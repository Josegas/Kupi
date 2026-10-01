"""
Job de muestreo de precios: captura el precio total real de los productos
que los usuarios tienen en favoritos. Se ejecuta cada 6 horas vía EventBridge.
"""
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

from kupi.connectors.rappi.connector import RappiConnector
from kupi.connectors.ubereats.connector import UberEatsConnector
from kupi.core.config import DEFAULT_LAT, DEFAULT_LNG


def run() -> dict:
    """Ejecuta el muestreo de precios y la evaluación de alertas."""
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SECRET_KEY", "")
    if not url or not key:
        return {"error": "SUPABASE_URL/SECRET_KEY no configurados"}

    sb = create_client(url, key)

    # 1. Obtener productos únicos que alguien tiene en favoritos
    favs_resp = sb.table("user_favorites").select(
        "rappi_product_id, ubereats_product_id, product_name, rappi_store_id, ubereats_store_id"
    ).execute()

    if not favs_resp.data:
        return {"sampled": 0, "alerts_sent": 0}

    # Deduplicar por par de product IDs
    seen = set()
    unique_products = []
    for f in favs_resp.data:
        key_tuple = (f.get("rappi_product_id"), f.get("ubereats_product_id"))
        if key_tuple not in seen:
            seen.add(key_tuple)
            unique_products.append(f)

    print(f"[price_sampler] {len(unique_products)} productos únicos a samplear")

    # 2. Samplear precios en paralelo (max 4 workers para no saturar APIs)
    rappi = RappiConnector()
    ubereats = UberEatsConnector()
    snapshots = []

    def sample_one(product: dict) -> list[dict]:
        results = []
        rappi_sid = product.get("rappi_store_id")
        ue_sid = product.get("ubereats_store_id")
        rappi_pid = product.get("rappi_product_id")
        ue_pid = product.get("ubereats_product_id")
        name = product.get("product_name", "")

        # Rappi
        if rappi_sid and rappi_pid:
            try:
                menu = rappi.fetch_menu(rappi_sid, DEFAULT_LAT, DEFAULT_LNG)
                prod = next((p for p in menu if p.product_id == rappi_pid), None)
                if prod:
                    quote = rappi.fetch_price(rappi_sid, prod, DEFAULT_LAT, DEFAULT_LNG)
                    results.append({
                        "rappi_product_id": rappi_pid,
                        "ubereats_product_id": ue_pid,
                        "product_name": name,
                        "platform": "rappi",
                        "product_price": quote.product_price,
                        "delivery_fee": quote.delivery_fee,
                        "service_fee": quote.service_fee,
                        "total": quote.total,
                        "rappi_store_id": rappi_sid,
                        "ubereats_store_id": ue_sid,
                    })
            except Exception as e:
                print(f"[price_sampler] Rappi error {rappi_pid}: {e}")

        # UberEats
        if ue_sid and ue_pid:
            try:
                menu = ubereats.fetch_menu(ue_sid, DEFAULT_LAT, DEFAULT_LNG)
                prod = next((p for p in menu if p.product_id == ue_pid), None)
                if prod:
                    quote = ubereats.fetch_price(ue_sid, prod, DEFAULT_LAT, DEFAULT_LNG)
                    results.append({
                        "rappi_product_id": rappi_pid,
                        "ubereats_product_id": ue_pid,
                        "product_name": name,
                        "platform": "ubereats",
                        "product_price": quote.product_price,
                        "delivery_fee": quote.delivery_fee,
                        "service_fee": quote.service_fee,
                        "total": quote.total,
                        "rappi_store_id": rappi_sid,
                        "ubereats_store_id": ue_sid,
                    })
            except Exception as e:
                print(f"[price_sampler] UberEats error {ue_pid}: {e}")

        return results

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(sample_one, p) for p in unique_products]
        for f in as_completed(futures):
            try:
                snapshots.extend(f.result())
            except Exception as e:
                print(f"[price_sampler] error: {e}")

    # 3. Insertar snapshots en Supabase
    if snapshots:
        sb.table("price_snapshots").insert(snapshots).execute()

    print(f"[price_sampler] {len(snapshots)} snapshots guardados")

    # 4. Evaluar alertas
    alerts_sent = _evaluate_alerts(sb, snapshots)

    return {"sampled": len(snapshots), "alerts_sent": alerts_sent}


def _evaluate_alerts(sb, new_snapshots: list[dict]) -> int:
    """
    Compara los precios nuevos con los anteriores.
    Si baja >= threshold_pct y no se notificó en 24h, crea notificación.
    """
    # Obtener alertas activas con info del favorito
    alerts_resp = sb.table("price_alerts").select(
        "*, user_favorites(rappi_product_id, ubereats_product_id, product_name, restaurant_name)"
    ).eq("is_active", True).execute()

    if not alerts_resp.data:
        return 0

    now = datetime.now(timezone.utc)
    cooldown = timedelta(hours=24)
    sent_count = 0

    for alert in alerts_resp.data:
        fav = alert.get("user_favorites", {})
        if not fav:
            continue

        rappi_pid = fav.get("rappi_product_id")
        ue_pid = fav.get("ubereats_product_id")

        # Buscar el snapshot nuevo para este producto
        new = None
        for s in new_snapshots:
            if (rappi_pid and s.get("rappi_product_id") == rappi_pid) or \
               (ue_pid and s.get("ubereats_product_id") == ue_pid):
                if new is None or s["total"] < new["total"]:
                    new = s

        if not new:
            continue

        # Buscar el snapshot anterior (el más reciente antes de este batch)
        since = (now - timedelta(days=7)).isoformat()
        prev_query = sb.table("price_snapshots").select("total, platform").eq("platform", new["platform"])

        if rappi_pid:
            prev_query = prev_query.eq("rappi_product_id", rappi_pid)
        elif ue_pid:
            prev_query = prev_query.eq("ubereats_product_id", ue_pid)

        prev_resp = prev_query.gte("sampled_at", since).order("sampled_at", desc=True).limit(2).execute()

        if not prev_resp.data or len(prev_resp.data) < 2:
            continue

        # El segundo es el anterior (el primero es el que acabamos de insertar)
        prev_total = prev_resp.data[1]["total"]
        new_total = new["total"]

        if prev_total <= 0:
            continue

        pct_drop = ((prev_total - new_total) / prev_total) * 100

        if pct_drop < alert.get("threshold_pct", 5):
            continue

        # Verificar cooldown
        last_notified = alert.get("last_notified_at")
        if last_notified:
            last_dt = datetime.fromisoformat(last_notified.replace("Z", "+00:00"))
            if now - last_dt < cooldown:
                continue

        # Crear notificación
        message = (
            f"El precio de {fav.get('product_name', '')} en {fav.get('restaurant_name', '')} "
            f"bajo de ${prev_total:.0f} a ${new_total:.0f} en {new['platform'].title()} "
            f"({pct_drop:.0f}% menos)"
        )

        sb.table("alert_notifications").insert({
            "alert_id": alert["id"],
            "user_id": alert["user_id"],
            "message": message,
            "channel": "email",
        }).execute()

        # Actualizar last_notified_at
        sb.table("price_alerts").update({"last_notified_at": now.isoformat()}).eq("id", alert["id"]).execute()

        sent_count += 1
        print(f"[alert] {message}")

    return sent_count

import difflib
import time as _time
import unicodedata

import requests as _requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from kupi.core.config import DEFAULT_LAT, DEFAULT_LNG
from kupi.core.models import PriceQuote
from kupi.connectors.rappi.connector import RappiConnector
from kupi.connectors.ubereats.connector import UberEatsConnector
from kupi.connectors.didi.connector import DidiConnector

app = FastAPI(title="Kupi API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restringir al dominio del frontend una vez deployado
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

rappi = RappiConnector()
ubereats = UberEatsConnector()
didi = DidiConnector()


# --- Esquemas de request/response ---

class CompareRequest(BaseModel):
    rappi_store_id: str
    ubereats_store_id: str
    rappi_product_id: str
    ubereats_product_id: str
    lat: float = DEFAULT_LAT
    lng: float = DEFAULT_LNG
    # Toppings de Rappi para simular checkout real (opcional - si no se envían, se usa el precio del menú)
    rappi_toppings: list[dict] | None = None
    # DiDi es opcional: si se omite, la respuesta solo incluye Rappi y Uber Eats
    didi_store_id: str | None = None
    didi_product_id: str | None = None


class QuoteResponse(BaseModel):
    platform: str
    product_price: float
    delivery_fee: float | None   # None en DiDi (solo disponible en la app)
    service_fee: float | None    # None en DiDi (solo disponible en la app)
    total: float
    currency: str
    eta_minutes: int | None
    deep_link: str
    store_name: str
    store_address: str
    variant_label: str = ""
    is_open: bool = True
    opens_at: str = ""


# --- Endpoints ---

def _normalize_name(name: str) -> str:
    name = name.lower()
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    name = "".join(c if c.isalnum() or c.isspace() else " " for c in name)
    return " ".join(name.split())


def _match_products(rappi_products: list, ue_products: list) -> dict:
    ue_norm = [(p, _normalize_name(p.name)) for p in ue_products]
    matched = []
    matched_rappi_ids: set[str] = set()
    seen_ue_ids: set[str] = set()

    for rp in rappi_products:
        rp_norm = _normalize_name(rp.name)
        best_match = None
        best_ratio = 0.0
        for up, up_norm in ue_norm:
            if up.product_id in seen_ue_ids:
                continue
            ratio = difflib.SequenceMatcher(None, rp_norm, up_norm).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = up
        if best_ratio >= 0.72 and best_match:
            # Rechazar si los precios difieren más del 25% — evita falsos positivos por nombre similar
            if best_match.price > 0 and rp.price > 0:
                price_ratio = min(rp.price, best_match.price) / max(rp.price, best_match.price)
                if price_ratio < 0.75:
                    continue
            matched_rappi_ids.add(rp.product_id)
            seen_ue_ids.add(best_match.product_id)
            matched.append({
                "name": rp.name,
                "description": rp.description,
                "price": rp.price,
                "image_url": rp.image_url or best_match.image_url or "",
                "rappi_product_id": rp.product_id,
                "ubereats_product_id": best_match.product_id,
            })

    only_rappi = [
        {"name": p.name, "description": p.description, "price": p.price,
         "image_url": p.image_url or "", "rappi_product_id": p.product_id, "platform": "rappi"}
        for p in rappi_products if p.product_id not in matched_rappi_ids
    ]

    # Deduplicar UberEats por product_id (el mismo producto puede aparecer en varias secciones)
    seen_ue_exclusive: set[str] = set()
    only_ubereats = []
    for p in ue_products:
        if p.product_id not in seen_ue_ids and p.product_id not in seen_ue_exclusive:
            seen_ue_exclusive.add(p.product_id)
            only_ubereats.append({
                "name": p.name, "description": p.description, "price": p.price,
                "image_url": p.image_url or "", "ubereats_product_id": p.product_id, "platform": "ubereats"
            })

    return {
        "matched": sorted(matched, key=lambda x: x["price"]),
        "only_rappi": sorted(only_rappi, key=lambda x: x["price"]),
        "only_ubereats": sorted(only_ubereats, key=lambda x: x["price"]),
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stores/status")
def get_stores_status(
    rappi_store_ids: str,
    ue_store_ids: str = "",
    lat: float = DEFAULT_LAT,
    lng: float = DEFAULT_LNG,
):
    """
    Verifica si cada restaurante está abierto en Rappi y/o UberEats.
    Un restaurante se muestra como abierto si AL MENOS UNA plataforma lo tiene abierto.
    rappi_store_ids y ue_store_ids: IDs separados por coma, en el mismo orden.
    Retorna: { "<rappi_store_id>": { "is_open": bool } }
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from kupi.connectors.ubereats.connector import _call_ubereats, _build_headers, _BASE_URL

    rappi_ids = [sid.strip() for sid in rappi_store_ids.split(",") if sid.strip()]
    ue_ids = [sid.strip() for sid in ue_store_ids.split(",") if sid.strip()]
    # Emparejar rappi_id → ue_id por posición
    ue_map = {rappi_ids[i]: ue_ids[i] for i in range(min(len(rappi_ids), len(ue_ids)))}

    def check_rappi(store_id: str) -> bool:
        try:
            data = rappi._fetch_store(store_id, lat, lng)
            status = data.get("status", "")
            if status == "OUT_OF_COVERAGE":
                return False  # no sabemos si está abierto, defer a UberEats
            return status == "OPEN"
        except Exception:
            return False

    def check_ue(ue_store_id: str) -> bool:
        try:
            headers = _build_headers(lat, lng)
            body = {"storeUuid": ue_store_id, "diningMode": "DELIVERY", "time": {"asap": True}, "cbType": "EATER_ENDORSED"}
            data = _call_ubereats(f"{_BASE_URL}/getStoreV1?localeCode=mx", headers, body).get("data", {})
            # closedMessage vacío = abierto ahora; no vacío = cerrado ("Abre: 10:00 a.m.")
            return not data.get("closedMessage", "")
        except Exception:
            return False

    def check_one(rappi_id: str) -> tuple[str, bool]:
        ue_id = ue_map.get(rappi_id)
        rappi_open = check_rappi(rappi_id)
        ue_open = check_ue(ue_id) if ue_id else False
        # Abierto si cualquiera de las dos plataformas lo está
        return rappi_id, rappi_open or ue_open

    result: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(check_one, sid): sid for sid in rappi_ids}
        for future in as_completed(futures):
            store_id, is_open = future.result()
            result[store_id] = {"is_open": is_open}

    return result


import re as _re

# Palabras/patrones que indican que un producto NO es un alimento que llena
_NON_FOOD_RE = _re.compile(
    r"\b\d+\s*ml\b"                                          # volumen: 600 ml, 237ml…
    r"|\blat[a]?\b"                                          # lata, latas
    r"|\blitros?\b|\blts?\b"                                 # litro/litros, lts
    r"|\b(coca.?cola|pepsi|sprite|fanta|sidral|mundet|fuze|7up|manzanita|mirinda|peñafiel|squirt|boing|fresca)\b"
    r"|\b(refresco|limonada|jugo|bebida|changuirongo)\b"     # bebidas
    r"|^\s*(salsa|aderezo|dip|crazy sauce)\b"                # salsas/aderezos al inicio
    r"|\bdip\b"                                             # dip en cualquier posición
    r"|\bsalsas?\s*$"                                        # "2 Salsas"
    r"|\b(bbq|ranch|brava|cheesepe[ñn]o|mango.habanero)\s*$"  # nombres de salsas solos
    r"|\bshot\b"                                             # salsas en formato shot (KFC)
    r"|\b(kream|big kream)\b"                                # bebidas KFC
    r"|\b(sundae|mcflurry|malteada|helado|pay de|dona|donut|cake pop)\b"  # postres
    r"|\bbaitz\b"                                            # Domino's dessert bites
    r"|\badicionales?\b"                                     # "2 Adicionales"
    r"|\b(puré de papa|papas?\s+(gajo|francesas?|a\s+la\s+francesa|fritas?|medianas?|grandes?|pequeñas?))\b"
    r"|\b(ensalada de col|coleslaw)\b"
    r"|\bsobre\s+(huntrix|saja)\b"                           # sobres de salsa McDonald's
    r"|\bfrijol(es)?\b"                                      # frijoles como guarnición
    r"|\b(cheesy\s*bread|papotas)\b"                         # Domino's sides
    r"|\b(crazy\s*bread|canela\s*stix)\b"                    # Little Caesars sides
    r"|\bté\s+de\s+la\s+casa\b"                             # té como bebida
    r"|extra\s*$"
    r"|ingrediente\s+extra"                                  # "Ingrediente Extra para Rollo"
    r"|\btogarashi\b"                                        # condimento Sushi City
    r"|\bquepapas?\b"                                        # snack Pizza Hut                                            # "Soya Extra", "Sriracha Extra"
    r"|\b(agua ciel|agua purificada)\b"
    r"|^agua\s"
    r"|^tortilla[s]?\s"                              # toda tortilla suelta
    r"|^guacamole\b"                                 # guacamole como dip
    r"|^queso\s*$",                                  # "Queso" solo = dip
    _re.IGNORECASE,
)


def _is_non_food(name: str) -> bool:
    return bool(_NON_FOOD_RE.search(name.strip()))


_FEATURED_RESTAURANTS = [
    {"restaurant_id": "little-caesars-culiacan",    "rappi_store_id": "1923772704",  "ubereats_store_id": "793b1eae-e077-44d0-8744-cf23f54fec50", "cuisine": "Pizza",         "restaurant_name": "Little Caesars"},
    {"restaurant_id": "pizza-hut-culiacan",          "rappi_store_id": "1923220069",  "ubereats_store_id": "e53caf1b-90b4-4c47-a0e0-6b8f63f65337", "cuisine": "Pizza",         "restaurant_name": "Pizza Hut"},
    {"restaurant_id": "pizzeta-culiacan",            "rappi_store_id": "1923214369",  "ubereats_store_id": "800cdf3a-43c7-4bec-936e-a11d978b2143", "cuisine": "Pizza",         "restaurant_name": "Pizzeta"},
    {"restaurant_id": "dominos-culiacan",            "rappi_store_id": "1930069672",  "ubereats_store_id": "cdc441e1-fca8-563c-bea6-d76717f401f9", "cuisine": "Pizza",         "restaurant_name": "Domino's Pizza"},
    {"restaurant_id": "kfc-culiacan",                "rappi_store_id": "1923218753",  "ubereats_store_id": "ff1cda7d-6ac6-4b0f-a276-ff8e49fd63df", "cuisine": "Pollo",         "restaurant_name": "KFC"},
    {"restaurant_id": "starbucks-culiacan",          "rappi_store_id": "1923761853",  "ubereats_store_id": "fa88c37a-8e40-43fc-a5c1-a1b288090fc1", "cuisine": "Café",          "restaurant_name": "Starbucks"},
    {"restaurant_id": "mcdonalds-culiacan",          "rappi_store_id": "1923235741",  "ubereats_store_id": "dd6ea249-d885-464f-a73d-8e67e62068c7", "cuisine": "Hamburguesas",  "restaurant_name": "McDonald's"},
    {"restaurant_id": "sushi-city-culiacan",         "rappi_store_id": "1930209629",  "ubereats_store_id": "2ef66044-c618-440c-8775-4fb2f2bfd9fb", "cuisine": "Sushi",         "restaurant_name": "Sushi City"},
    {"restaurant_id": "taqueria-san-juan-culiacan",  "rappi_store_id": "1923229914",  "ubereats_store_id": "1916b3b2-36c3-4a79-bdf6-7e2f97e6ded6", "cuisine": "Tacos",         "restaurant_name": "Taquería San Juan"},
]

_featured_cache: dict = {"ts": 0.0, "data": []}
_FEATURED_CACHE_TTL = 300  # 5 minutos


@app.get("/products/featured")
def get_featured_products(
    max_price: float = 100.0,
    lat: float = DEFAULT_LAT,
    lng: float = DEFAULT_LNG,
):
    """
    Productos bajo cierto precio, verificados en Rappi y Uber Eats.
    Corre en paralelo y cachea el resultado 5 minutos.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    global _featured_cache
    now = _time.time()
    if now - _featured_cache["ts"] < _FEATURED_CACHE_TTL:
        return [p for p in _featured_cache["data"] if p["price"] <= max_price]

    def fetch_one(r: dict) -> list[dict]:
        try:
            rappi_products = rappi.fetch_menu(r["rappi_store_id"], lat, lng)
        except Exception:
            rappi_products = []
        try:
            ue_products = ubereats.fetch_menu(r["ubereats_store_id"], lat, lng)
        except Exception:
            ue_products = []

        matched = _match_products(rappi_products, ue_products)
        results = []
        for p in matched["matched"]:
            # Filtrar extras, bebidas, salsas y postres
            if p["price"] < 45:
                continue
            if not p.get("image_url"):
                continue
            if _is_non_food(p["name"]):
                continue
            results.append({
                "name": p["name"],
                "price": p["price"],
                "image_url": p.get("image_url", ""),
                "restaurant_id": r["restaurant_id"],
                "restaurant_name": r["restaurant_name"],
                "category": r["cuisine"],
                "rappi_product_id": p.get("rappi_product_id", ""),
                "ubereats_product_id": p.get("ubereats_product_id", ""),
            })
        return results

    all_products: list[dict] = []
    with ThreadPoolExecutor(max_workers=9) as executor:
        futures = [executor.submit(fetch_one, r) for r in _FEATURED_RESTAURANTS]
        for future in as_completed(futures):
            all_products.extend(future.result())

    all_products.sort(key=lambda x: x["price"])
    _featured_cache = {"ts": now, "data": all_products}
    return [p for p in all_products if p["price"] <= max_price]


_deals_cache: dict = {}  # { "pizza_100": {"ts": float, "data": list} }


@app.get("/products/deals")
def get_deals(
    category: str,
    max_price: float = 100.0,
    lat: float = DEFAULT_LAT,
    lng: float = DEFAULT_LNG,
):
    """
    Productos bajo el precio TOTAL real (producto + envío + cuota de servicio)
    verificado en Rappi y Uber Eats con checkout completo.
    Requiere categoría. Cache 5 min por categoría.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    cache_key = f"{category.lower()}_{int(max_price)}"
    now = _time.time()
    if cache_key in _deals_cache and now - _deals_cache[cache_key]["ts"] < _FEATURED_CACHE_TTL:
        return _deals_cache[cache_key]["data"]

    restaurants = [r for r in _FEATURED_RESTAURANTS if r["cuisine"].lower() == category.lower()]
    if not restaurants:
        return []

    # Paso 1: obtener menús en paralelo, conservando los objetos Product originales
    def fetch_menus(r: dict):
        try:
            rappi_prods = rappi.fetch_menu(r["rappi_store_id"], lat, lng)
        except Exception:
            rappi_prods = []
        try:
            ue_prods = ubereats.fetch_menu(r["ubereats_store_id"], lat, lng)
        except Exception:
            ue_prods = []
        rappi_map = {p.product_id: p for p in rappi_prods}
        ue_map = {p.product_id: p for p in ue_prods}
        matched = _match_products(rappi_prods, ue_prods)
        return r, rappi_map, ue_map, matched

    restaurant_data = []
    with ThreadPoolExecutor(max_workers=len(restaurants)) as ex:
        for result in as_completed([ex.submit(fetch_menus, r) for r in restaurants]):
            restaurant_data.append(result.result())

    # Paso 2: armar candidatos (filtro básico antes del checkout costoso)
    candidates = []
    for r, rappi_map, ue_map, matched in restaurant_data:
        for p in matched["matched"]:
            if p["price"] < 45 or p["price"] > max_price or not p.get("image_url"):
                continue
            if _is_non_food(p["name"]):
                continue
            rp = rappi_map.get(p.get("rappi_product_id", ""))
            up = ue_map.get(p.get("ubereats_product_id", ""))
            if not rp and not up:
                continue
            candidates.append((r, rp, up, p))

    # Paso 3: checkout completo en paralelo (limitado para no saturar UberEats)
    def full_compare(r, rp, up, p_info):
        quotes = []
        try:
            if rp:
                quotes.append(rappi.fetch_price(r["rappi_store_id"], rp, lat, lng))
        except Exception:
            pass
        try:
            if up:
                quotes.append(ubereats.fetch_price(r["ubereats_store_id"], up, lat, lng))
        except Exception:
            pass
        if not quotes:
            return None
        min_total = min(q.total for q in quotes)
        if min_total > max_price:
            return None
        best = min(quotes, key=lambda q: q.total)
        return {
            "name": p_info["name"],
            "price": p_info["price"],
            "total": round(min_total, 2),
            "best_platform": best.platform,
            "image_url": p_info.get("image_url", ""),
            "restaurant_id": r["restaurant_id"],
            "restaurant_name": r["restaurant_name"],
            "category": r["cuisine"],
            "rappi_product_id": p_info.get("rappi_product_id", ""),
            "ubereats_product_id": p_info.get("ubereats_product_id", ""),
            "quotes": [
                {"platform": q.platform, "total": round(q.total, 2), "delivery_fee": q.delivery_fee}
                for q in quotes
            ],
        }

    results = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = [ex.submit(full_compare, r, rp, up, p) for r, rp, up, p in candidates]
        for f in as_completed(futures):
            r = f.result()
            if r:
                results.append(r)

    results.sort(key=lambda x: x["total"])
    _deals_cache[cache_key] = {"ts": now, "data": results}
    return results


@app.get("/proxy/image")
def proxy_image(url: str = Query(...)):
    """Proxy para imágenes con hotlink protection (ej. CDN de Rappi)."""
    if "ubereats.com" in url or "cloudfront.net" in url or "uber.com" in url:
        referer = "https://www.ubereats.com/"
    else:
        referer = "https://www.rappi.com.mx/"
    try:
        resp = _requests.get(
            url,
            headers={
                "Referer": referer,
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
            },
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return Response(
        content=resp.content,
        media_type=resp.headers.get("content-type", "image/png"),
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/menu/rappi/{store_id}")
def get_rappi_menu(store_id: str, lat: float = DEFAULT_LAT, lng: float = DEFAULT_LNG):
    try:
        products = rappi.fetch_menu(store_id, lat, lng)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"store_id": store_id, "products": [p.__dict__ for p in products]}


@app.get("/menu/ubereats/{store_id}")
def get_ubereats_menu(store_id: str, lat: float = DEFAULT_LAT, lng: float = DEFAULT_LNG):
    try:
        products = ubereats.fetch_menu(store_id, lat, lng)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"store_id": store_id, "products": [p.__dict__ for p in products]}


@app.get("/menu/didi/{store_id}")
def get_didi_menu(store_id: str):
    """
    Menú de una sucursal de DiDi Food por su ID numérico.
    El ID debe estar registrado en connectors/didi/stores.json.
    lat/lng no aplican (DiDi usa ciudad fija en la URL).
    """
    try:
        products = didi.fetch_menu(store_id, lat=0, lng=0)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"store_id": store_id, "products": [p.__dict__ for p in products]}


@app.get("/didi/stores")
def list_didi_stores():
    """Lista todas las sucursales de DiDi disponibles en Culiacán."""
    from kupi.connectors.didi.connector import _STORES
    return {
        "count": len(_STORES),
        "stores": [
            {"store_id": sid, "name": info["name"], "url": info["url"]}
            for sid, info in _STORES.items()
        ],
    }


@app.get("/menu/combined")
def get_combined_menu(
    rappi_store_id: str,
    ubereats_store_id: str,
    lat: float = DEFAULT_LAT,
    lng: float = DEFAULT_LNG,
    didi_store_id: str | None = None,
):
    """
    Jala el menú de Rappi y Uber Eats, hace matching por nombre normalizado,
    y opcionalmente también cruza con DiDi (si se pasa didi_store_id).
    Cada producto en 'matched' incluye didi_product_id si hay coincidencia.
    """
    errors: list[str] = []
    rappi_products = []
    ue_products = []
    didi_products = []

    try:
        rappi_products = rappi.fetch_menu(rappi_store_id, lat, lng)
    except Exception as e:
        errors.append(f"Rappi: {e}")

    try:
        ue_products = ubereats.fetch_menu(ubereats_store_id, lat, lng)
    except Exception as e:
        errors.append(f"UberEats: {e}")

    if didi_store_id:
        try:
            didi_products = didi.fetch_menu(didi_store_id, lat=0, lng=0)
        except Exception as e:
            errors.append(f"DiDi: {e}")

    if not rappi_products and not ue_products:
        raise HTTPException(status_code=502, detail={"errors": errors})

    result = _match_products(rappi_products, ue_products)

    # Cruzar productos matched con DiDi por nombre normalizado
    if didi_products:
        didi_norm = [(_normalize_name(p.name), p) for p in didi_products]
        for product in result["matched"]:
            rp_norm = _normalize_name(product["name"])
            best_id: str | None = None
            best_ratio = 0.0
            for dn, dp in didi_norm:
                ratio = difflib.SequenceMatcher(None, rp_norm, dn).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_id = dp.product_id
            # Umbral más bajo que Rappi↔UberEats porque los nombres difieren más entre plataformas
            if best_ratio >= 0.55 and best_id:
                product["didi_product_id"] = best_id
            else:
                product["didi_product_id"] = None

    return {
        "products": result["matched"],
        "only_rappi": result["only_rappi"],
        "only_ubereats": result["only_ubereats"],
        "errors": errors,
    }


@app.post("/compare", response_model=list[QuoteResponse])
def compare(req: CompareRequest):
    """
    Cotiza el precio final de un producto en Rappi y Uber Eats en paralelo.
    Devuelve la lista de quotes ordenada de más barato a más caro (total).
    """
    quotes: list[PriceQuote] = []
    errors: list[str] = []

    # Rappi
    try:
        rappi_products = rappi.fetch_menu(req.rappi_store_id, req.lat, req.lng)
        rappi_product = next((p for p in rappi_products if p.product_id == req.rappi_product_id), None)
        if rappi_product:
            quotes.append(rappi.fetch_price(
                req.rappi_store_id, rappi_product, req.lat, req.lng,
                toppings=req.rappi_toppings,
            ))
        else:
            errors.append(f"Producto {req.rappi_product_id} no encontrado en Rappi")
    except Exception as e:
        errors.append(f"Rappi: {e}")

    # Uber Eats
    try:
        ue_products = ubereats.fetch_menu(req.ubereats_store_id, req.lat, req.lng)
        ue_product = next((p for p in ue_products if p.product_id == req.ubereats_product_id), None)
        if ue_product:
            quotes.append(ubereats.fetch_price(req.ubereats_store_id, ue_product, req.lat, req.lng))
        else:
            errors.append(f"Producto {req.ubereats_product_id} no encontrado en Uber Eats")
    except Exception as e:
        errors.append(f"Uber Eats: {e}")

    # DiDi (opcional — solo si se envían didi_store_id y didi_product_id)
    if req.didi_store_id and req.didi_product_id:
        try:
            didi_products = didi.fetch_menu(req.didi_store_id, req.lat, req.lng)
            didi_product = next(
                (p for p in didi_products if p.product_id == req.didi_product_id), None
            )
            if didi_product:
                quotes.append(didi.fetch_price(req.didi_store_id, didi_product, req.lat, req.lng))
            else:
                errors.append(f"Producto {req.didi_product_id} no encontrado en DiDi")
        except Exception as e:
            errors.append(f"DiDi: {e}")

    if not quotes:
        raise HTTPException(status_code=502, detail={"errors": errors})

    # Ordenar por total; DiDi va al final si su total es parcial (sin envío)
    quotes.sort(key=lambda q: q.total)
    return [QuoteResponse(**q.__dict__) for q in quotes]


@app.get("/coupons")
def get_coupons_endpoint(restaurant_id: str | None = None):
    """
    Devuelve cupones activos desde Supabase.
    Opcionalmente filtra por restaurant_id.
    """
    try:
        from kupi.catalog.coupons import get_coupons
        return get_coupons(restaurant_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/coupons/refresh")
def refresh_coupons_endpoint(
    lat: float = DEFAULT_LAT,
    lng: float = DEFAULT_LNG,
):
    """
    Escanea Rappi y UberEats en tiempo real y actualiza la tabla de cupones en Supabase.
    Operación costosa (~10-30s) - llamar solo desde un job periódico o manualmente.
    """
    try:
        from kupi.catalog.coupons import refresh_coupons
        count = refresh_coupons(lat, lng)
        return {"saved": count}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

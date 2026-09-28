import difflib
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
    allow_origins=["http://localhost:3000"],  # ajustar al dominio real en producción
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

    if not rappi_products or not ue_products:
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

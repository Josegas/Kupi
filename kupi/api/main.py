from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from kupi.core.config import DEFAULT_LAT, DEFAULT_LNG
from kupi.core.models import PriceQuote
from kupi.connectors.rappi.connector import RappiConnector
from kupi.connectors.ubereats.connector import UberEatsConnector

app = FastAPI(title="Kupi API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ajustar al dominio real en producción
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

rappi = RappiConnector()
ubereats = UberEatsConnector()


# --- Esquemas de request/response ---

class CompareRequest(BaseModel):
    rappi_store_id: str
    ubereats_store_id: str
    rappi_product_id: str
    ubereats_product_id: str
    lat: float = DEFAULT_LAT
    lng: float = DEFAULT_LNG


class QuoteResponse(BaseModel):
    platform: str
    product_price: float
    delivery_fee: float
    service_fee: float
    total: float
    currency: str
    eta_minutes: int | None
    deep_link: str


# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok"}


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
            quotes.append(rappi.fetch_price(req.rappi_store_id, rappi_product, req.lat, req.lng))
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

    if not quotes:
        raise HTTPException(status_code=502, detail={"errors": errors})

    quotes.sort(key=lambda q: q.total)
    return [QuoteResponse(**q.__dict__) for q in quotes]

import requests
from kupi.connectors.base import BaseConnector
from kupi.core.config import RAPPI_TOKEN, RAPPI_DEVICE_ID
from kupi.core.models import Product, PriceQuote

_HEADERS = {
    "authorization": f"Bearer {RAPPI_TOKEN}",
    "app-version": "1.162.2",
    "deviceid": RAPPI_DEVICE_ID,
    "content-type": "application/json; charset=UTF-8",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
    "accept": "application/json",
    "accept-language": "es-MX",
}

_BASE_URL = "https://services.mxgrability.rappi.com/api/web-gateway/web/restaurants-bus/store/id"


class RappiConnector(BaseConnector):

    def _fetch_store(self, store_id: str, lat: float, lng: float) -> dict:
        url = f"{_BASE_URL}/{store_id}/"
        body = {
            "lat": lat,
            "lng": lng,
            "store_type": "restaurant",
            "is_prime": False,
            "prime_config": {"unlimited_shipping": False},
        }
        resp = requests.post(url, headers=_HEADERS, json=body, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def fetch_menu(self, store_id: str, lat: float, lng: float) -> list[Product]:
        data = self._fetch_store(store_id, lat, lng)
        products = []
        for corridor in data.get("corridors", []):
            for p in corridor.get("products", []):
                products.append(Product(
                    product_id=str(p["product_id"]),
                    name=p["name"],
                    price=float(p["price"]),
                    real_price=float(p.get("real_price", p["price"])),
                    description=p.get("description", ""),
                    image_url=p.get("image", ""),
                ))
        return products

    def fetch_price(self, store_id: str, product: Product, lat: float, lng: float) -> PriceQuote:
        data = self._fetch_store(store_id, lat, lng)
        delivery_fee = float(data.get("delivery_price", 0))
        eta = data.get("eta")
        return PriceQuote(
            platform="rappi",
            product_price=product.price,
            delivery_fee=delivery_fee,
            service_fee=0.0,  # Rappi no expone cuota de servicio separada en este endpoint
            total=product.price + delivery_fee,
            eta_minutes=int(eta) if eta else None,
            deep_link=f"https://www.rappi.com.mx/restaurantes/{store_id}",
        )

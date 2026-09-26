import time
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
    "origin": "https://www.rappi.com.mx",
    "referer": "https://www.rappi.com.mx/",
}

_STORE_URL = "https://services.mxgrability.rappi.com/api/web-gateway/web/restaurants-bus/store/id"
_CART_BASE = "https://services.mxgrability.rappi.com/api/ms/shopping-cart"
_IMAGE_CDN = "https://images.rappi.com.mx/products/"
_LOGO_CDN = "https://images.rappi.com.mx/restaurants_logo/"
_BG_CDN = "https://images.rappi.com.mx/restaurants_background/"


def _rappi_image(raw: str) -> str:
    if not raw:
        return ""
    if raw.startswith("http"):
        return raw
    return f"{_IMAGE_CDN}{raw}"


def _rappi_store_image(store_data: dict) -> str:
    """Devuelve la imagen de fondo del restaurante, o su logo como fallback."""
    bg = store_data.get("background", "")
    if bg:
        return f"{_BG_CDN}{bg}"
    logo = store_data.get("logo", "")
    if logo:
        return f"{_LOGO_CDN}{logo}"
    return ""


class RappiConnector(BaseConnector):

    def _fetch_store(self, store_id: str, lat: float, lng: float) -> dict:
        url = f"{_STORE_URL}/{store_id}/"
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
                    image_url=_rappi_image(p.get("image", "")),
                ))
        return products

    def fetch_price(
        self,
        store_id: str,
        product: Product,
        lat: float,
        lng: float,
        toppings: list[dict] | None = None,
    ) -> PriceQuote:
        data = self._fetch_store(store_id, lat, lng)
        delivery_fee = float(data.get("delivery_price", 0))
        eta = data.get("eta")
        eta_minutes = int("".join(filter(str.isdigit, str(eta)))) if eta else None
        store_name = data.get("name", "")
        store_address = data.get("address", "")

        # Siempre intentar checkout real para obtener envío y service fee con promos aplicadas
        try:
            return self._fetch_checkout(
                store_id=store_id,
                product=product,
                lat=lat,
                lng=lng,
                toppings=toppings or [],
                store_data=data,
                eta_minutes=eta_minutes,
            )
        except Exception as e:
            # Si falla (ej. producto con personalización obligatoria), caer al precio del menú
            print(f"[Rappi] checkout falló ({e}), usando precio de menú")

        return PriceQuote(
            platform="rappi",
            product_price=product.price,
            delivery_fee=delivery_fee,
            service_fee=0.0,
            total=product.price + delivery_fee,
            eta_minutes=eta_minutes,
            deep_link=f"https://www.rappi.com.mx/restaurantes/{store_id}?product={product.product_id}",
            store_name=store_name,
            store_address=store_address,
        )

    def _fetch_checkout(
        self,
        store_id: str,
        product: Product,
        lat: float,
        lng: float,
        toppings: list[dict],
        store_data: dict,
        eta_minutes: int | None,
    ) -> PriceQuote:
        """
        Simula el checkout de Rappi en 3 pasos para obtener el desglose real:
          1. PUT  /v2/restaurant/store     - pone el producto en el carrito
          2. POST /v1/restaurant/recalculate - recalcula precios y fees
          3. GET  /v1/restaurant/summary-v2  - desglose completo (envío, servicio, descuentos)
        """
        store_name = store_data.get("name", "")
        store_address = store_data.get("address", "")

        # Extraer partner_id del store si está disponible, sino usar el store_id
        partner_id = str(store_data.get("partner_id") or store_data.get("brand_id") or store_id)
        timestamp_ms = int(time.time() * 1000)
        vendor_id = f"{partner_id}_{timestamp_ms}"

        # Paso 1 - PUT carrito (reintenta una vez si hay 409 por carrito previo activo)
        product_entry_id = f"{store_id}_{product.product_id}"
        cart_body = [{
            "id": int(store_id),
            "products": [{
                "id": product_entry_id,
                "units": 1,
                "sale_type": "Unit",
                "nodeId": product.product_id,
                "toppings": toppings,
            }],
            "vendor": {
                "id": vendor_id,
                "type": "rappi",
                "flow_type": "rappi-web",
            },
        }]
        r1 = requests.put(
            f"{_CART_BASE}/v2/restaurant/store",
            headers=_HEADERS,
            json=cart_body,
            timeout=10,
        )
        if r1.status_code == 409:
            # Carrito previo activo - vaciarlo y reintentar
            time.sleep(0.5)
            requests.put(
                f"{_CART_BASE}/v2/restaurant/store",
                headers=_HEADERS,
                json=[{"id": int(store_id), "products": [], "vendor": {"id": vendor_id, "type": "rappi", "flow_type": "rappi-web"}}],
                timeout=10,
            )
            time.sleep(0.3)
            r1 = requests.put(
                f"{_CART_BASE}/v2/restaurant/store",
                headers=_HEADERS,
                json=cart_body,
                timeout=10,
            )
        r1.raise_for_status()

        # Paso 2 - recalcular (change-address no es necesario para cotización)
        r2 = requests.post(
            f"{_CART_BASE}/v1/restaurant/recalculate",
            headers=_HEADERS,
            json={},
            timeout=10,
        )
        r2.raise_for_status()

        # Paso 3 - summary-v2 con desglose completo
        r3 = requests.get(
            f"{_CART_BASE}/v1/restaurant/summary-v2",
            headers=_HEADERS,
            timeout=10,
        )
        r3.raise_for_status()
        summary = r3.json()

        return _parse_summary(summary, product, store_id, store_name, store_address, eta_minutes)


def _parse_summary(
    summary: dict,
    product: Product,
    store_id: str,
    store_name: str,
    store_address: str,
    eta_minutes: int | None,
) -> PriceQuote:
    """
    Parsea summary-v2 usando los sub_value del Total (más precisos que fees[]):
      type="product_total" → precio con descuento
      type="shipping"      → costo de envío real (0 si hay promo de envío gratis)
      type="service_fee"   → tarifa de servicio
      type="tip"           → propina (se excluye - es opcional del usuario)
    """
    product_price = product.price
    delivery_fee = 0.0
    service_fee = 0.0

    for section in summary.get("summary", []):
        for sub in (section.get("sub_value") or []):
            t = sub.get("type")
            val = float(sub.get("raw_value") or 0)
            if t == "product_total":
                product_price = val
            elif t == "shipping":
                delivery_fee = val
            elif t == "service_fee":
                service_fee = val
            # tip se ignora - es opcional del usuario, no parte del precio de la plataforma

    total = product_price + delivery_fee + service_fee

    return PriceQuote(
        platform="rappi",
        product_price=product_price,
        delivery_fee=delivery_fee,
        service_fee=service_fee,
        total=total,
        eta_minutes=eta_minutes,
        deep_link=f"https://www.rappi.com.mx/restaurantes/{store_id}?product={product.product_id}",
        store_name=store_name,
        store_address=store_address,
    )

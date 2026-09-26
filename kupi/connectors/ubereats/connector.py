import json
import urllib.parse
import uuid as uuid_lib
from curl_cffi import requests
from kupi.connectors.base import BaseConnector
from kupi.core.config import UBEREATS_COOKIE_STRING
from kupi.core.models import Product, PriceQuote

_BASE_URL = "https://www.ubereats.com/_p/api"

_HEADERS_BASE = {
    "accept": "*/*",
    "accept-language": "es-419,es;q=0.5",
    "content-type": "application/json",
    "origin": "https://www.ubereats.com",
    "priority": "u=1, i",
    "sec-ch-ua": '"Brave";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sec-gpc": "1",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
    "x-csrf-token": "x",
    "x-uber-client-gitref": "1732c3b88979083c69bf194084b10b1d475ff81d",
}


def _parse_cookies(cookie_string: str) -> dict[str, str]:
    cookies = {}
    for part in cookie_string.split(";"):
        part = part.strip()
        if "=" in part:
            name, value = part.split("=", 1)
            cookies[name.strip()] = value.strip()
    return cookies


def _build_session(lat: float, lng: float) -> requests.Session:
    """Crea una sesión con cookies y headers de ubicación listos."""
    session = requests.Session()
    cookies = _parse_cookies(UBEREATS_COOKIE_STRING)
    for name, value in cookies.items():
        session.cookies.set(name, value, domain=".ubereats.com")
    session.headers.update({
        **_HEADERS_BASE,
        "x-uber-device-location-latitude": str(lat),
        "x-uber-device-location-longitude": str(lng),
        "x-uber-target-location-latitude": str(lat),
        "x-uber-target-location-longitude": str(lng),
    })
    return session


class UberEatsConnector(BaseConnector):

    def fetch_menu(self, store_id: str, lat: float, lng: float) -> list[Product]:
        """
        Llama a getStoreV1 y parsea el catálogo completo.
        Guarda section_uuid y subsection_uuid por producto (necesarios para cotizar).
        """
        session = _build_session(lat, lng)
        body = {
            "storeUuid": store_id,
            "diningMode": "DELIVERY",
            "time": {"asap": True},
            "cbType": "EATER_ENDORSED",
        }
        resp = session.post(
            f"{_BASE_URL}/getStoreV1?localeCode=mx",
            json=body,
            impersonate="chrome120",
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "success":
            raise RuntimeError(f"getStoreV1 falló: {data.get('data', {}).get('errorMessage', 'unknown')}")

        store_data = data["data"]
        return _parse_menu(store_data)

    def fetch_price(self, store_id: str, product: Product, lat: float, lng: float) -> PriceQuote:
        """
        Cotiza el precio real en 2 pasos:
          1. createDraftOrderV2  → obtiene draftOrderUUID
          2. getCheckoutPresentationV1 → desglose: producto + envío + cuota de servicio
        Reutiliza el getStoreV1 (ya llamado en fetch_menu) para obtener nombre y dirección.
        """
        session = _build_session(lat, lng)

        # Obtener nombre y dirección de la tienda
        store_body = {"storeUuid": store_id, "diningMode": "DELIVERY", "time": {"asap": True}, "cbType": "EATER_ENDORSED"}
        store_resp = session.post(f"{_BASE_URL}/getStoreV1?localeCode=mx", json=store_body, impersonate="chrome120")
        store_resp.raise_for_status()
        store_data = store_resp.json().get("data", {})
        store_name = store_data.get("title", "")
        store_address = store_data.get("location", {}).get("address", "")

        # Construir el referer con el quickView del producto específico
        modctx = json.dumps({
            "storeUuid": store_id,
            "sectionUuid": product.section_uuid,
            "subsectionUuid": product.subsection_uuid,
            "itemUuid": product.product_id,
            "showSeeDetailsCTA": True,
        })
        modctx_encoded = urllib.parse.quote(urllib.parse.quote(modctx))  # doble encode para el header
        modctx_deep = urllib.parse.quote(modctx)  # encode simple para el deep link
        referer = (
            f"https://www.ubereats.com/mx/store/store/{store_id}"
            f"?diningMode=DELIVERY&mod=quickView&modctx={modctx_encoded}"
        )
        deep_link_ue = (
            f"https://www.ubereats.com/mx/store/store/{store_id}"
            f"?diningMode=DELIVERY&mod=quickView&modctx={modctx_deep}"
        )
        session.headers.update({"referer": referer})

        # Paso 1 - crear draft order
        create_body = {
            "isMulticart": True,
            "shoppingCartItems": [{
                "uuid": product.product_id,
                "shoppingCartItemUuid": str(uuid_lib.uuid4()),
                "storeUuid": store_id,
                "sectionUuid": product.section_uuid,
                "subsectionUuid": product.subsection_uuid,
                "price": int(product.price * 100),  # centavos
                "title": product.name,
                "quantity": 1,
                "customizations": product.customizations,
                "imageURL": product.image_url,
                "specialInstructions": "",
                "itemId": None,
            }],
            "useCredits": True,
            "extraPaymentProfiles": [],
            "promotionOptions": {
                "autoApplyPromotionUUIDs": [],
                "selectedPromotionInstanceUUIDs": [],
                "skipApplyingPromotion": False,
            },
            "deliveryTime": {"asap": True},
            "deliveryType": "ASAP",
            "currencyCode": "MXN",
            "interactionType": "door_to_door",
            "checkMultipleDraftOrdersCap": True,
            "actionMeta": {"isQuickAdd": False, "numClicks": 1},
            "businessDetails": {},
        }
        resp1 = session.post(
            f"{_BASE_URL}/createDraftOrderV2?localeCode=mx",
            json=create_body,
            impersonate="chrome120",
        )
        resp1.raise_for_status()
        data1 = resp1.json()
        if data1.get("status") != "success":
            raise RuntimeError(f"createDraftOrderV2 falló: {data1}")

        draft_order_uuid = data1["data"]["draftOrder"]["uuid"]

        # Paso 2 - obtener desglose de precios
        checkout_body = {
            "draftOrderUUID": draft_order_uuid,
            "isGroupOrder": False,
            "webGiftingPersonalizationEnabled": True,
            "clientFeaturesData": {
                "paymentSelectionContext": {
                    "value": '{"deviceContext":{"thirdPartyApplications":[]}}'
                }
            },
            "payloadTypes": [
                "canonicalProductStorePickerPayload",
                "total",
                "subtotal",
                "fareBreakdown",
                "deliveryOptInInfo",
                "paymentProfilesEligibility",
                "requestUtensilPayload",
                "versionMetadata",
            ],
        }
        resp2 = session.post(
            f"{_BASE_URL}/getCheckoutPresentationV1?localeCode=mx",
            json=checkout_body,
            impersonate="chrome120",
        )
        resp2.raise_for_status()
        data2 = resp2.json()
        if data2.get("status") != "success":
            raise RuntimeError(f"getCheckoutPresentationV1 falló: {data2}")

        checkout_data = data2["data"]
        return _parse_checkout(checkout_data, product, store_id, store_name, store_address, deep_link=deep_link_ue)


def _parse_menu(store_data: dict) -> list[Product]:
    products = []
    catalog_map = store_data.get("catalogSectionsMap", {})
    for section_uuid, subsections in catalog_map.items():
        for subsection in subsections:
            subsection_uuid = subsection.get("catalogSectionUUID", "")
            items = (
                subsection.get("payload", {})
                .get("standardItemsPayload", {})
                .get("catalogItems", [])
            )
            for item in items:
                products.append(Product(
                    product_id=item.get("uuid", ""),
                    name=item.get("title", ""),
                    price=item.get("price", 0) / 100,
                    real_price=item.get("price", 0) / 100,  # UberEats no distingue real_price en este endpoint
                    description=item.get("itemDescription", ""),
                    image_url=item.get("imageURL") or "",
                    section_uuid=section_uuid,
                    subsection_uuid=subsection_uuid,
                ))
    return products


def _parse_money_text(text: str) -> float:
    """Convierte '$21.00' o '21.00' a float. Retorna 0.0 si no puede."""
    try:
        return float(text.replace("$", "").replace(",", "").strip())
    except (ValueError, AttributeError):
        return 0.0


def _parse_checkout(checkout_data: dict, product: Product, store_id: str, store_name: str = "", store_address: str = "", deep_link: str = "") -> PriceQuote:
    payloads = checkout_data.get("checkoutPayloads", {})
    charges = payloads.get("fareBreakdown", {}).get("charges", [])

    delivery_fee = 0.0
    service_fee = 0.0

    for charge in charges:
        fare_id = charge.get("fareBreakdownChargeMetadata", {}).get("fareInfoID", "")
        amount = _parse_money_text(charge.get("value", {}).get("text", ""))
        if fare_id == "eats_fare.delivery_fee":
            delivery_fee = amount
        elif "service_fee" in fare_id or "basket_dependent_fee" in fare_id:
            service_fee = amount

    # No se ajusta el delivery fee por tier (Basica vs Prioritaria):
    # UberEats balancea los fees entre tiers -- lo que sube en delivery baja en
    # service fee, por lo que el TOTAL Prioritaria es casi identico al total Basica.

    total = product.price + delivery_fee + service_fee

    return PriceQuote(
        platform="ubereats",
        product_price=product.price,
        delivery_fee=delivery_fee,
        service_fee=service_fee,
        total=total,
        deep_link=deep_link or f"https://www.ubereats.com/mx/store/store/{store_id}",
        store_name=store_name,
        store_address=store_address,
    )

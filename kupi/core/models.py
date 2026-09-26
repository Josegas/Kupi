from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Product:
    product_id: str
    name: str
    price: float          # precio con descuento activo
    real_price: float     # precio sin descuento
    description: str = ""
    image_url: str = ""
    # Campos extra que Uber Eats necesita para cotizar (no aplican en Rappi/DiDi)
    section_uuid: str = ""
    subsection_uuid: str = ""
    customizations: dict = field(default_factory=dict)


@dataclass
class PriceQuote:
    platform: str         # "rappi" | "ubereats" | "didi"
    product_price: float
    delivery_fee: float
    service_fee: float
    total: float
    currency: str = "MXN"
    eta_minutes: Optional[int] = None
    deep_link: str = ""   # URL para abrir la tienda en la app/web de la plataforma
    store_name: str = ""  # nombre de la sucursal en esa plataforma
    store_address: str = ""  # dirección de la sucursal

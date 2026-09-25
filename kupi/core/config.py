import os
from dotenv import load_dotenv

load_dotenv()

RAPPI_TOKEN: str = os.environ["RAPPI_TOKEN"]
RAPPI_DEVICE_ID: str = os.environ["RAPPI_DEVICE_ID"]

UBEREATS_COOKIE_STRING: str = os.environ["UBEREATS_COOKIE_STRING"]

DEFAULT_LAT: float = float(os.getenv("DEFAULT_LAT", "24.8143484"))
DEFAULT_LNG: float = float(os.getenv("DEFAULT_LNG", "-107.4005298"))

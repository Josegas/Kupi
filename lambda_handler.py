"""
Punto de entrada para AWS Lambda.
Solo envuelve la app de FastAPI con Mangum - toda la lógica vive en kupi/api/main.py.
"""
from mangum import Mangum
from kupi.api.main import app

handler = Mangum(app, lifespan="off")

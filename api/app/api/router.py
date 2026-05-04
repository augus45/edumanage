from fastapi import APIRouter
from app.api.v1 import auth, users, clients, services, orders, payments

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
api_router.include_router(users.router, prefix="/users", tags=["Usuarios"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clientes"])
api_router.include_router(services.router, prefix="/services", tags=["Catálogo de Servicios"])
api_router.include_router(orders.router, prefix="/orders", tags=["Pedidos"])
api_router.include_router(payments.router, prefix="/payments", tags=["Pagos"])

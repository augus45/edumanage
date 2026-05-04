import json
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.database import get_db
from app.models import Service, User
from app.schemas import Service as ServiceSchema, ServiceCreate
from app.api import deps
from app.core.cache import get_redis

router = APIRouter()

CACHE_TTL = 3600 # 1 hora
SERVICES_CACHE_KEY = "catalog:services"

@router.get("/", response_model=List[ServiceSchema])
async def read_services(
    db: AsyncSession = Depends(get_db),
    redis_client = Depends(get_redis),
) -> Any:
    """
    Obtener el catálogo de servicios disponibles.
    Implementa caché en Redis para respuestas ultra-rápidas.
    """
    # Intentar obtener de Caché
    if redis_client:
        cached_services = await redis_client.get(SERVICES_CACHE_KEY)
        if cached_services:
            return json.loads(cached_services)
            
    # Si no hay caché (Cache Miss), buscar en BD
    result = await db.execute(select(Service).where(Service.is_active == True))
    services = result.scalars().all()
    
    # Serializar y guardar en Caché
    services_list = [
        {"id": str(s.id), "name": s.name, "description": s.description, "price": s.price, "is_active": s.is_active}
        for s in services
    ]
    if redis_client:
        await redis_client.setex(SERVICES_CACHE_KEY, CACHE_TTL, json.dumps(services_list))
        
    return services

@router.post("/", response_model=ServiceSchema, status_code=status.HTTP_201_CREATED)
async def create_service(
    *,
    db: AsyncSession = Depends(get_db),
    service_in: ServiceCreate,
    current_user: User = Depends(deps.get_current_active_user),
    redis_client = Depends(get_redis)
) -> Any:
    """
    Crear un nuevo servicio. Invalida la caché del catálogo.
    Requiere autenticación (Agente/Admin).
    """
    service_obj = Service(
        name=service_in.name,
        description=service_in.description,
        price=service_in.price,
        is_active=service_in.is_active
    )
    db.add(service_obj)
    await db.commit()
    await db.refresh(service_obj)
    
    # Invalidar caché al actualizar el catálogo
    if redis_client:
        await redis_client.delete(SERVICES_CACHE_KEY)
        
    return service_obj

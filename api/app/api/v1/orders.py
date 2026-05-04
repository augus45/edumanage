from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.database import get_db
from app.models import Order, Service, Client, User, OrderStatus
from app.schemas import Order as OrderSchema, OrderCreate, OrderUpdate
from app.api import deps
import httpx

router = APIRouter()

@router.post("/", response_model=OrderSchema, status_code=status.HTTP_201_CREATED)
async def create_order(
    *,
    db: AsyncSession = Depends(get_db),
    order_in: OrderCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Crea un nuevo pedido asociando un cliente y un servicio.
    Valida la existencia del cliente y el servicio.
    """
    # Verificar servicio
    result_service = await db.execute(select(Service).where(Service.id == order_in.service_id))
    service = result_service.scalars().first()
    if not service or not service.is_active:
        raise HTTPException(status_code=400, detail="Servicio no válido o inactivo.")
        
    # Verificar cliente
    result_client = await db.execute(select(Client).where(Client.id == order_in.client_id))
    client = result_client.scalars().first()
    if not client:
        raise HTTPException(status_code=400, detail="Cliente no encontrado.")

    order_obj = Order(
        client_id=order_in.client_id,
        service_id=order_in.service_id,
        status=OrderStatus.pending,
        total_amount=service.price
    )
    db.add(order_obj)
    await db.commit()
    await db.refresh(order_obj)
    
    # Enviar notificación al microservicio Node.js de forma asíncrona
    try:
        async with httpx.AsyncClient() as http_client:
            await http_client.post(
                "http://notifications:3000/api/notify",
                json={
                    "to": client.email,
                    "template": "order_created",
                    "data": {
                        "order_id": str(order_obj.id),
                        "service_name": service.name,
                        "amount": service.price
                    }
                },
                timeout=5.0
            )
    except Exception as e:
        print(f"Error enviando notificación al microservicio: {e}")
    
    return order_obj

@router.get("/", response_model=List[OrderSchema])
async def read_orders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Obtiene la lista de todos los pedidos. (Para Dashboard)
    """
    result = await db.execute(select(Order).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{order_id}", response_model=OrderSchema)
async def read_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Obtener detalles de un pedido.
    """
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
    return order

@router.patch("/{order_id}/status", response_model=OrderSchema)
async def update_order_status(
    *,
    db: AsyncSession = Depends(get_db),
    order_id: UUID,
    order_in: OrderUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Actualiza el estado de un pedido (ej. de pending a in_progress).
    """
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
        
    order.status = order_in.status
    db.add(order)
    await db.commit()
    await db.refresh(order)
    
    return order

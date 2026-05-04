from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
import mercadopago

from app.database import get_db
from app.models import Order, Payment, PaymentStatus, User
from app.schemas import Payment as PaymentSchema
from app.core.config import settings
from app.api import deps

router = APIRouter()

# Configurar SDK de MercadoPago
sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN) if settings.MERCADOPAGO_ACCESS_TOKEN else None

@router.post("/create-preference/{order_id}", status_code=status.HTTP_200_OK)
async def create_preference(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    # Descomentar la siguiente linea si la pasarela se usa solo logueado:
    # current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Crea una preferencia en MercadoPago para un pedido específico y devuelve la URL de pago.
    """
    if not sdk:
        raise HTTPException(status_code=500, detail="MercadoPago no está configurado.")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
        
    # Obtener el servicio para armar el item
    await db.refresh(order, ["service", "client"])

    preference_data = {
        "items": [
            {
                "title": order.service.name,
                "quantity": 1,
                "unit_price": float(order.total_amount),
            }
        ],
        "payer": {
            "name": order.client.first_name,
            "surname": order.client.last_name,
            "email": order.client.email,
        },
        "back_urls": {
            "success": "http://localhost:3000/success", # Cambiar por frontend
            "failure": "http://localhost:3000/failure",
            "pending": "http://localhost:3000/pending"
        },
        "auto_return": "approved",
        "external_reference": str(order.id),
        # notification_url es donde MP hará POST cuando cambie el estado
        "notification_url": "https://mi-dominio-ngrok.com/api/v1/payments/webhook" 
    }

    preference_response = sdk.preference().create(preference_data)
    
    if preference_response.get('status') != 201:
        raise HTTPException(status_code=500, detail="Error al crear preferencia en MercadoPago.")
        
    return {
        "preference_id": preference_response["response"]["id"],
        "init_point": preference_response["response"]["init_point"]
    }


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def mercadopago_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Recibe notificaciones asíncronas desde MercadoPago (IPN/Webhooks).
    """
    payload = await request.json()
    
    # Manejar confirmación de pago
    if payload.get("type") == "payment":
        payment_id = payload["data"]["id"]
        
        # Consultar la API de MP para ver el estado real del pago
        payment_info = sdk.payment().get(payment_id)
        
        if payment_info["status"] == 200:
            payment_data = payment_info["response"]
            external_reference = payment_data.get("external_reference") # order_id
            payment_status_str = payment_data.get("status") # 'approved', 'rejected', etc.
            
            if not external_reference:
                return {"status": "ignored, no external reference"}
                
            # Mapear estado
            status_map = {
                "approved": PaymentStatus.approved,
                "rejected": PaymentStatus.rejected,
                "pending": PaymentStatus.pending,
                "in_process": PaymentStatus.pending
            }
            mapped_status = status_map.get(payment_status_str, PaymentStatus.pending)
            
            # Buscar el payment en la DB o crearlo
            result = await db.execute(select(Payment).where(Payment.order_id == external_reference))
            db_payment = result.scalars().first()
            
            if db_payment:
                db_payment.status = mapped_status
                db_payment.mercadopago_id = str(payment_id)
            else:
                db_payment = Payment(
                    order_id=external_reference,
                    mercadopago_id=str(payment_id),
                    status=mapped_status,
                    amount=payment_data.get("transaction_amount"),
                    payment_method=payment_data.get("payment_method_id")
                )
                db.add(db_payment)
                
            await db.commit()
            
            # TODO: Notificar por email (Node.js) al cliente que el pago fue aprobado
            
    return {"status": "ok"}

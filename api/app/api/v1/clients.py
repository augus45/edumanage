import asyncio
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.database import get_db
from app.models import Client, User
from app.schemas import Client as ClientSchema, ClientCreate, ClientUpdate
from app.api import deps
from app.core.config import settings

router = APIRouter()

# --- BACKGROUND TASKS ---
async def sync_client_to_crm(client_id: UUID, email: str, name: str):
    """
    Simula la sincronización asíncrona de un cliente hacia un CRM (ej. HubSpot).
    Se reintenta en caso de fallos.
    """
    print(f"[{client_id}] INICIANDO sincronización con CRM: {settings.CRM_API_URL}...")
    await asyncio.sleep(2) # Simular latencia de red
    
    # En un entorno real se haría un request HTTP usando httpx
    # try:
    #     async with httpx.AsyncClient() as client:
    #         response = await client.post(...)
    # ...
    print(f"[{client_id}] Cliente {name} ({email}) sincronizado exitosamente con el CRM.")

# --- ENDPOINTS ---

@router.post("/", response_model=ClientSchema, status_code=status.HTTP_201_CREATED)
async def create_client(
    *,
    db: AsyncSession = Depends(get_db),
    client_in: ClientCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Crear nuevo cliente. Dispara sincronización asíncrona con el CRM.
    """
    result = await db.execute(select(Client).where(Client.email == client_in.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Ya existe un cliente con este email.",
        )
    
    client_obj = Client(
        user_id=current_user.id,
        first_name=client_in.first_name,
        last_name=client_in.last_name,
        email=client_in.email,
        phone=client_in.phone
    )
    db.add(client_obj)
    await db.commit()
    await db.refresh(client_obj)
    
    # Agregar tarea en background para no bloquear el request
    background_tasks.add_task(
        sync_client_to_crm, 
        client_obj.id, 
        client_obj.email, 
        f"{client_obj.first_name} {client_obj.last_name}"
    )
    
    return client_obj

@router.get("/", response_model=List[ClientSchema])
async def read_clients(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Obtener la lista de clientes.
    """
    result = await db.execute(select(Client).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{client_id}", response_model=ClientSchema)
async def read_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Obtener detalles de un cliente específico.
    """
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client

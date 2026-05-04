from typing import Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID
from app.models import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.agent

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class User(UserBase):
    id: UUID
    
    class Config:
        from_attributes = True

# --- CLIENT SCHEMAS ---

class ClientBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None

class Client(ClientBase):
    id: UUID
    user_id: Optional[UUID] = None
    crm_id: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- SERVICE SCHEMAS ---

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    is_active: bool = True

class ServiceCreate(ServiceBase):
    pass

class Service(ServiceBase):
    id: UUID
    
    class Config:
        from_attributes = True

# --- ORDER SCHEMAS ---
from app.models import OrderStatus

class OrderBase(BaseModel):
    client_id: UUID
    service_id: UUID

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    status: OrderStatus

class Order(OrderBase):
    id: UUID
    status: OrderStatus
    total_amount: float
    
    class Config:
        from_attributes = True

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import logging
from app.core.config import settings
from app.api.router import api_router
from app.core.cache import init_redis, close_redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configurar Structlog
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
    )
    log = structlog.get_logger()
    log.info("Starting EduManage API...")
    
    await init_redis()
    yield
    await close_redis()
    log.info("Shutting down EduManage API...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API robusta para la gestión de servicios académicos y asesorías",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8080",
    # Añadir dominios permitidos (ej. el WordPress de la empresa)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "service": settings.PROJECT_NAME
    }

# 🎓 EduManage Backend Platform

![Python](https://img.shields.io/badge/python-3.12-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688.svg?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-316192.svg?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?logo=redis)
![NodeJS](https://img.shields.io/badge/Node.js-20-339933.svg?logo=node.js)
![CI](https://github.com/augustoacuna/edumanage/actions/workflows/ci.yml/badge.svg)

EduManage es una plataforma backend de grado empresarial diseñada para gestionar servicios académicos, tutorías y consultorías. Este sistema robusto integra una API core en Python, microservicios en Node.js, procesamiento de pagos con MercadoPago, y está preparado para despliegues modernos.

## 🌟 Arquitectura del Sistema

El sistema implementa un enfoque de microservicios ligero (*SOA*), donde la lógica de negocio se concentra en FastAPI y las tareas delegables (I/O pesadas como emails) se derivan a servicios especializados.

- **Core API (FastAPI):** Rutas, JWT Auth, Máquina de estados de pedidos.
- **Cache & Rate Limiting (Redis):** Caché de catálogo de servicios (Cache-Aside pattern) logrando tiempos de respuesta de ~1ms.
- **Notificaciones (Node.js/Express):** Microservicio dedicado para el despacho asíncrono de emails.
- **Pagos (MercadoPago):** Integración nativa mediante Webhooks (IPN).
- **Cliente (WordPress):** Un plugin demostrativo que consume la API desde el Frontend usando JS Vainilla.

## 🚀 Instalación Rápida (Docker)

La manera más rápida de levantar toda la infraestructura (Base de datos, Caché, Microservicios y API) es utilizando Docker Compose.

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/edumanage.git
cd edumanage

# 2. Configurar variables de entorno
cp api/.env.example api/.env
# Editar api/.env con tu Access Token de MercadoPago y un SECRET_KEY seguro

# 3. Levantar la infraestructura
docker-compose up -d --build

# 4. Correr las migraciones de Base de Datos
docker-compose exec api alembic upgrade head
```

La API estará disponible en `http://localhost:8001` y la documentación interactiva en `http://localhost:8001/docs`.

## Frontend demo

El repositorio incluye una interfaz React en `frontend/` pensada para mostrar EduManage como demo navegable desde portfolio.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Por defecto el frontend consume `http://localhost:8001/api/v1`, que es el puerto publicado por `docker-compose.yml`.
Desde la demo se puede crear un usuario agente, iniciar sesión, cargar servicios académicos, registrar clientes, crear pedidos y actualizar estados.

## 🧪 Testing y CI/CD

El proyecto cuenta con una robusta suite de pruebas unitarias implementadas con **Pytest** y **pytest-asyncio**, utilizando SQLite in-memory para ejecuciones ultrarrápidas y *mocks* para anular dependencias de red durante CI.

Para correr los tests localmente:
```bash
cd api
pytest
```

Se incluye un pipeline de **GitHub Actions** (`.github/workflows/ci.yml`) que verifica el linting (`flake8`) y corre la suite de pruebas automáticamente en cada Pull Request a `main`.

## 📈 Decisiones Técnicas Destacadas

1. **Async nativo:** Al usar FastAPI + `asyncpg` + `httpx`, la API puede manejar miles de conexiones concurrentes sin bloquear hilos del procesador.
2. **Background Tasks & Microservicios:** La sincronización con CRM y el envío de notificaciones ocurren en procesos paralelos, asegurando que el cliente/frontend obtenga respuesta inmediata.
3. **Logs Estructurados:** Implementación de `structlog` generando logs en formato JSON listos para ser ingeridos por sistemas como ELK/Datadog.

---
**Desarrollado por [Augusto Acuña]**  
*Junior Backend Developer enfocado en arquitecturas escalables.*

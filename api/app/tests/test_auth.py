import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_user(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/users/",
        json={
            "email": "test@example.com",
            "password": "strongpassword123",
            "role": "agent"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_user_duplicate_email(async_client: AsyncClient):
    # Ya existe del test anterior
    response = await async_client.post(
        "/api/v1/users/",
        json={
            "email": "test@example.com",
            "password": "anotherpassword",
            "role": "admin"
        }
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "strongpassword123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_failure(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401

import os
from datetime import datetime, timedelta, timezone

import jwt

from tests.helpers import login, run

REGISTER = {"username": "drlong", "full_name": "Dr Long"}


def test_register_rejects_passwords_over_72_bytes(client):
    assert client.post("/api/auth/register", json={**REGISTER, "password": "a" * 73}).status_code == 422
    # counted in bytes: 37 two-byte characters = 74 bytes
    assert client.post("/api/auth/register", json={**REGISTER, "password": "é" * 37}).status_code == 422
    assert client.post("/api/auth/register", json={**REGISTER, "password": "a" * 72}).status_code == 200


def test_login_with_over_long_password_is_401_not_500(client):
    login(client, "drlong", "a" * 72)
    r = client.post("/api/auth/login", json={"username": "drlong", "password": "a" * 100})
    assert r.status_code == 401
    assert r.json()["detail"]["msg"] == "Invalid username or password"


def test_wrong_password_and_unknown_user_get_the_same_answer(client):
    login(client)
    wrong = client.post("/api/auth/login", json={"username": "drtest", "password": "wrong"})
    unknown = client.post("/api/auth/login", json={"username": "nobody", "password": "x"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_open_signup_always_creates_a_doctor_with_a_unique_username(client, db):
    body = {"username": "drnew", "password": "secret123", "full_name": "Dr New"}
    r = client.post("/api/auth/register", json={**body, "role": "Admin"})  # no code needed
    assert r.status_code == 200
    assert run(db.users.find_one({"username": "drnew"}))["role"] == "Doctor"  # role never taken from the request
    assert client.post("/api/auth/register", json=body).status_code == 409
    # an older client that still sends signup_code is accepted (the field is ignored)
    old_client = {"username": "drold", "password": "secret123", "full_name": "Dr Old", "signup_code": "anything"}
    assert client.post("/api/auth/register", json=old_client).status_code == 200


def test_protected_routes_reject_missing_expired_and_forged_tokens(client):
    assert client.get("/api/patients").status_code == 401
    assert client.get("/api/patients", headers={"Authorization": "Bearer garbage"}).status_code == 401

    expired = jwt.encode({"sub": "x", "role": "Admin", "exp": datetime.now(timezone.utc) - timedelta(seconds=5)},
                         os.environ["JWT_SECRET"], algorithm="HS256")
    r = client.get("/api/patients", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401 and r.json()["detail"] == "Token has expired"

    forged = jwt.encode({"sub": "x", "role": "Admin"}, "not-the-server-secret-0123456789abcdef", algorithm="HS256")
    assert client.get("/api/patients", headers={"Authorization": f"Bearer {forged}"}).status_code == 401

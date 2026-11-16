import asyncio

import app.database as database


def run(coro):
    """Run one mock-database call from synchronous test code."""
    return asyncio.run(coro)


def booking(**overrides) -> dict:
    """A valid public booking form submission."""
    body = {
        "full_name": "Priya Sharma", "phone": "9123456789", "email": "priya@example.com",
        "age": 29, "gender": "Female", "address": "MG Road", "consultation_type": "online",
        "treatment": "PRP Therapy", "preferred_date": "2026-12-01", "message": "Hair fall",
    }
    body.update(overrides)
    return body


def login(client, username="drtest", password="secret123", admin=False) -> dict:
    """Registers the user if needed and returns an Authorization header."""
    r = client.post("/api/auth/register", json={
        "username": username, "password": password, "full_name": "Dr Test"})
    assert r.status_code in (200, 409), r.text
    if admin:
        run(database.db.users.update_one({"username": username}, {"$set": {"role": "Admin"}}))
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def register_patient(client, headers, **overrides) -> dict:
    body = {"full_name": "Asha Verma", "whatsapp": "9000000001", "age": 40, "gender": "Female",
            "treatment": "Cupping", "patient_type": "offline"}
    body.update(overrides)
    r = client.post("/api/patients", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()

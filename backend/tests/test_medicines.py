import pytest

from tests.helpers import login

MISSING_ID = "0123456789abcdef01234567"


def test_medicine_catalogue_crud(client):
    headers = login(client)
    r = client.post("/api/medicines", json={"name": "Minoxidil 5%", "price": 499.5, "description": "Topical"}, headers=headers)
    assert r.status_code == 200
    mid = r.json()["_id"]

    assert client.put(f"/api/medicines/{mid}", json={"name": "Minoxidil 2%", "description": ""}, headers=headers).status_code == 200
    medicine = next(m for m in client.get("/api/medicines", headers=headers).json()["medicines"] if m["_id"] == mid)
    assert medicine["name"] == "Minoxidil 2%" and medicine["price"] == 499.5 and medicine["description"] == ""

    assert client.delete(f"/api/medicines/{mid}", headers=headers).status_code == 200
    assert client.delete(f"/api/medicines/{mid}", headers=headers).status_code == 404
    assert client.get("/api/medicines").status_code == 401


@pytest.mark.parametrize("bad", [{"price": -5}, {"stock": -1}, {"name": "B"}])
def test_medicine_validation(client, bad):
    headers = login(client)
    assert client.post("/api/medicines", json={"name": "Biotin", **bad}, headers=headers).status_code == 422


def test_medicine_update_errors(client):
    headers = login(client)
    mid = client.post("/api/medicines", json={"name": "Biotin", "price": 250}, headers=headers).json()["_id"]
    assert client.put(f"/api/medicines/{mid}", json={"price": -1}, headers=headers).status_code == 422
    assert client.put(f"/api/medicines/{MISSING_ID}", json={"price": 1}, headers=headers).status_code == 404
    assert client.put(f"/api/medicines/{MISSING_ID}", json={}, headers=headers).status_code == 404  # even with no changes
    assert client.put(f"/api/medicines/{mid}", json={}, headers=headers).status_code == 200
    assert client.put("/api/medicines/not-an-id", json={}, headers=headers).status_code == 400

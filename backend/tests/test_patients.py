"""Patient records: registration, search, visits, dispatch, deletion and the thank-you email."""
import pytest

from tests.helpers import login, register_patient, run

CATALOGUE_ENTRY = {"_id": "6650f0aa0000000000000001", "name": "Biotin", "price": 250, "type": "tablet",
                   "composition": "Biotin 10mg", "description": "", "stock": 10}


def test_registration_creates_visit_one_and_sequential_ids(client, dpms_db):
    headers = login(client)
    first = register_patient(client, headers, whatsapp="9000000101", medicines=[CATALOGUE_ENTRY],
                             blood_tests=["Vitamin B12"], patient_type="online",
                             payment_datetime="2026-11-10T10:00", amount_paid="1500")
    second = register_patient(client, headers, whatsapp="9000000102")
    assert first["patient_id"].startswith("PT-")
    assert int(second["patient_id"][3:]) == int(first["patient_id"][3:]) + 1

    visit = first["visits"][0]
    assert visit["amount_paid"] == 1500.0 and visit["blood_tests"] == ["Vitamin B12"]
    assert visit["medicines"][0] == {**CATALOGUE_ENTRY, "price": 250.0}  # catalogue fields kept
    assert visit["next_visit"]  # backend default, unchanged
    stored = run(dpms_db.patients.find_one({"patient_id": first["patient_id"]}))
    assert stored["visits"][0]["medicines"][0]["_id"] == CATALOGUE_ENTRY["_id"]


def test_duplicate_whatsapp_returns_the_existing_patient(client):
    headers = login(client)
    existing = register_patient(client, headers, whatsapp="9777777777")
    r = client.post("/api/patients", headers=headers, json={
        "full_name": "Someone", "whatsapp": "9777777777", "age": 30, "gender": "Male", "treatment": "Cupping"})
    assert r.status_code == 409
    assert r.json()["detail"] == {"duplicate": True, "msg": "Patient already exists", "patient_id": existing["patient_id"]}


@pytest.mark.parametrize("bad", [{"price": 10}, {"name": "X", "price": -1}, {"name": "X", "price": "abc"}, "Biotin"])
def test_visit_rejects_malformed_medicine_lines(client, bad):
    headers = login(client)
    patient = register_patient(client, headers)
    r = client.put(f"/api/patients/{patient['patient_id']}", json={"visit": {"treatment": "PRP", "medicines": [bad]}}, headers=headers)
    assert r.status_code == 422


def test_search_treats_terms_as_plain_text(client):
    headers = login(client)
    register_patient(client, headers, full_name="Rahul (Jr) Mehta", whatsapp="9000000201")
    register_patient(client, headers, full_name="Abc Kumar", whatsapp="9000000202")
    for term in ["(", "[", "*", "+", "\\", "(Jr)"]:
        assert client.get("/api/patients", params={"name": term}, headers=headers).status_code == 200, term

    def names(**params):
        return [p["full_name"] for p in client.get("/api/patients", params=params, headers=headers).json()["items"]]

    assert names(name="(jr)") == ["Rahul (Jr) Mehta"]  # case-insensitive "contains"
    assert names(name="a.c") == []                      # "." is not a wildcard
    assert names(whatsapp="0202") == ["Abc Kumar"]
    assert client.get("/api/patients", params={"whatsapp": "+91(", "patient_id": "PT-("}, headers=headers).status_code == 200


def test_edit_details_add_visit_and_dispatch(client):
    headers = login(client)
    pid = register_patient(client, headers, patient_type="online")["patient_id"]

    r = client.put(f"/api/patients/{pid}", json={"address": "New address", "age": ""}, headers=headers)
    assert r.status_code == 200 and r.json()["address"] == "New address"

    visits = client.put(f"/api/patients/{pid}", json={"visit": {"treatment": "PRP Therapy", "amount_paid": ""}}, headers=headers).json()["visits"]
    assert len(visits) == 2 and visits[1]["treatment"] == "PRP Therapy"

    r = client.patch(f"/api/patients/{pid}/visit-dispatch", headers=headers,
                     json={"visit_id": visits[1]["visit_id"], "dispatch_date": "2026-11-12", "tracking_id": "TRK1"})
    assert r.status_code == 200
    stored = client.get(f"/api/patients/{pid}", headers=headers).json()["visits"]
    assert stored[1]["tracking_id"] == "TRK1" and stored[0].get("tracking_id") in (None, "")
    assert client.patch(f"/api/patients/{pid}/visit-dispatch", json={"visit_id": "nope"}, headers=headers).status_code == 404


def test_only_an_admin_can_delete_a_patient(client):
    doctor = login(client)
    admin = login(client, "admin1", admin=True)
    pid = register_patient(client, doctor)["patient_id"]
    assert client.delete(f"/api/patients/{pid}", headers=doctor).status_code == 403
    assert client.delete(f"/api/patients/{pid}", headers=admin).status_code == 200
    assert client.get(f"/api/patients/{pid}", headers=doctor).status_code == 404
    assert client.delete(f"/api/patients/{pid}", headers=admin).status_code == 404


def test_thank_you_email(client, sent_emails):
    headers = login(client)
    body = {"phone": "9123456789", "email": "asha@example.com", "name": "Asha <b>", "treatment": "Cupping", "next_visit": None}
    r = client.post("/api/notify/post-visit", json=body, headers=headers)  # "phone" from older clients is ignored
    assert r.status_code == 200
    assert [m["to"] for m in sent_emails] == ["asha@example.com"]
    assert "Asha &lt;b&gt;" in sent_emails[0]["html"]
    assert "next visit" not in sent_emails[0]["html"].lower()  # the automatic date is never announced
    assert client.post("/api/notify/post-visit", json=body).status_code == 401

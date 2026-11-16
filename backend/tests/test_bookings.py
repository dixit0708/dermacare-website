"""Public booking (POST /api/appointments) and the clinic's appointment updates."""
import logging

import pytest

from app import rate_limit
from app.config import BOOKINGS_PER_IP_PER_HOUR
from tests.helpers import booking, login, register_patient, run


@pytest.mark.parametrize("bad", [
    {"consultation_type": "teleport"}, {"age": -1}, {"age": 121}, {"address": "x" * 501},
    {"preferred_date": "next tuesday"}, {"preferred_date": "2026-13-45"}, {"full_name": "A"},
])
def test_booking_rejects_invalid_input(client, bad):
    assert client.post("/api/appointments", json=booking(**bad)).status_code == 422


@pytest.mark.parametrize("ok", [
    {"preferred_date": ""}, {"preferred_date": None}, {"preferred_date": "2026-12-01T10:30"},
    {"consultation_type": "walk_in"}, {"email": None},
])
def test_booking_accepts_valid_variants(client, ok):
    assert client.post("/api/appointments", json=booking(**ok)).status_code == 200


def test_booking_is_stored_in_both_databases(client, db, dpms_db):
    r = client.post("/api/appointments", json=booking())
    assert r.status_code == 200
    assert run(db.appointments.count_documents({"id": r.json()["id"]})) == 1
    clinic_copy = run(dpms_db.appointments.find_one({"phone": "9123456789"}))
    assert clinic_copy["status"] == "New" and clinic_copy["source"] == "Website" and clinic_copy["patient_id"] == ""
    assert clinic_copy["date_time"] == "2026-12-01"


def test_confirmation_email_is_sent_and_address_masked_in_logs(client, sent_emails, caplog):
    caplog.set_level(logging.INFO)
    r = client.post("/api/appointments", json=booking(email="priya.sharma@example.com", full_name="Priya <b>"))
    assert r.status_code == 200
    assert [m["to"] for m in sent_emails] == ["priya.sharma@example.com"]
    email = sent_emails[0]
    assert "Booking ref" in email["text"] and "9123456789" in email["text"]
    assert "Priya &lt;b&gt;" in email["html"]  # typed by the public, so escaped
    assert "priya.sharma@example.com" not in caplog.text
    assert "p***@example.com" in caplog.text


def test_no_email_address_means_no_email(client, sent_emails):
    assert client.post("/api/appointments", json=booking(email=None)).status_code == 200
    assert sent_emails == []


def test_booking_rate_limit_per_ip(client, sent_emails, db, dpms_db):
    for i in range(BOOKINGS_PER_IP_PER_HOUR):
        r = client.post("/api/appointments", json=booking(email=f"u{i}@example.com", phone=f"94000000{i:02d}"))
        assert r.status_code == 200, r.text
    sent_before = len(sent_emails)

    r = client.post("/api/appointments", json=booking(email="extra@example.com", phone="9499999999"))
    assert r.status_code == 429
    assert r.json()["detail"]["msg"].startswith("Too many booking requests")
    assert 1 <= int(r.headers["Retry-After"]) <= 3600
    assert len(sent_emails) == sent_before                               # no email for a rejected booking
    assert run(dpms_db.appointments.count_documents({"phone": "9499999999"})) == 0  # nothing stored

    keys = [d["_id"] for d in run(db.rate_limits.find().to_list(None))]
    assert keys and not any("testclient" in k or "@" in k for k in keys)  # hashed, never raw IP/email


def test_rate_limit_counts_per_scope_and_identity(db):
    for _ in range(3):
        assert run(rate_limit.hit("booking-email", "victim@example.com", 3, 86400)) is None
    assert run(rate_limit.hit("booking-email", "victim@example.com", 3, 86400)) > 0
    assert run(rate_limit.hit("booking-email", "other@example.com", 3, 86400)) is None
    assert run(rate_limit.hit("booking-ip", "victim@example.com", 3, 86400)) is None
    assert "expires_at" in run(db.rate_limits.find_one({}))
    indexes = run(db.rate_limits.index_information())
    assert any(ix.get("expireAfterSeconds") == 0 for ix in indexes.values())  # MongoDB deletes old counters


def test_returning_patient_is_linked_but_not_changed_by_the_public_request(client, dpms_db):
    headers = login(client)
    patient = register_patient(client, headers, full_name="Kiran Rao", whatsapp="9555555555", patient_type="offline")

    r = client.post("/api/appointments", json=booking(full_name="kiran rao", phone="9555555555", consultation_type="online"))
    assert r.status_code == 200
    appt = run(dpms_db.appointments.find_one({"phone": "9555555555"}))
    assert appt["source"] == "Existing Patient Booking" and appt["patient_id"] == patient["patient_id"]
    assert run(dpms_db.patients.find_one({"patient_id": patient["patient_id"]}))["patient_type"] == "offline"

    # A logged-in doctor starting the consultation is what updates the type.
    assert client.put(f"/api/appointments/{appt['_id']}", json={"status": "Consultation Started"}).status_code == 401
    assert client.put(f"/api/appointments/{appt['_id']}", json={"status": "Consultation Started"}, headers=headers).status_code == 200
    assert run(dpms_db.patients.find_one({"patient_id": patient["patient_id"]}))["patient_type"] == "online"
    assert run(dpms_db.appointments.find_one({"_id": appt["_id"]}))["status"] == "Consultation Started"


def test_linking_a_newly_registered_patient_keeps_the_doctors_choice(client, dpms_db):
    headers = login(client)
    client.post("/api/appointments", json=booking(full_name="Meera Iyer", phone="9666666666", consultation_type="walk_in"))
    appt = run(dpms_db.appointments.find_one({"phone": "9666666666"}))
    assert appt["source"] == "Website"
    patient = register_patient(client, headers, full_name="Meera Iyer", whatsapp="9666666666", patient_type="online")

    r = client.put(f"/api/appointments/{appt['_id']}", headers=headers, json={
        "patient_id": patient["patient_id"], "status": "Consultation Started", "source": "Registered from Website"})
    assert r.status_code == 200
    assert run(dpms_db.patients.find_one({"patient_id": patient["patient_id"]}))["patient_type"] == "online"


def test_appointment_update_errors(client):
    headers = login(client)
    assert client.put("/api/appointments/0123456789abcdef01234567", json={"status": "Completed"}, headers=headers).status_code == 404
    assert client.put("/api/appointments/not-an-id", json={"status": "Completed"}, headers=headers).status_code == 400
    client.post("/api/appointments", json=booking())
    appt_id = client.get("/api/appointments", headers=headers).json()["items"][0]["_id"]
    assert client.put(f"/api/appointments/{appt_id}", json={"status": "Bogus"}, headers=headers).status_code == 422
    assert client.put(f"/api/appointments/{appt_id}", json={"therapist": "x"}, headers=headers).json() == {"ok": True}  # unknown fields ignored


def test_appointment_list_filters_by_source(client):
    headers = login(client)
    register_patient(client, headers, full_name="Old Patient", whatsapp="9777000000")
    client.post("/api/appointments", json=booking(full_name="Old Patient", phone="9777000000"))
    client.post("/api/appointments", json=booking(full_name="New Person", phone="9777000001"))

    def names_from(source):
        items = client.get("/api/appointments", params={"source": source}, headers=headers).json()["items"]
        return [a["patient_name"] for a in items]

    assert names_from("Website") == ["New Person"]
    assert names_from("Existing Patient Booking") == ["Old Patient"]

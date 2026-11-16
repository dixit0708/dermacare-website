"""App-level checks: routing, CORS, discontinued SMS code, and frontend/backend constants."""
import pathlib
import re
import typing

from starlette.middleware.cors import CORSMiddleware

import server
from app.models import AppointmentUpdate
from app.routes import appointments
from tests.conftest import BLOCKED_CONNECTIONS
from tests.helpers import booking

BACKEND = pathlib.Path(server.__file__).parent
FRONTEND = BACKEND.parent / "frontend"


def test_site_admin_and_api_are_served_from_one_origin(client):
    r = client.get("/")
    assert r.status_code == 200 and 'id="booking-form"' in r.text
    for path in ["/admin", "/admin/", "/admin/patients/PT-00001", "/admin/website-appointments"]:
        r = client.get(path)  # every admin URL returns the app shell; the router takes it from there
        assert r.status_code == 200 and '<script type="module" src="/admin/js/main.js">' in r.text, path
    for path, kind in [("/admin/js/main.js", "javascript"), ("/admin/js/views/patientDetail/historyTab.js", "javascript"),
                       ("/assets/js/site.js", "javascript"), ("/assets/css/site.css", "css"), ("/admin/assets/admin.css", "css")]:
        r = client.get(path)
        assert r.status_code == 200 and kind in r.headers["content-type"], path
    assert client.get("/api/health").json() == {"status": "healthy"}
    assert client.get("/api/does-not-exist").status_code == 404


def test_files_outside_the_frontend_are_not_served(client):
    for path in ["/.env", "/../backend/.env", "/backend/.env", "/admin/js/components/calendar.js"]:
        assert client.get(path).status_code == 404, path


def test_no_cors_headers_for_other_origins(client):
    assert not any(m.cls is CORSMiddleware for m in server.app.user_middleware)
    r = client.options("/api/appointments", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers
    assert client.post("/api/appointments", json=booking(email=None)).status_code == 200  # same-origin use is unaffected


def test_no_sms_integration_remains():
    hits = []
    for f in [*BACKEND.glob("app/**/*.py"), BACKEND / "server.py", BACKEND / "requirements.txt"]:
        for no, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if re.search(r"msg91|send_sms|\bsms\b|httpx", line, re.I):
                hits.append(f"{f.name}:{no}: {line.strip()}")
    # the one allowed mention explains why an old client's "phone" field is ignored
    assert all("removed SMS feature" in h for h in hits), hits
    assert not (BACKEND / "app" / "services" / "sms.py").exists()


def test_frontend_appointment_constants_match_the_backend():
    js = (FRONTEND / "admin" / "js" / "constants.js").read_text(encoding="utf-8")

    def js_values(name):
        block = re.search(rf"{name} = Object\.freeze\(\{{(.*?)\}}\)", js, re.S).group(1)
        return set(re.findall(r':\s*"([^"]+)"', block))

    statuses = set(typing.get_args(typing.get_args(AppointmentUpdate.model_fields["status"].annotation)[0]))
    assert js_values("APPOINTMENT_STATUS") == statuses
    assert {appointments.SOURCE_NEW_PATIENT, appointments.SOURCE_RETURNING_PATIENT} <= js_values("APPOINTMENT_SOURCE")


def test_network_guard_blocks_outside_connections():
    # The guard itself (see conftest): outside hosts fail, and are recorded so the
    # session-level check can report them. This test removes its own record.
    import socket
    s = socket.socket()
    try:
        s.connect(("203.0.113.1", 25))  # TEST-NET-3 documentation address
        raise AssertionError("connection was not blocked")
    except RuntimeError as e:
        assert "blocked" in str(e)
    finally:
        s.close()
        BLOCKED_CONNECTIONS.remove(("203.0.113.1", 25))

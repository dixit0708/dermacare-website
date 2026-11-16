"""Starts the real app with uvicorn in a subprocess, with no database or mail server.

The subprocess gets its own environment (an unused local MongoDB port, blank SMTP
settings), which takes precedence over backend/.env, so nothing real is contacted.
"""
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

import pytest

from tests.helpers import booking

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _request(port, path, data=None):
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", data=data,
                                 headers={"Content-Type": "application/json"} if data else {})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


@pytest.fixture(scope="module")
def server_port():
    port = _free_port()
    env = {**os.environ, "MONGO_URL": "mongodb://127.0.0.1:9", "DB_NAME": "startup_test", "DPMS_DB_NAME": "startup_test",
           "JWT_SECRET": "startup-test-secret-0123456789abcdef", "SMTP_USER": "", "SMTP_PASSWORD": ""}
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", str(port)],
                            cwd=BACKEND, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        deadline = time.time() + 60  # startup waits ~10s for the (absent) database before giving up on indexes
        while time.time() < deadline:
            if proc.poll() is not None:
                pytest.fail(f"uvicorn exited:\n{proc.stdout.read()}")
            try:
                if _request(port, "/api/health")[0] == 200:
                    break
            except OSError:
                time.sleep(0.5)
        else:
            pytest.fail("uvicorn did not start within 60s")
        yield port
    finally:
        proc.terminate()
        proc.wait(timeout=20)


@pytest.mark.parametrize("path,status,needle", [
    ("/", 200, 'id="booking-form"'),
    ("/admin/patients/PT-00001", 200, "/admin/js/main.js"),
    ("/admin/js/views/patientDetail.js", 200, "renderHistoryTab"),
    ("/api/health", 200, "healthy"),
    ("/api/patients", 401, "Missing or invalid token"),
])
def test_uvicorn_serves_the_app(server_port, path, status, needle):
    got_status, body = _request(server_port, path)
    assert got_status == status and needle in body


def test_booking_without_a_database_fails_cleanly(server_port):
    import json
    status, body = _request(server_port, "/api/appointments", data=json.dumps(booking(email=None)).encode())
    assert status == 503
    assert "Can't reach the database right now" in body and "Atlas" not in body

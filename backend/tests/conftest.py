"""Test setup. Runs before any app module is imported, so the app never sees real config.

Isolation guarantees:
- Environment variables are set first; python-dotenv never overrides them, so the
  Atlas URL and SMTP password in backend/.env are not used.
- MongoDB is replaced by mongomock (in memory). The real Motor client points at a
  closed local port and is never queried.
- SMTP delivery is replaced by a recorder; SMTP_HOST is also an unresolvable name.
- Outbound network connections fail (loopback is allowed: asyncio on Windows needs it).
"""
import os
import socket

import pytest

os.environ.update({
    "MONGO_URL": "mongodb://127.0.0.1:9",
    "DB_NAME": "test_site",
    "DPMS_DB_NAME": "test_dpms",
    "JWT_SECRET": "test-only-secret-0123456789abcdef0123",
    "SMTP_HOST": "smtp.invalid",
    "SMTP_USER": "clinic@example.test",
    "SMTP_PASSWORD": "not-a-real-password",
})

_real_connect = socket.socket.connect
BLOCKED_CONNECTIONS = []


def _guarded_connect(self, address):
    host = address[0] if isinstance(address, tuple) else address
    if host in ("127.0.0.1", "::1", "localhost"):
        return _real_connect(self, address)
    BLOCKED_CONNECTIONS.append(address)
    raise RuntimeError(f"network access is blocked in tests: {address}")


socket.socket.connect = _guarded_connect

from mongomock_motor import AsyncMongoMockClient  # noqa: E402

import app.database as database  # noqa: E402

_mock = AsyncMongoMockClient()
database.client = _mock
database.db = _mock["test_site"]
database.dpms_db = _mock["test_dpms"]

import app.services.email as email_service  # noqa: E402

SENT_EMAILS = []
email_service._send_smtp = lambda to, subject, html, text: SENT_EMAILS.append(
    {"to": to, "subject": subject, "html": html, "text": text}
)

import server  # noqa: E402  (route modules now hold the mock databases)
from app.config import MONGO_URL  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from tests.helpers import run  # noqa: E402

assert MONGO_URL == "mongodb://127.0.0.1:9", "real MONGO_URL leaked into tests"
assert server.db is database.db and server.dpms_db is database.dpms_db, "mock database not wired in"


@pytest.fixture(scope="session", autouse=True)
def no_outbound_connections():
    """Fails the run if any code tried to reach Atlas, SMTP, Cloudinary or anything else."""
    yield
    assert BLOCKED_CONNECTIONS == [], f"tests tried to reach the network: {BLOCKED_CONNECTIONS}"


@pytest.fixture(scope="session")
def client():
    with TestClient(server.app) as c:  # runs startup: index creation on the mock DB
        yield c


@pytest.fixture(autouse=True)
def clean_state(client):
    """Each test starts with empty collections (indexes kept) and no recorded emails."""
    for database_ in (database.db, database.dpms_db):
        for name in run(database_.list_collection_names()):
            run(database_[name].delete_many({}))
    SENT_EMAILS.clear()
    yield


@pytest.fixture
def db():
    return database.db


@pytest.fixture
def dpms_db():
    return database.dpms_db


@pytest.fixture
def sent_emails():
    return SENT_EMAILS

"""Fixed-window rate limiting with the counters stored in MongoDB.

The counters live in the database rather than in process memory so the limit still
holds if the API runs as several worker processes or on several machines.
"""
import hashlib
import time
from datetime import datetime, timezone
from typing import Optional

from pymongo import ReturnDocument

from app.database import db


async def ensure_indexes() -> None:
    # MongoDB's TTL monitor deletes each counter after its window has ended.
    await db.rate_limits.create_index("expires_at", expireAfterSeconds=0)


async def hit(scope: str, identity: str, limit: int, window_seconds: int) -> Optional[int]:
    """Count one request for `identity` (e.g. an IP address) in `scope`.

    Returns None while the caller is within `limit` requests per window, otherwise
    the number of seconds until the window resets (for a Retry-After header).
    """
    now = int(time.time())
    window_start = now - now % window_seconds
    window_end = window_start + window_seconds
    # Hashed, so raw IP addresses and emails are never stored.
    key = hashlib.sha256(f"{scope}:{identity}".encode()).hexdigest()

    # A single atomic upsert + $inc, so concurrent requests can't both slip under the limit.
    counter = await db.rate_limits.find_one_and_update(
        {"_id": f"{key}:{window_start}"},
        {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": datetime.fromtimestamp(window_end, timezone.utc)}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if counter["count"] > limit:
        return max(window_end - now, 1)
    return None

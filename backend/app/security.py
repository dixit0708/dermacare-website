from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException

from app.config import JWT_SECRET, JWT_ALGORITHM


def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """FastAPI dependency: reads the "Authorization: Bearer <token>" header and
    returns the token payload (sub, username, full_name, role), or responds 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Like get_current_user, but only lets users with the Admin role through."""
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only an admin can do this")
    return user

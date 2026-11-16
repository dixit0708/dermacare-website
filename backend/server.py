import logging
import os
from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse
from pymongo.errors import ConnectionFailure
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app import rate_limit
from app.database import db, dpms_db
from app.routes import auth, patients, appointments, medicines

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
ADMIN_DIR = os.path.join(FRONTEND_DIR, "admin")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Unique indexes stop two patients/users from ever getting the same ID or
    # username. Failing here (e.g. DB unreachable) shouldn't block startup.
    try:
        await dpms_db.patients.create_index("patient_id", unique=True)
        await db.users.create_index("username", unique=True)
        await rate_limit.ensure_indexes()
    except Exception as e:
        logger.warning("Could not create indexes: %s", e)
    yield

app = FastAPI(title="DermaCare API", lifespan=lifespan)


@app.exception_handler(ConnectionFailure)
async def db_unreachable(request: Request, exc: ConnectionFailure):
    # The hosting hint goes to the server log only; this response also reaches the public site.
    logger.error("Database unreachable (with Atlas, check Network Access / IP allowlist): %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": {"msg": "Can't reach the database right now. Please try again shortly."}},
    )

# No CORS middleware: the site, admin panel and API all share this one origin.
# If the frontend ever moves to another domain, add CORSMiddleware for that origin.

api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "DermaCare API", "status": "ok"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(patients.router, tags=["Patients"])
api_router.include_router(appointments.router, tags=["Appointments"])
api_router.include_router(medicines.router, tags=["Medicines"])

app.include_router(api_router)

# Mounted after the API router so /api/* is always matched first.
app.mount("/admin/assets", StaticFiles(directory=os.path.join(ADMIN_DIR, "assets")), name="admin-assets")
app.mount("/admin/js", StaticFiles(directory=os.path.join(ADMIN_DIR, "js")), name="admin-js")


@app.get("/admin")
@app.get("/admin/{full_path:path}")
async def serve_admin(full_path: str = ""):
    # Every /admin/... URL gets the app shell, so deep links work on refresh.
    return FileResponse(os.path.join(ADMIN_DIR, "index.html"))


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

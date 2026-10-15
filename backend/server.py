import logging
import os
from fastapi import FastAPI, APIRouter
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.services.scheduler import setup_scheduler
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
    # Startup
    scheduler = setup_scheduler()
    yield
    # Shutdown
    scheduler.shutdown()

app = FastAPI(title="DermaCare API", lifespan=lifespan)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://dermacare.in"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "DermaCare API", "status": "ok"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include routers
api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(patients.router, tags=["Patients"])
api_router.include_router(appointments.router, tags=["Appointments"])
api_router.include_router(medicines.router, tags=["Medicines"])

app.include_router(api_router)

# Serve the plain HTML/CSS/JS frontend (no separate Node/Vite process needed).
# Mounted after the API router so /api/* is always matched first.
app.mount("/admin/assets", StaticFiles(directory=os.path.join(ADMIN_DIR, "assets")), name="admin-assets")
app.mount("/admin/js", StaticFiles(directory=os.path.join(ADMIN_DIR, "js")), name="admin-js")


@app.get("/admin")
@app.get("/admin/{full_path:path}")
async def serve_admin(full_path: str = ""):
    # SPA shell fallback so deep links (e.g. /admin/patients/PT-00001) loaded
    # directly also resolve to the admin app, which does its own client-side routing.
    return FileResponse(os.path.join(ADMIN_DIR, "index.html"))


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

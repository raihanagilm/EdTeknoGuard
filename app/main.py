import sys
from pathlib import Path

# Pastikan root proyek masuk ke sys.path agar aman dijalankan langsung (python app/main.py atau Run VS Code)
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.services.scheduler_service import scheduler
from app.modules.auth.routes import router as auth_router
from app.modules.dashboard.routes import router as dashboard_router
from app.modules.monitoring.routes import router as monitoring_router
from app.modules.customers.routes import router as customers_router
from app.modules.telegram_mgmt.routes import router as telegram_router
from app.modules.logs_mgmt.routes import router as logs_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Memulai {settings.APP_NAME}...")
    # Mulai scheduler background pemantau 5 menit
    scheduler.start()
    yield
    logger.info(f"Menghentikan {settings.APP_NAME}...")

app = FastAPI(
    title=settings.APP_NAME,
    description="Sistem Deteksi Dini & Monitoring Kualitas Jaringan ONT/Modem ISP",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handler untuk Redirect Auth (HTTP 303)
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 303 and exc.headers and "Location" in exc.headers:
        return RedirectResponse(url=exc.headers["Location"], status_code=303)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

# Mount folder static
app.mount("/static", StaticFiles(directory="static"), name="static")

# Registrasi Router
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(monitoring_router)
app.include_router(customers_router)
app.include_router(telegram_router)
app.include_router(logs_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.APP_PORT, reload=True)


import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.init_db import init_db
from app.services.market_worker import market_worker_loop
from app.routers import auth, profile, market, trading, bank, ai


# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development simulation
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(profile.router, prefix=settings.API_V1_STR)
app.include_router(market.router, prefix=settings.API_V1_STR)
app.include_router(trading.router, prefix=settings.API_V1_STR)
app.include_router(bank.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)

background_tasks = set()


@app.on_event("startup")
async def startup_event():
    logger.info("Initializing FinLit Sim application...")
    # Initialize DB (creates tables & seeds 2026 holidays if needed)
    init_db()
    
    # Start market data background worker
    loop = asyncio.get_event_loop()
    task = loop.create_task(market_worker_loop())
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)
    logger.info("Background market worker loop started.")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the FinLit Sim FastAPI Backend API",
        "version": "1.0.0"
    }

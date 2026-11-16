from fastapi import FastAPI
from app.routers import health, catalogue, sync

app = FastAPI(title="BrainArena Solo API", version="0.1.0")
app.include_router(health.router, prefix="/v1")
app.include_router(catalogue.router, prefix="/v1")
app.include_router(sync.router, prefix="/v1")

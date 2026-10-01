from fastapi import FastAPI

from app.api.v1.router import router as api_v1_router
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging()

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    version="0.1.0",
)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_v1_router, prefix=settings.api_v1_prefix)
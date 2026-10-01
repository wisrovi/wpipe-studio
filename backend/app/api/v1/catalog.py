from fastapi import APIRouter, HTTPException, Query
from app.services.catalog import catalog_service, CatalogEntry

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/categories", response_model=list[str])
def list_categories() -> list[str]:
    return catalog_service.get_categories()


@router.get("/steps", response_model=list[CatalogEntry])
def list_steps(category: str | None = Query(default=None)) -> list[CatalogEntry]:
    return catalog_service.get_entries(category=category)


@router.get("/steps/detail", response_model=CatalogEntry)
def get_step_detail(namespace: str, func_name: str) -> CatalogEntry:
    entry = catalog_service.get_step(namespace=namespace, func_name=func_name)
    if not entry:
        raise HTTPException(status_code=404, detail="Step not found in release manifest")
    return entry


@router.get("/stats")
def catalog_stats() -> dict[str, int]:
    entries = catalog_service.get_entries()
    categories = catalog_service.get_categories()
    return {
        "total_steps": len(entries),
        "total_categories": len(categories),
    }

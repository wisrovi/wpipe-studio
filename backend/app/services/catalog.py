import hashlib
import json
import os
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field


class ParamSpec(BaseModel):
    name: str
    annotation: str | None = None
    default: Any | None = None


class CatalogEntry(BaseModel):
    name: str
    func_name: str
    namespace: str
    version: str = "v1.0"
    description: str = ""
    category: str = "general"
    license: str = "MIT"
    repo: str = "Official"
    author: str = ""
    how_to_use: str = ""
    params: list[ParamSpec] = Field(default_factory=list)
    response_key: str | None = None
    dialect: str = "B"
    index_ok: bool = True


class CatalogService:
    def __init__(self, catalog_path: str | Path | None = None):
        if catalog_path is None:
            # Default lookup path relative to workspace or env
            workspace_root = Path(__file__).resolve().parents[4]
            catalog_path = workspace_root / "wpipe-steps" / "steps_catalog.json"
        self.catalog_path = Path(catalog_path)
        self._cache_hash: str | None = None
        self._entries: list[CatalogEntry] = []

    def _compute_file_hash(self) -> str:
        if not self.catalog_path.exists():
            return ""
        hasher = hashlib.sha256()
        with open(self.catalog_path, "rb") as f:
            hasher.update(f.read())
        return hasher.hexdigest()

    def get_entries(self, category: str | None = None) -> list[CatalogEntry]:
        current_hash = self._compute_file_hash()
        if current_hash != self._cache_hash or not self._entries:
            self._load_and_enrich()
            self._cache_hash = current_hash

        if category:
            return [e for e in self._entries if e.category.lower() == category.lower()]
        return self._entries

    def get_step(self, namespace: str, func_name: str) -> CatalogEntry | None:
        entries = self.get_entries()
        for entry in entries:
            if entry.namespace == namespace and entry.func_name == func_name:
                return entry
        return None

    def get_categories(self) -> list[str]:
        entries = self.get_entries()
        cats = {entry.category for entry in entries if entry.category}
        return sorted(list(cats))

    def _load_and_enrich(self) -> None:
        if not self.catalog_path.exists():
            self._entries = []
            return

        try:
            with open(self.catalog_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            self._entries = []
            return

        entries: list[CatalogEntry] = []
        for raw in data:
            entry = CatalogEntry(
                name=raw.get("name", ""),
                func_name=raw.get("func_name", ""),
                namespace=raw.get("namespace", ""),
                version=raw.get("version", "v1.0"),
                description=raw.get("description", ""),
                category=raw.get("category", "general"),
                license=raw.get("license", "MIT"),
                repo=raw.get("repo", "Official"),
                author=raw.get("author", ""),
                how_to_use=raw.get("how_to_use", ""),
                params=[
                    ParamSpec(name="config", annotation="dict | None", default=None),
                    ParamSpec(name="timeout", annotation="int", default=30),
                ],
                response_key="response" if "http" in raw.get("name", "") else "result",
                dialect="B",
                index_ok=True,
            )
            entries.append(entry)

        self._entries = entries


catalog_service = CatalogService()

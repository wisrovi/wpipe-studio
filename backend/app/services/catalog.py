import hashlib
import json
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
    repo: str = "Official"  # "Official" or "Plugin"
    author: str = ""
    how_to_use: str = ""
    params: list[ParamSpec] = Field(default_factory=list)
    response_key: str | None = None
    dialect: str = "B"
    index_ok: bool = True
    code_snippet: str | None = None


class CatalogService:
    def __init__(self, catalog_path: str | Path | None = None, plugins_path: str | Path | None = None):
        workspace_root = Path(__file__).resolve().parents[4]
        if catalog_path is None:
            catalog_path = workspace_root / "wpipe-steps" / "steps_catalog.json"
        if plugins_path is None:
            plugins_path = workspace_root / "wpipe-plugins" / "steps_catalog.json"

        self.catalog_path = Path(catalog_path)
        self.plugins_path = Path(plugins_path)
        self._cache_hash: str | None = None
        self._entries: list[CatalogEntry] = []

    def _compute_file_hash(self) -> str:
        hasher = hashlib.sha256()
        for p in (self.catalog_path, self.plugins_path):
            if p.exists():
                with open(p, "rb") as f:
                    hasher.update(f.read())
        return hasher.hexdigest()

    def get_entries(self, category: str | None = None, repo_type: str | None = None) -> list[CatalogEntry]:
        current_hash = self._compute_file_hash()
        if current_hash != self._cache_hash or not self._entries:
            self._load_and_enrich()
            self._cache_hash = current_hash

        res = self._entries
        if repo_type:
            res = [e for e in res if e.repo.lower() == repo_type.lower()]
        if category:
            res = [e for e in res if e.category.lower() == category.lower()]
        return res

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
        entries: list[CatalogEntry] = []

        # Load official steps
        if self.catalog_path.exists():
            try:
                with open(self.catalog_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for raw in data:
                    entries.append(
                        CatalogEntry(
                            name=raw.get("name", ""),
                            func_name=raw.get("func_name", ""),
                            namespace=raw.get("namespace", ""),
                            version=raw.get("version", "v1.0"),
                            description=raw.get("description", ""),
                            category=raw.get("category", "general"),
                            license=raw.get("license", "MIT"),
                            repo="Official",
                            author=raw.get("author", ""),
                            how_to_use=raw.get("how_to_use", ""),
                            params=[
                                ParamSpec(name="config", annotation="dict | None", default=None),
                                ParamSpec(name="timeout", annotation="int", default=30),
                            ],
                            response_key="response" if "http" in raw.get("name", "") else "result",
                            code_snippet=f"from {raw.get('namespace', '')} import {raw.get('func_name', '')}\n\n# Official Step: {raw.get('name', '')}\n# Description: {raw.get('description', '')}",
                        )
                    )
            except Exception:
                pass

        # Load plugin steps
        if self.plugins_path.exists():
            try:
                with open(self.plugins_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for raw in data:
                    entries.append(
                        CatalogEntry(
                            name=raw.get("name", ""),
                            func_name=raw.get("func_name", ""),
                            namespace=raw.get("namespace", ""),
                            version=raw.get("version", "v0.1.0"),
                            description=raw.get("description", ""),
                            category=raw.get("category", "vision"),
                            license=raw.get("license", "MIT"),
                            repo="Plugin",
                            author=raw.get("author", "Community"),
                            how_to_use=raw.get("how_to_use", ""),
                            params=[
                                ParamSpec(name="model_path", annotation="str | None", default=None),
                                ParamSpec(name="conf", annotation="float", default=0.25),
                            ],
                            response_key="results",
                            code_snippet=f"from {raw.get('namespace', '')} import {raw.get('func_name', '')}\n\n# Community Plugin: {raw.get('name', '')}\n# Author: {raw.get('author', '')}",
                        )
                    )
            except Exception:
                pass

        self._entries = entries


catalog_service = CatalogService()

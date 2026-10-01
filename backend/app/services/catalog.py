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
    subcategory1: str = ""
    subcategory2: str = ""
    subcategory3: str = ""
    license: str = "MIT"
    repo: str = "Official"  # "Official" or "Community" / "Plugin"
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

    def get_entries(self, category: str | None = None, repo_type: str | None = None, query: str | None = None) -> list[CatalogEntry]:
        current_hash = self._compute_file_hash()
        if current_hash != self._cache_hash or not self._entries:
            self._load_and_enrich()
            self._cache_hash = current_hash

        res = self._entries
        if repo_type:
            r_target = repo_type.lower()
            if r_target in ("plugin", "community"):
                res = [e for e in res if e.repo.lower() in ("plugin", "community")]
            else:
                res = [e for e in res if e.repo.lower() == r_target]
        if category:
            res = [e for e in res if e.category.lower() == category.lower()]
        if query:
            q = query.lower().strip()
            res = [
                e for e in res
                if q in e.name.lower()
                or q in e.func_name.lower()
                or q in e.namespace.lower()
                or q in e.category.lower()
                or q in e.subcategory1.lower()
                or q in e.subcategory2.lower()
                or q in e.description.lower()
            ]
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
                            subcategory1=raw.get("subcategory1", ""),
                            subcategory2=raw.get("subcategory2", ""),
                            subcategory3=raw.get("subcategory3", ""),
                            license=raw.get("license", "MIT"),
                            repo="Official",
                            author=raw.get("author", ""),
                            how_to_use=raw.get("how_to_use", ""),
                            params=[
                                ParamSpec(name="config", annotation="dict | None", default=None),
                                ParamSpec(name="timeout", annotation="int", default=30),
                            ],
                            response_key="response" if "http" in raw.get("name", "") else "result",
                            code_snippet=f"from {raw.get('namespace', '')} import {raw.get('func_name', '')}\n\n# Official Step: {raw.get('name', '')}\n# Category: {raw.get('category', '')} / {raw.get('subcategory1', '')}\n# Description: {raw.get('description', '')}",
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
                    ns = raw.get("namespace", "")
                    ns_parts = ns.split(".")
                    cat = raw.get("category") or (ns_parts[1] if len(ns_parts) > 1 else "vision")
                    subcat1 = raw.get("subcategory1") or (ns_parts[2] if len(ns_parts) > 2 else "")

                    entries.append(
                        CatalogEntry(
                            name=raw.get("name", ""),
                            func_name=raw.get("func_name", ""),
                            namespace=ns,
                            version=raw.get("version", "v0.1.0"),
                            description=raw.get("description", ""),
                            category=cat,
                            subcategory1=subcat1,
                            license=raw.get("license", "MIT"),
                            repo=raw.get("repo", "Community"),
                            author=raw.get("author", "Community"),
                            how_to_use=raw.get("how_to_use", ""),
                            params=[
                                ParamSpec(name="model_path", annotation="str | None", default=None),
                                ParamSpec(name="conf", annotation="float", default=0.25),
                            ],
                            response_key="results",
                            code_snippet=f"from {ns} import {raw.get('func_name', '')}\n\n# Community Plugin: {raw.get('name', '')}\n# Author: {raw.get('author', '')}",
                        )
                    )
            except Exception:
                pass

        self._entries = entries


catalog_service = CatalogService()

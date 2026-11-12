"""Step: Manage Machine Activations (Leases).
Author: William Rodriguez (wisrovi.dev)
"""

from typing import Any

from client import CloudflareAdminClient
from dto.admin_context import AdminPipelineContext
from wpipe.decorators.step import step
from wpipe.timeout import timeout_sync
from wpipe.util.transform import to_obj


def _get(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


@step(
    name="ManageActivationsStep",
    version="v1.0",
    timeout=10,
    description="Handles hardware machine activations listing and unlinking",
    tags=["admin", "activations", "hardware"],
    retry_count=2,
    retry_delay=0.1,
)
class ManageActivationsStep:
    """Step to query or unlink bound hardware machines in Cloudflare D1."""

    def __init__(self, client: CloudflareAdminClient | None = None) -> None:
        self.client = client or CloudflareAdminClient()

    def execute(self, context: Any) -> Any:
        """Execute step logic directly."""
        return self(context)

    @timeout_sync(seconds=8)
    @to_obj(AdminPipelineContext)
    def __call__(self, context: Any) -> Any:
        action = _get(context, "action", "fetch_all")
        target_id = _get(context, "target_id", None)

        try:
            if action == "delete_activation" and target_id:
                self.client.delete_activation(target_id)

            activations = self.client.list_activations()
            if isinstance(context, dict):
                context["activations"] = activations
            else:
                context.activations = activations
        except (RuntimeError, ValueError, OSError, ConnectionError, TypeError, KeyError) as e:
            if isinstance(context, dict):
                context["activations"] = []
                context["error"] = str(e)
            else:
                context.activations = []
                context.error = str(e)

        return context

"""Step: Manage Audit Logs.
Author: William Rodriguez (wisrovi.dev)
"""

from typing import Any

from client import CloudflareAdminClient
from dto.admin_context import AdminPipelineContext
from wpipe.decorators.step import step
from wpipe.timeout import timeout_sync
from wpipe.util.transform import to_obj


@step(
    name="ManageAuditStep",
    version="v1.0",
    timeout=10,
    description="Loads chronological security and activation audit logs",
    tags=["admin", "audit", "security"],
    retry_count=2,
    retry_delay=0.1,
)
class ManageAuditStep:
    """Step to load audit logs from Cloudflare D1."""

    def __init__(self, client: CloudflareAdminClient | None = None) -> None:
        self.client = client or CloudflareAdminClient()

    def execute(self, context: Any) -> Any:
        """Execute step logic directly."""
        return self(context)

    @timeout_sync(seconds=8)
    @to_obj(AdminPipelineContext)
    def __call__(self, context: Any) -> Any:
        try:
            audit_logs = self.client.list_audit_logs(limit=100)
            if isinstance(context, dict):
                context["audit_logs"] = audit_logs
            else:
                context.audit_logs = audit_logs
        except (RuntimeError, ValueError, OSError, ConnectionError, TypeError, KeyError) as e:
            if isinstance(context, dict):
                context["audit_logs"] = []
                context["error"] = str(e)
            else:
                context.audit_logs = []
                context.error = str(e)

        return context

from __future__ import annotations

from .feature_flags import build_live_provider_status


class LiveModelDisabledError(RuntimeError):
    """Raised whenever fail-closed code attempts to use a live model provider."""


class DisabledLiveModelProvider:
    message = "Live model providers are disabled by the Step 13 feature-flag gate."

    def __init__(self, status: dict[str, object] | None = None) -> None:
        self.status = status

    def _blocked_message(self) -> str:
        status = self.status if self.status is not None else build_live_provider_status()
        blocked_reasons = status.get("blocked_reasons", [])
        if not isinstance(blocked_reasons, (list, tuple)) or not blocked_reasons:
            return self.message

        return f"{self.message} Blocked reasons: {'; '.join(str(reason) for reason in blocked_reasons)}"

    def run(self, *_args: object, **_kwargs: object) -> None:
        raise LiveModelDisabledError(self._blocked_message())

    def generate(self, *_args: object, **_kwargs: object) -> None:
        raise LiveModelDisabledError(self._blocked_message())

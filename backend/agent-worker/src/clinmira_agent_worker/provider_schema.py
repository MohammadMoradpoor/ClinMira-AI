from __future__ import annotations

from math import isfinite
from typing import Any

from .context_firewall import FORBIDDEN_FIELDS
from .provider_boundary import ProviderError


REQUIRED_STRUCTURED_OUTPUT_KEYS = (
    "response_kind",
    "message",
    "used_fact_ids",
    "safety_postcheck_required",
)

FORBIDDEN_OUTPUT_KEYS = FORBIDDEN_FIELDS.union({
    "raw_hidden_facts",
    "faculty_notes",
    "provider_secret",
    "environment",
    "model_allowlist",
})

FORBIDDEN_OUTPUT_TEXT_MARKERS = (
    "hidden diagnosis",
    "treatment plan",
    "medication recommendation",
    "imaging interpretation",
    "faculty score",
    "debrief explanation",
)


def validate_provider_structured_output(output: Any) -> tuple[ProviderError, ...]:
    errors: list[ProviderError] = []

    if not isinstance(output, dict):
        return (_schema_error("schema_output_not_object", "Provider structured output must be a dict"),)

    for key in REQUIRED_STRUCTURED_OUTPUT_KEYS:
        if key not in output:
            errors.append(_schema_error("schema_required_key_missing", f"Provider structured output missing: {key}"))

    if "used_fact_ids" in output:
        used_fact_ids = output["used_fact_ids"]
        if not isinstance(used_fact_ids, list) or not all(isinstance(item, str) for item in used_fact_ids):
            errors.append(_schema_error("schema_used_fact_ids_invalid", "used_fact_ids must be a list of strings"))

    if output.get("safety_postcheck_required") is not True:
        errors.append(
            _schema_error("schema_safety_postcheck_required", "safety_postcheck_required must be true")
        )

    errors.extend(_validate_safe_values(output))
    errors.extend(_reject_forbidden_output_keys(output))
    errors.extend(_reject_forbidden_text_markers(output))

    return tuple(errors)


def _validate_safe_values(value: Any, path: tuple[str, ...] = ()) -> tuple[ProviderError, ...]:
    errors: list[ProviderError] = []

    if isinstance(value, dict):
        for key, nested in value.items():
            errors.extend(_validate_safe_values(nested, (*path, str(key))))
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            errors.extend(_validate_safe_values(nested, (*path, str(index))))
    elif isinstance(value, float):
        if not isfinite(value):
            errors.append(_schema_error("schema_value_not_safe", f"Unsafe numeric value at {_path(path)}"))
    elif not isinstance(value, (str, int, bool, type(None))):
        errors.append(_schema_error("schema_value_not_safe", f"Unsafe value type at {_path(path)}"))

    return tuple(errors)


def _reject_forbidden_output_keys(value: Any, path: tuple[str, ...] = ()) -> tuple[ProviderError, ...]:
    errors: list[ProviderError] = []

    if isinstance(value, dict):
        for key, nested in value.items():
            normalized_key = str(key)
            joined = (*path, normalized_key)
            if normalized_key in FORBIDDEN_OUTPUT_KEYS:
                errors.append(_schema_error("schema_forbidden_key", f"Forbidden output key: {_path(joined)}"))
            errors.extend(_reject_forbidden_output_keys(nested, joined))
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            errors.extend(_reject_forbidden_output_keys(nested, (*path, str(index))))

    return tuple(errors)


def _reject_forbidden_text_markers(value: Any, path: tuple[str, ...] = ()) -> tuple[ProviderError, ...]:
    errors: list[ProviderError] = []

    if isinstance(value, str):
        normalized = value.lower()
        for marker in FORBIDDEN_OUTPUT_TEXT_MARKERS:
            if marker in normalized:
                errors.append(_schema_error("schema_forbidden_text_marker", f"Forbidden output text at {_path(path)}"))
    elif isinstance(value, dict):
        for key, nested in value.items():
            errors.extend(_reject_forbidden_text_markers(nested, (*path, str(key))))
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            errors.extend(_reject_forbidden_text_markers(nested, (*path, str(index))))

    return tuple(errors)


def _schema_error(code: str, message: str) -> ProviderError:
    return ProviderError(code=code, message=message, blocked_reason=message)


def _path(path: tuple[str, ...]) -> str:
    return ".".join(path) if path else "<root>"

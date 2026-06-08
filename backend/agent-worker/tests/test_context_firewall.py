from __future__ import annotations

import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.context_firewall import ContextFirewallError, validate_agent_context


class ContextFirewallTests(unittest.TestCase):
    def test_persona_accepts_only_student_safe_fact_summaries(self) -> None:
        validate_agent_context(
            "mock_persona",
            {
                "allowed_fact_summaries": [
                    {
                        "fact_id": "fact-001",
                        "visibility": "baseline_visible",
                        "student_safe_summary": "I feel nervous about the appointment.",
                    }
                ]
            },
        )

    def test_persona_rejects_restricted_fact_visibility(self) -> None:
        for visibility in ("hidden_until_revealed", "faculty_only", "safety_only", "evaluator_only"):
            with self.subTest(visibility=visibility):
                with self.assertRaises(ContextFirewallError):
                    validate_agent_context(
                        "mock_persona",
                        {
                            "allowed_fact_summaries": [
                                {
                                    "fact_id": "restricted",
                                    "visibility": visibility,
                                    "student_safe_summary": "must not pass",
                                }
                            ]
                        },
                    )

    def test_forbidden_fields_fail_closed(self) -> None:
        for field in (
            "raw_fact_content",
            "faculty_only_notes",
            "hidden_diagnosis",
            "system_prompt",
            "internal_prompt",
            "tool_secret",
            "api_key",
            "provider_secret",
        ):
            with self.subTest(field=field):
                with self.assertRaises(ContextFirewallError):
                    validate_agent_context("mock_persona", {field: "blocked"})

    def test_disabled_agents_cannot_receive_fact_payloads(self) -> None:
        for agent_name in ("mock_imaging", "mock_evaluator"):
            with self.subTest(agent_name=agent_name):
                with self.assertRaises(ContextFirewallError):
                    validate_agent_context(
                        agent_name,
                        {
                            "allowed_fact_summaries": [
                                {
                                    "fact_id": "fact-001",
                                    "visibility": "baseline_visible",
                                    "student_safe_summary": "safe but disabled agent cannot receive it",
                                }
                            ]
                        },
                    )

    def test_mock_safety_rejects_raw_content(self) -> None:
        with self.assertRaises(ContextFirewallError):
            validate_agent_context("mock_safety", {"facts": [{"fact_id": "x", "content": {"raw": "blocked"}}]})


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .feature_flags import build_live_provider_status
from .health import build_health_response
from .runtime import AgentRuntime, AgentRuntimeError


def main() -> int:
    parser = argparse.ArgumentParser(prog="clinmira-agent-worker")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("health")
    subparsers.add_parser("live-provider-status")
    run_parser = subparsers.add_parser("run-mock-agent")
    run_parser.add_argument("--agent-name", default="mock_persona")
    run_parser.add_argument("--input-text", default="")
    run_parser.add_argument("--json-file")

    args = parser.parse_args()
    command = args.command or "health"

    try:
        if command == "health":
            print(json.dumps(build_health_response(), sort_keys=True))
            return 0
        if command == "live-provider-status":
            print(json.dumps(build_live_provider_status(), sort_keys=True))
            return 0
        if command == "run-mock-agent":
            request = _load_request(args)
            print(json.dumps(AgentRuntime().run_agent(request), sort_keys=True))
            return 0

        print(json.dumps({"status": "blocked", "reason": f"Unknown command: {command}"}, sort_keys=True), file=sys.stderr)
        return 1
    except AgentRuntimeError as exc:
        print(json.dumps({"status": "blocked", "reason": str(exc)}, sort_keys=True), file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(json.dumps({"status": "blocked", "reason": str(exc)}, sort_keys=True), file=sys.stderr)
        return 1


def _load_request(args: argparse.Namespace) -> dict[str, object]:
    if args.json_file:
        with Path(args.json_file).open("r", encoding="utf-8") as handle:
            value = json.load(handle)
        if not isinstance(value, dict):
            raise RuntimeError("run-mock-agent JSON input must be an object")
        return value

    return {
        "agent_name": args.agent_name,
        "mode": "mock",
        "input_text": args.input_text,
        "context": {
            "allowed_fact_summaries": [],
        },
        "requested_capabilities": [],
    }


if __name__ == "__main__":
    raise SystemExit(main())

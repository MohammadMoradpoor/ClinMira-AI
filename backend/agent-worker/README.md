# ClinMira Agent Worker Skeleton

This is the Python agent-worker skeleton for ClinMira AI.

Current scope:

- Importable Python package.
- CLI health response.
- Mock-only agent runtime.
- Mock Persona, Physiology, Safety, Imaging, and Evaluator agents.
- Context firewall validation before every mock agent run.
- Disabled live-model provider.
- Redacted local trace shape.
- Live-agent feature gate refusal.
- No third-party runtime dependencies.

Explicitly not implemented:

- OpenAI SDK integration.
- Live agent orchestration.
- Tool calls.
- Clinical reasoning.
- Database access.
- Temporal activities/workflows.
- Network model calls.

Commands:

```bash
cd backend/agent-worker
PYTHONPATH=src:../../shared/contracts/python python3 -m clinmira_agent_worker.main health
PYTHONPATH=src:../../shared/contracts/python python3 -m clinmira_agent_worker.main run-mock-agent --agent-name mock_persona --input-text "How are you feeling?"
python3 -m unittest discover -s tests
```

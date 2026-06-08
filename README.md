# ClinMira AI

ClinMira AI is a frontend prototype for a Virtual Clinic Simulation OS. It presents generative multi-agent Patient Twins for clinical and dental education, including Virtual Clinic encounters, Case Library content, Debriefing, Competency Analytics, Scenario Studio, Agent Control, Faculty Validation, and Safety Guardrails.

## Current Status

- Frontend-only prototype built with Next.js, TypeScript, Tailwind CSS, shadcn-style components, and typed mock data.
- No clinical or product backend APIs are implemented yet; only health-only backend skeleton endpoints exist.
- No real AI API calls are made.
- No real patient data is used.
- All patients, imaging, scoring, faculty review, and agent events are synthetic educational mock data.

## Development

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Quality Checks

```bash
cd frontend
pnpm lint
pnpm build
pnpm audit:screenshots
```

## Product Routes

- `/` - Student Clinic
- `/student-clinic` - Student Clinic redirect
- `/cases` - Case Library
- `/virtual-clinic` - Virtual Clinic
- `/debriefing` - Debriefing
- `/faculty` - Faculty Dashboard
- `/scenario-studio` - Scenario Studio
- `/agent-control` - Agent Control
- `/settings` - Settings

## Backend

The backend skeleton lives in `backend/README.md`.

Current backend scope:

- NestJS API/BFF health skeleton.
- Python agent-worker health skeleton.
- Shared health and feature-flag contracts.
- No clinical APIs, database migrations, realtime gateway, Temporal workflows, or live AI calls.

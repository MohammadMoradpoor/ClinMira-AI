# ClinMira AI Frontend

ClinMira AI is a frontend prototype for a Virtual Clinic Simulation OS. It uses synthetic educational Patient Twins, Multi-Agent Simulation, Safety Guardrails, Faculty Validation, Imaging Simulation, Debriefing, and Competency Analytics for clinical and dental education.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn-style component foundation
- lucide-react
- framer-motion
- recharts
- next-themes

## Development

Install dependencies:

```bash
pnpm install
```

Run locally:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Quality Checks

```bash
pnpm lint
pnpm build
pnpm audit:screenshots
```

## Routes

- `/` - Student Clinic
- `/student-clinic` - Student Clinic redirect
- `/cases` - Case Library
- `/virtual-clinic` - Virtual Clinic
- `/debriefing` - Debriefing
- `/faculty` - Faculty Dashboard
- `/scenario-studio` - Scenario Studio
- `/agent-control` - Agent Control
- `/settings`

## Notes

- All patient, imaging, agent, scoring, faculty review, and competency analytics data are synthetic educational mock data.
- No backend APIs, database, real authentication, real AI calls, or real patient data are implemented.
- The backend placeholder lives in `../backend/README.md`.

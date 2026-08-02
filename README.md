# Student Management System : Registry Module

Technical assessment submission for PEN Global, covering the Registry module: student enrolment, fees & payments, assessment submission, and marksheet & results.

## Tech Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- Tailwind CSS
- shadcn/ui

## Design System

- **Colors** are centralized as CSS variables in `src/app/globals.css` (`--primary`, `--destructive`, `--success`, `--warning`, `--info`, etc.), each with a light and dark value. Components reference these tokens (`bg-success`, `text-warning-foreground`, ...) rather than hardcoded colors, so retuning a color is a one-line change.
- **Components** are shadcn/ui primitives owned in `src/components/ui/` (e.g. `Button`, `Badge`), each defining every visual variant once via `cva`. Feature code always imports these shared components rather than styling one-off buttons/badges per page.

## Design Decisions & Known Limitations

- **One programme per student.** A student can only be enrolled in a single programme at a time. In reality, students sometimes hold multiple programmes (double majors, transfers) — this is a deliberate scope simplification given the assessment's timeframe and the spec's literal wording ("their programme"), not an oversight. Modeling it properly would require scoping fees, assessments, and grades per-programme-per-student rather than per-student, which is a structural change we're choosing not to take on now.
- **`feeOverride` instead of a scholarship/financial-aid system.** Students can have an optional per-student fee override (discount, aid, scholarship) via a single nullable field, rather than a full application/approval workflow. This covers the common case ("this student doesn't pay the standard rate") without building an entire subsystem the spec doesn't ask for.
- **`academicYear` is staff-editable, not derived.** It represents year of study (1st/2nd/3rd...), not intake year, and isn't computed from enrolment date because a retake can put a student in the same academic year across two sessions.

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables (defaults already match docker-compose.yml)
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d

# 4. Apply the schema and generate the Prisma Client
npx prisma migrate dev

# 5. Seed demo data
npx prisma db seed

# 6. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Default in `.env.example` matches the `docker-compose.yml` Postgres container out of the box. |

## AI Usage

This project was built with Claude Code as a collaborative pair-programmer. See [AI_USAGE.md](AI_USAGE.md) for the full step-by-step log of what was AI-assisted and what was manually reviewed/decided.

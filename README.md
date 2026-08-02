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

## Getting Started

_(to be filled in once the database and env vars are wired up)_

## Environment Variables

_(to be filled in once Prisma/Postgres are configured — see `.env.example`)_

## AI Usage

This project was built with Claude Code as a collaborative pair-programmer. See [AI_USAGE.md](AI_USAGE.md) for the full step-by-step log of what was AI-assisted and what was manually reviewed/decided.

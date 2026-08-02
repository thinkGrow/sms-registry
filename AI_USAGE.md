# AI Usage Log

This project was built with Claude Code as a collaborative pair-programmer. Each entry documents a step: what was done, and how AI was used vs. reviewed/decided by the developer.

### Setup
- Scaffolded with `create-next-app` (TypeScript, App Router, Tailwind, ESLint, `src/` dir, `@/*` import alias) — commands suggested by Claude, run manually in terminal.
- Noted that the scaffold's generated `AGENTS.md`/`CLAUDE.md` flags Next.js 16 as having breaking changes vs. AI training data; agreed to check `node_modules/next/dist/docs/` before writing framework-specific code rather than assuming older App Router conventions.
- Developer instructed Claude to keep commit messages structured (Conventional Commits: `feat`/`fix`/`chore`/`docs`/`test`/`ci`) for the rest of the project, and to log that instruction here.

### Design system
- Ran `shadcn@latest init` interactively (developer's own terminal), landing on `base-sera` style / `taupe` base color.
- Before adding feature components, developer asked Claude to confirm a centralized color system and reusable components existed. Claude verified shadcn's CSS-variable token system and the existing `cva`-based `Button` component, then extended `globals.css` with app-specific semantic tokens (`success`, `warning`, `info`) for status flags (enrolment status, overdue fees, late submissions, grade classification) — defined once, light + dark, rather than one-off colors per page.

### Database setup
- Added `docker-compose.yml` for local PostgreSQL (chosen over a hosted DB so anyone cloning the repo can run it with zero account signup, and the same image can later back a CI service container).
- Ran `npx prisma init`, which generated a placeholder `DATABASE_URL` pointing at Prisma's own hosted `prisma+postgres://` dev service rather than a plain Postgres connection string — Claude caught this and replaced it with the actual Docker Postgres connection string, and added the missing `dotenv` dependency that `prisma.config.ts` requires.
- Filled in README's "Getting Started" and "Environment Variables" sections with the real setup steps once they existed, replacing earlier placeholders.

### Schema design - Student & Programme
- Discussed field-by-field reasoning for `Student` (separate `id` vs. human-facing `studentId`, `@db.Date` for DOB, enum for status, audit timestamps) and `Programme` (`Decimal` for money, not `Float`) before writing the schema.
- Developer raised that students may get discounts via multiple programmes, financial aid, or scholarships. Claude recommended against building full subsystems for these (out of spec scope, would crowd out the four graded modules given the time remaining), proposing instead a single optional `feeOverride` field on Student, with the one-programme-per-student simplification and its trade-offs documented explicitly in the README rather than silently ignored. Developer agreed, noting the real logic can be layered in later once the core project is complete.
- Discussed why `academicYear` must stay a plain editable field rather than derived from enrolment date (retakes), and why enrolment `status` should gate assessment submission eligibility.
- Established Zod as the project-wide validation convention, reused between forms and API routes, after discussing why client-side validation alone isn't sufficient (a public API route can be hit directly, bypassing the form).

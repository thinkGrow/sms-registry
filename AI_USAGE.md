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

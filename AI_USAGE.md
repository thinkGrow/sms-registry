# AI Usage Log

I built this project with Claude Code as a collaborative pair programmer. Each entry documents a step: what I did, and how I used AI versus what I reviewed or decided myself.

### Setup
- I scaffolded the app with `create-next-app` (TypeScript, App Router, Tailwind, ESLint, `src/` dir, `@/*` import alias), using commands Claude suggested and running them myself in the terminal.
- The scaffold generated `AGENTS.md`/`CLAUDE.md` files flagging that Next.js 16 has breaking changes versus what's in Claude's training data. I agreed with Claude that it should check `node_modules/next/dist/docs/` before writing framework-specific code, instead of assuming older App Router conventions still apply.
- I asked Claude to keep commit messages structured (Conventional Commits: `feat`, `fix`, `chore`, `docs`, `test`, `ci`) for the rest of the project, and to log that instruction here.

### Design system
- I ran `shadcn@latest init` interactively in my own terminal, landing on the `base-sera` style with the `taupe` base color.
- Before adding feature components, I asked Claude to confirm a centralized color system and reusable components already existed. Claude verified shadcn's CSS variable token system and the existing `cva` based `Button` component, then extended `globals.css` with app specific semantic tokens (`success`, `warning`, `info`) for status flags like enrolment status, overdue fees, late submissions, and grade classification. These are defined once, for light and dark, rather than as one off colors per page.

### Database setup
- I added `docker-compose.yml` for local PostgreSQL, choosing that over a hosted database so anyone cloning the repo can run it with zero account signup, and the same image can later back a CI service container.
- I ran `npx prisma init`, which generated a placeholder `DATABASE_URL` pointing at Prisma's own hosted `prisma+postgres://` dev service instead of a plain Postgres connection string. Claude caught this and replaced it with the actual Docker Postgres connection string, and added the missing `dotenv` dependency that `prisma.config.ts` requires.
- I filled in the README's "Getting Started" and "Environment Variables" sections with the real setup steps once they existed, replacing the earlier placeholders.

### Schema design: Student and Programme
- Claude and I discussed the field by field reasoning for `Student` (a separate `id` versus a human facing `studentId`, `@db.Date` for date of birth, an enum for status, audit timestamps) and `Programme` (`Decimal` for money instead of `Float`) before writing the schema.
- I raised that students may get discounts through multiple programmes, financial aid, or scholarships. Claude recommended against building full subsystems for these, since they're out of spec scope and would crowd out the four graded modules given the time I have left. Instead we agreed on a single optional `feeOverride` field on Student, with the one programme per student simplification and its trade offs documented explicitly in the README rather than silently ignored. I decided the fuller logic can be layered in later once the core project is complete.
- We discussed why `academicYear` has to stay a plain editable field rather than being derived from enrolment date, because a retake can put a student in the same academic year twice. We also agreed enrolment `status` should gate assessment submission eligibility.
- I settled on Zod as the project wide validation convention, reused between forms and API routes, after asking Claude why client side validation alone isn't sufficient (a public API route can be hit directly, bypassing the form).
- I asked Claude to explain how to visualize the database design. We went with a hand maintained Mermaid ER diagram in the README instead of an auto generating tool like prisma-erd-generator, since it needs no extra dependency and GitHub renders it natively.

### Schema design: Payment and fee due dates
- I asked to discuss the Payment model entirely from scratch rather than refining an earlier draft. Claude restated the four open questions plainly: whether payments are installment style, where the reference number comes from, what defines an overdue balance, and whether a recorded payment can be edited.
- I confirmed payments are installment style, multiple rows accumulate toward a student's fee.
- I asked whether the reference number could be auto-generated instead of staff-entered. Claude agreed this was the better call since the app doesn't integrate with a real payment gateway or bank, so there's no external reference to capture, and generating it the same way as the Student ID avoids relying on staff data entry for uniqueness.
- I ruled out a "days since enrolment" definition of overdue, since a fee amount doesn't change based on what day someone signed up, and rejected "balance greater than zero" as too blunt since it would flag a student overdue on day one before any real deadline passed. I settled on a per-programme due date instead.
- I confirmed payments should be ordinary CRUD rather than a full accounting ledger with reversal entries, and asked Claude to document that as a deliberate scope exclusion in the README rather than leaving it unstated.

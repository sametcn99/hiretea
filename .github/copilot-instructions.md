# Hiretea Copilot Instructions

## Core Product Rules

- The entire product is English-only. Keep code identifiers, comments, docs, tests, UI copy, and status messages in English.
- Preserve the current App Router architecture. Do not introduce Pages Router patterns or parallel architectural styles.
- Keep page layers thin. Pages and layouts orchestrate auth, query loading, and composition. Business logic belongs in dedicated domain modules.
- Server data is the source of truth on the server. Do not move domain state into client-only stores.

## Route Boundaries

- Respect the existing route group split: `(public)` for unauthenticated marketing/setup flows, `(auth)` for sign-in flows, and `(app)` for authenticated application surfaces.
- Default to Server Components for pages, layouts, and section composition. Add `"use client"` only when interaction, browser APIs, or client state is actually required.
- Keep route files small and compositional. Favor pages like `src/app/(app)/dashboard/audit-trail/page.tsx` that gate access, load data, and render section components.
- When a route needs related UI, create a colocated `components` folder in the nearest route scope and keep those files there.

## Colocation And Scope

- Scope every new file to the **nearest common owner**.
- If a UI component is reused by multiple pages within the same route segment, place it in that segment's `components` folder.
- If a UI component is used by only one page, create a `components` folder inside that page's route folder and keep it there.
- Apply the same scoping rule to hooks, helpers, constants, formatters, mappers, and view-model utilities.
- If a helper or hook is only used by a single shared component, keep it next to that component instead of promoting it.
- Promote code to a broader scope only when there is an actual second consumer at that broader scope.

## Folder Placement

- Use `src/components/ui/*` only for app-wide reusable UI primitives such as branded shells, badges, cards, and similar design-system-level building blocks.
- Use `src/components/providers/*` for root-level or app-wide client providers.
- Use `src/app/(app)/dashboard/components/*` for dashboard-wide shared UI consumed by multiple dashboard pages.
- Use feature-segment folders like `src/app/(app)/dashboard/candidate-cases/components/*` for components shared across that feature's pages.
- Use page-local folders like `src/app/(app)/dashboard/candidate-cases/[candidateCaseId]/components/*` for files only used by that one page.
- Do not place domain-specific workflow UI in `src/components/ui/*` unless it is clearly a generic primitive.
- Do not create new top-level shared folders when an existing nearest-scope folder already fits.

## Server Actions Pattern

- Route-owned mutations belong in the nearest route segment `actions.ts` file and must keep the `"use server"` boundary there.
- Server actions should handle only request-facing orchestration: auth checks, input extraction from `FormData`, schema validation, domain service calls, and cache revalidation.
- Put actual domain mutation logic in `src/lib/<domain>/*` modules, not directly inside route actions.
- Server actions should return small serializable action states rather than rich class instances or raw ORM objects.
- When an action mutates data, explicitly revalidate the affected routes with `revalidatePath`.

## Domain Module Rules

- Domain logic belongs under `src/lib/<domain>/*` and should stay grouped by business capability.
- Keep the existing domain boundaries intact: auth logic in `src/lib/auth`, audit logic in `src/lib/audit`, Gitea integration in `src/lib/gitea`, candidate case logic in `src/lib/candidate-cases`, and so on.
- Do not leak Gitea-specific implementation details outside `src/lib/gitea` unless a domain service is intentionally wrapping them.
- Prefer one focused file per mutation or workflow step when the domain already follows that convention, for example `create-candidate-case.ts`, `restore-candidate-case.ts`, or `revoke-case-access.ts`.

## Queries And Data Shaping

- Read models for pages and components should come from `queries.ts` files inside the relevant domain module.
- Query functions should return UI-ready objects with the exact fields the route needs, rather than forcing components to understand raw Prisma shapes.
- Keep Prisma access centralized through `src/lib/db.ts`. Do not instantiate new `PrismaClient` instances in feature files.
- When a route handler or query touches the database or Gitea APIs, keep it on the server and prefer Node runtime where needed.

## Validation And Types

- Input validation belongs in domain `schemas.ts` files under `src/lib/<domain>/schemas.ts`.
- Parse and normalize raw request values with Zod before calling domain mutations.
- Export inferred types from schema modules and reuse them in actions and forms instead of duplicating input types.
- Keep environment parsing centralized in `src/lib/env.ts`. Do not read `process.env` directly throughout the app when `env` already exposes the contract.

## Auth And Access Control

- Protected pages in `(app)` should enforce access through `requireAuthSession` or `requireRole` from `src/lib/auth/session.ts`.
- Keep role checks near the route entrypoint or server action boundary, not scattered through deep UI components.
- Redirect-based access control is the current pattern. Do not replace it with ad hoc client-only guards for server pages.

## Client Interaction Rules

- Use `"use client"` components only for interaction, form state, dialogs, clipboard access, dropdowns, toasts, and similar browser-side concerns.
- Use Radix `AlertDialog` for destructive confirmations and use the shared toast provider for success/error feedback after actions.
- Do not use `alert()` for user feedback when the app already has toast infrastructure.
- Zustand is reserved for client-side UI state only. Never duplicate server-owned business data into Zustand as a primary source of truth.

## Provider Rules

- Global client providers belong in `src/components/providers/*` and are composed from `AppProviders`.
- Do not wrap individual pages with duplicate copies of providers already mounted in the root application shell.
- If a new provider is required app-wide, add it to `AppProviders` instead of scattering it across routes.

## UI Composition Rules

- Reuse the existing Radix Themes based visual system. Do not introduce a second UI framework or CSS-in-JS stack.
- Prefer composing pages from focused sections rather than keeping long monolithic JSX trees in a page file.
- Reuse existing primitives such as `SectionCard`, `StatusBadge`, and `AppLogo` before creating new variants.
- Keep styling aligned with existing tokens, Radix props, and the current theme/provider setup.

## Testing Architecture

- Preserve the current testing split: `tests/unit` for pure logic, `tests/integration` for database-backed workflows, and shell-based smoke tests for full-stack availability.
- Add unit tests for pure helpers, schemas, and non-I/O logic.
- Add integration tests for business workflows that depend on Prisma, bootstrap state, or persisted workspace behavior.
- Keep smoke tests narrow and focused on startup/public surface verification rather than deep business assertions.

## Refactor Rules

- During refactors, move the dependency chain with the consumer. Do not leave page-only helpers behind in a broader shared folder.
- Before extracting a file, decide whether the correct target scope is global, dashboard-wide, feature-shared, or page-local.
- When splitting a page, preserve the existing server/client boundary instead of accidentally turning a server page into a client tree.
- Prefer introducing a helper or section component before adding more conditional complexity into an already-large page file.
- If a requested change would violate these rules, reorganize the files first and then implement the behavior.

## Examples In This Repo

- `src/app/(app)/dashboard/page.tsx` consumes `src/app/(app)/dashboard/components/dashboard-overview.tsx`, which is dashboard-wide shared UI.
- `src/app/(app)/dashboard/candidate-cases/components/candidate-case-actions.tsx` is feature-shared because both the candidate case list and detail flows consume it.
- `src/app/(app)/dashboard/candidate-cases/[candidateCaseId]/components/*` is page-local because those detail sections are only used by the candidate case detail page.
- `src/app/(app)/dashboard/candidate-cases/actions.ts` shows the expected route action pattern: auth, schema parse, domain call, and targeted `revalidatePath`.
- `src/lib/candidate-cases/schemas.ts` shows the expected place for Zod-based input validation and exported inferred types.
- `src/lib/env.ts` is the environment contract. Reuse it instead of reading from arbitrary environment variables in feature code.

## Implementation Expectations

- Match existing Next.js App Router, Radix Themes, Prisma, Zod, Biome, and Bun-based workflow conventions already present in the repository.
- Choose the narrowest valid scope first for every new file.
- Keep architecture decisions consistent with the current repo before introducing new abstractions.

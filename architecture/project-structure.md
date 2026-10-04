# Project structure

## Framework entry points

### Next.js

`src/app/` contains Next.js routing and composition only. It connects routes to views/modules; business logic and application components belong in the scopes described below. Next.js-specific framework files required for routing remain in `app/`.

### React SPA

`src/routes/` contains React Router Declarative Mode routing and composition only. It connects routes to views/modules; business logic belongs in the appropriate application scope. The initial React preset is a client-rendered SPA and does not use SSR, Data Mode, or Framework Mode.

## Application scopes

Place code in the smallest scope that can own and reuse it:

- `components/`: globally reusable, presentational UI.
- `shared/`: UI shared across domains that contains application/business behavior, including shared components and modals.
- `modules/<domain>/`: code owned by one business domain.
- `modules/<domain>/pages/<Page>/`: code owned by a specific page within a domain.
- `core/`: application-wide capabilities and services that do not belong to a narrower scope.
- `hooks/` and `providers/`: top-level shared hooks/providers only when their scope is genuinely application-wide. Narrower hooks/providers stay with their owning scope.

The detailed responsibilities are in `components.md`, `shared.md`, `modules.md`, `core.md`, `hooks.md`, and `providers.md`.

## Generator scope references

Generators accept ownership scopes as slash-separated architectural references
relative to `src/`, without the physical `src/` prefix. For example,
`modules/users` identifies the users domain; it does not identify a literal
directory to create at that exact level for every file type. Each generator
resolves an accepted scope to the physical location prescribed by the owning
architecture document. `generate hook` mappings and its supported scopes are
defined in `hooks.md`. Scopes are required when ownership cannot be derived
from the generated entity, and generators must reject unknown scopes instead
of inferring placement.

## Lazy structure

No directory is created merely because it appears in an example or diagram. A directory exists only as a parent of a file the project actually needs. This applies to `assets`, `components`, `shared`, `hooks`, `providers`, `core`, `modules`, and every nested scope, including `core/constants`.

Do not create placeholder directories or empty scope folders. Framework-required files and directories are the exception only where the framework requires them to run; optional application scopes remain lazy.

## Decision Status

- **Approved:** Next.js uses `app/`; React starts as a SPA using React Router Declarative Mode; routing files do not own business logic.
- **Approved:** code belongs to the smallest suitable scope and optional directories are created only with content.
- **Extensible:** additional framework entry-point requirements may be documented without changing the shared scope rules.

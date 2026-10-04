# Tooling and standard stack

The generated project uses TypeScript and React, with Next.js or a React SPA preset. The standard stack is:

- Zustand for state management.
- React Router Declarative Mode for routing in the React SPA preset.
- TanStack Query for server/query state.
- React Hook Form and Yup for forms and validation.
- Tailwind CSS for styling.
- `@headlessui/react` for headless UI primitives.
- Lucide for icons.
- Sonner for toast notifications.
- `clsx` for conditional class composition.
- Motion for animation.
- ESLint and Prettier for linting and formatting.
- Husky, lint-staged, and Commitlint for Git hooks, staged-file checks, and commit structure validation.
- Vitest and React Testing Library for lightweight testing.
- `next-intl` for Next.js i18n and `react-i18next` for React SPA i18n, only when i18n is enabled.

Supabase client/configuration is included only when selected in the wizard. It does not include generated authentication or migrations. Do not add unapproved dependencies.

Use npm for the initial generated-project workflow and document Node.js 22 LTS as the target/minimum version. Framework-specific dependencies and configuration belong to the corresponding preset; shared tools should not be duplicated in framework templates.

## Validation flow

The validation stages and their responsibilities are defined in `testing.md`; Conventional Commit and hook policy is defined in `git.md`. The approved tools for those stages are ESLint, Prettier, Husky, Commitlint, and Vitest/React Testing Library.

## Decision Status

- **Approved:** listed libraries/tooling, npm, Node.js 22 LTS target/minimum, and framework-specific i18n integrations.
- **Extensible:** exact compatible package versions and configuration syntax are selected during implementation; no additional dependency is implied by this document.

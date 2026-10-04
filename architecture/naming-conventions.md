# Naming conventions

- Name React components with PascalCase.
- Name custom hooks with a `use` prefix. A component-specific hook is named `use[ComponentName]` (for example, `useButton`).
- Standalone hook generators use `use` followed by a PascalCase name containing English letters and digits, such as `useUsers`; component-owned hooks must use the owning component name.
- Name business modules by domain under `modules/<domain>/`.
- Shared modal component names begin with `Modal`, such as `ModalAddMembers`.
- Component-local translated messages use a file named `messages.json`.
- A local translation namespace is derived from the source path relative to `src/`: remove the leading `src/`, replace `/` with `-`, and retain the remaining path segments. For example, `src/modules/users/pages/UserList/index.tsx` maps to `modules-users-pages-UserList`.

Names in examples illustrate the convention; they do not require the corresponding directory to exist.
The English-language requirement for filenames and identifiers is defined in `coding-standards.md`.

## Decision Status

- **Approved:** English code/file names, hook and modal prefixes, and route-derived namespace convention.
- **Extensible:** detailed casing rules for domain names and non-component filenames may be refined without changing these approved conventions.

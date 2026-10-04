# Coding standards

- Code identifiers and filenames are written in English. This includes variables, functions, components, hooks, types, and interfaces.
- Code comments are written in Spanish.
- Application functions authored by the project use arrow-function syntax.
- Keep business logic out of Next.js `app/` routing/composition files and React `routes/` routing/composition files.
- Use the project architecture scopes described in `project-structure.md`.

These rules apply to both Next.js and React projects. They do not prescribe the language of user-facing UI text; UI text follows the internationalization rules when i18n is enabled.

## Decision Status

- **Approved:** language and arrow-function rules above.
- **Extensible:** formatting details not stated here are handled by the approved ESLint and Prettier tooling; this document does not add further style rules.

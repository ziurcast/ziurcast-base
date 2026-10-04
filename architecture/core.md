# Core

`src/core/` contains application-wide capabilities that are not owned by one module or page. Organize files by domain or responsibility rather than collecting unrelated code in generic files.

Possible subscopes include:

- `api/`: backend functions grouped by domain (detailed in `api.md`).
- `types/`: types and interfaces grouped by domain.
- `utils/`: utilities grouped by entity or responsibility.
- `constants/`: constants grouped by domain when constants actually exist.
- `store/`: application-wide Zustand state (detailed in `state-management.md`).
- `translations/`: global/core translations when i18n is enabled (detailed in `internationalization.md`).
- `supabase/`: client/configuration only when the Supabase option is enabled.
- `seo/`: SEO configuration/utilities only when needed by the framework/application.

These scopes are examples of responsibilities, not a required directory tree. In particular, `constants/` must not be created preemptively. Do not place module-specific code in core merely to make it globally accessible.

## Decision Status

- **Approved:** core is the global scope; organize by domain/responsibility; `constants/` and all other subscopes are lazy.
- **Approved:** initial Supabase integration is limited to client/configuration and environment example; no generated auth or migrations.
- **Extensible:** additional core capabilities may be introduced when needed and documented without pre-creating empty folders.

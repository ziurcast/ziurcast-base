# Internationalization

Internationalization is optional. When disabled, do not generate `messages.json` files or i18n infrastructure. When enabled, the initial locales are `es` and `en`, with `es` as the default locale.

## Local messages and namespaces

Every component or page that renders translatable text has a colocated `messages.json`. The namespace is derived from the source path relative to `src/`: remove the leading `src/`, replace `/` with `-`, and retain the remaining segments. For example:

```text
src/modules/users/pages/UserList/index.tsx
→ modules-users-pages-UserList
```

Do not copy a common/global translation into a local `messages.json`. Reuse it through `tCore`.

## Translation API

The application exposes its own translation API based on `t`:

- `t` resolves the current component/page's local namespace.
- `useCoreTranslations()` returns a translator for the global/core catalog; name the local translator variable `tCore` when declaring it.
- Do not pass `t` or `tCore` through component props. Each component or hook declares the translation function it needs in its own scope.
- If only core translations are needed, use `tCore` without requiring a local message file.

The core catalog lives under `src/core/translations/` and is organized by purpose/domain. It contains reusable application-wide wording; component/page wording stays local. The underlying framework libraries are details behind the project API.

## Framework integrations

- **Next.js:** use `next-intl` when i18n is enabled.
- **React SPA:** use `react-i18next` when i18n is enabled.

Both integrations must support the same project-facing concepts: local `t`, global `tCore`, locales `es` and `en`, and default locale `es`.

## Decision Status

- **Approved:** optional i18n, framework libraries, locales/default, colocated local messages, path-derived namespaces, `t`/`tCore`, and no translation-function props.
- **Extensible:** key taxonomy and internal adapter implementation may evolve while preserving this API and avoiding duplicated common translations.

# Providers

Place providers in `src/providers/` when they provide application-wide context. Create this directory only when an actual provider is required. Provider composition belongs at the framework's application boundary; routing files remain limited to routing/composition and must not become business-logic containers.

Framework/feature integrations differ:

- **Next.js:** provider setup must work with the Next.js application structure and the selected `next-intl` integration when i18n is enabled.
- **React SPA:** provider setup must work with the React application root and `react-i18next` when i18n is enabled.

Do not create a provider simply because a library is in the stack. Add one only when that library or application feature requires provider/context setup.

## Decision Status

- **Approved:** providers are lazy and belong at the appropriate application boundary; i18n integrations are framework-specific.
- **Extensible:** the exact provider composition is determined by enabled features and framework requirements.

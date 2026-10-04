# Modules

`src/modules/<domain>/` owns code specific to one business domain. A module may contain module-wide components, hooks, store, and modals, plus one or more pages.

An illustrative shape is:

```text
modules/<domain>/
├── moduleComponents/
├── moduleModal/
├── moduleHooks/
├── moduleStore/
├── pages/<Page>/
│   ├── pageComponents/
│   ├── pageStore/
│   ├── pageModals/
│   ├── index.tsx
│   └── use<Page>.ts
└── index.tsx
```

Every listed scope is optional. Create a module or subscope only when a real file needs it. Keep state, hooks, components, and modals at the narrowest scope that can own them: page-specific material belongs to the page; domain-wide material belongs to the module; cross-domain material belongs in `shared/`; application-wide capability belongs in `core/` or the relevant global scope.

`app/` and `routes/` connect routing to module/page views; they do not contain module business logic.

## Decision Status

- **Approved:** domain and page scopes, narrowest-scope placement, and lazy creation.
- **Extensible:** the exact files inside a module depend on its actual features; this example is not a required scaffold.

# Shared application UI

`src/shared/` contains UI reused across multiple business domains that includes application or business behavior. It differs from `src/components/`, whose components are globally reusable and presentational.

Optional scopes include:

```text
shared/
├── components/
├── modals/
└── index.ts
```

Create each directory or index only when it contains a needed file. Shared modals begin with `Modal`, for example `ModalAddMembers` or `ModalDeleteProduct`. A modal specific to one domain belongs to that module instead of global shared scope.

## Decision Status

- **Approved:** `shared/` is for cross-domain UI with application/business behavior; `shared/modals/` is optional and modal names use the `Modal` prefix.
- **Extensible:** further shared subscopes may be added when real content requires them; diagrams do not mandate empty folders.

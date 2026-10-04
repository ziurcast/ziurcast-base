# State management

Use Zustand for client-side stores. Keep each store in the narrowest scope that owns the state:

- application-wide state in `core/store/`;
- domain state in the module's store scope;
- page-only state in the page's store scope.

Every Zustand store separates state and actions into `data` and `actions`:

```ts
users: {
  data: {
    // state
  },
  actions: {
    // operations that update or use the state
  }
}
```

Do not place state and actions together at the same store level. The store location and key should make its scope evident. Do not create a store directory until a store is needed.

## Decision Status

- **Approved:** Zustand, narrowest-scope state, and the `data/actions` shape for every store.
- **Extensible:** store composition details are selected per store while preserving the required shape.

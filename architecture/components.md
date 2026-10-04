# Components

## Global components

`src/components/` is for reusable, presentational UI that can be used across the application without owning business logic. Components expose behavior through props and events, with variants represented by appropriate props such as `variant`, `tone`, or `size` where relevant.

The shared `Text` component supports an `as` prop to select its rendered element and supports its defined variants/tone options.

Export global components through `src/components/index.ts` when that scope exists. Do not create the scope or barrel file until at least one global component needs it.

## Component folder

The conceptual folder shape is:

```text
ComponentName/
├── index.tsx
├── useComponentName.ts
├── ComponentName.test.tsx
└── ComponentName.Readme.md
```

`index.tsx` contains the component. The other files are optional and are created only when needed:

- `useComponentName.ts` is needed when the component has non-trivial logic to separate from rendering. Purely presentational components do not need a hook.
- `ComponentName.test.tsx` is created when a meaningful UI test is warranted; tests are not added solely to increase coverage.
- `ComponentName.Readme.md` is a short component note when useful.

Do not add empty files to match the diagram. Business-aware UI reused across domains belongs in `shared/`, not the global presentational component scope.

## Decision Status

- **Approved:** global components are presentational; non-trivial component logic uses a colocated `use[ComponentName]` hook; optional files are not mandatory.
- **Extensible:** exact component props depend on the component's purpose and are not globally prescribed.

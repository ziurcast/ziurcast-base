# Hooks

Place a hook in the scope that owns its behavior. A hook used only by a component or page belongs beside that component/page; a hook shared across domains may belong in `src/hooks/` when it is genuinely application-wide. Do not create `hooks/`, `moduleHooks/`, or page hook scopes in advance.

Purely presentational components do not require a custom hook. When a component has non-trivial logic that should be separated from rendering, put the hook in the same component folder and name it `use[ComponentName]`, such as `useButton`. Do not create a hook file solely to satisfy a folder pattern.

Application functions use arrow functions as required by `coding-standards.md`.

## Explicit generator scopes

`create-base-app generate hook` requires `--scope <scope>`. A scope is an
architectural ownership path relative to `src/`, written with `/` separators.
It is not a filesystem path: do not include the `src/` prefix, `.` or `..`.
Each path segment begins with an English letter or digit and may continue with
English letters, digits, `_` or `-`.

Supported hook scopes resolve as follows:

| Scope | Generated file | Ownership rule |
| --- | --- | --- |
| `hooks` | `src/hooks/<HookName>.ts` | The caller explicitly declares the hook application-wide. |
| `modules/<domain>` | `src/modules/<domain>/moduleHooks/<HookName>.ts` | The hook belongs to that business domain. The module hook subscope is created only with the file. |
| `modules/<domain>/pages/<Page>` | `src/modules/<domain>/pages/<Page>/<HookName>.ts` | The page must already exist; the hook is colocated with its owner. |
| `components/<ComponentName>` | `src/components/<ComponentName>/use<ComponentName>.ts` | The component must already exist, and the hook name must be `use<ComponentName>`. |

The global `hooks` scope is never inferred from a hook name. Selecting it is an
explicit declaration that the hook is genuinely application-wide. Module
scopes may be created lazily as parents of the generated module hook file;
page and component scopes must exist because those owners must exist first.
Every generator must reject unsupported scope forms rather than guessing a
physical location. Future generators use the same scope syntax, with each
generator documenting which architectural scopes it accepts and how they map
to files.

## Decision Status

- **Approved:** colocate non-trivial component logic in `use[ComponentName]`; no mandatory hook for presentational components; no empty hook scopes.
- **Approved:** standalone hook generation requires an explicit architectural scope using the mappings above.
- **Extensible:** the threshold for non-trivial logic is judged by the component's responsibilities; no line-count threshold is imposed.

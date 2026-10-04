# API and data queries

Place backend API functions in `core/api/`, grouped by domain, when they are application-wide. For example, user operations belong under a users domain and product operations under products. Do not create an API domain folder until it contains an API function.

Use TanStack Query for query/mutation integration and wrappers that standardize API calls, loading/error states, and error handling. Keep the underlying API functions distinct from query/mutation hooks so each concern remains in its appropriate scope. Domain-specific calls may be owned by a module if they are not shared application-wide; avoid moving them to core solely for convenience.

Supabase, when selected, adds client/configuration and environment-variable example only. This contract does not generate authentication flows or database migrations.

## API function generator

`create-base-app generate api <ApiName> --scope <scope>` generates one backend API function file. The name is a lower camel case identifier containing only English letters and digits, beginning with a lowercase English letter. The same name is used for the `.ts` filename and the named export. The function is an arrow function. Its initial body contains a Spanish implementation reminder and throws `new Error('Not implemented')`; it does not prescribe parameters, a return value, backend protocol, or business logic.

The scope is required and is an architectural reference relative to `src/`:

| Scope | Generated file |
| --- | --- |
| `core/api/<domain>` | `src/core/api/<domain>/<ApiName>.ts` |
| `modules/<domain>` | `src/modules/<domain>/api/<ApiName>.ts` |

Only these scope forms are supported. Scope segments must be safe architectural names; filesystem prefixes and traversal segments are rejected. Parent directories are created lazily as needed for the generated file. This API generator creates only the function file, not TanStack Query hooks or related query/mutation files.

## Decision Status

- **Approved:** domain organization, TanStack Query, query/mutation wrappers, and the limited Supabase scope.
- **Approved:** the API generator's initial artifact, name convention, scopes, output paths, and minimal scaffold.
- **Extensible:** API function signatures beyond the initial scaffold, backend protocols, and error presentation are not prescribed here.

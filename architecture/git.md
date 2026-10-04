# Git and commits

Conventional Commits are required. Commitlint validates commit structure only; it must not enforce the commit message language.

- AI-generated commits use English.
- Human-authored commits may use any language.
- Husky runs the configured Git hooks.
- Pre-commit, pre-push, and CI validation responsibilities are defined in `testing.md` and `tooling.md`.

Examples of valid structures:

```text
feat(users): add user invitation
fix(auth): handle expired session
refactor(api): simplify request handler
test(users): add user deletion tests
chore(deps): update dependencies
```

## Decision Status

- **Approved:** Conventional Commits, structural-only Commitlint, Husky, and the different language expectations for AI and human commits.
- **Extensible:** additional Conventional Commit types/scopes may be used as long as the structure remains valid; no locale rule is added.

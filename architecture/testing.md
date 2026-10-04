# Testing

Use Vitest as the test runner and React Testing Library for React UI tests. Add tests for meaningful behavior; do not create tests solely to raise coverage. A component's `ComponentName.test.tsx` file is optional and belongs beside the component when useful.

Validation stages:

- **Pre-commit:** run related tests when applicable, along with the configured commit-stage checks.
- **Pre-push:** run the complete test suite.
- **CI:** run the complete test suite and the full validation set, including lint, format check, typecheck, and build.

The intended balance is fast local commits, broader pre-push validation, and CI as the final validation gate.

## Decision Status

- **Approved:** Vitest, React Testing Library, related pre-commit tests, full pre-push suite, complete CI validation, and no artificial coverage tests.
- **Extensible:** the exact mechanism for identifying related tests and the detailed hook commands are tooling implementation details; they must preserve these stages.

# Release readiness / pre-publication hardening

Audit snapshot: 2026-10-04. This is maintainer-facing status, not an npm release notice.

## Decisions that require the package owner

- Package identity: resolved. The package was renamed from the working name `create-base-app` (owned by an unrelated npm publisher) to `ziurcast-base`. The package name, bin, generated development dependency, generated `generate:*` scripts, usage messages, command examples, and smoke check were updated together. `ziurcast-base` was unregistered on npm at the time of the rename.
- The generator package declares `license: UNLICENSED`. Do not replace it with a public license without owner approval. Decide whether distribution is intentionally unlicensed/proprietary or specify an approved license before public distribution.

## Dependency audit

The generator's current lockfile audit reports zero vulnerabilities. Both generated Next.js audit variants (minimal and i18n + Supabase) report seven vulnerable package entries: five high and two moderate. All seven are in development dependency trees; the audit reported no vulnerable production dependency.

| Severity | Direct affected dependency | Transitive affected packages | Finding / safe path |
|---|---|---|---|
| High (5 package entries) | `eslint-config-next@16.3.8` | `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, `braces@3.0.3` | The `braces` denial-of-service advisory affects `<=3.0.3` ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). npm has no `braces@3.0.4`; the available npm audit fix proposes downgrading `eslint-config-next` to `14.2.35`, a major framework tooling downgrade from the generated Next.js 16 stack. No compatible patch was identified. Do not apply that downgrade or an unverified override. |
| Moderate (2 package entries) | `vitest@3.2.7` | `@vitest/mocker@3.2.7` | Path traversal / arbitrary file read in redirect mocks ([GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)). npm identifies `vitest@4.1.11` as a fix, which is a major upgrade from the generated `^3.2.4` range. Review migration compatibility before changing the template. |

The package entries in npm's count share two advisory chains; they are not seven separate direct dependencies. The findings are development-only, so they do not currently affect generated application production dependencies. The high finding is still a reasonable release gate for a generator that emits this toolchain. No `npm audit fix` or automatic dependency changes were applied.

## Runtime and CI

- The generator requires Node.js `>=22.13`. Node 22 was not installed in the local implementation environment; Node 25 checks do not substitute for the Node 22 contract.
- `.github/workflows/ci.yml` selects Node 22 and runs tests, typecheck, lint, build, pack, and the local-tarball smoke. A hosted GitHub Actions run is still required.
- The architecture's format-check rule applies to generated applications. Their manifests include Prettier and `format:check`. The generator repository itself has no formatter configured; its CI therefore does not add Prettier solely for this check. The release smoke installs each generated app and runs its own format check.

## Documentation alignment

- Component test files consistently use `ComponentName.test.tsx` in both `architecture/components.md` and `architecture/testing.md`.
- The i18n contract names the translator function `tCore`; the existing `useCoreTranslations()` hook is the mechanism that returns it. No new translation API was introduced.

## Local package smoke and reproducibility

Run `npm run release:smoke` from the generator repository. It builds and packs two isolated source copies, compares tarball hashes and extracted package contents, installs the local tarball into a clean prefix, runs the installed binary through minimal and i18n + Supabase wizard flows, and checks generated files/configuration. It redirects only each throwaway generated project's `ziurcast-base` dev dependency to the exact tarball under test so the unpublished build is what gets validated; it then installs each project and runs test, typecheck, lint, format check, and build. No published npm package is used, and no project dependency is replaced with an unrelated package.

The script requires Node.js `>=22.13`, macOS or Linux, npm, and system Python 3 (used only to drive the installed CLI through a pseudo-terminal). Run it under Node 22 in CI for the contractual validation.

## Publication gates

1. Authenticate with npm as the account that will own `ziurcast-base`.
2. Approve the distribution license.
3. Review the generated-project audit findings, especially the high-severity Next.js lint dependency chain and the Vitest major upgrade; do not publish with unreviewed high findings.
4. Obtain a passing hosted CI run on Node 22.
The local clean-pack comparison and tarball-installed CLI smoke are implemented and passing under Node 25. After an approved release, installing the published package from npm is a post-publication verification, not a pre-publication prerequisite.

No package has been published as part of this work.

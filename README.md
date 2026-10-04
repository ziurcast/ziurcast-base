# Project Base Generator

Project Base Generator is an npm CLI for creating an opinionated Next.js application and generating selected application artifacts. `architecture/` is the versioned contract copied into each generated project; it applies to generated applications and does not describe the generator's implementation.

## Requirements

- Node.js 22 LTS or newer (the CLI package requires Node.js `>=22.13`).
- npm.

## Create a project

The intended npm interface, after the package identity is approved and released, accepts a project name or asks for one in the wizard:

```bash
npx create-base-app my-project
npx create-base-app
```

This package has not been published to npm. The npm name in this workspace is unresolved: `create-base-app@0.1.0` is not available under the current public registry identity. Until that is resolved and the package is released, these `npx` commands do not select this workspace's implementation. To run the checked-out CLI locally, install dependencies, build it, and invoke the generated entry point:

```bash
npm run build
node dist/cli/index.js my-project
```

The wizard currently generates the Next.js preset. It asks whether to enable i18n, Supabase client/configuration, agent files (Both, Codex, Claude, or None), Git initialization, and dependency installation. It summarizes the configuration and asks for confirmation before generating. A non-empty destination is never overwritten; an existing empty directory requires confirmation.

The generated project includes a complete versioned `architecture/` copy and supports optional `next-intl` and Supabase client configuration. Supabase authentication and migrations are not generated.

## Generate artifacts

Run these commands from a generated project. The package `create-base-app` must be installed (the generated manifest declares it as a development dependency).

```bash
npm run generate:component -- Button
npm run generate:hook -- useUsers --scope modules/users
npm run generate:api -- getUsers --scope modules/users
npm run generate:page -- UsersPage --scope modules/users --route /users
npm run generate:module -- users --api getUsers --hook useUsers
```

`generate module` accepts one or more explicitly selected `--page`, `--api`, and `--hook` artifacts. A page selection requires `--route`. See each command's argument rules and the generated `architecture/` contract before use.

## Framework support

Project creation and page/component generators currently support Next.js. React SPA project generation is not implemented. Hook and API generators support the framework contexts described by their command contracts; module generation rejects page selection in a React project.

## Development and validation

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm pack
```

`npm pack` runs the build through the `prepack` lifecycle and includes compiled `dist/`, project templates, and `architecture/` in the package. `package-lock.json` should be used for reproducible development installs.

Generated applications include scripts for development, testing, linting, formatting, typechecking, building, and artifact generation. Their complete validation flow is documented in the copied `architecture/testing.md`.

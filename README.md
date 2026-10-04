# Project Base Generator

Project Base Generator is an npm CLI for creating an opinionated Next.js application and generating selected application artifacts. `architecture/` is the versioned contract copied into each generated project; it applies to generated applications and does not describe the generator's implementation.

## Requirements

- Node.js 22 LTS or newer (the CLI package requires Node.js `>=22.13`).
- npm.

## Create a project

The npm package is `ziurcast-base`. It accepts a project name or asks for one in the wizard:

```bash
npx ziurcast-base@latest my-project
npx ziurcast-base@latest
```

To run the checked-out CLI locally, install dependencies, build it, and invoke the generated entry point:

```bash
npm run build
node dist/cli/index.js my-project
```

The wizard asks for the framework preset (Next.js or React with Vite), then whether to enable i18n, Supabase client/configuration, agent files (Both, Codex, Claude, or None), Git initialization, and dependency installation. It summarizes the configuration and asks for confirmation before generating. A non-empty destination is never overwritten; an existing empty directory requires confirmation.

The generated project includes a complete versioned `architecture/` copy and supports optional i18n (`next-intl` or `react-i18next`) and Supabase client configuration. Supabase authentication and migrations are not generated.

## Generate artifacts

Run these commands from a generated project. The package `ziurcast-base` must be installed (the generated manifest declares it as a development dependency).

```bash
npm run generate:component -- Button
npm run generate:hook -- useUsers --scope modules/users
npm run generate:api -- getUsers --scope modules/users
npm run generate:page -- UsersPage --scope modules/users --route /users
npm run generate:module -- users --api getUsers --hook useUsers
```

Options may be given in any order. Run `npx ziurcast-base --help` for every command's usage, or `--version` for the installed generator version.

`generate module` accepts one or more explicitly selected `--page`, `--api`, and `--hook` artifacts. A page selection requires `--route`. See each command's argument rules and the generated `architecture/` contract before use.

## Framework support

Both presets share the architecture contract, the stack (Tailwind CSS, TanStack Query, Zustand, React Hook Form, Vitest), and every artifact generator.

- **Next.js:** App Router; pages are routed through files in `src/app/`; optional i18n uses `next-intl`.
- **React:** Vite SPA with React Router Declarative Mode; pages are registered in `src/routes/AppRoutes.tsx`; optional i18n uses `react-i18next` with locale-prefixed routes (`/es`, `/en`).

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

## License

[MIT](LICENSE)

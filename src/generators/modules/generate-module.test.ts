import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readProjectContext } from '../../project/read-project-context.js';
import { createModuleGenerationPlan, generateModule } from './generate-module.js';

const temporaryDirectories: string[] = [];

const createProject = async (
  framework: 'next' | 'react' = 'next',
  internationalization = false,
): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-module-generator-'));
  temporaryDirectories.push(rootDirectory);
  await mkdir(join(rootDirectory, 'architecture'), { recursive: true });
  await writeFile(join(rootDirectory, 'architecture/VERSION'), '1.2.0\n');
  await writeFile(
    join(rootDirectory, 'package.json'),
    JSON.stringify({ dependencies: { [framework]: '^16.0.0' } }),
  );
  await writeFile(
    join(rootDirectory, '.project-base-generator.json'),
    JSON.stringify({
      framework,
      configVersion: 1,
      architectureVersion: '1.2.0',
      features: { internationalization, supabase: false },
    }),
  );

  for (const name of [
    'modules.md',
    'project-structure.md',
    'naming-conventions.md',
    'api.md',
    'hooks.md',
    'internationalization.md',
    'coding-standards.md',
    'testing.md',
  ]) {
    await writeFile(join(rootDirectory, 'architecture', name), '# Contract\n');
  }

  if (internationalization) {
    await mkdir(join(rootDirectory, 'src/i18n'), { recursive: true });
    await writeFile(
      join(rootDirectory, 'src/i18n/messages.ts'),
      '// <pbg:importaciones-traducciones-locales>\n' +
        'const localMessages = {\n' +
        '  // <pbg:entradas-traducciones-locales>\n' +
        '};\n' +
        'export const getMessages = () => localMessages;\n',
    );
  }

  return rootDirectory;
};

const createContext = async (
  framework: 'next' | 'react' = 'next',
  internationalization = false,
) => readProjectContext(await createProject(framework, internationalization));

const findEmptyDirectories = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = entries.filter((entry) => entry.isDirectory());

  if (entries.length === 0) {
    return [directory];
  }

  const nested = await Promise.all(
    children.map((entry) => findEmptyDirectories(join(directory, entry.name))),
  );

  return nested.flat();
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('module generator', () => {
  it('generates an API only when API is selected', async () => {
    const context = await createContext();
    const plan = await createModuleGenerationPlan(context, 'users', {
      api: 'getUsers',
    });

    expect(plan.changes.map(({ relativePath }) => relativePath)).toEqual([
      'src/modules/users/api/getUsers.ts',
    ]);
  });

  it('generates a hook only when hook is selected', async () => {
    const context = await createContext();
    const plan = await createModuleGenerationPlan(context, 'users', {
      hook: 'useUsers',
    });

    expect(plan.changes.map(({ relativePath }) => relativePath)).toEqual([
      'src/modules/users/moduleHooks/useUsers.ts',
    ]);
  });

  it('delegates page and route creation to the page generator', async () => {
    const context = await createContext();
    const plan = await createModuleGenerationPlan(context, 'users', {
      page: 'UserList',
      route: '/users',
    });

    expect(plan.changes.map(({ relativePath }) => relativePath)).toEqual([
      'src/modules/users/pages/UserList/index.tsx',
      'src/app/users/page.tsx',
    ]);
  });

  it('composes selected API, hook, and page plans into one generation plan', async () => {
    const context = await createContext();
    const plan = await createModuleGenerationPlan(context, 'users', {
      api: 'getUsers',
      hook: 'useUsers',
      page: 'UserList',
      route: '/users',
    });

    expect(plan.projectRoot).toBe(context.rootDirectory);
    expect(plan.changes.map(({ relativePath }) => relativePath)).toEqual([
      'src/modules/users/api/getUsers.ts',
      'src/modules/users/moduleHooks/useUsers.ts',
      'src/modules/users/pages/UserList/index.tsx',
      'src/app/users/page.tsx',
    ]);
  });

  it('requires at least one artifact and requires page and route together', async () => {
    const context = await createContext();

    await expect(
      createModuleGenerationPlan(context, 'users', {}),
    ).rejects.toThrow('Select at least one module artifact');
    await expect(
      createModuleGenerationPlan(context, 'users', { page: 'UserList' }),
    ).rejects.toThrow('--page and --route must be provided together');
    await expect(
      createModuleGenerationPlan(context, 'users', { route: '/users' }),
    ).rejects.toThrow('--page and --route must be provided together');
  });

  it('reuses delegated scope and entity name validation', async () => {
    const context = await createContext();

    await expect(
      createModuleGenerationPlan(context, '../users', { api: 'getUsers' }),
    ).rejects.toThrow('Invalid API scope');
    await expect(
      createModuleGenerationPlan(context, 'users', { hook: 'users' }),
    ).rejects.toThrow('Hook names must start with use');
    await expect(
      createModuleGenerationPlan(context, 'users', {
        page: 'userList',
        route: '/users',
      }),
    ).rejects.toThrow('Page names must use PascalCase');
  });

  it('supports adding artifacts to a partially existing module without changing other files', async () => {
    const context = await createContext();
    const moduleDirectory = join(context.rootDirectory, 'src/modules/users');
    await mkdir(moduleDirectory, { recursive: true });
    await writeFile(join(moduleDirectory, 'README.md'), 'Existing module notes.\n');

    await generateModule(context, 'users', { api: 'getUsers' });

    await expect(
      readFile(join(moduleDirectory, 'README.md'), 'utf8'),
    ).resolves.toBe('Existing module notes.\n');
    await expect(
      readFile(join(moduleDirectory, 'api/getUsers.ts'), 'utf8'),
    ).resolves.toContain('export const getUsers');
  });

  it('rejects a file collision without writing other selected artifacts', async () => {
    const context = await createContext();
    const apiPath = join(context.rootDirectory, 'src/modules/users/api/getUsers.ts');
    await mkdir(join(context.rootDirectory, 'src/modules/users/api'), {
      recursive: true,
    });
    await writeFile(apiPath, 'existing API');

    await expect(
      generateModule(context, 'users', {
        api: 'getUsers',
        hook: 'useUsers',
      }),
    ).rejects.toThrow('Generation collision');
    await expect(readFile(apiPath, 'utf8')).resolves.toBe('existing API');
    await expect(
      readFile(
        join(context.rootDirectory, 'src/modules/users/moduleHooks/useUsers.ts'),
        'utf8',
      ),
    ).rejects.toThrow();
  });

  it('rejects route collisions without writing the module page or API', async () => {
    const context = await createContext();
    const routePath = join(context.rootDirectory, 'src/app/users/page.tsx');
    await mkdir(join(context.rootDirectory, 'src/app/users'), { recursive: true });
    await writeFile(routePath, 'existing route');

    await expect(
      generateModule(context, 'users', {
        api: 'getUsers',
        page: 'UserList',
        route: '/users',
      }),
    ).rejects.toThrow('Generation collision');
    await expect(readFile(routePath, 'utf8')).resolves.toBe('existing route');
    await expect(
      readFile(join(context.rootDirectory, 'src/modules/users/api/getUsers.ts'), 'utf8'),
    ).rejects.toThrow();
    await expect(
      readFile(
        join(context.rootDirectory, 'src/modules/users/pages/UserList/index.tsx'),
        'utf8',
      ),
    ).rejects.toThrow();
  });

  it('rejects duplicate i18n namespaces without writing selected APIs or hooks', async () => {
    const context = await createContext('next', true);
    const registryPath = join(context.rootDirectory, 'src/i18n/messages.ts');
    const initialRegistry =
      "const localMessages = {\n  'modules-users-pages-UserList': existingMessages,\n};\n";
    await writeFile(registryPath, initialRegistry);

    await expect(
      generateModule(context, 'users', {
        api: 'getUsers',
        hook: 'useUsers',
        page: 'UserList',
        route: '/users',
      }),
    ).rejects.toThrow('Translation namespace is already registered');
    await expect(readFile(registryPath, 'utf8')).resolves.toBe(initialRegistry);
    await expect(
      readFile(join(context.rootDirectory, 'src/modules/users/api/getUsers.ts'), 'utf8'),
    ).rejects.toThrow();
    await expect(
      readFile(
        join(context.rootDirectory, 'src/modules/users/moduleHooks/useUsers.ts'),
        'utf8',
      ),
    ).rejects.toThrow();
  });

  it('includes a single atomic i18n registry update with page and other selected artifacts', async () => {
    const context = await createContext('next', true);
    const plan = await createModuleGenerationPlan(context, 'users', {
      api: 'getUsers',
      hook: 'useUsers',
      page: 'UserList',
      route: '/users',
    });
    const registryChanges = plan.changes.filter(
      ({ relativePath }) => relativePath === 'src/i18n/messages.ts',
    );

    expect(registryChanges).toHaveLength(1);
    expect(registryChanges[0]?.operation).toBe('update');
    expect(registryChanges[0]?.content).toContain('modules-users-pages-UserList');
    expect(
      plan.changes.map(({ relativePath }) => relativePath),
    ).toContain('src/app/[locale]/users/page.tsx');
  });

  it('generates API and hook artifacts in React projects', async () => {
    const context = await createContext('react');
    const plan = await createModuleGenerationPlan(context, 'users', {
      api: 'getUsers',
      hook: 'useUsers',
    });

    expect(plan.changes.map(({ relativePath }) => relativePath)).toEqual([
      'src/modules/users/api/getUsers.ts',
      'src/modules/users/moduleHooks/useUsers.ts',
    ]);
  });

  it('rejects React module pages atomically when the route registry is missing', async () => {
    const context = await createContext('react');

    await expect(
      generateModule(context, 'users', {
        api: 'getPosts',
        page: 'UserList',
        route: '/users',
      }),
    ).rejects.toThrow('The React route registry is missing: src/routes/AppRoutes.tsx');
    await expect(
      readFile(join(context.rootDirectory, 'src/modules/users/api/getPosts.ts'), 'utf8'),
    ).rejects.toThrow();
  });

  it('registers React module pages in the route registry', async () => {
    const context = await createContext('react');
    await mkdir(join(context.rootDirectory, 'src/routes'), { recursive: true });
    await writeFile(
      join(context.rootDirectory, 'src/routes/AppRoutes.tsx'),
      "import { Route, Routes } from 'react-router';\n" +
        '// <pbg:importaciones-rutas>\n\n' +
        'export const AppRoutes = () => (\n' +
        '  <Routes>\n' +
        '    {/* <pbg:rutas> */}\n' +
        '  </Routes>\n' +
        ');\n',
    );

    await generateModule(context, 'users', { page: 'UserList', route: '/users' });

    await expect(
      readFile(join(context.rootDirectory, 'src/modules/users/pages/UserList/index.tsx'), 'utf8'),
    ).resolves.toContain('export const UserList');
    const routes = await readFile(
      join(context.rootDirectory, 'src/routes/AppRoutes.tsx'),
      'utf8',
    );
    expect(routes).toContain("import { UserList } from '@/modules/users/pages/UserList';");
    expect(routes).toContain('    <Route path="/users" element={<UserList />} />');
  });

  it('creates no empty directories', async () => {
    const context = await createContext();
    await generateModule(context, 'users', {
      api: 'getUsers',
      hook: 'useUsers',
      page: 'UserList',
      route: '/users',
    });

    expect(await findEmptyDirectories(context.rootDirectory)).toEqual([]);
  });
});

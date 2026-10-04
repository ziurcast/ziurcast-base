import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readProjectContext } from '../../project/read-project-context.js';
import { createPageGenerationPlan, generatePage } from './generate-page.js';

const temporaryDirectories: string[] = [];

const createProject = async (internationalization = false): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-page-generator-'));
  temporaryDirectories.push(rootDirectory);
  await mkdir(join(rootDirectory, 'architecture'), { recursive: true });
  await writeFile(join(rootDirectory, 'architecture/VERSION'), '1.2.0\n');
  await writeFile(
    join(rootDirectory, 'package.json'),
    JSON.stringify({ dependencies: { next: '^16.0.0' } }),
  );
  await writeFile(
    join(rootDirectory, '.project-base-generator.json'),
    JSON.stringify({
      framework: 'next',
      configVersion: 1,
      architectureVersion: '1.2.0',
      features: { internationalization, supabase: false },
    }),
  );

  for (const name of [
    'modules.md',
    'project-structure.md',
    'naming-conventions.md',
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
      "import coreMessages from '@/core/translations/messages/en.json';\n" +
        '// <pbg:importaciones-traducciones-locales>\n' +
        'const localMessages = {\n' +
        '  // <pbg:entradas-traducciones-locales>\n' +
        '};\n' +
        'export const getMessages = () => ({ ...coreMessages, ...localMessages });\n',
    );
  }

  return rootDirectory;
};

const findEmptyDirectories = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedDirectories = entries.filter((entry) => entry.isDirectory());

  if (entries.length === 0) {
    return [directory];
  }

  const nestedResults = await Promise.all(
    nestedDirectories.map((entry) => findEmptyDirectories(join(directory, entry.name))),
  );

  return nestedResults.flat();
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('page generator', () => {
  it('validates page names using PascalCase', async () => {
    const context = await readProjectContext(await createProject());

    for (const pageName of ['userList', 'User-List', '1User', '']) {
      await expect(
        createPageGenerationPlan(context, pageName, 'modules/users', '/users'),
      ).rejects.toThrow('Page names must use PascalCase');
    }
  });

  it('rejects unsupported and unsafe module scopes', async () => {
    const context = await readProjectContext(await createProject());

    for (const scope of [
      'src/modules/users',
      'modules/../users',
      '../users',
      '/modules/users',
      'modules/users/pages',
      'core/api/users',
    ]) {
      await expect(
        createPageGenerationPlan(context, 'UserList', scope, '/users'),
      ).rejects.toThrow(/Invalid page scope|Unsupported page scope/);
    }
  });

  it('rejects routes that are not safe absolute static paths', async () => {
    const context = await readProjectContext(await createProject());

    for (const route of [
      'users',
      '//users',
      '/users/',
      '/users//teams',
      '/users/../admin',
      '/users?active=true',
      '/users#top',
      '/[userId]',
    ]) {
      await expect(
        createPageGenerationPlan(context, 'UserList', 'modules/users', route),
      ).rejects.toThrow('Invalid route');
    }
  });

  it('generates only the module page and route when i18n is disabled', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);
    const plan = await createPageGenerationPlan(
      context,
      'UserList',
      'modules/users',
      '/users',
    );

    expect(plan.changes.map(({ relativePath }) => relativePath)).toEqual([
      'src/modules/users/pages/UserList/index.tsx',
      'src/app/users/page.tsx',
    ]);
    await generatePage(context, 'UserList', 'modules/users', '/users');

    await expect(
      readFile(join(rootDirectory, 'src/modules/users/pages/UserList/index.tsx'), 'utf8'),
    ).resolves.toBe('export const UserList = () => <main />;\n');
    await expect(
      readFile(join(rootDirectory, 'src/app/users/page.tsx'), 'utf8'),
    ).resolves.toContain("import { UserList } from '@/modules/users/pages/UserList';");
    await expect(
      readFile(join(rootDirectory, 'src/modules/users/pages/UserList/messages.json'), 'utf8'),
    ).rejects.toThrow();
    await expect(
      readFile(join(rootDirectory, 'src/i18n/messages.ts'), 'utf8'),
    ).rejects.toThrow();
  });

  it('generates translated page messages and registers the path-derived namespace', async () => {
    const rootDirectory = await createProject(true);
    const context = await readProjectContext(rootDirectory);
    const plan = await createPageGenerationPlan(
      context,
      'UserList',
      'modules/users',
      '/users',
    );

    expect(plan.changes.map(({ relativePath }) => relativePath)).toEqual([
      'src/modules/users/pages/UserList/index.tsx',
      'src/app/[locale]/users/page.tsx',
      'src/modules/users/pages/UserList/messages.json',
      'src/i18n/messages.ts',
    ]);
    expect(plan.changes[0]?.content).toContain(
      "const namespace = 'modules-users-pages-UserList';",
    );
    expect(plan.changes[2]?.content).toContain('Página UserList');
    expect(plan.changes[2]?.content).toContain('Page UserList');
    expect(plan.changes[3]?.content).toContain(
      "'modules-users-pages-UserList': PageModulesUsersPagesUserListMessages,",
    );

    await generatePage(context, 'UserList', 'modules/users', '/users');

    await expect(
      readFile(join(rootDirectory, 'src/app/[locale]/users/page.tsx'), 'utf8'),
    ).resolves.toBeDefined();
    const messages = JSON.parse(
      await readFile(
        join(rootDirectory, 'src/modules/users/pages/UserList/messages.json'),
        'utf8',
      ),
    ) as { es: { title: string }; en: { title: string } };
    expect(messages.es.title).toBe('Página UserList');
    expect(messages.en.title).toBe('Page UserList');
  });

  it('rejects page and route collisions without overwriting existing files', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);
    const modulePage = join(
      rootDirectory,
      'src/modules/users/pages/UserList/index.tsx',
    );
    const nextRoute = join(rootDirectory, 'src/app/users/page.tsx');
    await mkdir(join(rootDirectory, 'src/modules/users/pages/UserList'), {
      recursive: true,
    });
    await mkdir(join(rootDirectory, 'src/app/users'), { recursive: true });
    await writeFile(modulePage, 'existing module page');
    await writeFile(nextRoute, 'existing Next route');

    await expect(
      generatePage(context, 'UserList', 'modules/users', '/users'),
    ).rejects.toThrow('Generation collision');
    await expect(readFile(modulePage, 'utf8')).resolves.toBe('existing module page');
    await expect(readFile(nextRoute, 'utf8')).resolves.toBe('existing Next route');
  });

  it('does not partially create page files or update the registry on a collision', async () => {
    const rootDirectory = await createProject(true);
    const context = await readProjectContext(rootDirectory);
    const registryPath = join(rootDirectory, 'src/i18n/messages.ts');
    const initialRegistry = await readFile(registryPath, 'utf8');
    const routePath = join(rootDirectory, 'src/app/[locale]/users/page.tsx');
    await mkdir(join(rootDirectory, 'src/app/[locale]/users'), { recursive: true });
    await writeFile(routePath, 'existing route');

    await expect(
      generatePage(context, 'UserList', 'modules/users', '/users'),
    ).rejects.toThrow('Generation collision');
    await expect(readFile(registryPath, 'utf8')).resolves.toBe(initialRegistry);
    await expect(
      readFile(join(rootDirectory, 'src/modules/users/pages/UserList/index.tsx'), 'utf8'),
    ).rejects.toThrow();
    await expect(readFile(routePath, 'utf8')).resolves.toBe('existing route');
  });

  it('creates no empty scope directories', async () => {
    const rootDirectory = await createProject(true);
    const context = await readProjectContext(rootDirectory);

    await generatePage(context, 'UserList', 'modules/users', '/users');

    expect(await findEmptyDirectories(rootDirectory)).toEqual([]);
  });
});

import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readProjectContext } from '../../project/read-project-context.js';
import { createHookGenerationPlan, generateHook } from './generate-hook.js';
import { resolveHookTarget } from './resolve-hook-target.js';

const temporaryDirectories: string[] = [];

const createProject = async (): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-hook-generator-'));
  temporaryDirectories.push(rootDirectory);
  await mkdir(join(rootDirectory, 'architecture'), { recursive: true });
  await writeFile(join(rootDirectory, 'architecture/VERSION'), '1.0.0\n');
  await writeFile(
    join(rootDirectory, 'package.json'),
    JSON.stringify({ dependencies: { next: '^16.0.0' } }),
  );
  await writeFile(
    join(rootDirectory, '.project-base-generator.json'),
    JSON.stringify({
      framework: 'next',
      configVersion: 1,
      architectureVersion: '1.0.0',
      features: { internationalization: false, supabase: false },
    }),
  );

  for (const name of [
    'hooks.md',
    'project-structure.md',
    'naming-conventions.md',
    'coding-standards.md',
    'modules.md',
    'components.md',
  ]) {
    await writeFile(join(rootDirectory, 'architecture', name), '# Contract\n');
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

describe('hook generator', () => {
  it('generates a hook into the module hook scope and uses a generation plan', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory, {
      requiredArchitectureFiles: [
        'hooks.md',
        'project-structure.md',
        'naming-conventions.md',
        'coding-standards.md',
        'modules.md',
        'components.md',
      ],
    });
    const plan = await createHookGenerationPlan(context, 'useUsers', 'modules/users');

    expect(context.framework).toBe('next');
    expect(plan.changes).toEqual([
      {
        operation: 'create',
        relativePath: 'src/modules/users/moduleHooks/useUsers.ts',
        content: 'export const useUsers = () => undefined;\n',
      },
    ]);

    await generateHook(context, 'useUsers', 'modules/users');
    await expect(
      readFile(
        join(rootDirectory, 'src/modules/users/moduleHooks/useUsers.ts'),
        'utf8',
      ),
    ).resolves.toBe('export const useUsers = () => undefined;\n');
  });

  it('resolves each documented architectural scope to its physical directory', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);
    await mkdir(join(rootDirectory, 'src/components/Button'), { recursive: true });
    await writeFile(join(rootDirectory, 'src/components/Button/index.tsx'), 'export {};');
    await mkdir(join(rootDirectory, 'src/modules/users/pages/UserList'), {
      recursive: true,
    });
    await writeFile(
      join(rootDirectory, 'src/modules/users/pages/UserList/index.tsx'),
      'export {};',
    );

    await expect(resolveHookTarget(context, 'useUsers', 'hooks')).resolves.toBe(
      'src/hooks/useUsers.ts',
    );
    await expect(
      resolveHookTarget(context, 'useUsers', 'modules/users'),
    ).resolves.toBe('src/modules/users/moduleHooks/useUsers.ts');
    await expect(
      resolveHookTarget(context, 'useUsers', 'modules/users/pages/UserList'),
    ).resolves.toBe('src/modules/users/pages/UserList/useUsers.ts');
    await expect(
      resolveHookTarget(context, 'useButton', 'components/Button'),
    ).resolves.toBe('src/components/Button/useButton.ts');
  });

  it('rejects hook names that do not follow the use-prefixed convention', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);

    for (const hookName of ['users', 'useusers', 'use-user', 'use']) {
      await expect(
        createHookGenerationPlan(context, hookName, 'modules/users'),
      ).rejects.toThrow('Hook names must start with use');
    }
  });

  it('rejects unsupported and unsafe scopes', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);

    for (const scope of ['src/modules/users', 'modules/../users', 'shared']) {
      await expect(
        createHookGenerationPlan(context, 'useUsers', scope),
      ).rejects.toThrow(/Invalid hook scope|Unsupported hook scope/);
    }
  });

  it('requires page and component owner scopes to exist', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);

    await expect(
      resolveHookTarget(context, 'useUsers', 'modules/users/pages/UserList'),
    ).rejects.toThrow('page scope does not exist');
    await expect(
      resolveHookTarget(context, 'useButton', 'components/Button'),
    ).rejects.toThrow('component scope does not exist');
  });

  it('requires a component-owned hook to match its component name', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);
    await mkdir(join(rootDirectory, 'src/components/Button'), { recursive: true });
    await writeFile(join(rootDirectory, 'src/components/Button/index.tsx'), 'export {};');

    await expect(
      resolveHookTarget(context, 'useUsers', 'components/Button'),
    ).rejects.toThrow('must be named useButton');
  });

  it('detects collisions and never overwrites the existing hook', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);
    const hookPath = join(rootDirectory, 'src/modules/users/moduleHooks/useUsers.ts');
    await mkdir(join(rootDirectory, 'src/modules/users/moduleHooks'), {
      recursive: true,
    });
    await writeFile(hookPath, 'existing hook');

    await expect(generateHook(context, 'useUsers', 'modules/users')).rejects.toThrow(
      'Generation collision',
    );
    await expect(readFile(hookPath, 'utf8')).resolves.toBe('existing hook');
  });

  it('creates only directories required by the generated file', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);
    await generateHook(context, 'useUsers', 'modules/users');

    expect(await findEmptyDirectories(rootDirectory)).toEqual([]);
    await expect(readdir(join(rootDirectory, 'src/modules/users/moduleHooks'))).resolves.toEqual([
      'useUsers.ts',
    ]);
    await expect(readdir(join(rootDirectory, 'src/modules/users'))).resolves.toEqual([
      'moduleHooks',
    ]);
  });
});

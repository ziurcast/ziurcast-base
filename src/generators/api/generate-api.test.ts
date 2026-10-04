import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readProjectContext } from '../../project/read-project-context.js';
import { createApiGenerationPlan, generateApi } from './generate-api.js';
import { resolveApiTarget } from './resolve-api-target.js';

const temporaryDirectories: string[] = [];

const createProject = async (): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-api-generator-'));
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
      features: { internationalization: false, supabase: false },
    }),
  );

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

describe('API generator', () => {
  it('generates one backend function file using the project context and plan', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);
    const plan = await createApiGenerationPlan(context, 'getUsers', 'core/api/users');

    expect(plan.changes).toEqual([
      {
        operation: 'create',
        relativePath: 'src/core/api/users/getUsers.ts',
        content:
          "export const getUsers = () => {\n  // Implementa la función API.\n  throw new Error('Not implemented');\n};\n",
      },
    ]);

    await generateApi(context, 'getUsers', 'core/api/users');
    await expect(
      readFile(join(rootDirectory, 'src/core/api/users/getUsers.ts'), 'utf8'),
    ).resolves.toBe(plan.changes[0]?.content);
  });

  it('resolves the two supported scopes to their documented file paths', () => {
    expect(resolveApiTarget('getUsers', 'core/api/users')).toBe(
      'src/core/api/users/getUsers.ts',
    );
    expect(resolveApiTarget('createUser', 'modules/users')).toBe(
      'src/modules/users/api/createUser.ts',
    );
  });

  it('rejects invalid API names', async () => {
    const context = await readProjectContext(await createProject());

    for (const name of ['GetUsers', 'get-users', 'get_users', '1getUsers']) {
      await expect(
        createApiGenerationPlan(context, name, 'modules/users'),
      ).rejects.toThrow('API names must be lower camel case');
    }
  });

  it('rejects unsupported and unsafe scopes', async () => {
    const context = await readProjectContext(await createProject());

    for (const scope of [
      'src/modules/users',
      'modules/../users',
      '../users',
      '/core/api/users',
      'modules/users/',
      'shared/users',
      'core/users',
      'core/api',
    ]) {
      await expect(
        createApiGenerationPlan(context, 'getUsers', scope),
      ).rejects.toThrow(/Invalid API scope|Unsupported API scope/);
    }
  });

  it('detects collisions and does not overwrite existing files', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);
    const apiPath = join(rootDirectory, 'src/modules/users/api/getUsers.ts');
    await mkdir(join(rootDirectory, 'src/modules/users/api'), { recursive: true });
    await writeFile(apiPath, 'existing API');

    await expect(generateApi(context, 'getUsers', 'modules/users')).rejects.toThrow(
      'Generation collision',
    );
    await expect(readFile(apiPath, 'utf8')).resolves.toBe('existing API');
  });

  it('creates only required directories lazily', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);

    await generateApi(context, 'getUsers', 'core/api/users');

    expect(await findEmptyDirectories(rootDirectory)).toEqual([]);
    await expect(readdir(join(rootDirectory, 'src/core/api/users'))).resolves.toEqual([
      'getUsers.ts',
    ]);
  });
});

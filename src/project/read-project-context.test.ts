import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readProjectContext } from './read-project-context.js';

const temporaryDirectories: string[] = [];

const createProject = async (
  overrides: Record<string, unknown> = {},
  frameworkPackage = 'next',
): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-project-context-'));
  temporaryDirectories.push(rootDirectory);
  await mkdir(join(rootDirectory, 'architecture'));
  await writeFile(join(rootDirectory, 'architecture/VERSION'), '1.0.0\n');
  await writeFile(
    join(rootDirectory, 'package.json'),
    JSON.stringify({ dependencies: { [frameworkPackage]: '^19.0.0' } }),
  );
  await writeFile(
    join(rootDirectory, '.project-base-generator.json'),
    JSON.stringify({
      framework: 'next',
      configVersion: 1,
      architectureVersion: '1.0.0',
      features: { internationalization: true, supabase: false },
      ...overrides,
    }),
  );

  return rootDirectory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('readProjectContext', () => {
  it('returns framework, features, config version, and copied architecture version', async () => {
    const rootDirectory = await createProject();
    const context = await readProjectContext(rootDirectory);

    expect(context).toMatchObject({
      rootDirectory,
      framework: 'next',
      features: { internationalization: true, supabase: false },
      configVersion: 1,
      architectureVersion: '1.0.0',
    });
  });

  it('accepts the existing version field for previously generated projects', async () => {
    const rootDirectory = await createProject({
      configVersion: undefined,
      version: 1,
      architectureVersion: undefined,
    });
    const context = await readProjectContext(rootDirectory);

    expect(context.configVersion).toBe(1);
    expect(context.architectureVersion).toBe('1.0.0');
  });

  it('resolves a React project context without enabling React generators', async () => {
    const rootDirectory = await createProject({ framework: 'react' }, 'react');
    const context = await readProjectContext(rootDirectory);

    expect(context.framework).toBe('react');
  });

  it('rejects an incompatible configuration', async () => {
    const rootDirectory = await createProject({ framework: 'unsupported' });

    await expect(readProjectContext(rootDirectory)).rejects.toThrow(
      'configuration is incompatible',
    );
  });

  it('rejects metadata that disagrees with the copied architecture version', async () => {
    const rootDirectory = await createProject({ architectureVersion: '0.9.0' });

    await expect(readProjectContext(rootDirectory)).rejects.toThrow(
      'does not match architecture/VERSION',
    );
  });
});

import { link, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyGenerationPlan } from './apply-generation-plan.js';

const temporaryDirectories: string[] = [];

const createProject = async (): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-generation-plan-'));
  temporaryDirectories.push(rootDirectory);
  return rootDirectory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('applyGenerationPlan', () => {
  it('applies new files and updates as one plan', async () => {
    const projectRoot = await createProject();
    await writeFile(join(projectRoot, 'existing.ts'), 'before');

    await applyGenerationPlan({
      projectRoot,
      changes: [
        { operation: 'create', relativePath: 'src/components/Card/index.tsx', content: 'card' },
        {
          operation: 'update',
          relativePath: 'existing.ts',
          expectedContent: 'before',
          content: 'after',
        },
      ],
    });

    await expect(
      readFile(join(projectRoot, 'src/components/Card/index.tsx'), 'utf8'),
    ).resolves.toBe('card');
    await expect(readFile(join(projectRoot, 'existing.ts'), 'utf8')).resolves.toBe('after');
  });

  it('detects a collision before writing any planned file', async () => {
    const projectRoot = await createProject();
    await writeFile(join(projectRoot, 'existing.ts'), 'keep');

    await expect(
      applyGenerationPlan({
        projectRoot,
        changes: [
          { operation: 'create', relativePath: 'new.ts', content: 'new' },
          { operation: 'create', relativePath: 'existing.ts', content: 'overwrite' },
        ],
      }),
    ).rejects.toThrow('Generation collision');

    await expect(readdir(projectRoot)).resolves.toEqual(['existing.ts']);
  });

  it('rejects paths outside the project root', async () => {
    const projectRoot = await createProject();

    await expect(
      applyGenerationPlan({
        projectRoot,
        changes: [{ operation: 'create', relativePath: '../outside.ts', content: 'x' }],
      }),
    ).rejects.toThrow('unsafe relative path');
  });

  it('rolls back files and created folders if a commit write fails', async () => {
    const projectRoot = await createProject();

    await expect(
      applyGenerationPlan(
        {
          projectRoot,
          changes: [
            { operation: 'create', relativePath: 'src/components/First/index.tsx', content: 'first' },
            { operation: 'create', relativePath: 'src/components/Second/index.tsx', content: 'second' },
          ],
        },
        {
          link: async (source, target) => {
            if (target.endsWith('/Second/index.tsx')) {
              throw new Error('simulated commit failure');
            }

            await link(source, target);
          },
        },
      ),
    ).rejects.toThrow('simulated commit failure');

    await expect(readdir(projectRoot)).resolves.toEqual([]);
  });
});

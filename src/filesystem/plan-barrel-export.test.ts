import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyGenerationPlan } from './apply-generation-plan.js';
import { planBarrelExport } from './plan-barrel-export.js';

const temporaryDirectories: string[] = [];

const createProject = async (): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-barrel-plan-'));
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

describe('planBarrelExport', () => {
  it('creates a lazy barrel when it does not exist', async () => {
    const projectRoot = await createProject();
    const barrelChange = await planBarrelExport(
      projectRoot,
      'src/components/index.ts',
      'Button',
      './Button',
    );

    expect(barrelChange.operation).toBe('create');
    await applyGenerationPlan({ projectRoot, changes: [barrelChange] });
    await expect(
      readFile(join(projectRoot, 'src/components/index.ts'), 'utf8'),
    ).resolves.toBe("export { Button } from './Button';\n");
  });

  it('updates an existing barrel while preserving exports', async () => {
    const projectRoot = await createProject();
    await mkdir(join(projectRoot, 'src/components'), { recursive: true });
    await writeFile(
      join(projectRoot, 'src/components/index.ts'),
      "export { Card } from './Card';\n",
    );
    const barrelChange = await planBarrelExport(
      projectRoot,
      'src/components/index.ts',
      'Button',
      './Button',
    );

    expect(barrelChange.operation).toBe('update');
    await applyGenerationPlan({ projectRoot, changes: [barrelChange] });
    await expect(
      readFile(join(projectRoot, 'src/components/index.ts'), 'utf8'),
    ).resolves.toBe("export { Card } from './Card';\nexport { Button } from './Button';\n");
  });

  it('rejects an export that already exists', async () => {
    const projectRoot = await createProject();
    await mkdir(join(projectRoot, 'src/components'), { recursive: true });
    await writeFile(
      join(projectRoot, 'src/components/index.ts'),
      "export { Button } from './Button';\n",
    );

    await expect(
      planBarrelExport(projectRoot, 'src/components/index.ts', 'Button', './Button'),
    ).rejects.toThrow('already exported');
  });
});

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { inspectTargetDirectory } from './inspect-target-directory.js';

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'ziurcast-base-'));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('inspectTargetDirectory', () => {
  it('reports a missing directory', async () => {
    const parent = await createTemporaryDirectory();
    expect(await inspectTargetDirectory(join(parent, 'missing'))).toEqual({
      kind: 'missing',
    });
  });

  it('reports an empty directory', async () => {
    const parent = await createTemporaryDirectory();
    const target = join(parent, 'empty');
    await mkdir(target);
    expect(await inspectTargetDirectory(target)).toEqual({ kind: 'empty' });
  });

  it('reports a non-empty directory', async () => {
    const target = await createTemporaryDirectory();
    await writeFile(join(target, 'keep.txt'), 'content');
    expect(await inspectTargetDirectory(target)).toEqual({ kind: 'non-empty' });
  });

  it('reports a file at the destination', async () => {
    const parent = await createTemporaryDirectory();
    const target = join(parent, 'file');
    await writeFile(target, 'content');
    expect(await inspectTargetDirectory(target)).toEqual({ kind: 'not-directory' });
  });
});

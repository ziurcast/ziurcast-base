import { readdir, stat } from 'node:fs/promises';

export type TargetDirectoryState =
  | { kind: 'missing' }
  | { kind: 'empty' }
  | { kind: 'non-empty' }
  | { kind: 'not-directory' };

export const inspectTargetDirectory = async (
  targetDirectory: string,
): Promise<TargetDirectoryState> => {
  try {
    const targetStat = await stat(targetDirectory);

    if (!targetStat.isDirectory()) {
      return { kind: 'not-directory' };
    }

    const entries = await readdir(targetDirectory);
    return entries.length === 0 ? { kind: 'empty' } : { kind: 'non-empty' };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { kind: 'missing' };
    }

    throw error;
  }
};

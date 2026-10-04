import { mkdir } from 'node:fs/promises';
import { inspectTargetDirectory } from './inspect-target-directory.js';

export const prepareTargetDirectory = async (
  targetDirectory: string,
  allowExistingEmptyDirectory: boolean,
): Promise<void> => {
  const state = await inspectTargetDirectory(targetDirectory);

  if (state.kind === 'non-empty') {
    throw new Error(`Destination contains files and will not be overwritten: ${targetDirectory}`);
  }

  if (state.kind === 'not-directory') {
    throw new Error(`Destination exists and is not a directory: ${targetDirectory}`);
  }

  if (state.kind === 'empty' && !allowExistingEmptyDirectory) {
    throw new Error(`Destination appeared after confirmation: ${targetDirectory}`);
  }

  if (state.kind === 'missing') {
    try {
      await mkdir(targetDirectory);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
        throw new Error(
          `Destination appeared during generation: ${targetDirectory}`,
          { cause: error },
        );
      }

      throw error;
    }
  }
};

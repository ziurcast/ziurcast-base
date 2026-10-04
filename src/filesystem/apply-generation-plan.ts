import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  rmdir,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type {
  GenerationFileChange,
  GenerationPlan,
} from '../types/generation-plan.js';

export type GenerationFileSystem = {
  lstat: typeof lstat;
  mkdir: typeof mkdir;
  mkdtemp: typeof mkdtemp;
  readFile: typeof readFile;
  realpath: typeof realpath;
  rename: typeof rename;
  rm: typeof rm;
  rmdir: typeof rmdir;
  writeFile: typeof writeFile;
  link: typeof link;
};

const fileSystem: GenerationFileSystem = {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  rmdir,
  writeFile,
  link,
};

const hasErrorCode = (error: unknown, code: string): boolean =>
  error instanceof Error && 'code' in error && error.code === code;

const getFilePath = (rootDirectory: string, relativePath: string): string => {
  if (
    !relativePath ||
    isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    relativePath.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`Generation plan contains an unsafe relative path: ${relativePath}`);
  }

  const absolutePath = resolve(rootDirectory, ...relativePath.split('/'));
  const pathFromRoot = relative(rootDirectory, absolutePath);

  if (
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error(`Generation plan path escapes the project root: ${relativePath}`);
  }

  return absolutePath;
};

const pathExists = async (
  fileSystemAdapter: GenerationFileSystem,
  filePath: string,
): Promise<boolean> => {
  try {
    await fileSystemAdapter.lstat(filePath);
    return true;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return false;
    }

    throw error;
  }
};

const validateExistingParents = async (
  fileSystemAdapter: GenerationFileSystem,
  rootDirectory: string,
  targetPath: string,
): Promise<void> => {
  let currentDirectory = dirname(targetPath);

  while (currentDirectory !== rootDirectory) {
    if (!(await pathExists(fileSystemAdapter, currentDirectory))) {
      currentDirectory = dirname(currentDirectory);
      continue;
    }

    const currentStat = await fileSystemAdapter.lstat(currentDirectory);

    if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) {
      throw new Error(`Generation path contains a non-directory parent: ${currentDirectory}`);
    }

    currentDirectory = dirname(currentDirectory);
  }
};

const validatePlan = async (
  fileSystemAdapter: GenerationFileSystem,
  projectRoot: string,
  changes: GenerationFileChange[],
): Promise<string[]> => {
  const paths = new Set<string>();
  const targetPaths: string[] = [];

  for (const change of changes) {
    const targetPath = getFilePath(projectRoot, change.relativePath);

    if (paths.has(targetPath)) {
      throw new Error(`Generation plan contains a duplicate path: ${change.relativePath}`);
    }

    paths.add(targetPath);
    targetPaths.push(targetPath);
    await validateExistingParents(fileSystemAdapter, projectRoot, targetPath);
    const targetExists = await pathExists(fileSystemAdapter, targetPath);

    if (change.operation === 'create' && targetExists) {
      throw new Error(`Generation collision: ${change.relativePath} already exists.`);
    }

    if (change.operation === 'update') {
      if (!targetExists) {
        throw new Error(`Generation update target does not exist: ${change.relativePath}`);
      }

      const targetStat = await fileSystemAdapter.lstat(targetPath);

      if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
        throw new Error(`Generation update target is not a regular file: ${change.relativePath}`);
      }

      const existingContent = await fileSystemAdapter.readFile(targetPath, 'utf8');

      if (existingContent !== change.expectedContent) {
        throw new Error(`Generation update target changed: ${change.relativePath}`);
      }
    }
  }

  return targetPaths;
};

const ensureParentDirectories = async (
  fileSystemAdapter: GenerationFileSystem,
  rootDirectory: string,
  targetPath: string,
  createdDirectories: string[],
): Promise<void> => {
  const missingDirectories: string[] = [];
  let currentDirectory = dirname(targetPath);

  while (currentDirectory !== rootDirectory) {
    if (await pathExists(fileSystemAdapter, currentDirectory)) {
      const currentStat = await fileSystemAdapter.lstat(currentDirectory);

      if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) {
        throw new Error(`Generation path contains a non-directory parent: ${currentDirectory}`);
      }
    } else {
      missingDirectories.push(currentDirectory);
    }

    currentDirectory = dirname(currentDirectory);
  }

  for (const directory of missingDirectories.reverse()) {
    await fileSystemAdapter.mkdir(directory);
    createdDirectories.push(directory);
  }
};

export const applyGenerationPlan = async (
  plan: GenerationPlan,
  fileSystemOverrides: Partial<GenerationFileSystem> = {},
): Promise<void> => {
  const fileSystemAdapter = { ...fileSystem, ...fileSystemOverrides };
  const projectRoot = await fileSystemAdapter.realpath(resolve(plan.projectRoot));
  const rootStat = await fileSystemAdapter.lstat(projectRoot);

  if (!rootStat.isDirectory()) {
    throw new Error(`Generation project root is not a directory: ${projectRoot}`);
  }

  const targetPaths = await validatePlan(
    fileSystemAdapter,
    projectRoot,
    plan.changes,
  );
  const stagingDirectory = await fileSystemAdapter.mkdtemp(
    resolve(projectRoot, '.project-base-generator-stage-'),
  );
  const stagedPaths: string[] = [];
  const createdFiles: string[] = [];
  const createdDirectories: string[] = [];
  const originalContents = new Map<string, string>();
  let committed = false;

  try {
    for (const [index, change] of plan.changes.entries()) {
      const stagedPath = resolve(stagingDirectory, `${index}.stage`);
      await fileSystemAdapter.writeFile(stagedPath, change.content, {
        flag: 'wx',
      });
      stagedPaths.push(stagedPath);
    }

    for (const [index, change] of plan.changes.entries()) {
      const targetPath = targetPaths[index];
      const stagedPath = stagedPaths[index];

      if (!targetPath || !stagedPath) {
        throw new Error('Generation plan could not be applied.');
      }

      await ensureParentDirectories(
        fileSystemAdapter,
        projectRoot,
        targetPath,
        createdDirectories,
      );

      if (change.operation === 'create') {
        await fileSystemAdapter.link(stagedPath, targetPath);
        createdFiles.push(targetPath);
        await fileSystemAdapter.rm(stagedPath, { force: true });
        continue;
      }

      const currentContent = await fileSystemAdapter.readFile(targetPath, 'utf8');

      if (currentContent !== change.expectedContent) {
        throw new Error(`Generation update target changed during commit: ${change.relativePath}`);
      }

      originalContents.set(targetPath, currentContent);
      await fileSystemAdapter.rename(stagedPath, targetPath);
    }

    committed = true;
  } catch (error) {
    for (const targetPath of [...createdFiles].reverse()) {
      await fileSystemAdapter.rm(targetPath, { force: true }).catch(() => undefined);
    }

    for (const [targetPath, originalContent] of [...originalContents.entries()].reverse()) {
      await fileSystemAdapter
        .writeFile(targetPath, originalContent)
        .catch(() => undefined);
    }

    for (const directory of [...createdDirectories].reverse()) {
      await fileSystemAdapter.rmdir(directory).catch(() => undefined);
    }

    throw error;
  } finally {
    await fileSystemAdapter
      .rm(stagingDirectory, { recursive: true, force: true })
      .catch(() => undefined);

    if (!committed) {
      for (const directory of [...createdDirectories].reverse()) {
        await fileSystemAdapter.rmdir(directory).catch(() => undefined);
      }
    }
  }
};

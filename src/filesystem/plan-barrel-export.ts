import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { GenerationFileChange } from '../types/generation-plan.js';

const hasExport = (source: string, exportName: string): boolean => {
  const namedExports = /export\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/gs;

  for (const match of source.matchAll(namedExports)) {
    const exportNames = match[1]?.split(',').map((name) => name.trim()) ?? [];

    if (
      exportNames.some((name) =>
        new RegExp(`(?:^|\\s+as\\s+)${exportName}$`).test(name),
      )
    ) {
      return true;
    }
  }

  return new RegExp(
    `export\\s+(?:const|function|class)\\s+${exportName}\\b`,
  ).test(source);
};

export const planBarrelExport = async (
  projectRoot: string,
  relativePath: string,
  exportName: string,
  importPath: string,
): Promise<GenerationFileChange> => {
  const barrelPath = resolve(projectRoot, relativePath);
  let existingContent: string | undefined;

  try {
    const barrelStat = await lstat(barrelPath);

    if (!barrelStat.isFile() || barrelStat.isSymbolicLink()) {
      throw new Error(`Barrel path is not a regular file: ${relativePath}`);
    }

    existingContent = await readFile(barrelPath, 'utf8');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }

  if (existingContent !== undefined && hasExport(existingContent, exportName)) {
    throw new Error(`Export already exported from ${relativePath}: ${exportName}`);
  }

  const normalizedContent = existingContent?.trimEnd() ?? '';
  const exportLine = `export { ${exportName} } from '${importPath}';`;
  const content = normalizedContent
    ? `${normalizedContent}\n${exportLine}\n`
    : `${exportLine}\n`;

  return existingContent === undefined
    ? { operation: 'create', relativePath, content }
    : {
        operation: 'update',
        relativePath,
        expectedContent: existingContent,
        content,
      };
};

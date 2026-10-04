import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export type TemplateTokens = Record<string, string>;

export const writeTemplateTree = async (
  sourceDirectory: string,
  targetDirectory: string,
  tokens: TemplateTokens = {},
): Promise<void> => {
  const entries = await readdir(sourceDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(sourceDirectory, entry.name);
    const targetName = entry.name.endsWith('.tpl')
      ? entry.name.slice(0, -4)
      : entry.name;
    const targetPath = join(targetDirectory, targetName);

    if (entry.isDirectory()) {
      await writeTemplateTree(sourcePath, targetPath, tokens);
      continue;
    }

    const template = await readFile(sourcePath, 'utf8');
    const rendered = Object.entries(tokens).reduce(
      (content, [token, value]) => content.replaceAll(`{{${token}}}`, value),
      template,
    );

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, rendered, { flag: 'wx' });
  }
};

export const copyDirectory = async (
  sourceDirectory: string,
  targetDirectory: string,
): Promise<void> => {
  await cp(sourceDirectory, targetDirectory, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
};

export const writeJsonFile = async (
  targetPath: string,
  value: unknown,
): Promise<void> => {
  const absolutePath = resolve(targetPath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, {
    flag: 'wx',
  });
};

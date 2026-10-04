import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const loadGeneratorTemplate = (
  relativePath: string,
  tokens: Record<string, string> = {},
): string => {
  const templatePath = resolve(packageRoot, 'src/templates/generators', relativePath);
  const template = readFileSync(templatePath, 'utf8');

  return Object.entries(tokens).reduce(
    (content, [token, value]) => content.replaceAll(`{{${token}}}`, value),
    template,
  );
};

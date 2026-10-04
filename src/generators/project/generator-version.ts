import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const readGeneratorVersion = (): string => {
  const manifest = JSON.parse(
    readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
  ) as { version?: unknown };

  if (typeof manifest.version !== 'string' || !manifest.version) {
    throw new Error('The generator package version is missing.');
  }

  return manifest.version;
};

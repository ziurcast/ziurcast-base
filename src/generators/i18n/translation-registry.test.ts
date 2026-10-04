import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  planComponentTranslationRegistryUpdate,
  planPageTranslationRegistryUpdate,
} from './translation-registry.js';

const temporaryDirectories: string[] = [];

const createProject = async (): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-i18n-adapter-'));
  temporaryDirectories.push(rootDirectory);
  await mkdir(join(rootDirectory, 'src/i18n'), { recursive: true });
  await writeFile(
    join(rootDirectory, 'src/i18n/messages.ts'),
    `import type { Locale } from './routing';
// <pbg:importaciones-traducciones-locales>

const localMessages = {
  'modules-home-pages-HomePage': homePageMessages,
  // <pbg:entradas-traducciones-locales>
};

export const getMessages = (locale: Locale) => localMessages;
`,
  );
  return rootDirectory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('translation registry', () => {
  it('plans imports and namespace registration through stable anchors', async () => {
    const projectRoot = await createProject();
    const change = await planComponentTranslationRegistryUpdate(projectRoot, 'Button');

    expect(change.operation).toBe('update');
    if (change.operation !== 'update') {
      throw new Error('Expected a registry update.');
    }
    expect(change.content).toContain(
      "import ButtonMessages from '@/components/Button/messages.json';",
    );
    expect(change.content).toContain("'components-Button': ButtonMessages,");
  });

  it('wraps entries that exceed the print width like Prettier', async () => {
    const projectRoot = await createProject();
    const change = await planPageTranslationRegistryUpdate(
      projectRoot,
      'billing',
      'InvoicesPage',
      'modules-billing-pages-InvoicesPage',
    );

    expect(change.content).toContain(
      "  'modules-billing-pages-InvoicesPage':\n    PageModulesBillingPagesInvoicesPageMessages,",
    );
  });
});

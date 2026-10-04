import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  ComponentDefinition,
  ComponentProjectContext,
} from '../../types/component-generator.js';
import { createDefaultComponentSource } from './default-component.js';
import {
  createComponentGenerationPlan,
  generateComponentFiles,
} from './generate-component.js';
import { readComponentProjectContext } from './project-context.js';

const temporaryDirectories: string[] = [];

const createProject = async (internationalization = false): Promise<string> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'base-component-generator-'));
  temporaryDirectories.push(rootDirectory);
  await mkdir(join(rootDirectory, 'architecture'), { recursive: true });
  await mkdir(join(rootDirectory, 'src/i18n'), { recursive: true });
  await writeFile(
    join(rootDirectory, 'package.json'),
    JSON.stringify({ dependencies: { next: '^16.0.0' } }),
  );
  await writeFile(
    join(rootDirectory, '.project-base-generator.json'),
    JSON.stringify({
      framework: 'next',
      configVersion: 1,
      architectureVersion: '1.0.0',
      features: { internationalization, supabase: false },
    }),
  );
  await writeFile(join(rootDirectory, 'architecture/VERSION'), '1.0.0\n');

  for (const fileName of [
    'components.md',
    'coding-standards.md',
    'naming-conventions.md',
    'internationalization.md',
    'testing.md',
  ]) {
    await writeFile(join(rootDirectory, 'architecture', fileName), '# Contract\n');
  }

  await writeFile(
    join(rootDirectory, 'src/i18n/messages.ts'),
    `import homePageMessages from '@/modules/home/pages/HomePage/messages.json';
import type { Locale } from './routing';

const localMessages = {
  'modules-home-pages-HomePage': homePageMessages,
};

export const getMessages = (locale: Locale) => ({
  ...Object.fromEntries(
    Object.entries(localMessages).map(([namespace, messages]) => [
      namespace,
      messages[locale],
    ]),
  ),
});
`,
  );

  return rootDirectory;
};

const createContext = (
  rootDirectory: string,
  internationalization = false,
): ComponentProjectContext => ({
  rootDirectory,
  framework: 'next',
  features: { internationalization, supabase: false },
  configVersion: 1,
  architectureVersion: '1.0.0',
  configuration: {
    framework: 'next',
    configVersion: 1,
    architectureVersion: '1.0.0',
    features: { internationalization, supabase: false },
  },
});

const createDefinition = (
  name = 'Button',
  overrides: Partial<ComponentDefinition> = {},
): ComponentDefinition => ({
  name,
  componentSource: createDefaultComponentSource(name),
  ...overrides,
});

const findEmptyDirectories = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedDirectories = entries.filter((entry) => entry.isDirectory());

  if (entries.length === 0) {
    return [directory];
  }

  const nestedEmptyDirectories = await Promise.all(
    nestedDirectories.map((entry) => findEmptyDirectories(join(directory, entry.name))),
  );

  return nestedEmptyDirectories.flat();
};

beforeEach(() => {
  temporaryDirectories.length = 0;
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('component generator', () => {
  it('plans the component entrypoint and shared barrel update before writing', async () => {
    const rootDirectory = await createProject();
    const plan = await createComponentGenerationPlan(
      createContext(rootDirectory),
      createDefinition(),
    );

    expect(plan.changes.map(({ relativePath }) => relativePath)).toEqual([
      'src/components/Button/index.tsx',
      'src/components/index.ts',
    ]);
    await expect(readdir(join(rootDirectory, 'src/components'))).rejects.toThrow();
  });

  it('generates a presentational Button with only its entrypoint and barrel', async () => {
    const rootDirectory = await createProject();
    await generateComponentFiles(createContext(rootDirectory), createDefinition());

    const componentFiles = await readdir(join(rootDirectory, 'src/components/Button'));
    const source = await readFile(
      join(rootDirectory, 'src/components/Button/index.tsx'),
      'utf8',
    );
    const barrel = await readFile(join(rootDirectory, 'src/components/index.ts'), 'utf8');

    expect(componentFiles).toEqual(['index.tsx']);
    expect(source).toContain('classNames?: Readonly');
    expect(source).not.toContain('className?:');
    expect(barrel).toBe("export { Button } from './Button';\n");
  });

  it('creates and uses a component hook only when logic is supplied', async () => {
    const rootDirectory = await createProject();
    const definition = createDefinition('Toggle', {
      componentSource: `import { useToggle } from './useToggle';\nexport const Toggle = () => {\n  const { enabled } = useToggle();\n  return <button type="button">{enabled ? 'On' : 'Off'}</button>;\n};\n`,
      hookSource: `export const useToggle = () => ({ enabled: true });\n`,
    });

    await generateComponentFiles(createContext(rootDirectory), definition);

    await expect(
      readFile(join(rootDirectory, 'src/components/Toggle/useToggle.ts'), 'utf8'),
    ).resolves.toContain('export const useToggle');
    await expect(
      readFile(join(rootDirectory, 'src/components/Toggle/index.tsx'), 'utf8'),
    ).resolves.toContain("from './useToggle'");
  });

  it('does not create a hook for a presentational component', async () => {
    const rootDirectory = await createProject();
    await generateComponentFiles(
      createContext(rootDirectory),
      createDefinition('Card'),
    );

    const files = await readdir(join(rootDirectory, 'src/components/Card'));
    expect(files).toEqual(['index.tsx']);
  });

  it('does not create tests or a README unless useful content is supplied', async () => {
    const rootDirectory = await createProject();
    await generateComponentFiles(createContext(rootDirectory), createDefinition());

    const files = await readdir(join(rootDirectory, 'src/components/Button'));
    expect(files).not.toContain('Button.test.tsx');
    expect(files).not.toContain('Button.Readme.md');
  });

  it('creates optional tests and a non-empty README when supplied', async () => {
    const rootDirectory = await createProject();
    await generateComponentFiles(
      createContext(rootDirectory),
      createDefinition('Button', {
        testSource: `import { render, screen } from '@testing-library/react';\nimport { Button } from './index';\n`,
        readme: '# Button\n\nA native button wrapper.\n',
      }),
    );

    const files = await readdir(join(rootDirectory, 'src/components/Button'));
    expect(files).toContain('Button.test.tsx');
    expect(files).toContain('Button.Readme.md');
    await expect(
      readFile(join(rootDirectory, 'src/components/Button/Button.Readme.md'), 'utf8'),
    ).resolves.toContain('A native button wrapper.');
  });

  it('does not create messages.json when project i18n is disabled', async () => {
    const rootDirectory = await createProject(false);
    await generateComponentFiles(
      createContext(rootDirectory, false),
      createDefinition('Button', {
        messages: { label: { es: 'Guardar', en: 'Save' } },
      }),
    );

    const files = await readdir(join(rootDirectory, 'src/components/Button'));
    expect(files).not.toContain('messages.json');
  });

  it('creates local messages and registers the route-derived namespace when i18n is enabled', async () => {
    const rootDirectory = await createProject(true);
    await generateComponentFiles(
      createContext(rootDirectory, true),
      createDefinition('Button', {
        componentSource: `import { useTranslations } from '@/core/translations/useTranslations';\n\nconst namespace = 'components-Button';\n\nexport const Button = () => {\n  const t = useTranslations(namespace);\n  return <button type="button">{t('label')}</button>;\n};\n`,
        messages: { label: { es: 'Guardar', en: 'Save' } },
      }),
    );

    const messages = JSON.parse(
      await readFile(join(rootDirectory, 'src/components/Button/messages.json'), 'utf8'),
    ) as Record<string, Record<string, string>>;
    const registry = await readFile(join(rootDirectory, 'src/i18n/messages.ts'), 'utf8');

    expect(messages).toEqual({ es: { label: 'Guardar' }, en: { label: 'Save' } });
    expect(registry).toContain("'components-Button': ButtonMessages");
    expect(registry).toContain("from '@/components/Button/messages.json'");
  });

  it('rejects a duplicate barrel export without changing existing files', async () => {
    const rootDirectory = await createProject();
    await mkdir(join(rootDirectory, 'src/components'), { recursive: true });
    const barrel = "export { Button } from './Button';\n";
    await writeFile(join(rootDirectory, 'src/components/index.ts'), barrel);

    await expect(
      generateComponentFiles(createContext(rootDirectory), createDefinition()),
    ).rejects.toThrow('already exported');
    await expect(
      readFile(join(rootDirectory, 'src/components/index.ts'), 'utf8'),
    ).resolves.toBe(barrel);
    await expect(
      readdir(join(rootDirectory, 'src/components/Button')),
    ).rejects.toThrow();
  });

  it('does not overwrite an existing component directory', async () => {
    const rootDirectory = await createProject();
    const componentDirectory = join(rootDirectory, 'src/components/Button');
    await mkdir(componentDirectory, { recursive: true });
    await writeFile(join(componentDirectory, 'index.tsx'), 'existing');

    await expect(
      generateComponentFiles(createContext(rootDirectory), createDefinition()),
    ).rejects.toThrow('already exists');
    await expect(
      readFile(join(componentDirectory, 'index.tsx'), 'utf8'),
    ).resolves.toBe('existing');
  });

  it('rejects names that are not PascalCase', async () => {
    const rootDirectory = await createProject();

    for (const invalidName of ['button', 'user-card', 'user_card']) {
      await expect(
        generateComponentFiles(
          createContext(rootDirectory),
          createDefinition(invalidName),
        ),
      ).rejects.toThrow('PascalCase');
    }
  });

  it('rejects execution outside a compatible generated project', async () => {
    const outsideDirectory = await mkdtemp(join(tmpdir(), 'not-base-project-'));
    temporaryDirectories.push(outsideDirectory);

    await expect(readComponentProjectContext(outsideDirectory)).rejects.toThrow(
      'compatible Project Base Generator project',
    );
  });

  it('creates no empty scope directories', async () => {
    const rootDirectory = await createProject();
    await generateComponentFiles(createContext(rootDirectory), createDefinition());

    const emptyDirectories = await findEmptyDirectories(rootDirectory);
    expect(emptyDirectories).toEqual([]);
  });
});

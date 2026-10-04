import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ProjectOptions } from '../../types/project-options.js';
import { getProjectTemplateDirectories } from './generate-project.js';

const projectTemplates = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../templates/project',
);

const createOptions = (overrides: Partial<ProjectOptions> = {}): ProjectOptions => ({
  projectName: 'test-project',
  packageName: 'test-project',
  targetDirectory: '/tmp/test-project',
  framework: 'next',
  internationalization: false,
  supabase: false,
  agent: 'none',
  initializeGit: false,
  installDependencies: false,
  ...overrides,
});

describe('project template selection', () => {
  it('selects framework-specific templates for each preset', () => {
    expect(getProjectTemplateDirectories(createOptions())).toEqual([
      'common',
      'next',
      'features/no-i18n/next',
    ]);
    expect(
      getProjectTemplateDirectories(
        createOptions({
          framework: 'react',
          internationalization: true,
          supabase: true,
          agent: 'both',
        }),
      ),
    ).toEqual([
      'common',
      'react',
      'agents/codex',
      'agents/claude',
      'features/i18n/common',
      'features/i18n/react',
      'features/supabase/react',
    ]);
  });

  it('only selects template directories that exist', () => {
    for (const framework of ['next', 'react'] as const) {
      for (const internationalization of [false, true]) {
        const directories = getProjectTemplateDirectories(
          createOptions({ framework, internationalization, supabase: true, agent: 'both' }),
        );

        for (const directory of directories) {
          expect(existsSync(resolve(projectTemplates, directory)), directory).toBe(true);
        }
      }
    }
  });
});

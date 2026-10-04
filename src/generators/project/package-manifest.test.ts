import { describe, expect, it } from 'vitest';
import type { ProjectOptions } from '../../types/project-options.js';
import { readFileSync } from 'node:fs';
import { buildPackageManifest } from './package-manifest.js';

const createOptions = (
  overrides: Partial<ProjectOptions> = {},
): ProjectOptions => ({
  projectName: 'test-project',
  packageName: 'test-project',
  targetDirectory: '/tmp/test-project',
  framework: 'next',
  internationalization: false,
  supabase: false,
  agent: 'both',
  initializeGit: false,
  installDependencies: false,
  ...overrides,
});

describe('generated package manifest', () => {
  it('keeps optional Next.js features conditional', () => {
    const baseManifest = buildPackageManifest(createOptions());
    const optionalManifest = buildPackageManifest(
      createOptions({ internationalization: true, supabase: true }),
    );

    expect(baseManifest.dependencies).not.toHaveProperty('next-intl');
    expect(baseManifest.dependencies).not.toHaveProperty('@supabase/supabase-js');
    expect(optionalManifest.dependencies).toHaveProperty('next-intl');
    expect(optionalManifest.dependencies).toHaveProperty('@supabase/supabase-js');
  });

  it('keeps generator-only dependencies out of application dependencies', () => {
    const manifest = buildPackageManifest(createOptions());

    expect(manifest.dependencies).not.toHaveProperty('@inquirer/prompts');
    expect(manifest.dependencies).not.toHaveProperty('validate-npm-package-name');
    expect(manifest.devDependencies).toHaveProperty('ziurcast-base');
    expect(manifest.scripts).toHaveProperty('generate:component');
    expect(manifest.scripts).toHaveProperty('generate:hook');
    expect(manifest.scripts).toHaveProperty('generate:api');
    expect(manifest.scripts).toHaveProperty('generate:page');
    expect(manifest.scripts).toHaveProperty('generate:module');
  });

  it('depends on the running generator version', () => {
    const generatorManifest = JSON.parse(
      readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
    ) as { version: string };
    const manifest = buildPackageManifest(createOptions());

    expect(manifest.devDependencies['ziurcast-base']).toBe(
      `^${generatorManifest.version}`,
    );
  });
});

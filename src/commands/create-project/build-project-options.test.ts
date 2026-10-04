import { describe, expect, it } from 'vitest';
import { buildProjectOptions } from './build-project-options.js';

describe('buildProjectOptions', () => {
  it('combines validated project identity, wizard answers, and an absolute target', () => {
    expect(buildProjectOptions({
      projectName: 'My Project',
      packageName: 'my-project',
      framework: 'react',
      internationalization: true,
      supabase: false,
      agent: 'codex',
      initializeGit: true,
      installDependencies: false,
    }, '/workspace')).toEqual({
      projectName: 'My Project',
      packageName: 'my-project',
      targetDirectory: '/workspace/My Project',
      framework: 'react',
      internationalization: true,
      supabase: false,
      agent: 'codex',
      initializeGit: true,
      installDependencies: false,
    });
  });
});

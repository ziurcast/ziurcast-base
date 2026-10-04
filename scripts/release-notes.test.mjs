import { describe, expect, it } from 'vitest';
import {
  buildReleaseNotes,
  changelogHeader,
  compareVersions,
  getRepositoryUrl,
  insertReleaseNotes,
  parseCommit,
  resolveNextVersion,
} from './release-notes.mjs';

const repositoryUrl = 'https://github.com/ziurcast/ziurcast-base';
const hash = 'aa811f2c0ffee0000000000000000000000000000';

describe('release versions', () => {
  it('bumps semantic versions and accepts explicit versions', () => {
    expect(resolveNextVersion('0.1.0', 'major')).toBe('1.0.0');
    expect(resolveNextVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(resolveNextVersion('1.2.3', 'patch')).toBe('1.2.4');
    expect(resolveNextVersion('0.1.0', '1.0.0')).toBe('1.0.0');
  });

  it('rejects versions that are not greater or not stable semver', () => {
    expect(() => resolveNextVersion('1.0.0', '1.0.0')).toThrow('must be greater');
    expect(() => resolveNextVersion('1.0.0', '0.9.0')).toThrow('must be greater');
    expect(() => resolveNextVersion('1.0.0', '2.0.0-beta.1')).toThrow('Invalid version');
    expect(() => resolveNextVersion('1.0.0', 'next')).toThrow('Invalid version');
  });

  it('compares versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});

describe('conventional commits', () => {
  it('classifies commits by type and scope', () => {
    expect(parseCommit({ hash, subject: 'feat(cli): add --help' })).toEqual({
      hash,
      section: 'feat',
      scope: 'cli',
      description: 'add --help',
    });
    expect(parseCommit({ hash, subject: 'chore: license under MIT' })?.section).toBe(
      'maintenance',
    );
    expect(parseCommit({ hash, subject: 'Update readme' })?.section).toBe('other');
  });

  it('detects breaking changes from the bang or the footer', () => {
    expect(parseCommit({ hash, subject: 'feat!: drop Node 20' })?.section).toBe('breaking');
    expect(
      parseCommit({
        hash,
        subject: 'refactor(cli): rename flags',
        body: 'Details.\n\nBREAKING CHANGE: --scope is now required.',
      })?.section,
    ).toBe('breaking');
  });

  it('hides release, test, and style commits', () => {
    expect(parseCommit({ hash, subject: 'chore(release): v1.0.0' })).toBeUndefined();
    expect(parseCommit({ hash, subject: 'test: cover parser' })).toBeUndefined();
    expect(parseCommit({ hash, subject: 'style: format files' })).toBeUndefined();
  });
});

describe('release notes', () => {
  it('groups entries by section with commit links', () => {
    const notes = buildReleaseNotes({
      version: '1.0.0',
      date: '2026-10-04',
      repositoryUrl,
      commits: [
        { hash, subject: 'feat: add the React (Vite SPA) preset' },
        { hash, subject: 'fix(cli): harden argument handling' },
        { hash, subject: 'chore: license under MIT' },
      ],
    });

    expect(notes).toBe(
      `## [1.0.0](${repositoryUrl}/releases/tag/v1.0.0) - 2026-10-04\n\n` +
        '### Features\n\n' +
        `- add the React (Vite SPA) preset ([aa811f2](${repositoryUrl}/commit/${hash}))\n\n` +
        '### Bug Fixes\n\n' +
        `- **cli:** harden argument handling ([aa811f2](${repositoryUrl}/commit/${hash}))\n\n` +
        '### Maintenance\n\n' +
        `- license under MIT ([aa811f2](${repositoryUrl}/commit/${hash}))\n`,
    );
  });

  it('links to the comparison with the previous tag', () => {
    const notes = buildReleaseNotes({
      version: '1.1.0',
      date: '2026-11-01',
      repositoryUrl,
      previousTag: 'v1.0.0',
      commits: [{ hash, subject: 'feat: add a generator' }],
    });

    expect(notes).toContain(`## [1.1.0](${repositoryUrl}/compare/v1.0.0...v1.1.0) - 2026-11-01`);
  });

  it('refuses to release without releasable commits', () => {
    expect(() =>
      buildReleaseNotes({
        version: '1.0.1',
        date: '2026-11-01',
        repositoryUrl,
        commits: [{ hash, subject: 'chore(release): v1.0.0' }],
      }),
    ).toThrow('no releasable commits');
  });
});

describe('changelog file', () => {
  it('creates the changelog with a header', () => {
    expect(insertReleaseNotes(undefined, '## [1.0.0]\n')).toBe(`${changelogHeader}\n## [1.0.0]\n`);
  });

  it('inserts new notes above the latest release', () => {
    const existing = `${changelogHeader}\n## [1.0.0]\n\n- first\n`;

    expect(insertReleaseNotes(existing, '## [1.1.0]\n\n- second\n')).toBe(
      `${changelogHeader}\n## [1.1.0]\n\n- second\n\n## [1.0.0]\n\n- first\n`,
    );
  });
});

describe('repository URL', () => {
  it('normalizes npm repository URLs', () => {
    expect(
      getRepositoryUrl({ type: 'git', url: 'git+https://github.com/ziurcast/ziurcast-base.git' }),
    ).toBe(repositoryUrl);
  });
});

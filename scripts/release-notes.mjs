// Lógica pura del release: versiones, commits convencionales y changelog.

const versionPattern = /^(\d+)\.(\d+)\.(\d+)$/;
const conventionalPattern =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<description>.+)$/;

// Orden de las secciones del changelog; los tipos ausentes no se publican.
const sectionTitles = [
  ['breaking', 'Breaking Changes'],
  ['feat', 'Features'],
  ['fix', 'Bug Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['docs', 'Documentation'],
  ['maintenance', 'Maintenance'],
  ['other', 'Other Changes'],
];

const maintenanceTypes = new Set(['build', 'chore', 'ci']);
const hiddenTypes = new Set(['style', 'test']);

export const changelogHeader = `# Changelog

All notable changes to this project are documented in this file. Versions follow [Semantic Versioning](https://semver.org/), and entries are generated from [Conventional Commits](https://www.conventionalcommits.org/) by \`npm run release\`.
`;

const parseVersion = (version) => {
  const match = versionPattern.exec(version);

  if (!match) {
    throw new Error(`Invalid version: ${version}. Use MAJOR.MINOR.PATCH.`);
  }

  return match.slice(1).map(Number);
};

export const compareVersions = (first, second) => {
  const firstParts = parseVersion(first);
  const secondParts = parseVersion(second);

  for (const [index, part] of firstParts.entries()) {
    const difference = part - secondParts[index];

    if (difference !== 0) {
      return Math.sign(difference);
    }
  }

  return 0;
};

export const resolveNextVersion = (currentVersion, specifier) => {
  const [major, minor, patch] = parseVersion(currentVersion);
  const bumps = {
    major: `${major + 1}.0.0`,
    minor: `${major}.${minor + 1}.0`,
    patch: `${major}.${minor}.${patch + 1}`,
  };
  const nextVersion = bumps[specifier] ?? specifier;

  if (compareVersions(nextVersion, currentVersion) <= 0) {
    throw new Error(
      `The next version (${nextVersion}) must be greater than the current version (${currentVersion}).`,
    );
  }

  return nextVersion;
};

export const parseCommit = ({ hash, subject, body = '' }) => {
  const match = conventionalPattern.exec(subject);

  if (!match?.groups) {
    return { hash, section: 'other', scope: undefined, description: subject };
  }

  const { type, scope, bang, description } = match.groups;
  const breaking = Boolean(bang) || /^BREAKING[ -]CHANGE: /m.test(body);

  // Los propios commits de release y los cambios sin efecto para el usuario no se listan.
  if (!breaking && (hiddenTypes.has(type) || (type === 'chore' && scope === 'release'))) {
    return undefined;
  }

  const typeSection = maintenanceTypes.has(type)
    ? 'maintenance'
    : sectionTitles.some(([key]) => key === type)
      ? type
      : 'other';

  return {
    hash,
    section: breaking ? 'breaking' : typeSection,
    scope,
    description,
  };
};

const formatEntry = ({ hash, scope, description }, repositoryUrl) => {
  const scopeLabel = scope ? `**${scope}:** ` : '';

  return `- ${scopeLabel}${description} ([${hash.slice(0, 7)}](${repositoryUrl}/commit/${hash}))`;
};

export const buildReleaseNotes = ({ version, date, commits, repositoryUrl, previousTag }) => {
  const entries = commits.map(parseCommit).filter(Boolean);

  if (entries.length === 0) {
    throw new Error('There are no releasable commits since the previous release.');
  }

  const link = previousTag
    ? `${repositoryUrl}/compare/${previousTag}...v${version}`
    : `${repositoryUrl}/releases/tag/v${version}`;
  const sections = sectionTitles
    .map(([key, title]) => {
      const sectionEntries = entries.filter((entry) => entry.section === key);

      return sectionEntries.length === 0
        ? undefined
        : `### ${title}\n\n${sectionEntries.map((entry) => formatEntry(entry, repositoryUrl)).join('\n')}`;
    })
    .filter(Boolean);

  return `## [${version}](${link}) - ${date}\n\n${sections.join('\n\n')}\n`;
};

// Inserta las notas nuevas encima de la versión más reciente, conservando la cabecera.
export const insertReleaseNotes = (existingChangelog, releaseNotes) => {
  if (!existingChangelog?.trim()) {
    return `${changelogHeader}\n${releaseNotes}`;
  }

  const firstReleaseIndex = existingChangelog.search(/^## /m);

  if (firstReleaseIndex < 0) {
    return `${existingChangelog.trimEnd()}\n\n${releaseNotes}`;
  }

  return `${existingChangelog.slice(0, firstReleaseIndex)}${releaseNotes}\n${existingChangelog.slice(firstReleaseIndex)}`;
};

export const getRepositoryUrl = (repository) => {
  const url = typeof repository === 'string' ? repository : repository?.url;

  if (!url) {
    throw new Error('package.json must declare a repository URL.');
  }

  return url.replace(/^git\+/, '').replace(/\.git$/, '');
};

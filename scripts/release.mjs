import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildReleaseNotes,
  getRepositoryUrl,
  insertReleaseNotes,
  resolveNextVersion,
} from './release-notes.mjs';

// Prepara la release localmente: CHANGELOG, versión, commit y tag.
// El push y el npm publish son irreversibles y los lanza una persona (ver /release).

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const changelogPath = join(repositoryRoot, 'CHANGELOG.md');
const releaseBranch = 'main';
const usage = `Usage: npm run release -- <major|minor|patch|x.y.z> [--dry-run] [--skip-ci-check]

Prepares the release locally: updates CHANGELOG.md, package.json, and package-lock.json,
commits "chore(release): vX.Y.Z", and creates the tag vX.Y.Z. It never pushes or publishes.

  --dry-run        Show the next version and release notes without changing anything.
  --skip-ci-check  Do not require a successful GitHub Actions run for HEAD.`;

const parseArguments = (args) => {
  const flags = new Set(args.filter((arg) => arg.startsWith('--')));
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const knownFlags = new Set(['--dry-run', '--skip-ci-check', '--help']);
  const unknownFlag = [...flags].find((flag) => !knownFlags.has(flag));

  if (flags.has('--help')) {
    console.log(usage);
    process.exit(0);
  }

  if (unknownFlag || positional.length !== 1) {
    throw new Error(unknownFlag ? `Unknown option: ${unknownFlag}\n\n${usage}` : usage);
  }

  return {
    specifier: positional[0],
    dryRun: flags.has('--dry-run'),
    skipCiCheck: flags.has('--skip-ci-check'),
  };
};

const capture = (command, args) => {
  const result = spawnSync(command, args, { cwd: repositoryRoot, encoding: 'utf8' });

  return {
    ok: !result.error && result.status === 0,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
};

const run = (command, args) => {
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: repositoryRoot, stdio: 'inherit' });

  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }
};

const git = (...args) => {
  const result = capture('git', args);

  if (!result.ok) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }

  return result.stdout;
};

const getPreviousTag = () => {
  const result = capture('git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*']);

  return result.ok ? result.stdout : undefined;
};

const readCommits = (previousTag) => {
  const range = previousTag ? [`${previousTag}..HEAD`] : ['HEAD'];
  const output = git('log', ...range, '--no-merges', '--format=%H%x1f%s%x1f%b%x1e');

  return output
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, body] = record.split('\x1f');
      return { hash, subject, body };
    });
};

const checkContinuousIntegration = () => {
  if (!capture('gh', ['auth', 'status']).ok) {
    return ['GitHub CLI is unavailable or not authenticated; use --skip-ci-check to skip the CI gate.'];
  }

  const head = git('rev-parse', 'HEAD');
  const result = capture('gh', [
    'run',
    'list',
    '--commit',
    head,
    '--workflow',
    'CI',
    '--json',
    'status,conclusion',
    '--limit',
    '1',
  ]);
  const [latestRun] = result.ok ? JSON.parse(result.stdout || '[]') : [];

  if (!latestRun) {
    return [`No CI run was found for ${head.slice(0, 7)}.`];
  }

  if (latestRun.status !== 'completed') {
    return [`The CI run for ${head.slice(0, 7)} has not finished yet.`];
  }

  return latestRun.conclusion === 'success'
    ? []
    : [`The CI run for ${head.slice(0, 7)} concluded with ${latestRun.conclusion}.`];
};

// En --dry-run los problemas se informan como avisos para poder previsualizar las notas.
const checkPreconditions = ({ version, packageName, dryRun, skipCiCheck }) => {
  const problems = [];
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');

  if (branch !== releaseBranch) {
    problems.push(`Releases must run from ${releaseBranch}; the current branch is ${branch}.`);
  }

  if (git('status', '--porcelain')) {
    problems.push('The working tree has uncommitted changes.');
  }

  if (capture('git', ['fetch', '--quiet', 'origin', releaseBranch]).ok) {
    if (git('rev-parse', 'HEAD') !== git('rev-parse', `origin/${releaseBranch}`)) {
      problems.push(`HEAD is not in sync with origin/${releaseBranch}; pull or push first.`);
    }
  } else {
    problems.push(`Could not fetch origin/${releaseBranch}.`);
  }

  if (capture('git', ['rev-parse', '--verify', '--quiet', `refs/tags/v${version}`]).ok) {
    problems.push(`The tag v${version} already exists.`);
  }

  if (capture('npm', ['view', `${packageName}@${version}`, 'version']).stdout === version) {
    problems.push(`${packageName}@${version} is already published on npm.`);
  }

  if (!skipCiCheck) {
    problems.push(...checkContinuousIntegration());
  }

  if (problems.length === 0) {
    return;
  }

  const message = problems.map((problem) => `- ${problem}`).join('\n');

  if (!dryRun) {
    throw new Error(`The release cannot start:\n${message}`);
  }

  console.warn(`Warnings (a real release would stop here):\n${message}\n`);
};

const main = () => {
  const options = parseArguments(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));
  const version = resolveNextVersion(manifest.version, options.specifier);
  const previousTag = getPreviousTag();
  const releaseNotes = buildReleaseNotes({
    version,
    date: new Date().toISOString().slice(0, 10),
    commits: readCommits(previousTag),
    repositoryUrl: getRepositoryUrl(manifest.repository),
    previousTag,
  });

  checkPreconditions({
    version,
    packageName: manifest.name,
    dryRun: options.dryRun,
    skipCiCheck: options.skipCiCheck,
  });

  console.log(`Release ${manifest.name}: ${manifest.version} -> ${version}`);
  console.log(`Changes since ${previousTag ?? 'the first commit'}:\n\n${releaseNotes}`);

  if (options.dryRun) {
    console.log('Dry run: no files, commits, or tags were changed.');
    return;
  }

  const existingChangelog = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf8')
    : undefined;
  writeFileSync(changelogPath, insertReleaseNotes(existingChangelog, releaseNotes));
  run('npm', ['version', version, '--no-git-tag-version']);
  run('git', ['add', 'CHANGELOG.md', 'package.json', 'package-lock.json']);
  run('git', ['commit', '--quiet', '-m', `chore(release): v${version}`]);
  run('git', ['tag', '--annotate', `v${version}`, '--message', `v${version}`]);

  console.log(
    `\nPrepared v${version} locally. Nothing was pushed or published.\n` +
      `To release it:   git push origin ${releaseBranch} --follow-tags && npm publish\n` +
      `To undo it:      git tag -d v${version} && git reset --hard HEAD~1`,
  );
};

try {
  main();
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

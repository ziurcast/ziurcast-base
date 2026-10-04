import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  buildReleaseNotes,
  getRepositoryUrl,
  insertReleaseNotes,
  resolveNextVersion,
} from './release-notes.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const changelogPath = join(repositoryRoot, 'CHANGELOG.md');
const releaseBranch = 'main';
const usage = `Usage: npm run release -- <major|minor|patch|x.y.z> [--dry-run] [--yes] [--smoke] [--skip-ci-check]

  --dry-run        Show the next version and release notes without changing anything.
  --yes            Skip the confirmation prompt before publishing.
  --smoke          Also run the release smoke (requires Node.js >=22.13, macOS or Linux).
  --skip-ci-check  Do not require a successful GitHub Actions run for the release commit.`;

const parseArguments = (args) => {
  const flags = new Set(args.filter((arg) => arg.startsWith('--')));
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const knownFlags = new Set(['--dry-run', '--yes', '--smoke', '--skip-ci-check', '--help']);
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
    yes: flags.has('--yes'),
    smoke: flags.has('--smoke'),
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
  console.log(`\n$ ${command} ${args.join(' ')}`);
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

const readPackageManifest = () =>
  JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));

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

// Comprobaciones previas; en --dry-run se informan como avisos para poder previsualizar.
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
    const head = git('rev-parse', 'HEAD');
    const remoteHead = git('rev-parse', `origin/${releaseBranch}`);

    if (head !== remoteHead) {
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

  const npmUser = capture('npm', ['whoami']);

  if (!npmUser.ok) {
    problems.push('You are not logged in to npm. Run npm login with the package owner account.');
  }

  if (!skipCiCheck) {
    problems.push(...checkContinuousIntegration());
  }

  if (problems.length > 0) {
    const message = problems.map((problem) => `- ${problem}`).join('\n');

    if (!dryRun) {
      throw new Error(`The release cannot start:\n${message}`);
    }

    console.warn(`\nWarnings (a real release would stop here):\n${message}`);
  }

  return { npmUser: npmUser.ok ? npmUser.stdout : undefined };
};

const checkContinuousIntegration = () => {
  if (!capture('gh', ['auth', 'status']).ok) {
    return ['GitHub CLI is unavailable or not authenticated; use --skip-ci-check to release without the CI gate.'];
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

const confirm = async (question) => {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question(`${question} (y/N) `);
  prompt.close();

  return /^y(es)?$/i.test(answer.trim());
};

const createGitHubRelease = (version, releaseNotes) => {
  if (!capture('gh', ['auth', 'status']).ok) {
    console.warn('\nGitHub CLI is unavailable; create the GitHub release for this tag manually.');
    return;
  }

  // El cuerpo del release omite el encabezado de versión, que ya es el título.
  const body = releaseNotes.split('\n').slice(2).join('\n');
  const notesDirectory = mkdtempSync(join(tmpdir(), 'ziurcast-release-'));
  const notesPath = join(notesDirectory, 'notes.md');

  try {
    writeFileSync(notesPath, body);
    run('gh', ['release', 'create', `v${version}`, '--title', `v${version}`, '--notes-file', notesPath]);
  } finally {
    rmSync(notesDirectory, { recursive: true, force: true });
  }
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const manifest = readPackageManifest();
  const version = resolveNextVersion(manifest.version, options.specifier);
  const previousTag = getPreviousTag();
  const releaseNotes = buildReleaseNotes({
    version,
    date: new Date().toISOString().slice(0, 10),
    commits: readCommits(previousTag),
    repositoryUrl: getRepositoryUrl(manifest.repository),
    previousTag,
  });
  const { npmUser } = checkPreconditions({
    version,
    packageName: manifest.name,
    dryRun: options.dryRun,
    skipCiCheck: options.skipCiCheck,
  });

  console.log(`\nRelease ${manifest.name}: ${manifest.version} -> ${version}`);
  console.log(`Changes since ${previousTag ?? 'the first commit'}:\n\n${releaseNotes}`);

  if (options.dryRun) {
    console.log('Dry run: no files, commits, tags, or packages were changed.');
    return;
  }

  for (const script of ['test', 'typecheck', 'lint', 'build']) {
    run('npm', ['run', script]);
  }

  if (options.smoke) {
    run('npm', ['run', 'release:smoke']);
  }

  if (
    !options.yes &&
    !(await confirm(`Publish ${manifest.name}@${version} to npm as ${npmUser}?`))
  ) {
    console.log('Release cancelled. Nothing was changed.');
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

  try {
    run('npm', ['publish']);
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n` +
        `The release commit and tag v${version} exist locally but were not pushed.\n` +
        `Retry with "npm publish" and then "git push origin ${releaseBranch} --follow-tags",\n` +
        `or undo them with "git tag -d v${version} && git reset --hard HEAD~1".`,
      { cause: error },
    );
  }

  run('git', ['push', 'origin', releaseBranch, '--follow-tags']);
  createGitHubRelease(version, releaseNotes);
  console.log(`\nReleased ${manifest.name}@${version}.`);
};

main().catch((error) => {
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

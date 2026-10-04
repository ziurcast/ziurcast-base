import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageManifest = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));
const architectureVersion = readFileSync(join(repositoryRoot, 'architecture/VERSION'), 'utf8').trim();
const temporaryRoot = mkdtempSync(join(process.env.TMPDIR ?? '/tmp', 'pbg-release-smoke-'));
const npmCache = join(temporaryRoot, 'npm-cache');

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, npm_config_cache: npmCache, ...options.env },
    encoding: options.encoding === null ? null : (options.encoding ?? 'utf8'),
    input: options.input,
    maxBuffer: 16 * 1024 * 1024,
    timeout: options.timeout ?? 180_000,
  });

  if (result.error) {
    throw new Error(`${result.error.message}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  }

  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    throw new Error(
      `${command} ${args.join(' ')} exited with ${result.status}.
${output.slice(-5000)}`,
    );
  }

  return result.stdout;
};

const getTarFiles = (archivePath) =>
  run('tar', ['-tzf', archivePath])
    .split('\n')
    .filter((entry) => entry && !entry.endsWith('/'))
    .sort();

const hash = (value) => createHash('sha256').update(value).digest('hex');

const comparePackageContents = (firstArchive, secondArchive) => {
  const firstFiles = getTarFiles(firstArchive);
  const secondFiles = getTarFiles(secondArchive);
  const differingPaths = [];
  const firstExtract = join(temporaryRoot, 'extract-one');
  const secondExtract = join(temporaryRoot, 'extract-two');

  mkdirSync(firstExtract, { recursive: true });
  mkdirSync(secondExtract, { recursive: true });
  run('tar', ['-xzf', firstArchive, '-C', firstExtract]);
  run('tar', ['-xzf', secondArchive, '-C', secondExtract]);

  if (firstFiles.join('\n') !== secondFiles.join('\n')) {
    return {
      identical: false,
      differingPaths: ['package file lists differ'],
    };
  }

  for (const filePath of firstFiles) {
    const firstContent = readFileSync(join(firstExtract, filePath));
    const secondContent = readFileSync(join(secondExtract, filePath));

    if (!firstContent.equals(secondContent)) {
      differingPaths.push(filePath);
    }
  }

  return { identical: differingPaths.length === 0, differingPaths };
};

const createCleanPackSource = (destination) => {
  cpSync(repositoryRoot, destination, {
    recursive: true,
    filter: (sourcePath) => {
      const relativePath = relative(repositoryRoot, sourcePath);
      const firstSegment = relativePath.split(sep)[0];

      return (
        relativePath === '' ||
        !['node_modules', 'dist', 'coverage', '.git'].includes(firstSegment) &&
        !sourcePath.endsWith('.tgz')
      );
    },
  });
  symlinkSync(join(repositoryRoot, 'node_modules'), join(destination, 'node_modules'), 'dir');
};

const packFromCleanCopy = (copyPath, destination) => {
  mkdirSync(destination, { recursive: true });
  run('npm', ['pack', '--pack-destination', destination], { cwd: copyPath });
  return join(destination, `${packageManifest.name}-${packageManifest.version}.tgz`);
};

const reportReproducibility = (firstArchive, secondArchive) => {
  const firstBytes = readFileSync(firstArchive);
  const secondBytes = readFileSync(secondArchive);
  const packageComparison = comparePackageContents(firstArchive, secondArchive);

  console.log(`First tarball SHA-256: ${hash(firstBytes)}`);
  console.log(`Second tarball SHA-256: ${hash(secondBytes)}`);

  if (firstBytes.equals(secondBytes)) {
    console.log('Reproducibility: tarballs are byte-identical.');
    return;
  }

  if (!packageComparison.identical) {
    throw new Error(
      `Reproducibility failure; packaged paths or contents differ: ${packageComparison.differingPaths.join(', ')}`,
    );
  }

  const firstTar = gunzipSync(firstBytes);
  const secondTar = gunzipSync(secondBytes);
  console.warn(
    'Reproducibility warning: tarball bytes differ, but all packaged paths and file contents match.',
  );

  if (firstTar.equals(secondTar)) {
    console.warn('The difference is limited to gzip metadata or compression bytes.');
    return;
  }

  const firstListing = run('tar', ['-tvzf', firstArchive]);
  const secondListing = run('tar', ['-tvzf', secondArchive]);
  const firstLines = firstListing.split('\n');
  const secondLines = secondListing.split('\n');
  const listingDifferences = firstLines
    .map((line, index) => (line === secondLines[index] ? undefined : `${line} <> ${secondLines[index]}`))
    .filter(Boolean);

  console.warn(`Tar metadata differences: ${listingDifferences.join('; ') || 'archive headers or padding'}`);
};

const runInstalledCli = (
  binaryPath,
  workingDirectory,
  projectName,
  { internationalization, supabase },
) => {
  const pythonPtyRunner = [
    'import errno, json, os, pty, select, sys, time',
    'binary, project_name = sys.argv[1:3]',
    'child_pid, master_fd = pty.fork()',
    'if child_pid == 0:',
    '    os.execvpe(binary, [binary, project_name], os.environ)',
    'features = json.loads(sys.argv[3])',
    "prompts = [(b'Enable internationalization?', b'y\\r' if features['internationalization'] else b'\\r'), (b'Use Supabase?', b'y\\r' if features['supabase'] else b'\\r'), (b'AI Agent', b'\\r'), (b'Initialize Git?', b'n\\r'), (b'Install dependencies?', b'n\\r'), (b'Create project?', b'\\r')]",
    'prompt_index, output_buffer = 0, bytearray()',
    'deadline = time.monotonic() + 100',
    'while True:',
    '    if time.monotonic() > deadline:',
    "        raise TimeoutError('CLI prompt interaction timed out')",
    '    readable, _, _ = select.select([master_fd], [], [], 0.2)',
    '    if readable:',
    '        try:',
    '            output = os.read(master_fd, 4096)',
    '        except OSError as error:',
    '            if error.errno == errno.EIO:',
    '                break',
    '            raise',
    '        if not output:',
    '            break',
    '        os.write(sys.stdout.fileno(), output)',
    '        output_buffer.extend(output)',
    '        if prompt_index < len(prompts) and prompts[prompt_index][0] in output_buffer:',
    '            os.write(master_fd, prompts[prompt_index][1])',
    '            prompt_index += 1',
    '            output_buffer.clear()',
    '    ended_pid, status = os.waitpid(child_pid, os.WNOHANG)',
    '    if ended_pid == child_pid:',
    '        break',
    '_, status = os.waitpid(child_pid, 0) if not ended_pid else (ended_pid, status)',
    'sys.exit(os.waitstatus_to_exitcode(status))',
  ].join('\n');
  const result = spawnSync(
    'python3',
    [
      '-c',
      pythonPtyRunner,
      binaryPath,
      projectName,
      JSON.stringify({ internationalization, supabase }),
    ],
    {
    cwd: workingDirectory,
    env: { ...process.env, npm_config_cache: npmCache },
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000,
    },
  );

  if (result.error) {
    throw new Error(`${result.error.message}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `Installed CLI exited with ${result.status}.
${`${result.stdout ?? ''}${result.stderr ?? ''}`.slice(-5000)}`,
    );
  }
};

const validateGeneratedProject = (projectDirectory, localPackageTarball) => {
  const manifestPath = join(projectDirectory, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // Solo el proyecto temporal apunta al tarball que se está probando, no a la versión publicada en npm.
  manifest.devDependencies['ziurcast-base'] = `file:${localPackageTarball}`;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    'For this temporary validation only, ziurcast-base resolves to the exact local tarball under test instead of the npm registry.',
  );

  run('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: projectDirectory,
    timeout: 600_000,
  });

  for (const script of ['test', 'typecheck', 'lint', 'format:check', 'build']) {
    run('npm', ['run', script], { cwd: projectDirectory, timeout: 600_000 });
    console.log(`${projectDirectory}: npm run ${script} passed.`);
  }
};

const main = () => {
  const [major, minor] = process.versions.node.split('.').map(Number);

  if (major < 22 || (major === 22 && minor < 13)) {
    throw new Error('Release smoke requires Node.js >=22.13.');
  }

  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    throw new Error('Release smoke currently supports macOS and Linux hosts.');
  }

  const firstSource = join(temporaryRoot, 'pack-source-one');
  const secondSource = join(temporaryRoot, 'pack-source-two');
  const firstDestination = join(temporaryRoot, 'pack-one');
  const secondDestination = join(temporaryRoot, 'pack-two');

  createCleanPackSource(firstSource);
  createCleanPackSource(secondSource);

  const firstArchive = packFromCleanCopy(firstSource, firstDestination);
  const secondArchive = packFromCleanCopy(secondSource, secondDestination);
  const archiveEntries = getTarFiles(firstArchive);
  const requiredEntries = [
    'package/dist/cli/index.js',
    'package/src/templates/load-template.ts',
    'package/src/templates/project/features/no-i18n/src/app/page.tsx.tpl',
    'package/architecture/README.md',
    'package/architecture/VERSION',
  ];
  const missingEntries = requiredEntries.filter((entry) => !archiveEntries.includes(entry));

  if (missingEntries.length > 0) {
    throw new Error(`Tarball is missing required entries: ${missingEntries.join(', ')}`);
  }

  console.log(`Packaged ${archiveEntries.length} files across two clean copies.`);
  reportReproducibility(firstArchive, secondArchive);

  const installPrefix = join(temporaryRoot, 'installed-package');
  mkdirSync(installPrefix, { recursive: true });
  run('npm', ['install', '--prefix', installPrefix, '--no-audit', '--no-fund', firstArchive]);

  const packageBin =
    typeof packageManifest.bin === 'string'
      ? Object.keys({ [packageManifest.name]: packageManifest.bin })[0]
      : Object.keys(packageManifest.bin ?? {})[0];

  if (!packageBin) {
    throw new Error('The package manifest does not define a CLI binary.');
  }

  const binaryName = process.platform === 'win32' ? `${packageBin}.cmd` : packageBin;
  const binaryPath = join(installPrefix, 'node_modules/.bin', binaryName);
  const projectName = 'pbg-release-smoke';

  if (!existsSync(binaryPath)) {
    throw new Error(`Installed package binary not found: ${binaryPath}`);
  }

  const projectVariants = [
    {
      name: projectName,
      internationalization: false,
      supabase: false,
      requiredFiles: [
        'package.json',
        'README.md',
        '.project-base-generator.json',
        'architecture/VERSION',
        'architecture/README.md',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'AGENTS.md',
        'CLAUDE.md',
      ],
    },
    {
      name: `${projectName}-optional`,
      internationalization: true,
      supabase: true,
      requiredFiles: [
        'package.json',
        '.project-base-generator.json',
        'architecture/VERSION',
        'src/app/[locale]/layout.tsx',
        'src/app/[locale]/page.tsx',
        'src/i18n/messages.ts',
        'src/core/supabase/client.ts',
        '.env.example',
        'AGENTS.md',
        'CLAUDE.md',
      ],
    },
  ];

  for (const variant of projectVariants) {
    const variantDirectory = join(temporaryRoot, variant.name);
    runInstalledCli(binaryPath, temporaryRoot, variant.name, variant);

    const missingProjectFiles = variant.requiredFiles.filter(
      (filePath) => !existsSync(join(variantDirectory, filePath)),
    );

    if (missingProjectFiles.length > 0) {
      throw new Error(
        `${variant.name} is missing generated files: ${missingProjectFiles.join(', ')}`,
      );
    }

    const generatedManifest = JSON.parse(
      readFileSync(join(variantDirectory, 'package.json'), 'utf8'),
    );
    const generatedConfig = JSON.parse(
      readFileSync(join(variantDirectory, '.project-base-generator.json'), 'utf8'),
    );

    if (
      generatedManifest.name !== variant.name ||
      generatedConfig.framework !== 'next' ||
      generatedConfig.architectureVersion !== architectureVersion ||
      generatedConfig.features.internationalization !== variant.internationalization ||
      generatedConfig.features.supabase !== variant.supabase ||
      Boolean(generatedManifest.dependencies['next-intl']) !== variant.internationalization ||
      Boolean(generatedManifest.dependencies['@supabase/supabase-js']) !== variant.supabase ||
      existsSync(join(variantDirectory, 'src/i18n')) !== variant.internationalization ||
      existsSync(join(variantDirectory, 'src/core/supabase')) !== variant.supabase
    ) {
      throw new Error(`${variant.name} has unexpected framework or optional-feature configuration.`);
    }

    console.log(`Installed tarball binary generated ${variantDirectory}.`);
    validateGeneratedProject(variantDirectory, firstArchive);
  }
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

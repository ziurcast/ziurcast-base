import { dirname, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { copyDirectory, writeJsonFile, writeTemplateTree } from '../../filesystem/write-template-tree.js';
import { prepareTargetDirectory } from '../../filesystem/prepare-target-directory.js';
import { runCommand } from '../../filesystem/run-command.js';
import type { ProjectOptions } from '../../types/project-options.js';
import type { BaseGeneratorConfig } from '../../types/base-generator-config.js';
import { buildPackageManifest } from './package-manifest.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const commonTemplates = resolve(packageRoot, 'src/templates/project/common');
const nextTemplates = resolve(packageRoot, 'src/templates/project/next');
const optionalTemplates = resolve(packageRoot, 'src/templates/project/features');
const agentTemplates = resolve(packageRoot, 'src/templates/project/agents');
const architectureSource = resolve(packageRoot, 'architecture');

export type ProjectGenerationOptions = {
  allowExistingEmptyDirectory: boolean;
};

const writeProjectTree = async (options: ProjectOptions): Promise<void> => {
  const tokens = { projectName: options.projectName };
  const targetDirectory = options.targetDirectory;

  await writeTemplateTree(commonTemplates, targetDirectory, tokens);
  await writeTemplateTree(nextTemplates, targetDirectory, tokens);
  await copyDirectory(architectureSource, resolve(targetDirectory, 'architecture'));

  if (options.agent === 'both' || options.agent === 'codex') {
    await writeTemplateTree(
      resolve(agentTemplates, 'codex'),
      targetDirectory,
      tokens,
    );
  }

  if (options.agent === 'both' || options.agent === 'claude') {
    await writeTemplateTree(
      resolve(agentTemplates, 'claude'),
      targetDirectory,
      tokens,
    );
  }

  if (options.internationalization) {
    await writeTemplateTree(
      resolve(optionalTemplates, 'i18n'),
      targetDirectory,
      tokens,
    );
  } else {
    await writeTemplateTree(
      resolve(optionalTemplates, 'no-i18n'),
      targetDirectory,
      tokens,
    );
  }

  if (options.supabase) {
    await writeTemplateTree(
      resolve(optionalTemplates, 'supabase'),
      targetDirectory,
      tokens,
    );
  }

  await writeJsonFile(
    resolve(targetDirectory, 'package.json'),
    buildPackageManifest(options),
  );

  const architectureVersion = (
    await readFile(resolve(architectureSource, 'VERSION'), 'utf8')
  ).trim();
  const generatorConfig: BaseGeneratorConfig = {
    framework: 'next',
    configVersion: 1,
    architectureVersion,
    features: {
      internationalization: options.internationalization,
      supabase: options.supabase,
    },
  };

  await writeJsonFile(
    resolve(targetDirectory, '.project-base-generator.json'),
    generatorConfig,
  );
};

export const generateNextProject = async (
  options: ProjectOptions,
  generationOptions: ProjectGenerationOptions,
): Promise<void> => {
  if (options.framework !== 'next') {
    throw new Error('This generator release supports the Next.js preset only.');
  }

  await prepareTargetDirectory(
    options.targetDirectory,
    generationOptions.allowExistingEmptyDirectory,
  );

  try {
    await writeProjectTree(options);

    if (options.initializeGit) {
      await runCommand('git', ['init', '--quiet'], options.targetDirectory);
    }

    if (options.installDependencies) {
      await runCommand('npm', ['install'], options.targetDirectory);
    }
  } catch (error) {
    throw new Error(
      `Project generation stopped in ${options.targetDirectory}. Some files may already have been written. ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
};

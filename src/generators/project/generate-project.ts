import { dirname, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { copyDirectory, writeJsonFile, writeTemplateTree } from '../../filesystem/write-template-tree.js';
import { prepareTargetDirectory } from '../../filesystem/prepare-target-directory.js';
import { runCommand } from '../../filesystem/run-command.js';
import type { ProjectOptions } from '../../types/project-options.js';
import type { BaseGeneratorConfig } from '../../types/base-generator-config.js';
import { buildPackageManifest } from './package-manifest.js';
import { toProjectNameLiteral } from './project-name-literal.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const projectTemplates = resolve(packageRoot, 'src/templates/project');
const architectureSource = resolve(packageRoot, 'architecture');

export type ProjectGenerationOptions = {
  allowExistingEmptyDirectory: boolean;
};

// Directorios de plantillas, relativos a src/templates/project, en orden de escritura.
export const getProjectTemplateDirectories = (options: ProjectOptions): string[] => {
  const { framework } = options;
  const directories = ['common', framework];

  if (options.agent === 'both' || options.agent === 'codex') {
    directories.push('agents/codex');
  }

  if (options.agent === 'both' || options.agent === 'claude') {
    directories.push('agents/claude');
  }

  if (options.internationalization) {
    directories.push('features/i18n/common', `features/i18n/${framework}`);
  } else {
    directories.push(`features/no-i18n/${framework}`);
  }

  if (options.supabase) {
    directories.push(`features/supabase/${framework}`);
  }

  return directories;
};

const writeProjectTree = async (options: ProjectOptions): Promise<void> => {
  const tokens = {
    projectName: options.projectName,
    projectNameLiteral: toProjectNameLiteral(options.projectName),
  };
  const targetDirectory = options.targetDirectory;

  for (const directory of getProjectTemplateDirectories(options)) {
    await writeTemplateTree(resolve(projectTemplates, directory), targetDirectory, tokens);
  }

  await copyDirectory(architectureSource, resolve(targetDirectory, 'architecture'));
  await writeJsonFile(
    resolve(targetDirectory, 'package.json'),
    buildPackageManifest(options),
  );

  const architectureVersion = (
    await readFile(resolve(architectureSource, 'VERSION'), 'utf8')
  ).trim();
  const generatorConfig: BaseGeneratorConfig = {
    framework: options.framework,
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

export const generateProject = async (
  options: ProjectOptions,
  generationOptions: ProjectGenerationOptions,
): Promise<void> => {
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

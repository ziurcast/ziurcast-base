import { access, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type {
  BaseGeneratorConfig,
  ProjectFramework,
} from '../types/base-generator-config.js';
import type { ProjectContext } from '../types/project-context.js';

type ParsedProjectConfig = {
  framework: ProjectFramework;
  configVersion: number;
  architectureVersion?: string;
  features: BaseGeneratorConfig['features'];
};

export type ReadProjectContextOptions = {
  requiredArchitectureFiles?: readonly string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseProjectConfig = (value: unknown): ParsedProjectConfig => {
  if (!isRecord(value) || !isRecord(value.features)) {
    throw new Error('Project Base Generator configuration is incompatible.');
  }

  const framework = value.framework;
  const configVersion = value.configVersion ?? value.version;
  const internationalization = value.features.internationalization;
  const supabase = value.features.supabase;

  if (
    (framework !== 'next' && framework !== 'react') ||
    configVersion !== 1 ||
    typeof internationalization !== 'boolean' ||
    typeof supabase !== 'boolean' ||
    (value.architectureVersion !== undefined &&
      typeof value.architectureVersion !== 'string')
  ) {
    throw new Error('Project Base Generator configuration is incompatible.');
  }

  const parsedConfig: ParsedProjectConfig = {
    framework,
    configVersion,
    features: { internationalization, supabase },
  };

  if (typeof value.architectureVersion === 'string') {
    parsedConfig.architectureVersion = value.architectureVersion;
  }

  return parsedConfig;
};

const findProjectRoot = async (startingDirectory: string): Promise<string> => {
  let currentDirectory = resolve(startingDirectory);

  while (true) {
    const configPath = resolve(currentDirectory, '.project-base-generator.json');
    const packagePath = resolve(currentDirectory, 'package.json');
    const architecturePath = resolve(currentDirectory, 'architecture');

    try {
      await Promise.all([
        access(configPath),
        access(packagePath),
        stat(architecturePath).then((directoryStat) => {
          if (!directoryStat.isDirectory()) {
            throw new Error('architecture is not a directory.');
          }
        }),
      ]);
      return currentDirectory;
    } catch {
      const parentDirectory = dirname(currentDirectory);

      if (parentDirectory === currentDirectory) {
        throw new Error(
          'This command must run inside a compatible Project Base Generator project with package.json, .project-base-generator.json, and architecture/.',
        );
      }

      currentDirectory = parentDirectory;
    }
  }
};

export const readProjectContext = async (
  startingDirectory: string,
  options: ReadProjectContextOptions = {},
): Promise<ProjectContext> => {
  const rootDirectory = await findProjectRoot(startingDirectory);
  let packageValue: unknown;
  let configValue: unknown;

  try {
    packageValue = JSON.parse(
      await readFile(resolve(rootDirectory, 'package.json'), 'utf8'),
    ) as unknown;
    configValue = JSON.parse(
      await readFile(
        resolve(rootDirectory, '.project-base-generator.json'),
        'utf8',
      ),
    ) as unknown;
  } catch (error) {
    throw new Error('Project metadata contains invalid JSON.', { cause: error });
  }

  if (!isRecord(packageValue)) {
    throw new Error('Project package.json is incompatible.');
  }

  const configuration = parseProjectConfig(configValue);
  const dependencies = {
    ...(isRecord(packageValue.dependencies) ? packageValue.dependencies : {}),
    ...(isRecord(packageValue.devDependencies)
      ? packageValue.devDependencies
      : {}),
  };
  const frameworkPackage = configuration.framework === 'next' ? 'next' : 'react';

  if (typeof dependencies[frameworkPackage] !== 'string') {
    throw new Error(
      `Project metadata declares ${configuration.framework}, but ${frameworkPackage} is missing from package.json.`,
    );
  }

  const architectureDirectory = resolve(rootDirectory, 'architecture');
  const copiedArchitectureVersion = (
    await readFile(resolve(architectureDirectory, 'VERSION'), 'utf8')
  ).trim();

  if (!copiedArchitectureVersion) {
    throw new Error('Project architecture version is missing.');
  }

  if (
    configuration.architectureVersion &&
    configuration.architectureVersion !== copiedArchitectureVersion
  ) {
    throw new Error(
      'Project metadata architectureVersion does not match architecture/VERSION.',
    );
  }

  for (const fileName of options.requiredArchitectureFiles ?? []) {
    const architectureFile = resolve(architectureDirectory, fileName);
    const fileStat = await stat(architectureFile).catch(() => undefined);

    if (!fileStat?.isFile()) {
      throw new Error(`Required architecture document is missing: architecture/${fileName}`);
    }

    await readFile(architectureFile, 'utf8');
  }

  const normalizedConfiguration: BaseGeneratorConfig = {
    framework: configuration.framework,
    configVersion: 1,
    architectureVersion: copiedArchitectureVersion,
    features: configuration.features,
  };

  return {
    rootDirectory,
    framework: configuration.framework,
    features: configuration.features,
    configuration: normalizedConfiguration,
    configVersion: configuration.configVersion,
    architectureVersion: copiedArchitectureVersion,
  };
};

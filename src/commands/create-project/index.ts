import { resolve } from 'node:path';
import { buildProjectOptions } from './build-project-options.js';
import {
  promptForFinalConfirmation,
  promptForProjectName,
  promptForProjectOptions,
  promptToUseEmptyDirectory,
} from '../../prompts/project-wizard.js';
import { inspectTargetDirectory } from '../../filesystem/inspect-target-directory.js';
import { validateProjectName } from '../../validation/project-name.js';
import type { ProjectOptions } from '../../types/project-options.js';
import { generateProject } from '../../generators/project/index.js';

const displayProjectSummary = (options: ProjectOptions): void => {
  const frameworkName = options.framework === 'next' ? 'Next.js' : 'React';
  const agentName = {
    both: 'Both',
    codex: 'Codex',
    claude: 'Claude',
    none: 'None',
  }[options.agent];

  console.log('\n────────────────────────');
  console.log(`Project: ${options.projectName}`);
  console.log(`Package: ${options.packageName}`);
  console.log(`Directory: ${options.targetDirectory}`);
  console.log(`Framework: ${frameworkName}`);
  console.log(`i18n: ${options.internationalization ? 'Yes' : 'No'}`);
  console.log(`Supabase: ${options.supabase ? 'Yes' : 'No'}`);
  console.log(`Agents: ${agentName}`);
  console.log(`Git: ${options.initializeGit ? 'Yes' : 'No'}`);
  console.log(`Install dependencies: ${options.installDependencies ? 'Yes' : 'No'}`);
  console.log('────────────────────────\n');
};

export const runCreateProject = async (
  providedProjectName: string | undefined,
  workingDirectory = process.cwd(),
): Promise<ProjectOptions | undefined> => {
  console.log('\n🚀 Project Base Generator\n');

  const nameResult = providedProjectName
    ? validateProjectName(providedProjectName)
    : await promptForProjectName().then((name) => ({ valid: true as const, ...name }));

  if (!nameResult.valid) {
    throw new Error(nameResult.message);
  }

  const targetDirectory = resolve(workingDirectory, nameResult.projectName);
  const targetState = await inspectTargetDirectory(targetDirectory);
  let allowExistingEmptyDirectory = false;

  if (targetState.kind === 'non-empty') {
    throw new Error(
      `Destination contains files and will not be overwritten: ${targetDirectory}`,
    );
  }

  if (targetState.kind === 'not-directory') {
    throw new Error(`Destination exists and is not a directory: ${targetDirectory}`);
  }

  if (targetState.kind === 'empty') {
    allowExistingEmptyDirectory = await promptToUseEmptyDirectory(targetDirectory);

    if (!allowExistingEmptyDirectory) {
      console.log('Cancelled. No files were created.');
      return undefined;
    }
  }

  const answers = await promptForProjectOptions();
  const options = buildProjectOptions(
    { ...nameResult, ...answers, framework: 'next' },
    workingDirectory,
  );

  displayProjectSummary(options);

  if (!(await promptForFinalConfirmation())) {
    console.log('Cancelled. No files were created.');
    return undefined;
  }

  console.log('\nProject configuration ready. Generating Next.js project...');
  await generateProject(options, { allowExistingEmptyDirectory });
  console.log(`\nProject created at ${options.targetDirectory}.`);

  if (!options.installDependencies) {
    console.log('Run npm install in the project directory to install dependencies.');
  }

  return options;
};

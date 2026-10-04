import { confirm, input, select } from '@inquirer/prompts';
import type { Agent, ProjectAnswers } from '../types/project-options.js';
import { validateProjectName } from '../validation/project-name.js';

export type WizardAnswers = Omit<
  ProjectAnswers,
  'projectName' | 'packageName' | 'framework'
>;

export const promptForProjectName = async (): Promise<{
  projectName: string;
  packageName: string;
}> => {
  const projectName = await input({
    message: 'Project name',
    validate: (value) => {
      const validation = validateProjectName(value);
      return validation.valid ? true : validation.message;
    },
  });
  const validation = validateProjectName(projectName);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  return {
    projectName: validation.projectName,
    packageName: validation.packageName,
  };
};

export const promptForProjectOptions = async (): Promise<WizardAnswers> => {
  const internationalization = await confirm({
    message: 'Enable internationalization?',
    default: false,
  });
  const supabase = await confirm({ message: 'Use Supabase?', default: false });
  const agent = await select<Agent>({
    message: 'AI Agent',
    choices: [
      { name: 'Both', value: 'both' },
      { name: 'Codex', value: 'codex' },
      { name: 'Claude', value: 'claude' },
      { name: 'None', value: 'none' },
    ],
    default: 'both',
  });
  const initializeGit = await confirm({
    message: 'Initialize Git?',
    default: true,
  });
  const installDependencies = await confirm({
    message: 'Install dependencies?',
    default: true,
  });

  return {
    internationalization,
    supabase,
    agent,
    initializeGit,
    installDependencies,
  };
};

export const promptToUseEmptyDirectory = async (
  targetDirectory: string,
): Promise<boolean> =>
  confirm({
    message: `Directory already exists and is empty. Use ${targetDirectory}?`,
    default: false,
  });

export const promptForFinalConfirmation = async (): Promise<boolean> =>
  confirm({ message: 'Create project?', default: true });

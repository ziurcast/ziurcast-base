import { resolve } from 'node:path';
import type { ProjectAnswers, ProjectOptions } from '../../types/project-options.js';

export const buildProjectOptions = (
  answers: ProjectAnswers,
  workingDirectory: string,
): ProjectOptions => ({
  ...answers,
  targetDirectory: resolve(workingDirectory, answers.projectName),
});

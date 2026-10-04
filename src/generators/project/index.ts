import type { ProjectOptions } from '../../types/project-options.js';
import {
  generateNextProject,
  type ProjectGenerationOptions,
} from './generate-next-project.js';

export const generateProject = async (
  options: ProjectOptions,
  generationOptions: ProjectGenerationOptions,
): Promise<void> => {
  if (options.framework !== 'next') {
    throw new Error('The React preset is not available in this release.');
  }

  await generateNextProject(options, generationOptions);
};

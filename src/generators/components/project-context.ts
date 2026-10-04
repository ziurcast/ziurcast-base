import type { ComponentProjectContext } from '../../types/component-generator.js';
import { readProjectContext } from '../../project/read-project-context.js';

const requiredArchitectureFiles = [
  'components.md',
  'coding-standards.md',
  'naming-conventions.md',
  'internationalization.md',
  'testing.md',
];

export const readComponentProjectContext = async (
  startingDirectory: string,
): Promise<ComponentProjectContext> => {
  const context = await readProjectContext(startingDirectory, {
    requiredArchitectureFiles,
  });

  if (context.framework !== 'next') {
    throw new Error('Only compatible Next.js projects can generate components.');
  }

  return context;
};

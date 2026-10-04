import { generateComponentFiles } from '../../generators/components/generate-component.js';
import { createDefaultComponentSource } from '../../generators/components/default-component.js';
import { readComponentProjectContext } from '../../generators/components/project-context.js';
import { validateComponentName } from '../../generators/components/component-name.js';
import type { ComponentDefinition } from '../../types/component-generator.js';

export const runGenerateCommand = async (
  command: string | undefined,
  componentName: string | undefined,
  workingDirectory = process.cwd(),
): Promise<void> => {
  if (command !== 'component' || !componentName) {
    throw new Error(
      'Usage: create-base-app generate component <ComponentName>',
    );
  }

  const nameError = validateComponentName(componentName);

  if (nameError) {
    throw new Error(nameError);
  }

  const context = await readComponentProjectContext(workingDirectory);
  const definition: ComponentDefinition = {
    name: componentName,
    componentSource: createDefaultComponentSource(componentName),
  };

  await generateComponentFiles(context, definition);

  console.log(`Generated component ${componentName} in src/components/${componentName}.`);
};

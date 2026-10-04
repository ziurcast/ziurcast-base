import { generateHook } from '../../generators/hooks/index.js';
import { readProjectContext } from '../../project/read-project-context.js';
import { validateHookName } from '../../generators/hooks/hook-name.js';

const requiredArchitectureFiles = [
  'hooks.md',
  'project-structure.md',
  'naming-conventions.md',
  'coding-standards.md',
  'modules.md',
  'components.md',
];

export const runGenerateHookCommand = async (
  hookName: string | undefined,
  scope: string | undefined,
  workingDirectory = process.cwd(),
): Promise<void> => {
  if (!hookName || !scope) {
    throw new Error(
      'Usage: create-base-app generate hook <HookName> --scope <scope>',
    );
  }

  const nameError = validateHookName(hookName);

  if (nameError) {
    throw new Error(nameError);
  }

  const context = await readProjectContext(workingDirectory, {
    requiredArchitectureFiles,
  });
  await generateHook(context, hookName, scope);

  console.log(`Generated hook ${hookName} in ${scope}.`);
};

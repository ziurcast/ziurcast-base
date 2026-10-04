import { generateApi } from '../../generators/api/index.js';
import { validateApiName } from '../../generators/api/api-name.js';
import { readProjectContext } from '../../project/read-project-context.js';

const requiredArchitectureFiles = [
  'api.md',
  'core.md',
  'modules.md',
  'project-structure.md',
  'naming-conventions.md',
  'coding-standards.md',
];

export const runGenerateApiCommand = async (
  apiName: string | undefined,
  scope: string | undefined,
  workingDirectory = process.cwd(),
): Promise<void> => {
  if (!apiName || !scope) {
    throw new Error('Usage: create-base-app generate api <ApiName> --scope <scope>');
  }

  const nameError = validateApiName(apiName);

  if (nameError) {
    throw new Error(nameError);
  }

  const context = await readProjectContext(workingDirectory, {
    requiredArchitectureFiles,
  });
  await generateApi(context, apiName, scope);

  console.log(`Generated API function ${apiName} in ${scope}.`);
};

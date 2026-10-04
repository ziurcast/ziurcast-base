import { generatePage } from '../../generators/pages/index.js';
import { validatePageName } from '../../generators/pages/page-name.js';
import { readProjectContext } from '../../project/read-project-context.js';

const requiredArchitectureFiles = [
  'modules.md',
  'project-structure.md',
  'naming-conventions.md',
  'internationalization.md',
  'coding-standards.md',
  'testing.md',
];

export const runGeneratePageCommand = async (
  pageName: string | undefined,
  scope: string | undefined,
  route: string | undefined,
  workingDirectory = process.cwd(),
): Promise<void> => {
  if (!pageName || !scope || !route) {
    throw new Error(
      'Usage: ziurcast-base generate page <PageName> --scope modules/<domain> --route /<path>',
    );
  }

  const nameError = validatePageName(pageName);

  if (nameError) {
    throw new Error(nameError);
  }

  const context = await readProjectContext(workingDirectory, {
    requiredArchitectureFiles,
  });
  await generatePage(context, pageName, scope, route);

  console.log(`Generated page ${pageName} at ${route} in ${scope}.`);
};

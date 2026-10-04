import {
  generateModule,
  validateModuleGenerationSelections,
} from '../../generators/modules/index.js';
import type { ModuleGenerationSelections } from '../../generators/modules/index.js';
import { readProjectContext } from '../../project/read-project-context.js';

const requiredArchitectureFiles = [
  'modules.md',
  'project-structure.md',
  'naming-conventions.md',
  'api.md',
  'hooks.md',
  'internationalization.md',
  'coding-standards.md',
  'testing.md',
];

const valueFlags = new Set(['--page', '--route', '--api', '--hook']);

export const parseGenerateModuleArguments = (
  args: string[],
): { domain: string; selections: ModuleGenerationSelections } => {
  const domain = args[0];

  if (!domain || domain.startsWith('--')) {
    throw new Error(
      'Usage: ziurcast-base generate module <Domain> [--page <PageName> --route /<path>] [--api <ApiName>] [--hook <HookName>]',
    );
  }

  const values = new Map<string, string>();

  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];

    if (!flag || !valueFlags.has(flag) || !value || value.startsWith('--')) {
      throw new Error(`Invalid module option: ${flag ?? ''}`);
    }

    if (values.has(flag)) {
      throw new Error(`Module option may only be provided once: ${flag}`);
    }

    values.set(flag, value);
  }

  const selections: ModuleGenerationSelections = {};
  const page = values.get('--page');
  const route = values.get('--route');
  const api = values.get('--api');
  const hook = values.get('--hook');

  if (page) selections.page = page;
  if (route) selections.route = route;
  if (api) selections.api = api;
  if (hook) selections.hook = hook;

  return { domain, selections };
};

export const runGenerateModuleCommand = async (
  domain: string,
  selections: ModuleGenerationSelections,
  workingDirectory = process.cwd(),
): Promise<void> => {
  validateModuleGenerationSelections(selections);

  const context = await readProjectContext(workingDirectory, {
    requiredArchitectureFiles,
  });
  await generateModule(context, domain, selections);

  console.log(`Generated selected artifacts for module ${domain}.`);
};

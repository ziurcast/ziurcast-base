import {
  generateModule,
  validateModuleGenerationSelections,
} from '../../generators/modules/index.js';
import type { ModuleGenerationSelections } from '../../generators/modules/index.js';
import { readProjectContext } from '../../project/read-project-context.js';
import { parseGenerateArguments } from './parse-generate-arguments.js';

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

export const generateModuleUsage =
  'Usage: ziurcast-base generate module <Domain> [--page <PageName> --route /<path>] [--api <ApiName>] [--hook <HookName>]';

export const parseGenerateModuleArguments = (
  args: string[],
): { domain: string; selections: ModuleGenerationSelections } => {
  const { name: domain, options } = parseGenerateArguments(
    args,
    ['--page', '--route', '--api', '--hook'],
    generateModuleUsage,
  );
  const selections: ModuleGenerationSelections = {};
  const page = options.get('--page');
  const route = options.get('--route');
  const api = options.get('--api');
  const hook = options.get('--hook');

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

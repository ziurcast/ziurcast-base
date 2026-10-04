import { applyGenerationPlan } from '../../filesystem/apply-generation-plan.js';
import { loadGeneratorTemplate } from '../../templates/load-template.js';
import type { GenerationPlan } from '../../types/generation-plan.js';
import type { ProjectContext } from '../../types/project-context.js';
import { validateApiName } from './api-name.js';
import { resolveApiTarget } from './resolve-api-target.js';

export const createApiGenerationPlan = async (
  context: ProjectContext,
  apiName: string,
  scope: string,
): Promise<GenerationPlan> => {
  const nameError = validateApiName(apiName);

  if (nameError) {
    throw new Error(nameError);
  }

  const relativePath = resolveApiTarget(apiName, scope);
  const content = await loadGeneratorTemplate('api/common/Api.ts.tpl', {
    apiName,
  });

  return {
    projectRoot: context.rootDirectory,
    changes: [{ operation: 'create', relativePath, content }],
  };
};

export const generateApi = async (
  context: ProjectContext,
  apiName: string,
  scope: string,
): Promise<void> => {
  const plan = await createApiGenerationPlan(context, apiName, scope);
  await applyGenerationPlan(plan);
};

import { applyGenerationPlan } from '../../filesystem/apply-generation-plan.js';
import { loadGeneratorTemplate } from '../../templates/load-template.js';
import type { GenerationPlan } from '../../types/generation-plan.js';
import type { ProjectContext } from '../../types/project-context.js';
import { validateHookName } from './hook-name.js';
import { resolveHookTarget } from './resolve-hook-target.js';

export const createHookGenerationPlan = async (
  context: ProjectContext,
  hookName: string,
  scope: string,
): Promise<GenerationPlan> => {
  const nameError = validateHookName(hookName);

  if (nameError) {
    throw new Error(nameError);
  }

  const relativePath = await resolveHookTarget(context, hookName, scope);
  const content = await loadGeneratorTemplate('hook/common/Hook.ts.tpl', {
    hookName,
  });

  return {
    projectRoot: context.rootDirectory,
    changes: [{ operation: 'create', relativePath, content }],
  };
};

export const generateHook = async (
  context: ProjectContext,
  hookName: string,
  scope: string,
): Promise<void> => {
  const plan = await createHookGenerationPlan(context, hookName, scope);
  await applyGenerationPlan(plan);
};

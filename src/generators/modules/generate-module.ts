import { applyGenerationPlan } from '../../filesystem/apply-generation-plan.js';
import { createApiGenerationPlan } from '../api/index.js';
import { createHookGenerationPlan } from '../hooks/index.js';
import { createPageGenerationPlan } from '../pages/index.js';
import type {
  GenerationFileChange,
  GenerationPlan,
} from '../../types/generation-plan.js';
import type { ProjectContext } from '../../types/project-context.js';

export type ModuleGenerationSelections = {
  page?: string;
  route?: string;
  api?: string;
  hook?: string;
};

export const validateModuleGenerationSelections = (
  selections: ModuleGenerationSelections,
): void => {
  if (Boolean(selections.page) !== Boolean(selections.route)) {
    throw new Error('--page and --route must be provided together.');
  }

  if (!selections.page && !selections.api && !selections.hook) {
    throw new Error('Select at least one module artifact: --page, --api, or --hook.');
  }
};

export const createModuleGenerationPlan = async (
  context: ProjectContext,
  domain: string,
  selections: ModuleGenerationSelections,
): Promise<GenerationPlan> => {
  validateModuleGenerationSelections(selections);

  const scope = `modules/${domain}`;
  const plans: GenerationPlan[] = [];

  if (selections.api) {
    plans.push(await createApiGenerationPlan(context, selections.api, scope));
  }

  if (selections.hook) {
    plans.push(await createHookGenerationPlan(context, selections.hook, scope));
  }

  if (selections.page && selections.route) {
    plans.push(
      await createPageGenerationPlan(
        context,
        selections.page,
        scope,
        selections.route,
      ),
    );
  }

  const changes: GenerationFileChange[] = [];

  for (const plan of plans) {
    if (plan.projectRoot !== context.rootDirectory) {
      throw new Error('A module generation plan contains an incompatible project root.');
    }

    changes.push(...plan.changes);
  }

  return { projectRoot: context.rootDirectory, changes };
};

export const generateModule = async (
  context: ProjectContext,
  domain: string,
  selections: ModuleGenerationSelections,
): Promise<void> => {
  const plan = await createModuleGenerationPlan(context, domain, selections);
  await applyGenerationPlan(plan);
};

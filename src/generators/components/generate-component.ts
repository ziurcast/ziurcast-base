import { applyGenerationPlan } from '../../filesystem/apply-generation-plan.js';
import { planBarrelExport } from '../../filesystem/plan-barrel-export.js';
import { planNextTranslationRegistryUpdate } from '../i18n/next-intl/translation-registry.js';
import type {
  GenerationFileChange,
  GenerationPlan,
} from '../../types/generation-plan.js';
import type {
  ComponentDefinition,
  ComponentProjectContext,
} from '../../types/component-generator.js';
import { validateComponentName } from './component-name.js';
import { hasLocalTranslations, planComponentFiles } from './plan-component-files.js';

const validateDefinition = (definition: ComponentDefinition): void => {
  const nameError = validateComponentName(definition.name);

  if (nameError) {
    throw new Error(nameError);
  }

  if (!definition.componentSource.trim()) {
    throw new Error('A component entrypoint must contain source code.');
  }

  if (
    definition.hookSource?.trim() &&
    !definition.componentSource.includes(`use${definition.name}`)
  ) {
    throw new Error(
      `The component entrypoint must use its component hook, use${definition.name}.`,
    );
  }

  for (const [key, translations] of Object.entries(definition.messages ?? {})) {
    if (!key.trim() || !translations.es.trim() || !translations.en.trim()) {
      throw new Error('Local translations require a key and non-empty es/en values.');
    }
  }
};

export const createComponentGenerationPlan = async (
  context: ComponentProjectContext,
  definition: ComponentDefinition,
): Promise<GenerationPlan> => {
  validateDefinition(definition);

  const changes: GenerationFileChange[] = planComponentFiles(definition, context).map((file) => ({
    operation: 'create' as const,
    relativePath: file.relativePath,
    content: file.content,
  }));
  const barrelChange = await planBarrelExport(
    context.rootDirectory,
    'src/components/index.ts',
    definition.name,
    `./${definition.name}`,
  );
  changes.push(barrelChange);

  if (hasLocalTranslations(definition, context)) {
    const registryChange = await planNextTranslationRegistryUpdate(
      context.rootDirectory,
      definition.name,
    );
    changes.push(registryChange);
  }

  return { projectRoot: context.rootDirectory, changes };
};

export const generateComponentFiles = async (
  context: ComponentProjectContext,
  definition: ComponentDefinition,
): Promise<void> => {
  const plan = await createComponentGenerationPlan(context, definition);
  await applyGenerationPlan(plan);
};

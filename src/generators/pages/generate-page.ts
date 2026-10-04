import { applyGenerationPlan } from '../../filesystem/apply-generation-plan.js';
import { planNextPageTranslationRegistryUpdate } from '../i18n/next-intl/translation-registry.js';
import { loadGeneratorTemplate } from '../../templates/load-template.js';
import type {
  GenerationFileChange,
  GenerationPlan,
} from '../../types/generation-plan.js';
import type { ProjectContext } from '../../types/project-context.js';
import { validatePageName } from './page-name.js';
import { resolvePageTargets } from './resolve-page-targets.js';

export const createPageGenerationPlan = async (
  context: ProjectContext,
  pageName: string,
  scope: string,
  route: string,
): Promise<GenerationPlan> => {
  if (context.framework !== 'next') {
    throw new Error('Only compatible Next.js projects can generate pages.');
  }

  const nameError = validatePageName(pageName);

  if (nameError) {
    throw new Error(nameError);
  }

  const targets = resolvePageTargets(
    pageName,
    scope,
    route,
    context.features.internationalization,
  );
  const routeImportPath = `@/${targets.modulePagePath
    .replace(/^src\//, '')
    .replace(/\/index\.tsx$/, '')}`;
  const moduleTemplate = context.features.internationalization
    ? 'page/next/ModulePage.i18n.tsx.tpl'
    : 'page/next/ModulePage.tsx.tpl';
  const moduleContent = await loadGeneratorTemplate(moduleTemplate, {
    pageName,
    namespace: targets.namespace,
  });
  const routeContent = await loadGeneratorTemplate('page/next/RoutePage.tsx.tpl', {
    pageName,
    importPath: routeImportPath,
  });
  const changes: GenerationFileChange[] = [
    {
      operation: 'create',
      relativePath: targets.modulePagePath,
      content: moduleContent,
    },
    {
      operation: 'create',
      relativePath: targets.nextRoutePath,
      content: routeContent,
    },
  ];

  if (context.features.internationalization) {
    const messagesContent = await loadGeneratorTemplate(
      'page/next/messages.json.tpl',
      { pageName },
    );
    changes.push({
      operation: 'create',
      relativePath: targets.modulePagePath.replace(/index\.tsx$/, 'messages.json'),
      content: messagesContent,
    });
    changes.push(
      await planNextPageTranslationRegistryUpdate(
        context.rootDirectory,
        scope.split('/')[1] ?? '',
        pageName,
        targets.namespace,
      ),
    );
  }

  return { projectRoot: context.rootDirectory, changes };
};

export const generatePage = async (
  context: ProjectContext,
  pageName: string,
  scope: string,
  route: string,
): Promise<void> => {
  const plan = await createPageGenerationPlan(context, pageName, scope, route);
  await applyGenerationPlan(plan);
};

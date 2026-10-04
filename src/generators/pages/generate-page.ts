import { applyGenerationPlan } from '../../filesystem/apply-generation-plan.js';
import { planPageTranslationRegistryUpdate } from '../i18n/translation-registry.js';
import { loadGeneratorTemplate } from '../../templates/load-template.js';
import type {
  GenerationFileChange,
  GenerationPlan,
} from '../../types/generation-plan.js';
import type { ProjectContext } from '../../types/project-context.js';
import { validatePageName } from './page-name.js';
import { planReactRouteRegistration } from './react-route-registry.js';
import { resolvePageTargets } from './resolve-page-targets.js';

// Prettier usa un ancho de 80 columnas; los namespaces largos pasan a la línea siguiente.
const formatNamespaceDeclaration = (namespace: string): string => {
  const declaration = `const namespace = '${namespace}';`;

  return declaration.length > 80
    ? `const namespace =\n  '${namespace}';`
    : declaration;
};

export const createPageGenerationPlan = async (
  context: ProjectContext,
  pageName: string,
  scope: string,
  route: string,
): Promise<GenerationPlan> => {
  const nameError = validatePageName(pageName);

  if (nameError) {
    throw new Error(nameError);
  }

  const { internationalization } = context.features;
  const targets = resolvePageTargets(pageName, scope, route, internationalization);
  const modulePageImportPath = `@/${targets.modulePagePath
    .replace(/^src\//, '')
    .replace(/\/index\.tsx$/, '')}`;
  const moduleTemplate = internationalization
    ? 'page/common/ModulePage.i18n.tsx.tpl'
    : 'page/common/ModulePage.tsx.tpl';
  const moduleContent = await loadGeneratorTemplate(moduleTemplate, {
    pageName,
    namespaceDeclaration: formatNamespaceDeclaration(targets.namespace),
  });
  const changes: GenerationFileChange[] = [
    {
      operation: 'create',
      relativePath: targets.modulePagePath,
      content: moduleContent,
    },
  ];

  // Next.js enruta con un archivo en app/; React registra la ruta en src/routes/AppRoutes.tsx.
  if (context.framework === 'next') {
    changes.push({
      operation: 'create',
      relativePath: targets.nextRoutePath,
      content: await loadGeneratorTemplate('page/next/RoutePage.tsx.tpl', {
        pageName,
        importPath: modulePageImportPath,
      }),
    });
  } else {
    changes.push(
      await planReactRouteRegistration(context.rootDirectory, {
        pageName,
        importPath: modulePageImportPath,
        routeSegments: targets.routeSegments,
        internationalization,
      }),
    );
  }

  if (internationalization) {
    const messagesContent = await loadGeneratorTemplate(
      'page/common/messages.json.tpl',
      { pageName },
    );
    changes.push({
      operation: 'create',
      relativePath: targets.modulePagePath.replace(/index\.tsx$/, 'messages.json'),
      content: messagesContent,
    });
    changes.push(
      await planPageTranslationRegistryUpdate(
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

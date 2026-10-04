import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { GenerationFileChange } from '../../types/generation-plan.js';

type TranslationRegistration = {
  namespace: string;
  symbolName: string;
  importPath: string;
};

// Prettier usa un ancho de 80 columnas; las entradas más largas se parten tras los dos puntos.
const printWidth = 80;

const formatRegistryEntry = (namespace: string, symbolName: string): string => {
  const entry = `  '${namespace}': ${symbolName},`;

  return entry.length > printWidth ? `  '${namespace}':\n    ${symbolName},` : entry;
};

const insertIntoRegistry = (
  source: string,
  registration: TranslationRegistration,
): string => {
  const { namespace, symbolName, importPath } = registration;

  if (source.includes(`'${namespace}'`) || source.includes(`"${namespace}"`)) {
    throw new Error(`Translation namespace is already registered: ${namespace}`);
  }

  const importAnchor = '// <pbg:importaciones-traducciones-locales>';
  const entryAnchor = '// <pbg:entradas-traducciones-locales>';
  let nextSource = source;

  if (nextSource.includes(importAnchor) && nextSource.includes(entryAnchor)) {
    nextSource = nextSource.replace(
      importAnchor,
      `${importAnchor}\nimport ${symbolName} from '${importPath}';`,
    );
    return nextSource.replace(
      entryAnchor,
      `${entryAnchor}\n${formatRegistryEntry(namespace, symbolName)}`,
    );
  }

  // Compatibilidad con los proyectos generados antes de añadir anclas estables.
  const localMessagesDeclaration = 'const localMessages = {';
  const declarationIndex = nextSource.indexOf(localMessagesDeclaration);

  if (declarationIndex < 0) {
    throw new Error('Could not find the local translation registry in src/i18n/messages.ts.');
  }

  const importDeclaration = `import ${symbolName} from '${importPath}';\n`;
  nextSource = `${nextSource.slice(0, declarationIndex)}${importDeclaration}\n${nextSource.slice(declarationIndex)}`;
  const updatedDeclarationIndex = nextSource.indexOf(localMessagesDeclaration);
  const closingIndex = nextSource.indexOf('\n};', updatedDeclarationIndex);

  if (closingIndex < 0) {
    throw new Error('Could not find the end of the local translation registry.');
  }

  return `${nextSource.slice(0, closingIndex)}\n${formatRegistryEntry(namespace, symbolName)}${nextSource.slice(closingIndex)}`;
};

const planTranslationRegistryUpdate = async (
  projectRoot: string,
  registration: TranslationRegistration,
): Promise<GenerationFileChange> => {
  const relativePath = 'src/i18n/messages.ts';
  const registryPath = resolve(projectRoot, relativePath);
  let existingContent: string;

  try {
    const registryStat = await lstat(registryPath);

    if (!registryStat.isFile() || registryStat.isSymbolicLink()) {
      throw new Error(`Translation registry is not a regular file: ${relativePath}`);
    }

    existingContent = await readFile(registryPath, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('i18n is enabled, but src/i18n/messages.ts is missing.', {
        cause: error,
      });
    }

    throw error;
  }

  return {
    operation: 'update',
    relativePath,
    expectedContent: existingContent,
    content: insertIntoRegistry(existingContent, registration),
  };
};

export const planComponentTranslationRegistryUpdate = async (
  projectRoot: string,
  componentName: string,
): Promise<GenerationFileChange> =>
  planTranslationRegistryUpdate(projectRoot, {
    namespace: `components-${componentName}`,
    symbolName: `${componentName}Messages`,
    importPath: `@/components/${componentName}/messages.json`,
  });

export const planPageTranslationRegistryUpdate = async (
  projectRoot: string,
  domain: string,
  pageName: string,
  namespace: string,
): Promise<GenerationFileChange> => {
  const symbolName = `Page${namespace
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => `${segment.charAt(0)?.toUpperCase()}${segment.slice(1)}`)
    .join('')}Messages`;

  return planTranslationRegistryUpdate(projectRoot, {
    namespace,
    symbolName,
    importPath: `@/modules/${domain}/pages/${pageName}/messages.json`,
  });
};

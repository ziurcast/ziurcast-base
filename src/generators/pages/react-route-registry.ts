import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { GenerationFileChange } from '../../types/generation-plan.js';

const registryRelativePath = 'src/routes/AppRoutes.tsx';
const importAnchor = '// <pbg:importaciones-rutas>';
const routeAnchor = '{/* <pbg:rutas> */}';

export type ReactRouteRegistration = {
  pageName: string;
  importPath: string;
  routeSegments: string[];
  internationalization: boolean;
};

// Con i18n las rutas son hijas de la ruta :locale, por lo que se registran como relativas.
const getRouteAttribute = (
  routeSegments: string[],
  internationalization: boolean,
): string => {
  if (!internationalization) {
    return `path="/${routeSegments.join('/')}"`;
  }

  return routeSegments.length === 0 ? 'index' : `path="${routeSegments.join('/')}"`;
};

// Prettier usa un ancho de 80 columnas; las rutas más largas se escriben con un atributo por línea.
const printWidth = 80;

const formatRouteElement = (
  indentation: string,
  routeAttribute: string,
  pageName: string,
): string => {
  const element = `${indentation}<Route ${routeAttribute} element={<${pageName} />} />`;

  if (element.length <= printWidth) {
    return element;
  }

  return [
    `${indentation}<Route`,
    `${indentation}  ${routeAttribute}`,
    `${indentation}  element={<${pageName} />}`,
    `${indentation}/>`,
  ].join('\n');
};

export const insertReactRoute = (
  source: string,
  registration: ReactRouteRegistration,
): string => {
  const { pageName, importPath, routeSegments, internationalization } = registration;

  if (!source.includes(importAnchor) || !source.includes(routeAnchor)) {
    throw new Error(`Could not find the route registry anchors in ${registryRelativePath}.`);
  }

  const routeAttribute = getRouteAttribute(routeSegments, internationalization);
  const routeAlreadyExists =
    routeAttribute === 'index'
      ? /<Route\s+index\b/.test(source)
      : source.includes(routeAttribute);

  if (routeAlreadyExists) {
    throw new Error(`Route is already registered in ${registryRelativePath}: ${routeAttribute}`);
  }

  if (new RegExp(`import\\s*\\{[^}]*\\b${pageName}\\b[^}]*\\}`).test(source)) {
    throw new Error(`Page is already imported in ${registryRelativePath}: ${pageName}`);
  }

  const routeAnchorLine = source
    .split('\n')
    .find((line) => line.trim() === routeAnchor);
  const indentation = routeAnchorLine?.match(/^\s*/)?.[0] ?? '';

  return source
    .replace(importAnchor, `${importAnchor}\nimport { ${pageName} } from '${importPath}';`)
    .replace(
      routeAnchor,
      `${routeAnchor}\n${formatRouteElement(indentation, routeAttribute, pageName)}`,
    );
};

export const planReactRouteRegistration = async (
  projectRoot: string,
  registration: ReactRouteRegistration,
): Promise<GenerationFileChange> => {
  const registryPath = resolve(projectRoot, registryRelativePath);
  let existingContent: string;

  try {
    const registryStat = await lstat(registryPath);

    if (!registryStat.isFile() || registryStat.isSymbolicLink()) {
      throw new Error(`Route registry is not a regular file: ${registryRelativePath}`);
    }

    existingContent = await readFile(registryPath, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`The React route registry is missing: ${registryRelativePath}`, {
        cause: error,
      });
    }

    throw error;
  }

  return {
    operation: 'update',
    relativePath: registryRelativePath,
    expectedContent: existingContent,
    content: insertReactRoute(existingContent, registration),
  };
};

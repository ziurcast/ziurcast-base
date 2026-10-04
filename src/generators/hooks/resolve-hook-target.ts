import { lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ProjectContext } from '../../types/project-context.js';

type HookScope =
  | { kind: 'global'; directory: string }
  | { kind: 'module'; directory: string }
  | { kind: 'page'; directory: string; ownerName: string }
  | { kind: 'component'; directory: string; ownerName: string };

const isSafeSegment = (segment: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(segment);

const parseHookScope = (scope: string): HookScope => {
  if (!scope || scope.includes('\\') || scope.startsWith('/') || scope.endsWith('/')) {
    throw new Error('Invalid hook scope. Use an architectural scope relative to src/.');
  }

  const segments = scope.split('/');

  if (segments.some((segment) => !isSafeSegment(segment))) {
    throw new Error('Invalid hook scope. Scope segments must be safe architectural names.');
  }

  if (scope === 'hooks') {
    return { kind: 'global', directory: 'src/hooks' };
  }

  if (segments.length === 2 && segments[0] === 'modules') {
    const domain = segments[1];

    if (!domain) {
      throw new Error('A module hook scope requires a domain name.');
    }

    return {
      kind: 'module',
      directory: `src/modules/${domain}/moduleHooks`,
    };
  }

  if (
    segments.length === 4 &&
    segments[0] === 'modules' &&
    segments[2] === 'pages'
  ) {
    return {
      kind: 'page',
      directory: `src/modules/${segments[1]}/pages/${segments[3]}`,
      ownerName: segments[3] ?? '',
    };
  }

  if (segments.length === 2 && segments[0] === 'components') {
    return {
      kind: 'component',
      directory: `src/components/${segments[1]}`,
      ownerName: segments[1] ?? '',
    };
  }

  throw new Error(
    `Unsupported hook scope: ${scope}. See architecture/hooks.md for supported scopes.`,
  );
};

const assertExistingOwner = async (
  projectRoot: string,
  directory: string,
  ownerKind: 'page' | 'component',
): Promise<void> => {
  const entrypointPath = resolve(projectRoot, directory, 'index.tsx');

  try {
    const entrypointStat = await lstat(entrypointPath);

    if (!entrypointStat.isFile() || entrypointStat.isSymbolicLink()) {
      throw new Error(`${ownerKind} scope has no regular index.tsx: ${directory}`);
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`${ownerKind} scope does not exist: ${directory}`, {
        cause: error,
      });
    }

    throw error;
  }
};

export const resolveHookTarget = async (
  context: ProjectContext,
  hookName: string,
  scope: string,
): Promise<string> => {
  const resolvedScope = parseHookScope(scope);

  if (resolvedScope.kind === 'page' || resolvedScope.kind === 'component') {
    await assertExistingOwner(
      context.rootDirectory,
      resolvedScope.directory,
      resolvedScope.kind,
    );
  }

  if (
    resolvedScope.kind === 'component' &&
    hookName !== `use${resolvedScope.ownerName}`
  ) {
    throw new Error(
      `A component-owned hook must be named use${resolvedScope.ownerName}.`,
    );
  }

  return `${resolvedScope.directory}/${hookName}.ts`;
};

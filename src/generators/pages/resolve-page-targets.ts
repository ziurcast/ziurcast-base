const isSafeSegment = (segment: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(segment);

export type ResolvedPageTargets = {
  modulePagePath: string;
  nextRoutePath: string;
  namespace: string;
};

export const resolvePageTargets = (
  pageName: string,
  scope: string,
  route: string,
  internationalization: boolean,
): ResolvedPageTargets => {
  if (!scope || scope.includes('\\') || scope.startsWith('/') || scope.endsWith('/')) {
    throw new Error('Invalid page scope. Use an architectural scope relative to src/.');
  }

  const scopeSegments = scope.split('/');

  if (scopeSegments.some((segment) => !isSafeSegment(segment))) {
    throw new Error('Invalid page scope. Scope segments must be safe architectural names.');
  }

  if (scopeSegments.length !== 2 || scopeSegments[0] !== 'modules') {
    throw new Error(`Unsupported page scope: ${scope}. Use modules/<domain>.`);
  }

  if (
    !route.startsWith('/') ||
    route.startsWith('//') ||
    route.includes('\\') ||
    route.includes('?') ||
    route.includes('#') ||
    (route.length > 1 && route.endsWith('/'))
  ) {
    throw new Error('Invalid route. Use an absolute static route path such as /users.');
  }

  const routeSegments = route === '/' ? [] : route.slice(1).split('/');

  if (
    routeSegments.some(
      (segment) =>
        !isSafeSegment(segment) || segment === '.' || segment === '..',
    )
  ) {
    throw new Error('Invalid route. Use non-empty static path segments with letters, numbers, - or _.');
  }

  const domain = scopeSegments[1];
  const modulePagePath = `src/modules/${domain}/pages/${pageName}`;
  const namespace = `modules-${domain}-pages-${pageName}`;
  const appSegments = [
    'src',
    'app',
    ...(internationalization ? ['[locale]'] : []),
    ...routeSegments,
    'page.tsx',
  ];

  return {
    modulePagePath: `${modulePagePath}/index.tsx`,
    nextRoutePath: appSegments.join('/'),
    namespace,
  };
};

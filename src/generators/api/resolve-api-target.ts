const isSafeSegment = (segment: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(segment);

export const resolveApiTarget = (
  apiName: string,
  scope: string,
): string => {
  if (!scope || scope.includes('\\') || scope.startsWith('/') || scope.endsWith('/')) {
    throw new Error('Invalid API scope. Use an architectural scope relative to src/.');
  }

  const segments = scope.split('/');

  if (segments.some((segment) => !isSafeSegment(segment))) {
    throw new Error('Invalid API scope. Scope segments must be safe architectural names.');
  }

  if (segments.length === 3 && segments[0] === 'core' && segments[1] === 'api') {
    return `src/core/api/${segments[2]}/${apiName}.ts`;
  }

  if (segments.length === 2 && segments[0] === 'modules') {
    return `src/modules/${segments[1]}/api/${apiName}.ts`;
  }

  throw new Error(`Unsupported API scope: ${scope}. See architecture/api.md for supported scopes.`);
};

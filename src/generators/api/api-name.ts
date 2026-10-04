const apiNamePattern = /^[a-z][A-Za-z0-9]*$/;

export const validateApiName = (apiName: string): string | undefined => {
  if (!apiNamePattern.test(apiName)) {
    return 'API names must be lower camel case and contain only English letters and numbers.';
  }

  return undefined;
};

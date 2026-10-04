const componentNamePattern = /^[A-Z][A-Za-z0-9]*$/;

export const validateComponentName = (name: string): string | undefined => {
  if (!componentNamePattern.test(name)) {
    return 'Component names must use PascalCase and contain only English letters and numbers, beginning with an uppercase letter.';
  }

  return undefined;
};

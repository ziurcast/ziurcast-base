const pageNamePattern = /^[A-Z][A-Za-z0-9]*$/;

export const validatePageName = (pageName: string): string | undefined => {
  if (!pageNamePattern.test(pageName)) {
    return 'Page names must use PascalCase and contain only English letters and numbers.';
  }

  return undefined;
};

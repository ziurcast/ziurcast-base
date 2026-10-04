const hookNamePattern = /^use[A-Z][A-Za-z0-9]*$/;

export const validateHookName = (hookName: string): string | undefined => {
  if (!hookNamePattern.test(hookName)) {
    return 'Hook names must start with use followed by an uppercase English letter and contain only English letters and numbers.';
  }

  return undefined;
};

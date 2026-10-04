import validateNpmPackageName from 'validate-npm-package-name';

export type ProjectNameValidation =
  | { valid: true; projectName: string; packageName: string }
  | { valid: false; message: string };

export const normalizePackageName = (projectName: string): string =>
  projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');

const hasControlCharacters = (value: string): boolean =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
  });

export const validateProjectName = (value: string): ProjectNameValidation => {
  const projectName = value.trim();

  if (!projectName) {
    return { valid: false, message: 'Project name is required.' };
  }

  if (projectName === '.' || projectName === '..') {
    return { valid: false, message: 'Project name cannot be a relative path.' };
  }

  if (/[\\/<>:"|?*]/.test(projectName) || hasControlCharacters(projectName)) {
    return {
      valid: false,
      message: 'Project name must be a valid single directory name.',
    };
  }

  if (/[. ]$/.test(projectName)) {
    return {
      valid: false,
      message: 'Project name cannot end with a period or space.',
    };
  }

  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(projectName)) {
    return {
      valid: false,
      message: 'Project name is reserved by Windows.',
    };
  }

  const packageName = normalizePackageName(projectName);
  const packageNameValidation = validateNpmPackageName(packageName);

  if (!packageName || !packageNameValidation.validForNewPackages) {
    return {
      valid: false,
      message: packageNameValidation.errors?.[0]
        ?? 'Project name cannot be converted into a valid npm package name.',
    };
  }

  return { valid: true, projectName, packageName };
};

declare module 'validate-npm-package-name' {
  type ValidationResult = {
    validForNewPackages: boolean;
    errors?: string[];
    warnings?: string[];
  };

  const validateNpmPackageName: (name: string) => ValidationResult;

  export default validateNpmPackageName;
}

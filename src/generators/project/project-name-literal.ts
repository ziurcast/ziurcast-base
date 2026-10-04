// Genera el literal con las comillas que Prettier elige para `singleQuote: true`.
// Los nombres de proyecto válidos nunca contienen comillas dobles ni barras invertidas.
export const toProjectNameLiteral = (projectName: string): string =>
  projectName.includes("'") ? `"${projectName}"` : `'${projectName}'`;

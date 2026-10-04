import { loadGeneratorTemplate } from '../../templates/load-template.js';
import type { ProjectFramework } from '../../types/base-generator-config.js';

export const createDefaultComponentSource = (
  componentName: string,
  framework: ProjectFramework = 'next',
): string => {
  const templateName = componentName === 'Button' ? 'Button' : 'Component';
  const tokens = componentName === 'Button' ? {} : { componentName };
  const source = loadGeneratorTemplate(
    `component/${framework}/${templateName}.tsx.tpl`,
    tokens,
  );

  return `${source.trimEnd()}\n`;
};

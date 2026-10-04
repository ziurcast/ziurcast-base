import { loadGeneratorTemplate } from '../../templates/load-template.js';

export const createDefaultComponentSource = (componentName: string): string => {
  const templatePath =
    componentName === 'Button' ? 'component/next/Button.tsx.tpl' : 'component/next/Component.tsx.tpl';
  const tokens = componentName === 'Button' ? {} : { componentName };
  const source = loadGeneratorTemplate(templatePath, tokens);

  return `${source.trimEnd()}\n`;
};

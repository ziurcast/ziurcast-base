import type {
  ComponentDefinition,
  ComponentProjectContext,
  PlannedComponentFile,
} from '../../types/component-generator.js';

export const getComponentTranslationNamespace = (componentName: string): string =>
  `components-${componentName}`;

const serializeMessages = (
  messages: NonNullable<ComponentDefinition['messages']>,
): string => {
  const localizedMessages = {
    es: {} as Record<string, string>,
    en: {} as Record<string, string>,
  };

  for (const [key, translation] of Object.entries(messages)) {
    localizedMessages.es[key] = translation.es;
    localizedMessages.en[key] = translation.en;
  }

  return `${JSON.stringify(localizedMessages, null, 2)}\n`;
};

export const planComponentFiles = (
  definition: ComponentDefinition,
  context: ComponentProjectContext,
): PlannedComponentFile[] => {
  const componentPath = `src/components/${definition.name}`;
  const files: PlannedComponentFile[] = [
    {
      relativePath: `${componentPath}/index.tsx`,
      content: definition.componentSource,
    },
  ];

  if (definition.hookSource?.trim()) {
    files.push({
      relativePath: `${componentPath}/use${definition.name}.ts`,
      content: definition.hookSource,
    });
  }

  if (
    context.features.internationalization &&
    definition.messages &&
    Object.keys(definition.messages).length > 0
  ) {
    files.push({
      relativePath: `${componentPath}/messages.json`,
      content: serializeMessages(definition.messages),
    });
  }

  if (definition.testSource?.trim()) {
    files.push({
      relativePath: `${componentPath}/${definition.name}.test.tsx`,
      content: definition.testSource,
    });
  }

  if (definition.readme?.trim()) {
    files.push({
      relativePath: `${componentPath}/${definition.name}.Readme.md`,
      content: definition.readme.trimEnd() + '\n',
    });
  }

  return files;
};

export const hasLocalTranslations = (
  definition: ComponentDefinition,
  context: ComponentProjectContext,
): boolean =>
  context.features.internationalization &&
  Boolean(definition.messages && Object.keys(definition.messages).length > 0);

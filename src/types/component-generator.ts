import type { ProjectContext } from './project-context.js';

export type ComponentLocale = 'es' | 'en';

export type ComponentMessages = Record<
  string,
  Record<ComponentLocale, string>
>;

export type ComponentDefinition = {
  name: string;
  componentSource: string;
  hookSource?: string;
  testSource?: string;
  readme?: string;
  messages?: ComponentMessages;
};

export type ComponentProjectContext = ProjectContext;

export type PlannedComponentFile = {
  relativePath: string;
  content: string;
};

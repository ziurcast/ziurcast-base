import type {
  BaseGeneratorConfig,
  ProjectFramework,
} from './base-generator-config.js';

export type ProjectContext = {
  rootDirectory: string;
  framework: ProjectFramework;
  features: BaseGeneratorConfig['features'];
  configuration: BaseGeneratorConfig;
  configVersion: number;
  architectureVersion: string;
};

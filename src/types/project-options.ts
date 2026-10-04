import type { ProjectFramework } from './base-generator-config.js';

export type Framework = ProjectFramework;

export type Agent = 'both' | 'codex' | 'claude' | 'none';

export type ProjectAnswers = {
  projectName: string;
  packageName: string;
  framework: Framework;
  internationalization: boolean;
  supabase: boolean;
  agent: Agent;
  initializeGit: boolean;
  installDependencies: boolean;
};

export type ProjectOptions = {
  projectName: string;
  packageName: string;
  targetDirectory: string;
  framework: Framework;
  internationalization: boolean;
  supabase: boolean;
  agent: Agent;
  initializeGit: boolean;
  installDependencies: boolean;
};

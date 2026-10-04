export type ProjectFramework = 'next' | 'react';

export type BaseGeneratorConfig = {
  framework: ProjectFramework;
  configVersion: 1;
  architectureVersion: string;
  features: {
    internationalization: boolean;
    supabase: boolean;
  };
};

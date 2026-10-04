import type { ProjectOptions } from '../../types/project-options.js';
import { readGeneratorVersion } from './generator-version.js';

const runtimeDependencies: Record<string, string> = {
  '@headlessui/react': '^2.2.0',
  '@tanstack/react-query': '^5.0.0',
  clsx: '^2.0.0',
  'lucide-react': '^1.0.0',
  motion: '^12.0.0',
  next: '^16.3.0',
  react: '^19.3.0',
  'react-dom': '^19.3.0',
  'react-hook-form': '^7.0.0',
  sonner: '^2.0.0',
  tailwindcss: '^4.3.0',
  '@tailwindcss/postcss': '^4.3.0',
  postcss: '^8.0.0',
  zustand: '^5.0.0',
  yup: '^1.0.0',
};

const developmentDependencies: Record<string, string> = {
  '@commitlint/cli': '^20.0.0',
  '@commitlint/config-conventional': '^20.0.0',
  '@testing-library/dom': '^10.0.0',
  '@testing-library/jest-dom': '^6.0.0',
  '@testing-library/react': '^16.0.0',
  '@testing-library/user-event': '^14.0.0',
  '@types/node': '^22.0.0',
  '@types/react': '^19.0.0',
  '@types/react-dom': '^19.0.0',
  eslint: '^9.39.0',
  'eslint-config-next': '^16.3.0',
  'eslint-config-prettier': '^10.0.0',
  husky: '^9.0.0',
  'lint-staged': '^16.0.0',
  jsdom: '^27.0.0',
  prettier: '^3.0.0',
  typescript: '^5.9.0',
  vitest: '^3.2.4',
};

export const buildPackageManifest = (options: ProjectOptions) => {
  const dependencies = { ...runtimeDependencies };

  if (options.internationalization) {
    dependencies['next-intl'] = '^4.14.0';
  }

  if (options.supabase) {
    dependencies['@supabase/supabase-js'] = '^2.0.0';
  }

  return {
    name: options.packageName,
    version: '0.1.0',
    private: true,
    engines: { node: '>=22' },
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'eslint .',
      format: 'prettier --write .',
      'format:check': 'prettier --check .',
      typecheck: 'tsc --noEmit',
      test: 'vitest run --passWithNoTests',
      'test:watch': 'vitest',
      prepare: 'husky',
      'generate:component': 'ziurcast-base generate component',
      'generate:hook': 'ziurcast-base generate hook',
      'generate:api': 'ziurcast-base generate api',
      'generate:page': 'ziurcast-base generate page',
      'generate:module': 'ziurcast-base generate module',
    },
    dependencies,
    devDependencies: {
      ...developmentDependencies,
      'ziurcast-base': `^${readGeneratorVersion()}`,
    },
    'lint-staged': {
      '*.{js,jsx,ts,tsx}': [
        'eslint --fix',
        'prettier --write',
        'vitest related --run --passWithNoTests',
      ],
      '*.{json,md,css,mjs}': ['prettier --write'],
    },
  };
};

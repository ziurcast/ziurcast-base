import type { Framework, ProjectOptions } from '../../types/project-options.js';
import { readGeneratorVersion } from './generator-version.js';

type DependencyMap = Record<string, string>;

type FrameworkPreset = {
  scripts: DependencyMap;
  dependencies: DependencyMap;
  devDependencies: DependencyMap;
  i18nDependencies: DependencyMap;
};

const sharedDependencies: DependencyMap = {
  '@headlessui/react': '^2.2.0',
  '@tanstack/react-query': '^5.0.0',
  clsx: '^2.0.0',
  'lucide-react': '^1.0.0',
  motion: '^12.0.0',
  react: '^19.3.0',
  'react-dom': '^19.3.0',
  'react-hook-form': '^7.0.0',
  sonner: '^2.0.0',
  zustand: '^5.0.0',
  yup: '^1.0.0',
};

const sharedDevDependencies: DependencyMap = {
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
  'eslint-config-prettier': '^10.0.0',
  husky: '^9.0.0',
  'lint-staged': '^16.0.0',
  jsdom: '^27.0.0',
  prettier: '^3.0.0',
  typescript: '~6.0.3',
  vitest: '^3.2.4',
};

const frameworkPresets: Record<Framework, FrameworkPreset> = {
  next: {
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      next: '^16.3.0',
      tailwindcss: '^4.3.0',
      '@tailwindcss/postcss': '^4.3.0',
      postcss: '^8.0.0',
    },
    devDependencies: {
      'eslint-config-next': '^16.3.0',
    },
    i18nDependencies: {
      'next-intl': '^4.14.0',
    },
  },
  react: {
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      'react-router': '^7.18.0',
    },
    devDependencies: {
      '@eslint/js': '^9.39.0',
      '@tailwindcss/vite': '^4.3.0',
      '@vitejs/plugin-react': '^5.2.0',
      'eslint-plugin-react-hooks': '^7.1.0',
      'eslint-plugin-react-refresh': '^0.5.0',
      globals: '^17.0.0',
      tailwindcss: '^4.3.0',
      'typescript-eslint': '^8.71.0',
      vite: '^7.3.0',
    },
    i18nDependencies: {
      i18next: '^26.4.0',
      'react-i18next': '^17.0.0',
    },
  },
};

// npm ordena las dependencias alfabéticamente al instalar; se replica para evitar diferencias.
const sortKeys = (map: DependencyMap): DependencyMap =>
  Object.fromEntries(Object.entries(map).sort(([first], [second]) => first.localeCompare(second)));

export const buildPackageManifest = (options: ProjectOptions) => {
  const preset = frameworkPresets[options.framework];
  const dependencies = { ...sharedDependencies, ...preset.dependencies };

  if (options.internationalization) {
    Object.assign(dependencies, preset.i18nDependencies);
  }

  if (options.supabase) {
    dependencies['@supabase/supabase-js'] = '^2.0.0';
  }

  return {
    name: options.packageName,
    version: '0.1.0',
    private: true,
    type: options.framework === 'react' ? 'module' : undefined,
    engines: { node: '>=22' },
    scripts: {
      ...preset.scripts,
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
    dependencies: sortKeys(dependencies),
    devDependencies: sortKeys({
      ...sharedDevDependencies,
      ...preset.devDependencies,
      'ziurcast-base': `^${readGeneratorVersion()}`,
    }),
    'lint-staged': {
      '*.{js,jsx,ts,tsx}': [
        'eslint --fix',
        'prettier --write',
        'vitest related --run --passWithNoTests',
      ],
      '*.{json,md,css,mjs,html}': ['prettier --write'],
    },
  };
};

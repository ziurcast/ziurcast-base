import { describe, expect, it } from 'vitest';
import { insertReactRoute } from './react-route-registry.js';

const createRegistry = (routes: string) =>
  "import { Route, Routes } from 'react-router';\n" +
  '// <pbg:importaciones-rutas>\n\n' +
  'export const AppRoutes = () => (\n' +
  '  <Routes>\n' +
  `${routes}` +
  '      {/* <pbg:rutas> */}\n' +
  '  </Routes>\n' +
  ');\n';

describe('React route registry', () => {
  it('registers absolute routes without i18n using the anchor indentation', () => {
    const source = insertReactRoute(createRegistry(''), {
      pageName: 'UserList',
      importPath: '@/modules/users/pages/UserList',
      routeSegments: ['users', 'list'],
      internationalization: false,
    });

    expect(source).toContain(
      "// <pbg:importaciones-rutas>\nimport { UserList } from '@/modules/users/pages/UserList';",
    );
    expect(source).toContain(
      '{/* <pbg:rutas> */}\n      <Route path="/users/list" element={<UserList />} />',
    );
  });

  it('registers relative and index routes inside the locale route with i18n', () => {
    const relative = insertReactRoute(createRegistry(''), {
      pageName: 'UserList',
      importPath: '@/modules/users/pages/UserList',
      routeSegments: ['users'],
      internationalization: true,
    });
    const index = insertReactRoute(createRegistry(''), {
      pageName: 'Dashboard',
      importPath: '@/modules/dashboard/pages/Dashboard',
      routeSegments: [],
      internationalization: true,
    });

    expect(relative).toContain('<Route path="users" element={<UserList />} />');
    expect(index).toContain('<Route index element={<Dashboard />} />');
  });

  it('rejects routes and pages that are already registered', () => {
    const registered = '    <Route path="/" element={<HomePage />} />\n';
    const withIndex = '      <Route index element={<HomePage />} />\n';

    expect(() =>
      insertReactRoute(createRegistry(registered), {
        pageName: 'Landing',
        importPath: '@/modules/landing/pages/Landing',
        routeSegments: [],
        internationalization: false,
      }),
    ).toThrow('Route is already registered');
    expect(() =>
      insertReactRoute(createRegistry(withIndex), {
        pageName: 'Landing',
        importPath: '@/modules/landing/pages/Landing',
        routeSegments: [],
        internationalization: true,
      }),
    ).toThrow('Route is already registered');
    expect(() =>
      insertReactRoute(
        `import { UserList } from '@/modules/users/pages/UserList';\n${createRegistry('')}`,
        {
          pageName: 'UserList',
          importPath: '@/modules/users/pages/UserList',
          routeSegments: ['people'],
          internationalization: false,
        },
      ),
    ).toThrow('Page is already imported');
  });

  it('requires both registry anchors', () => {
    expect(() =>
      insertReactRoute('export const AppRoutes = () => null;\n', {
        pageName: 'UserList',
        importPath: '@/modules/users/pages/UserList',
        routeSegments: ['users'],
        internationalization: false,
      }),
    ).toThrow('Could not find the route registry anchors');
  });
});

describe('React route registry formatting', () => {
  it('writes one attribute per line when the route exceeds the print width', () => {
    const source = insertReactRoute(createRegistry(''), {
      pageName: 'VeryLongAdministrationDashboardPage',
      importPath: '@/modules/administration/pages/VeryLongAdministrationDashboardPage',
      routeSegments: ['administration', 'dashboard'],
      internationalization: true,
    });

    expect(source).toContain(
      '      <Route\n' +
        '        path="administration/dashboard"\n' +
        '        element={<VeryLongAdministrationDashboardPage />}\n' +
        '      />',
    );
  });
});

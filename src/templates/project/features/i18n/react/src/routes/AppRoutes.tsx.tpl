import { Navigate, Route, Routes } from 'react-router';
import { routing } from '@/i18n/routing';
import { HomePage } from '@/modules/home/pages/HomePage';
import { LocaleRoute } from './LocaleRoute';
// <pbg:importaciones-rutas>

export const AppRoutes = () => (
  <Routes>
    <Route path=":locale" element={<LocaleRoute />}>
      <Route index element={<HomePage />} />
      {/* <pbg:rutas> */}
    </Route>
    <Route
      path="*"
      element={<Navigate to={`/${routing.defaultLocale}`} replace />}
    />
  </Routes>
);

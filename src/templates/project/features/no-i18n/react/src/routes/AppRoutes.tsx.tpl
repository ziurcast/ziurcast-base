import { Route, Routes } from 'react-router';
import { HomePage } from '@/modules/home/pages/HomePage';
// <pbg:importaciones-rutas>

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    {/* <pbg:rutas> */}
  </Routes>
);

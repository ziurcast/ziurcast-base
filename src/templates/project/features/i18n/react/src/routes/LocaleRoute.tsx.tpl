import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useParams } from 'react-router';
import { isLocale, routing } from '@/i18n/routing';

export const LocaleRoute = () => {
  const { locale } = useParams();
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const validLocale = isLocale(locale) ? locale : undefined;

  useEffect(() => {
    if (validLocale) {
      void i18n.changeLanguage(validLocale);
      document.documentElement.lang = validLocale;
    }
  }, [i18n, validLocale]);

  // Las rutas sin prefijo de idioma se redirigen al idioma por defecto.
  if (!validLocale) {
    return <Navigate to={`/${routing.defaultLocale}${pathname}`} replace />;
  }

  return <Outlet />;
};

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getMessages } from './messages';
import { isLocale, routing } from './routing';

// El idioma inicial sale de la URL para evitar mostrar primero el idioma por defecto.
const getInitialLocale = () => {
  const [, firstSegment] = window.location.pathname.split('/');

  return isLocale(firstSegment) ? firstSegment : routing.defaultLocale;
};

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    es: getMessages('es'),
    en: getMessages('en'),
  },
  lng: getInitialLocale(),
  fallbackLng: routing.defaultLocale,
  interpolation: { escapeValue: false },
});

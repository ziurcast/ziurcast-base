import coreEnglish from '@/core/translations/messages/en.json';
import coreSpanish from '@/core/translations/messages/es.json';
import homePageMessages from '@/modules/home/pages/HomePage/messages.json';
// <pbg:importaciones-traducciones-locales>
import type { Locale } from './routing';

const localMessages = {
  'modules-home-pages-HomePage': homePageMessages,
  // <pbg:entradas-traducciones-locales>
};

export const getMessages = (locale: Locale) => ({
  core: locale === 'es' ? coreSpanish : coreEnglish,
  ...Object.fromEntries(
    Object.entries(localMessages).map(([namespace, messages]) => [
      namespace,
      messages[locale],
    ]),
  ),
});

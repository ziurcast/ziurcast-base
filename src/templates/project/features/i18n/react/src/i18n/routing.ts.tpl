export const routing = {
  locales: ['es', 'en'],
  defaultLocale: 'es',
} as const;

export type Locale = (typeof routing.locales)[number];

export const isLocale = (value: string | undefined): value is Locale =>
  routing.locales.some((locale) => locale === value);

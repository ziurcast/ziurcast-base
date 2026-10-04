import { useTranslations as useNextTranslations } from 'next-intl';

export const useTranslations = (namespace: string) =>
  useNextTranslations(namespace);

import { useTranslation } from 'react-i18next';

export const useTranslations = (namespace: string) =>
  useTranslation(namespace).t;

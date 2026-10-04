import { useTranslations } from '@/core/translations/useTranslations';

{{namespaceDeclaration}}

export const {{pageName}} = () => {
  const t = useTranslations(namespace);

  return (
    <main>
      <h1>{t('title')}</h1>
    </main>
  );
};

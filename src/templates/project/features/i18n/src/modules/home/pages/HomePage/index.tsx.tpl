import { useTranslations } from '@/core/translations/useTranslations';

const namespace = 'modules-home-pages-HomePage';

export const HomePage = () => {
  const t = useTranslations(namespace);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Project Base Generator
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
        {t('title')}
      </h1>
      <p className="max-w-2xl text-lg leading-8 text-slate-600">
        {t('description')}
      </p>
    </main>
  );
};

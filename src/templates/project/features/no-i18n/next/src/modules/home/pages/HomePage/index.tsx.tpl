import Image from 'next/image';

const projectName = {{projectNameLiteral}};

const stack = [
  'Next.js',
  'React',
  'TypeScript',
  'Tailwind CSS',
  'TanStack Query',
  'Zustand',
  'React Hook Form',
  'Vitest',
];

export const HomePage = () => (
  <main className="relative isolate min-h-screen overflow-hidden">
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 -z-10 h-96 bg-linear-to-b from-brand/10 to-transparent dark:from-brand/40"
    />
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-16 px-6 py-20">
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.svg"
            alt="ziurcast"
            width={48}
            height={48}
            priority
            className="rounded-md"
          />
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
            {projectName}
          </span>
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Your project is ready to build.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
          Start by shaping this project around your product and its domains.
        </p>
      </header>

      <section aria-labelledby="stack-title" className="flex flex-col gap-6">
        <h2
          id="stack-title"
          className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase"
        >
          Included stack
        </h2>
        <ul className="flex flex-wrap gap-2">
          {stack.map((item) => (
            <li
              key={item}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  </main>
);

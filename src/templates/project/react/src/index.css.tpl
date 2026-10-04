@import 'tailwindcss';

@theme {
  --color-brand: #66023c;
}

:root {
  color-scheme: light dark;
}

body {
  @apply min-h-screen bg-white text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-50;
}

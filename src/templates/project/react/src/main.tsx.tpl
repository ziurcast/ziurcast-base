import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppProviders } from '@/providers/AppProviders';
import { AppRoutes } from '@/routes/AppRoutes';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('The #root element is missing from index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);

import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/providers/AppProviders';

export const metadata: Metadata = {
  title: {{projectNameLiteral}},
  description: 'A project generated with Project Base Generator.',
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    <body>
      <AppProviders>{children}</AppProviders>
    </body>
  </html>
);

export default RootLayout;

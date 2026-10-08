import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import ReactQueryProvider from '@/lib/provider';
import { ThemeProvider } from '@/components/shared/theme-provider';

export const metadata: Metadata = {
  title: 'Cloud Storage',
  description: 'AMS Cloud Storage — file sharing powered by Dropbox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <ReactQueryProvider>
            <Toaster richColors position="top-center" />
            {children}
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

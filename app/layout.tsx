import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RealtimeKit Live UI',
  description: 'Create meetings, join sessions, and inspect RealtimeKit analytics from a Next.js dashboard.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="dark min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}

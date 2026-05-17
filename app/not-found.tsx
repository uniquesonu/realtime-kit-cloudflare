import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
      <Card className="glass-panel w-full max-w-xl">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">404</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
            <p className="text-sm text-muted-foreground">Return to the RealtimeKit dashboard to create or join a meeting.</p>
          </div>
          <Button asChild className="rounded-full">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from 'next/link';
import { MeetingRoom } from '../../../components/meeting-room';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type MeetingPageProps = {
  params: Promise<{
    meetingId: string;
  }>;
  searchParams: Promise<{
    authToken?: string;
    participantId?: string;
    participantName?: string;
    customParticipantId?: string;
    presetName?: string;
  }>;
};

export default async function MeetingPage({ params, searchParams }: MeetingPageProps) {
  const [{ meetingId }, { authToken, participantId, participantName, customParticipantId, presetName }] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!authToken) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
        <Card className="glass-panel w-full max-w-xl">
          <CardContent className="flex flex-col items-start gap-4 p-8">
            <h1 className="text-3xl font-semibold tracking-tight">Missing auth token</h1>
            <p className="text-sm text-muted-foreground">
              Generate a participant token from the join dashboard before opening this meeting room.
            </p>
            <Button asChild className="rounded-full">
              <Link href="/">Return to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MeetingRoom
      meetingId={meetingId}
      authToken={authToken}
      participantId={participantId}
      participantName={participantName}
      customParticipantId={customParticipantId}
      presetName={presetName}
    />
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting, provideRtkDesignSystem } from '@cloudflare/realtimekit-react-ui';
import { Button } from '@/components/ui/button';

type MeetingRoomProps = {
  authToken: string;
  meetingId: string;
  participantId?: string;
  participantName?: string;
  customParticipantId?: string;
  presetName?: string;
};

export function MeetingRoom({
  authToken,
  meetingId,
  participantId,
  participantName,
  customParticipantId,
  presetName,
}: MeetingRoomProps) {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    initializedRef.current = true;

    provideRtkDesignSystem(document.body, {
      theme: 'dark',
      googleFont: 'Inter',
    });

    console.info('[meeting-room] participant context', {
      meetingId,
      participantId,
      participantName,
      customParticipantId,
      presetName,
    });

    initMeeting({
      authToken,
      baseURI: process.env.NEXT_PUBLIC_RTK_BASE_URL || 'realtime.cloudflare.com',
      defaults: {
        audio: true,
        video: true,
      },
    }).catch((joinError) => {
      setError(joinError instanceof Error ? joinError.message : 'Unable to initialize meeting');
    });
  }, [authToken, customParticipantId, initMeeting, meetingId, participantId, participantName, presetName]);

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-black/65 to-transparent" />
      <div className="absolute left-4 top-4 z-30">
        <Button asChild variant="outline" className="pointer-events-auto rounded-full border-white/15 bg-slate-950/70 text-white hover:bg-slate-900/80">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
      {error ? <div className="grid h-full place-items-center px-6 text-center text-sm text-red-200">{error}</div> : null}
      {!meeting && !error ? <div className="grid h-full place-items-center px-6 text-center text-sm text-slate-300">Initializing RealtimeKit meeting...</div> : null}
      {meeting ? <RtkMeeting meeting={meeting} mode="fill" showSetupScreen /> : null}
    </div>
  );
}

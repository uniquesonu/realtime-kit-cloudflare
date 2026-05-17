import { NextRequest, NextResponse } from 'next/server';
import { addParticipant } from '../../../../../lib/cloudflare';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    meetingId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { meetingId } = await context.params;
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Participant name is required' }, { status: 400 });
    }

    if (!body.presetName || typeof body.presetName !== 'string') {
      return NextResponse.json({ error: 'Preset name is required' }, { status: 400 });
    }

    const participant = await addParticipant({
      meetingId,
      name: body.name,
      presetName: body.presetName,
      customParticipantId: crypto.randomUUID(),
    });

    console.info('[api/meetings/join] participant created', {
      meetingId,
      participantId: participant.id,
      participantName: participant.name ?? body.name,
      presetName: participant.preset_name,
      customParticipantId: participant.custom_participant_id,
    });

    return NextResponse.json({
      data: {
        meetingId,
        participantId: participant.id,
        participantName: participant.name ?? body.name,
        presetName: participant.preset_name ?? body.presetName,
        customParticipantId: participant.custom_participant_id,
        token: participant.token,
      },
    });
  } catch (error) {
    console.error('[api/meetings/join] participant creation failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create participant token' },
      { status: 500 },
    );
  }
}

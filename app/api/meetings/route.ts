import { NextRequest, NextResponse } from 'next/server';
import { createMeeting, listMeetings } from '../../../lib/cloudflare';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await listMeetings();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch meetings' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.info('[api/meetings] create request', {
      title: body.title,
      record_on_start: Boolean(body.record_on_start),
      persist_chat: Boolean(body.persist_chat),
      summarize_on_end: Boolean(body.summarize_on_end),
      live_stream_on_start: Boolean(body.live_stream_on_start),
    });

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }

    const data = await createMeeting({
      title: body.title,
      record_on_start: Boolean(body.record_on_start),
      persist_chat: Boolean(body.persist_chat),
      summarize_on_end: Boolean(body.summarize_on_end),
      live_stream_on_start: Boolean(body.live_stream_on_start),
    });

    console.info('[api/meetings] create success', {
      meetingId: data.id,
      title: data.title,
      status: data.status,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[api/meetings] create failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create meeting' },
      { status: 500 },
    );
  }
}

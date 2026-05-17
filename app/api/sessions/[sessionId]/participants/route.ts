import { NextResponse } from 'next/server';
import { listSessionParticipants } from '../../../../../lib/cloudflare';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const data = await listSessionParticipants(sessionId);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch session participants' },
      { status: 500 },
    );
  }
}

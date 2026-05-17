import { NextResponse } from 'next/server';
import { listPresets } from '../../../lib/cloudflare';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await listPresets();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch presets' },
      { status: 500 },
    );
  }
}

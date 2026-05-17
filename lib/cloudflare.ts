type CloudflareEnvelope<T> = {
  success?: boolean;
  data?: T;
  result?: T | null;
  paging?: {
    total_count?: number;
    start_offset?: number;
    end_offset?: number;
  };
  errors?: Array<{ code?: number; message?: string }>;
  messages?: Array<{ code?: number; message?: string }>;
};

class CloudflareApiError extends Error {
  status: number;
  code?: number;
  details?: string;

  constructor(message: string, options: { status: number; code?: number; details?: string }) {
    super(message);
    this.name = 'CloudflareApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export type Meeting = {
  id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  status?: 'ACTIVE' | 'INACTIVE';
  persist_chat?: boolean;
  record_on_start?: boolean;
  live_stream_on_start?: boolean;
  summarize_on_end?: boolean;
  session_keep_alive_time_in_secs?: number;
};

export type Preset = {
  id?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
};

export type Session = {
  id: string;
  associated_id: string;
  created_at: string;
  updated_at: string;
  started_at: string;
  ended_at?: string;
  status: 'LIVE' | 'ENDED';
  type: 'meeting' | 'livestream' | 'participant';
  meeting_display_name: string;
  live_participants: number;
  max_concurrent_participants: number;
  minutes_consumed: number;
};

export type SessionParticipant = {
  id?: string;
  custom_participant_id?: string;
  display_name?: string;
  duration?: number;
  joined_at?: string;
  left_at?: string;
  preset_name?: string;
  updated_at?: string;
  created_at?: string;
  user_id?: string;
};

export type DashboardData = {
  meetings: Meeting[];
  presets: Preset[];
  sessions: Session[];
  analytics: {
    totalMeetings: number;
    activeMeetings: number;
    totalSessions: number;
    liveSessions: number;
    totalMinutesConsumed: number;
    peakParticipants: number;
  };
};

type CreateMeetingInput = {
  title: string;
  record_on_start?: boolean;
  persist_chat?: boolean;
  live_stream_on_start?: boolean;
  summarize_on_end?: boolean;
};

type CreateParticipantInput = {
  meetingId: string;
  name: string;
  presetName: string;
  customParticipantId: string;
};

function getEnv(name: 'ACCOUNT_ID' | 'API_KEY' | 'APP_ID') {
  const fallbackMap = {
    ACCOUNT_ID: process.env.ACCOUNT_ID,
    API_KEY: process.env.API_KEY ?? process.env.CLOUDFLARE_API_TOKEN,
    APP_ID: process.env.APP_ID,
  } as const;
  const value = fallbackMap[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const accountId = getEnv('ACCOUNT_ID');
  const appId = getEnv('APP_ID');
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url;
}

async function cloudflareRequest<T>(
  path: string,
  init?: RequestInit,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const apiKey = getEnv('API_KEY');
  const url = buildUrl(path, query);
  const method = init?.method ?? 'GET';
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const rawText = await response.text();
  let payload: CloudflareEnvelope<T> | null = null;

  try {
    payload = rawText ? (JSON.parse(rawText) as CloudflareEnvelope<T>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false || payload?.data === undefined) {
    const errorMessage = payload?.errors?.map((item) => item.message).filter(Boolean).join(', ')
      || payload?.messages?.map((item) => item.message).filter(Boolean).join(', ')
      || rawText
      || `Cloudflare API request failed with status ${response.status}`;
    const errorCode = payload?.errors?.[0]?.code ?? payload?.messages?.[0]?.code;

    console.error('[cloudflare] request failed', {
      method,
      path: url.pathname,
      status: response.status,
      code: errorCode,
      message: errorMessage,
    });

    throw new CloudflareApiError(errorMessage, {
      status: response.status,
      code: errorCode,
      details: rawText || undefined,
    });
  }

  return payload.data;
}

export async function listMeetings() {
  return cloudflareRequest<Meeting[]>('/meetings', undefined, {
    per_page: 20,
  });
}

export async function createMeeting(input: CreateMeetingInput) {
  return cloudflareRequest<Meeting>('/meetings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listPresets() {
  return cloudflareRequest<Preset[]>('/presets', undefined, {
    per_page: 20,
  });
}

export async function listSessions() {
  const data = await cloudflareRequest<{ sessions?: Session[] }>('/sessions', undefined, {
    per_page: 12,
    sort_by: 'createdAt',
    sort_order: 'DESC',
  });

  return data.sessions ?? [];
}

export async function listSessionParticipants(sessionId: string) {
  const data = await cloudflareRequest<{ participants?: SessionParticipant[] }>(`/sessions/${sessionId}/participants`, undefined, {
    per_page: 25,
    sort_by: 'duration',
    sort_order: 'DESC',
  });

  return data.participants ?? [];
}

export async function addParticipant(input: CreateParticipantInput) {
  return cloudflareRequest<{
    id: string;
    token: string;
    custom_participant_id: string;
    preset_name: string;
    name?: string;
    created_at: string;
    updated_at: string;
  }>(`/meetings/${input.meetingId}/participants`, {
    method: 'POST',
    body: JSON.stringify({
      custom_participant_id: input.customParticipantId,
      preset_name: input.presetName,
      name: input.name,
    }),
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  const [meetings, presets, sessions] = await Promise.all([
    listMeetings(),
    listPresets(),
    listSessions(),
  ]);

  return {
    meetings,
    presets,
    sessions,
    analytics: {
      totalMeetings: meetings.length,
      activeMeetings: meetings.filter((meeting) => meeting.status === 'ACTIVE').length,
      totalSessions: sessions.length,
      liveSessions: sessions.filter((session) => session.status === 'LIVE').length,
      totalMinutesConsumed: sessions.reduce((sum, session) => sum + (session.minutes_consumed || 0), 0),
      peakParticipants: sessions.reduce(
        (peak, session) => Math.max(peak, session.max_concurrent_participants || 0),
        0,
      ),
    },
  };
}

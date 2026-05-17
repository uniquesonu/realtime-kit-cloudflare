'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Clock3,
  Gauge,
  PlusCircle,
  Radio,
  RefreshCw,
  Rocket,
  ShieldCheck,
  UserRoundPlus,
  Users,
  Video,
} from 'lucide-react';
import type {
  DashboardData,
  Meeting,
  SessionParticipant,
} from '@/lib/cloudflare';
import { formatDate, formatMinutes, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DashboardProps = {
  initialData: DashboardData;
  initialError?: string | null;
};

type JoinResponse = {
  meetingId: string;
  token: string;
  participantId: string;
  participantName: string;
  customParticipantId: string;
  presetName: string;
};

function getRecommendedPresetName(data: DashboardData) {
  const names = data.presets
    .map((preset) => preset.name)
    .filter((name): name is string => Boolean(name));

  return (
    names.find((name) => name === 'group_call_host') ||
    names.find((name) => name === 'group_call_participant') ||
    names.find((name) => name.startsWith('group_call_')) ||
    names[0] ||
    ''
  );
}

function statusTone(status: string) {
  if (status === 'ACTIVE' || status === 'LIVE' || status === 'Ready') {
    return 'default';
  }

  if (
    status === 'INACTIVE' ||
    status === 'ENDED' ||
    status === 'Needs token fix'
  ) {
    return 'destructive';
  }

  return 'secondary';
}

function MetricCard({
  title,
  value,
  caption,
  icon: Icon,
}: {
  title: string;
  value: string;
  caption: string;
  icon: typeof Activity;
}) {
  return (
    <Card className="glass-panel overflow-hidden">
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'neutral';
  children: React.ReactNode;
}) {
  const styles = {
    error: 'border-red-500/20 bg-red-500/10 text-red-100',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    neutral: 'border-white/10 bg-white/5 text-slate-200',
  } as const;

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm leading-6',
        styles[tone]
      )}
    >
      {children}
    </div>
  );
}

export function Dashboard({ initialData, initialError }: DashboardProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState(
    initialData.meetings[0]?.id ?? ''
  );
  const [participantName, setParticipantName] = useState('Guest User');
  const [presetName, setPresetName] = useState(
    getRecommendedPresetName(initialData)
  );
  const [meetingTitle, setMeetingTitle] = useState('Product Sync');
  const [recordOnStart, setRecordOnStart] = useState(false);
  const [persistChat, setPersistChat] = useState(true);
  const [summarizeOnEnd, setSummarizeOnEnd] = useState(false);
  const [liveStreamOnStart, setLiveStreamOnStart] = useState(false);
  const [participantLists, setParticipantLists] = useState<
    Record<string, SessionParticipant[]>
  >({});
  const [participantErrors, setParticipantErrors] = useState<
    Record<string, string>
  >({});
  const [isCreating, startCreateTransition] = useTransition();
  const [isJoining, startJoinTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const hasAuthError = /authentication error/i.test(error ?? '');

  const meetingOptions = useMemo(() => data.meetings, [data.meetings]);
  const presetOptions = useMemo(
    () =>
      data.presets
        .map((preset) => preset.name)
        .filter((name): name is string => Boolean(name)),
    [data.presets]
  );

  async function refreshDashboard() {
    startRefreshTransition(async () => {
      try {
        setError(null);
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to refresh dashboard');
        }

        const nextData = payload.data as DashboardData;
        setData(nextData);
        setSelectedMeetingId(
          (current) => current || nextData.meetings[0]?.id || ''
        );
        setPresetName(
          (current) => current || getRecommendedPresetName(nextData)
        );
      } catch (refreshError) {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : 'Failed to refresh dashboard'
        );
      }
    });
  }

  function handleCreateMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateMessage(null);
    setError(null);

    startCreateTransition(async () => {
      try {
        const response = await fetch('/api/meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: meetingTitle,
            record_on_start: recordOnStart,
            persist_chat: persistChat,
            summarize_on_end: summarizeOnEnd,
            live_stream_on_start: liveStreamOnStart,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          console.error('[dashboard] create meeting failed', payload);
          throw new Error(payload.error || 'Failed to create meeting');
        }

        const meeting = payload.data as Meeting;
        console.info('[dashboard] meeting created', {
          meetingId: meeting.id,
          title: meeting.title,
        });
        setCreateMessage(`Created meeting ${meeting.title || meeting.id}`);
        setSelectedMeetingId(meeting.id);
        await refreshDashboard();
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : 'Failed to create meeting'
        );
      }
    });
  }

  function handleJoinMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError(null);

    startJoinTransition(async () => {
      try {
        const response = await fetch(
          `/api/meetings/${selectedMeetingId}/join`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: participantName,
              presetName,
            }),
          }
        );

        const payload = await response.json();

        if (!response.ok) {
          console.error('[dashboard] join meeting failed', payload);
          throw new Error(payload.error || 'Failed to join meeting');
        }

        const join = payload.data as JoinResponse;
        console.info('[dashboard] participant ready', {
          meetingId: join.meetingId,
          participantId: join.participantId,
          participantName: join.participantName,
          customParticipantId: join.customParticipantId,
          presetName: join.presetName,
        });
        router.push(
          `/meeting/${join.meetingId}?authToken=${encodeURIComponent(
            join.token
          )}&participantId=${encodeURIComponent(
            join.participantId
          )}&participantName=${encodeURIComponent(
            join.participantName
          )}&customParticipantId=${encodeURIComponent(
            join.customParticipantId
          )}&presetName=${encodeURIComponent(join.presetName)}`
        );
      } catch (joinMeetingError) {
        setJoinError(
          joinMeetingError instanceof Error
            ? joinMeetingError.message
            : 'Failed to join meeting'
        );
      }
    });
  }

  async function loadParticipants(sessionId: string) {
    if (participantLists[sessionId] || loadingSessionId === sessionId) {
      return;
    }

    setLoadingSessionId(sessionId);
    setParticipantErrors((current) => {
      const next = { ...current };
      delete next[sessionId];
      return next;
    });

    try {
      const response = await fetch(`/api/sessions/${sessionId}/participants`, {
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok) {
        console.error('[dashboard] load participants failed', payload);
        throw new Error(payload.error || 'Failed to load participants');
      }

      console.info('[dashboard] participant analytics loaded', {
        sessionId,
        participants: Array.isArray(payload.data) ? payload.data.length : 0,
      });

      setParticipantLists((current) => ({
        ...current,
        [sessionId]: payload.data as SessionParticipant[],
      }));
    } catch (participantError) {
      setParticipantErrors((current) => ({
        ...current,
        [sessionId]:
          participantError instanceof Error
            ? participantError.message
            : 'Failed to load participants',
      }));
    } finally {
      setLoadingSessionId(null);
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 surface-grid opacity-40" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Card className="glass-panel overflow-hidden border-primary/20">
          <CardContent className="relative p-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.15),transparent_30%)]" />
            <div className="relative grid gap-8 px-6 py-8 lg:grid-cols-[1.3fr_0.7fr] lg:px-8">
              <div className="space-y-5">
                <Badge className="w-fit" variant="outline">
                  Cloudflare RealtimeKit
                </Badge>
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                    Run meetings, hand out participant tokens, and inspect live
                    session activity from one dashboard.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-300">
                    This app creates meetings server-side, joins users with
                    participant presets, and surfaces session analytics without
                    leaving the browser.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={refreshDashboard}
                    disabled={isRefreshing}
                    className="rounded-full"
                  >
                    <RefreshCw
                      className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                    />
                    {isRefreshing ? 'Refreshing' : 'Refresh dashboard'}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-white/15 bg-white/5"
                    asChild
                  >
                    <a href="#join-room">Join a room</a>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <MetricCard
                  title="Meetings"
                  value={formatNumber(data.analytics.totalMeetings)}
                  caption="Reusable rooms provisioned"
                  icon={Video}
                />
                <MetricCard
                  title="Live Sessions"
                  value={formatNumber(data.analytics.liveSessions)}
                  caption="Sessions active right now"
                  icon={Radio}
                />
                <MetricCard
                  title="Minutes Consumed"
                  value={formatNumber(
                    Math.round(data.analytics.totalMinutesConsumed)
                  )}
                  caption="Session usage across the app"
                  icon={Clock3}
                />
                <MetricCard
                  title="Peak Participants"
                  value={formatNumber(data.analytics.peakParticipants)}
                  caption="Highest concurrent session load"
                  icon={Users}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle>Connection status</CardTitle>
                <CardDescription>
                  Surface the exact Cloudflare response before you try to create
                  or join a room.
                </CardDescription>
              </div>
              <Badge
                variant={statusTone(hasAuthError ? 'Needs token fix' : 'Ready')}
              >
                {hasAuthError ? 'Needs token fix' : 'Ready'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? (
                <Callout tone="error">{error}</Callout>
              ) : (
                <Callout tone="success">
                  Cloudflare API calls are available. You can create a meeting
                  or generate a participant token.
                </Callout>
              )}
              {hasAuthError ? (
                <Callout tone="neutral">
                  Cloudflare is rejecting the current token. Replace it with one
                  that has Realtime Admin access for this account, restart the
                  dev server, and refresh the dashboard.
                </Callout>
              ) : null}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle>User logging</CardTitle>
                <CardDescription>
                  Participant and meeting diagnostics are emitted in both the
                  browser and server console.
                </CardDescription>
              </div>
              <Badge variant="secondary">Debug enabled</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-slate-300">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  Client logs include participant name, participant id, custom
                  participant id, and preset name.
                </span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Activity className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  Server logs include meeting creation payloads, upstream
                  failures, and participant creation details.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle>Create meeting</CardTitle>
                <CardDescription>
                  Provision a reusable meeting room directly from Cloudflare
                  RealtimeKit.
                </CardDescription>
              </div>
              <Badge variant="outline">Meetings API</Badge>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5" onSubmit={handleCreateMeeting}>
                <div className="grid gap-2">
                  <Label htmlFor="meeting-title">Meeting title</Label>
                  <Input
                    id="meeting-title"
                    value={meetingTitle}
                    onChange={(event) => setMeetingTitle(event.target.value)}
                    placeholder="Weekly team sync"
                    required
                  />
                </div>

                <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="persist-chat"
                      checked={persistChat}
                      onCheckedChange={(checked) =>
                        setPersistChat(Boolean(checked))
                      }
                    />
                    <div className="grid gap-1.5">
                      <Label htmlFor="persist-chat">
                        Persist chat for follow-up
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Keep meeting chat available after the session ends.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="record-on-start"
                      checked={recordOnStart}
                      onCheckedChange={(checked) =>
                        setRecordOnStart(Boolean(checked))
                      }
                    />
                    <div className="grid gap-1.5">
                      <Label htmlFor="record-on-start">
                        Record as soon as someone joins
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Turn on recording automatically for the room.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="summarize-on-end"
                      checked={summarizeOnEnd}
                      onCheckedChange={(checked) =>
                        setSummarizeOnEnd(Boolean(checked))
                      }
                    />
                    <div className="grid gap-1.5">
                      <Label htmlFor="summarize-on-end">
                        Generate summary at the end
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Use the AI summary flow after the meeting finishes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="livestream-on-start"
                      checked={liveStreamOnStart}
                      onCheckedChange={(checked) =>
                        setLiveStreamOnStart(Boolean(checked))
                      }
                    />
                    <div className="grid gap-1.5">
                      <Label htmlFor="livestream-on-start">
                        Start live streaming on join
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Begin the room in a livestream-enabled state.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="rounded-full"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {isCreating ? 'Creating...' : 'Create meeting'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRefreshing}
                    className="rounded-full"
                    onClick={refreshDashboard}
                  >
                    <RefreshCw
                      className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                    />
                    Refresh data
                  </Button>
                </div>

                {createMessage ? (
                  <Callout tone="success">{createMessage}</Callout>
                ) : null}
                {error ? <Callout tone="error">{error}</Callout> : null}
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel" id="join-room">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle>Join meeting</CardTitle>
                <CardDescription>
                  Create a participant token and open the RealtimeKit meeting
                  experience.
                </CardDescription>
              </div>
              <Badge variant="outline">Participants API</Badge>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5" onSubmit={handleJoinMeeting}>
                <div className="grid gap-2">
                  <Label htmlFor="meeting-id">Meeting</Label>
                  <Select
                    value={selectedMeetingId || undefined}
                    onValueChange={setSelectedMeetingId}
                    disabled={meetingOptions.length === 0}
                  >
                    <SelectTrigger id="meeting-id">
                      <SelectValue placeholder="Select a meeting" />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingOptions.map((meeting) => (
                        <SelectItem key={meeting.id} value={meeting.id}>
                          {meeting.title || meeting.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="participant-name">Participant name</Label>
                  <Input
                    id="participant-name"
                    value={participantName}
                    onChange={(event) => setParticipantName(event.target.value)}
                    placeholder="Mary Sue"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="preset-name">Preset</Label>
                  <Select
                    value={presetName || undefined}
                    onValueChange={setPresetName}
                    disabled={presetOptions.length === 0}
                  >
                    <SelectTrigger id="preset-name">
                      <SelectValue placeholder="Select a participant preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {presetOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm leading-6 text-muted-foreground">
                    For two-way video, use{' '}
                    <code className="rounded bg-white/10 px-1 py-0.5">
                      group_call_host
                    </code>{' '}
                    or{' '}
                    <code className="rounded bg-white/10 px-1 py-0.5">
                      group_call_participant
                    </code>
                    .
                  </p>
                </div>

                <Callout tone="neutral">
                  If you join from only one browser, participant count stays at{' '}
                  <strong>1</strong> and there is nobody else to render. Open
                  the same meeting in another tab, browser, or device to test
                  the grid.
                </Callout>

                <Button
                  type="submit"
                  disabled={isJoining || !selectedMeetingId || !presetName}
                  className="rounded-full"
                >
                  <UserRoundPlus className="h-4 w-4" />
                  {isJoining ? 'Preparing room...' : 'Join meeting'}
                </Button>

                {joinError ? <Callout tone="error">{joinError}</Callout> : null}
              </form>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Meetings dashboard
              </h2>
              <p className="text-sm text-muted-foreground">
                Recent rooms and the server-side options currently attached to
                them.
              </p>
            </div>
            <Badge variant="secondary">
              {formatNumber(data.meetings.length)} loaded
            </Badge>
          </div>

          {data.meetings.length === 0 ? (
            <Card className="glass-panel">
              <CardContent className="flex min-h-40 items-center justify-center p-6 text-sm text-muted-foreground">
                No meetings found for this RealtimeKit app yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.meetings.map((meeting) => (
                <Card className="glass-panel" key={meeting.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">
                        {meeting.title || 'Untitled meeting'}
                      </CardTitle>
                      <CardDescription className="break-all font-mono text-xs">
                        {meeting.id}
                      </CardDescription>
                    </div>
                    <Badge variant={statusTone(meeting.status || 'INACTIVE')}>
                      {meeting.status || 'INACTIVE'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Created
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {formatDate(meeting.created_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Updated
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {formatDate(meeting.updated_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Record on start
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {meeting.record_on_start ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Persist chat
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {meeting.persist_chat ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Session analytics
              </h2>
              <p className="text-sm text-muted-foreground">
                Track recent live sessions, attendance peaks, and participant
                breakdowns.
              </p>
            </div>
            <Badge variant="outline">Sessions API</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Active meetings"
              value={formatNumber(data.analytics.activeMeetings)}
              caption="Currently active rooms"
              icon={Video}
            />
            <MetricCard
              title="Total sessions"
              value={formatNumber(data.analytics.totalSessions)}
              caption="Recorded session rows"
              icon={CalendarClock}
            />
            <MetricCard
              title="Live sessions"
              value={formatNumber(data.analytics.liveSessions)}
              caption="Sessions in progress"
              icon={Radio}
            />
            <MetricCard
              title="Peak participants"
              value={formatNumber(data.analytics.peakParticipants)}
              caption="Largest concurrent crowd"
              icon={Gauge}
            />
          </div>

          {data.sessions.length === 0 ? (
            <Card className="glass-panel">
              <CardContent className="flex min-h-40 items-center justify-center p-6 text-sm text-muted-foreground">
                No session analytics available yet. Join a room to start
                generating usage data.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.sessions.map((session) => (
                <Card className="glass-panel" key={session.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">
                        {session.meeting_display_name || 'Session'}
                      </CardTitle>
                      <CardDescription className="break-all font-mono text-xs">
                        {session.id}
                      </CardDescription>
                    </div>
                    <Badge variant={statusTone(session.status)}>
                      {session.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Meeting ID
                        </p>
                        <p className="mt-2 break-all text-sm font-medium">
                          {session.associated_id}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Started
                        </p>
                        <p className="mt-2 text-sm font-medium">
                          {formatDate(session.started_at)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Minutes
                        </p>
                        <p className="mt-2 text-sm font-medium">
                          {formatMinutes(session.minutes_consumed)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Peak participants
                        </p>
                        <p className="mt-2 text-sm font-medium">
                          {formatNumber(session.max_concurrent_participants)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => loadParticipants(session.id)}
                        disabled={loadingSessionId === session.id}
                        className="rounded-full"
                      >
                        {loadingSessionId === session.id
                          ? 'Loading participants...'
                          : 'Load participant analytics'}
                      </Button>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Live now: {formatNumber(session.live_participants)}
                      </div>
                    </div>

                    {participantErrors[session.id] ? (
                      <Callout tone="error">
                        {participantErrors[session.id]}
                      </Callout>
                    ) : null}

                    {participantLists[session.id] ? (
                      participantLists[session.id].length === 0 ? (
                        <Callout tone="neutral">
                          No participant rows were returned for this session.
                        </Callout>
                      ) : (
                        <div className="grid gap-3">
                          {participantLists[session.id].map(
                            (participant, index) => (
                              <div
                                className="rounded-2xl border border-white/10 bg-white/5 p-4"
                                key={participant.id || `${session.id}-${index}`}
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="font-medium text-white">
                                      {participant.display_name ||
                                        'Unknown participant'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Participant analytics row
                                    </p>
                                  </div>
                                  <Badge variant="secondary">
                                    {participant.preset_name ||
                                      'Preset unavailable'}
                                  </Badge>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                      Joined
                                    </p>
                                    <p className="mt-2 text-sm">
                                      {formatDate(participant.joined_at)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                      Left
                                    </p>
                                    <p className="mt-2 text-sm">
                                      {formatDate(participant.left_at)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                      Duration
                                    </p>
                                    <p className="mt-2 text-sm">
                                      {formatMinutes(participant.duration || 0)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                      Custom ID
                                    </p>
                                    <p className="mt-2 break-all text-sm">
                                      {participant.custom_participant_id ||
                                        'Not set'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Card className="glass-panel border-white/10 bg-white/[0.04]">
          <CardContent className="flex flex-col gap-3 p-6 text-sm text-slate-300 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
              <span>
                Use a second tab, browser, or device to test the actual in-room
                grid. A single participant can only see their own local preview
                and room controls.
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Rocket className="h-4 w-4" />
              RealtimeKit dashboard ready
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

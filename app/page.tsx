import { Dashboard } from '../components/dashboard';
import { getDashboardData } from '../lib/cloudflare';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const data = await getDashboardData();
    return <Dashboard initialData={data} />;
  } catch (error) {
    return (
      <Dashboard
        initialData={{
          meetings: [],
          presets: [],
          sessions: [],
          analytics: {
            totalMeetings: 0,
            activeMeetings: 0,
            totalSessions: 0,
            liveSessions: 0,
            totalMinutesConsumed: 0,
            peakParticipants: 0,
          },
        }}
        initialError={error instanceof Error ? error.message : 'Failed to load dashboard'}
      />
    );
  }
}

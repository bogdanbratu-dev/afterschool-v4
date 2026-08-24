// Helper client fire-and-forget pentru urmarirea progresului in chestionarul Potrivire (vezi si
// logSearch.ts, acelasi tipar). Un singur rand pe sesiune de wizard (UPSERT dupa sessionId in
// /api/analytics/match-progress), suprascris la fiecare pas - permite admin-ului sa vada unde s-au
// oprit userii care n-au ajuns la un lead.
export interface LogMatchProgressParams {
  sessionId: string;
  listingType?: string | null;
  stepId?: string;
  stepIndex?: number;
  totalSteps?: number;
  draft?: unknown;
  completed?: boolean;
}

export function logMatchProgress(params: LogMatchProgressParams): void {
  try {
    fetch('/api/analytics/match-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

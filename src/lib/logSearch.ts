// Helper client comun pentru inregistrarea cautarilor in istoricul permanent (tabela `searches`,
// vezi ALTER-urile din initializeDb() in db.ts). Fiecare suprafata de cautare de pe site (SearchBar
// de pe homepage, CircSearch, widgetul ZoneInsights) apeleaza asta direct - fire-and-forget, nu
// blocheaza si nu intrerupe UI-ul in caz de eroare de retea.
export interface LogSearchParams {
  query: string;
  source: string;
  lat?: number | null;
  lng?: number | null;
  sector?: number | null;
  resolved: boolean;
}

export function logSearch(params: LogSearchParams): void {
  try {
    fetch('/api/analytics/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

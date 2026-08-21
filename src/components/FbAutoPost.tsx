'use client';
import { useState, useEffect } from 'react';

interface AutoPostConfig {
  enabled: boolean;
  minIntervalMin: number;
  dailyCap: number;
  hoursStart: number;
  hoursEnd: number;
}

interface MentionedEntity {
  type: string;
  id: number;
  name: string;
  facebook_url?: string | null;
}

interface ComposedPost {
  template: 'A' | 'B' | 'C';
  anchorType: string;
  anchorId: number;
  text: string;
  mentioned: MentionedEntity[];
}

interface QueueRow {
  id: number;
  posted_at: number;
  generated_at: number | null;
  template: string;
  anchor_type: string;
  anchor_id: number;
  message: string;
  mentioned_json?: string | null;
  status: string;
}

interface LogRow {
  id: number;
  posted_at: number;
  generated_at: number | null;
  template: string;
  anchor_type: string;
  anchor_id: number;
  message: string;
  fb_post_id: string | null;
  status: string;
  error: string | null;
}

interface AnchorSearchResult {
  id: number;
  name: string;
}

interface PoolStat {
  total: number;
  promoted: number;
}

interface PoolStats {
  afterschools: PoolStat;
  clubs: PoolStat;
  kindergartens: PoolStat;
}

const TEMPLATE_LABELS: Record<string, string> = {
  A: 'A · Afterschool',
  B: 'B · Grădiniță',
  C: 'C · Club',
};

const STATUS_LABELS: Record<string, string> = {
  sent: 'postat',
  queued: 'generat, în coadă',
  error: 'eroare',
};

const STATUS_CLASSES: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  queued: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
};

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'chiar acum';
  if (mins < 60) return `acum ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `acum ${hours}h`;
  return `acum ${Math.floor(hours / 24)} zile`;
}

function QueueMentions({ mentionedJson }: { mentionedJson?: string | null }) {
  if (!mentionedJson) return null;
  let entities: MentionedEntity[] = [];
  try {
    entities = JSON.parse(mentionedJson);
  } catch {
    return null;
  }
  if (!entities.length) return null;
  return (
    <div className="mt-2 text-xs text-[var(--color-text-light)] flex flex-wrap gap-x-1">
      <span>Menționați:</span>
      {entities.map((m, i) => (
        <span key={`${m.type}-${m.id}`}>
          {m.facebook_url ? (
            <a href={m.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{m.name}</a>
          ) : (
            <span>{m.name}</span>
          )}
          {i < entities.length - 1 ? ',' : ''}
        </span>
      ))}
    </div>
  );
}

export default function FbAutoPost() {
  const [config, setConfig] = useState<AutoPostConfig | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [queueCount, setQueueCount] = useState(2);
  const [generatingQueue, setGeneratingQueue] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [hasCredentials, setHasCredentials] = useState(true);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(true);
  const [regenerateText, setRegenerateText] = useState<Record<number, string>>({});
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [regenerateError, setRegenerateError] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ComposedPost | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ posted: boolean; reason?: string; error?: string } | null>(null);

  const [customAnchorType, setCustomAnchorType] = useState<'afterschool' | 'kindergarten'>('afterschool');
  const [customQuery, setCustomQuery] = useState('');
  const [customResults, setCustomResults] = useState<AnchorSearchResult[]>([]);
  const [customSelected, setCustomSelected] = useState<AnchorSearchResult | null>(null);
  const [customSearching, setCustomSearching] = useState(false);
  const [customGenerating, setCustomGenerating] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/fb-autopost');
    const data = await res.json();
    setConfig(data.config);
    setLog(Array.isArray(data.log) ? data.log : []);
    setQueue(Array.isArray(data.queue) ? data.queue : []);
    setPoolStats(data.poolStats);
    setHasCredentials(!!data.hasCredentials);
    setHasAnthropicKey(!!data.hasAnthropicKey);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setCustomSelected(null);
    if (!customQuery.trim()) {
      setCustomResults([]);
      return;
    }
    setCustomSearching(true);
    const timer = setTimeout(async () => {
      const res = await fetch('/api/admin/fb-autopost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search-anchor', anchorType: customAnchorType, q: customQuery }),
      });
      const data = await res.json();
      setCustomResults(Array.isArray(data.results) ? data.results : []);
      setCustomSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [customQuery, customAnchorType]);

  const saveConfig = async (patch: Partial<AutoPostConfig>) => {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    setSaving(true);
    await fetch('/api/admin/fb-autopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-config', ...next }),
    });
    setSaving(false);
  };

  const doGenerateQueue = async () => {
    setGeneratingQueue(true);
    const res = await fetch('/api/admin/fb-autopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'queue-generate', count: queueCount }),
    });
    const data = await res.json();
    setQueue(Array.isArray(data.queue) ? data.queue : []);
    setGeneratingQueue(false);
  };

  const doCopyQueued = async (row: QueueRow) => {
    await navigator.clipboard.writeText(row.message);
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const doMarkQueuedPosted = async (id: number) => {
    const res = await fetch('/api/admin/fb-autopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'queue-mark-posted', id }),
    });
    const data = await res.json();
    setQueue(Array.isArray(data.queue) ? data.queue : []);
    load();
  };

  const doDiscardQueued = async (id: number) => {
    if (!confirm('Elimini această postare din coadă fără s-o publici?')) return;
    const res = await fetch('/api/admin/fb-autopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'queue-discard', id }),
    });
    const data = await res.json();
    setQueue(Array.isArray(data.queue) ? data.queue : []);
  };

  const doRegenerateQueued = async (id: number) => {
    const instruction = (regenerateText[id] || '').trim();
    if (!instruction) return;
    setRegeneratingId(id);
    setRegenerateError(prev => ({ ...prev, [id]: '' }));
    const res = await fetch('/api/admin/fb-autopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'queue-regenerate', id, instruction }),
    });
    const data = await res.json();
    if (data.ok) {
      setQueue(Array.isArray(data.queue) ? data.queue : []);
      setRegenerateText(prev => ({ ...prev, [id]: '' }));
    } else {
      setRegenerateError(prev => ({ ...prev, [id]: data.error || 'Regenerarea a eșuat.' }));
    }
    setRegeneratingId(null);
  };

  const doGenerateCustomPost = async () => {
    if (!customSelected) return;
    setCustomGenerating(true);
    const res = await fetch('/api/admin/fb-autopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'queue-generate-custom', anchorType: customAnchorType, anchorId: customSelected.id }),
    });
    const data = await res.json();
    if (data.ok) {
      setQueue(Array.isArray(data.queue) ? data.queue : []);
      setCustomQuery('');
      setCustomResults([]);
      setCustomSelected(null);
    }
    setCustomGenerating(false);
  };

  const doPreview = async () => {
    setPreviewing(true);
    setPreview(null);
    const res = await fetch('/api/admin/fb-autopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preview' }),
    });
    const data = await res.json();
    setPreview(data.post || null);
    setPreviewing(false);
  };

  const doPostNow = async () => {
    if (!confirm('Publici acum o postare reală pe Pagina de Facebook?')) return;
    setPosting(true);
    setPostResult(null);
    const res = await fetch('/api/admin/fb-autopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'post-now', template: preview?.template }),
    });
    const data = await res.json();
    setPostResult(data);
    setPosting(false);
    load();
  };

  if (loading || !config) return <div className="text-[var(--color-text-light)]">Se încarcă...</div>;

  return (
    <div className="space-y-6">
      {!hasCredentials && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-900">
          ⚠️ FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN nu sunt setate în env. Previzualizarea funcționează,
          dar publicarea reală va eșua până la configurare.
        </div>
      )}
      {!hasAnthropicKey && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-900">
          ⚠️ ANTHROPIC_API_KEY nu e setată în env. Butonul „Regenerează" din coadă nu va funcționa
          până la configurare.
        </div>
      )}

      {/* Config cadenta */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="font-semibold text-[var(--color-text-main)]">⚙️ Auto-postare pe Pagina de Facebook</h3>
          <button
            onClick={() => saveConfig({ enabled: !config.enabled })}
            disabled={saving}
            className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 ${config.enabled ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-[var(--color-surface-2)] text-[var(--color-text-light)]'}`}
          >
            {config.enabled ? '✓ Activat' : 'Dezactivat'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="text-xs text-[var(--color-text-light)]">
            Interval minim (min)
            <input
              type="number"
              value={config.minIntervalMin}
              onChange={e => saveConfig({ minIntervalMin: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
            />
          </label>
          <label className="text-xs text-[var(--color-text-light)]">
            Cap zilnic
            <input
              type="number"
              value={config.dailyCap}
              onChange={e => saveConfig({ dailyCap: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
            />
          </label>
          <label className="text-xs text-[var(--color-text-light)]">
            Ora start (RO)
            <input
              type="number"
              min={0}
              max={23}
              value={config.hoursStart}
              onChange={e => saveConfig({ hoursStart: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
            />
          </label>
          <label className="text-xs text-[var(--color-text-light)]">
            Ora stop (RO)
            <input
              type="number"
              min={0}
              max={23}
              value={config.hoursEnd}
              onChange={e => saveConfig({ hoursEnd: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
            />
          </label>
        </div>
        <p className="text-xs text-[var(--color-text-light)] mt-3">
          Recomandare: 1-2 postări/zi, minim 6h între ele, în intervalul 10:00-20:00 (ora României).
          Peste 3-4/zi, Facebook tinde să suprime reach-ul organic.
        </p>
      </div>

      {/* Progres rotatie */}
      {poolStats && (
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h3 className="font-semibold text-[var(--color-text-main)] mb-3">🎯 Progres rotație ("cutie cu bile")</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ['Afterschooluri', poolStats.afterschools],
              ['Cluburi', poolStats.clubs],
              ['Grădinițe', poolStats.kindergartens],
            ] as [string, PoolStat][]).map(([label, stat]) => (
              <div key={label} className="p-3 border border-[var(--color-border)] rounded-xl">
                <div className="text-sm text-[var(--color-text-light)]">{label}</div>
                <div className="text-lg font-semibold text-[var(--color-text-main)]">{stat.promoted} / {stat.total} promovate</div>
                <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${stat.total ? Math.min(100, (stat.promoted / stat.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Postare custom pentru un afterschool/gradinita anume */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h3 className="font-semibold text-[var(--color-text-main)] mb-2">🎯 Postare pentru un anumit afterschool/grădiniță</h3>
        <p className="text-xs text-[var(--color-text-light)] mb-4">
          Pe lângă rotația random de mai jos, poți alege manual o listare anume și genera o postare
          direct pentru ea (nu ține cont de filtrul de eligibilitate al rotației).
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex gap-2">
            {(['afterschool', 'kindergarten'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setCustomAnchorType(t); setCustomQuery(''); setCustomResults([]); setCustomSelected(null); }}
                className={`px-3 py-2 text-sm rounded-lg ${customAnchorType === t ? 'bg-blue-600 text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-main)]'}`}
              >
                {t === 'afterschool' ? 'Afterschool' : 'Grădiniță'}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              value={customSelected ? customSelected.name : customQuery}
              onChange={e => { setCustomQuery(e.target.value); setCustomSelected(null); }}
              placeholder={`Caută ${customAnchorType === 'afterschool' ? 'un afterschool' : 'o grădiniță'} după nume...`}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
            />
            {!customSelected && customQuery.trim() && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {customSearching && <div className="px-3 py-2 text-sm text-gray-500">Se caută...</div>}
                {!customSearching && customResults.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">Niciun rezultat.</div>
                )}
                {!customSearching && customResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setCustomSelected(r); setCustomResults([]); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-100"
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={doGenerateCustomPost}
            disabled={!customSelected || customGenerating}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {customGenerating ? 'Se generează...' : 'Generează postare pentru acesta'}
          </button>
        </div>
      </div>

      {/* Coada manuala - pana la tokenul API */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <h3 className="font-semibold text-[var(--color-text-main)]">📋 Coadă postări (manual, până avem tokenul API)</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={10}
              value={queueCount}
              onChange={e => setQueueCount(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white text-gray-900"
            />
            <button
              onClick={doGenerateQueue}
              disabled={generatingQueue}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingQueue ? 'Se generează...' : 'Generează postări noi'}
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--color-text-light)] mb-4">
          Generează text gata de postat, tu îl copiezi și îl publici manual pe Pagina de Facebook,
          apoi apeși „Am postat" ca să marchezi rândul și rotația să nu-l mai repete.
        </p>
        <div className="space-y-3">
          {queue.map(row => (
            <div key={row.id} className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-2)]">
              <div className="text-xs text-[var(--color-text-light)] mb-2">
                Șablon {TEMPLATE_LABELS[row.template] || row.template} · ancoră: {row.anchor_type} #{row.anchor_id}
              </div>
              <p className="text-sm text-[var(--color-text-main)] whitespace-pre-line">{row.message}</p>
              <QueueMentions mentionedJson={row.mentioned_json} />
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => doCopyQueued(row)}
                  className="px-3 py-1.5 text-xs bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-lg hover:opacity-80"
                >
                  {copiedId === row.id ? '✓ Copiat' : 'Copiază textul'}
                </button>
                <button
                  onClick={() => doMarkQueuedPosted(row.id)}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Am postat pe Facebook ✓
                </button>
                <button
                  onClick={() => doDiscardQueued(row.id)}
                  className="px-3 py-1.5 text-xs text-red-700 hover:underline"
                >
                  Elimină
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={regenerateText[row.id] || ''}
                  onChange={e => setRegenerateText(prev => ({ ...prev, [row.id]: e.target.value }))}
                  placeholder="Instrucțiune de regenerare (ex: e grădiniță de stat nu privată, elimină mențiunea cartierului X...)"
                  className="flex-1 min-w-[240px] px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs bg-white text-gray-900"
                />
                <button
                  onClick={() => doRegenerateQueued(row.id)}
                  disabled={regeneratingId === row.id || !(regenerateText[row.id] || '').trim() || !hasAnthropicKey}
                  className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {regeneratingId === row.id ? 'Se regenerează...' : '🔄 Regenerează'}
                </button>
              </div>
              {regenerateError[row.id] && (
                <p className="text-xs text-red-700 mt-1">{regenerateError[row.id]}</p>
              )}
            </div>
          ))}
          {queue.length === 0 && (
            <p className="text-sm text-[var(--color-text-light)]">Coada e goală. Apasă „Generează postări noi".</p>
          )}
        </div>
      </div>

      {/* Preview + postare test */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="font-semibold text-[var(--color-text-main)]">📝 Previzualizare / postare test</h3>
          <div className="flex gap-2">
            <button onClick={doPreview} disabled={previewing} className="px-4 py-2 text-sm bg-[var(--color-surface-2)] text-[var(--color-text-main)] rounded-lg hover:opacity-80 disabled:opacity-50">
              {previewing ? 'Se compune...' : 'Previzualizează'}
            </button>
            <button
              onClick={doPostNow}
              disabled={posting || !preview}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {posting ? 'Se publică...' : 'Postează acum (test, publică real)'}
            </button>
          </div>
        </div>

        {preview && (
          <div className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-2)]">
            <div className="text-xs text-[var(--color-text-light)] mb-2">
              Șablon {TEMPLATE_LABELS[preview.template] || preview.template} · ancoră: {preview.anchorType} #{preview.anchorId}
            </div>
            <p className="text-sm text-[var(--color-text-main)] whitespace-pre-line">{preview.text}</p>
            {preview.mentioned.length > 0 && (
              <div className="mt-3 text-xs text-[var(--color-text-light)] flex flex-wrap gap-x-1">
                <span>Menționați:</span>
                {preview.mentioned.map((m, i) => (
                  <span key={`${m.type}-${m.id}`}>
                    {m.facebook_url ? (
                      <a href={m.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{m.name}</a>
                    ) : (
                      <span>{m.name}</span>
                    )}
                    {i < preview.mentioned.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {!preview && <p className="text-sm text-[var(--color-text-light)]">Apasă „Previzualizează" pentru un exemplu de postare, fără publicare.</p>}

        {postResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${postResult.posted ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {postResult.posted ? '✓ Postare publicată cu succes.' : `✗ Nepublicat: ${postResult.reason || postResult.error || 'motiv necunoscut'}`}
          </div>
        )}
      </div>

      {/* Jurnal */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h3 className="font-semibold text-[var(--color-text-main)] mb-4">📜 Istoric generare/postare</h3>
        <div className="space-y-2">
          {log.map(row => (
            <div key={row.id} className="p-3 border border-[var(--color-border)] rounded-xl">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-medium text-[var(--color-text-main)]">
                  {TEMPLATE_LABELS[row.template] || row.template} · {row.anchor_type} #{row.anchor_id}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASSES[row.status] || 'bg-gray-100 text-gray-800'}`}>
                  {STATUS_LABELS[row.status] || row.status}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-light)] mt-1">
                Generat: {timeAgo(row.generated_at ?? row.posted_at)}
                {row.status === 'sent' && `  ·  Postat: ${timeAgo(row.posted_at)}`}
              </p>
              {row.error && <p className="text-xs text-red-700 mt-1">{row.error}</p>}
            </div>
          ))}
          {log.length === 0 && <p className="text-sm text-[var(--color-text-light)]">Niciun istoric încă.</p>}
        </div>
      </div>
    </div>
  );
}

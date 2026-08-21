import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { CIRC_SECTOR_INFO, CIRC_TYPE_LABEL, ensureCircTables } from '@/lib/circumscriptii';
import type { Metadata } from 'next';

type Props = { params: Promise<{ sector: string }> };

const SECTOR_NAMES: Record<string, string> = {
  '1': 'Sectorul 1', '2': 'Sectorul 2', '3': 'Sectorul 3', '4': 'Sectorul 4', '5': 'Sectorul 5', '6': 'Sectorul 6',
};

export async function generateStaticParams() {
  return ['1', '2', '3', '4', '5', '6'].map((sector) => ({ sector }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params;
  if (!SECTOR_NAMES[sector]) return { title: 'Pagina negăsită' };
  const name = SECTOR_NAMES[sector];
  return {
    title: `Circumscripții școlare ${name} București 2026 – Școli gimnaziale | ActivKids`,
    description: `Lista școlilor gimnaziale de stat și circumscripțiile lor din ${name} București. Află la ce școală este arondată strada ta și ce afterschool-uri sunt în zonă. Date oficiale ISMB 2026.`,
    alternates: { canonical: `https://activkids.ro/circumscriptii/sector/${sector}` },
    openGraph: {
      title: `Circumscripții școlare ${name} București 2026`,
      description: `Școlile gimnaziale de stat și circumscripțiile lor din ${name} București.`,
      url: `https://activkids.ro/circumscriptii/sector/${sector}`,
    },
  };
}

export default async function CircSectorPage({ params }: Props) {
  const { sector } = await params;
  if (!SECTOR_NAMES[sector]) notFound();
  const sec = parseInt(sector, 10);
  const db = getDb();
  ensureCircTables(db);
  const schools = db.prepare(
    `SELECT id, name, type, address FROM circ_schools WHERE sector = ? AND type != 'structura' ORDER BY name`
  ).all(sec) as { id: number; name: string; type: string; address: string | null }[];
  const structures = db.prepare(
    `SELECT id, name FROM circ_schools WHERE sector = ? AND type = 'structura' ORDER BY name`
  ).all(sec) as { id: number; name: string }[];

  const sectorName = SECTOR_NAMES[sector];
  const info = CIRC_SECTOR_INFO[sector];
  const clean = (n: string) => n.replace(/"/g, '').replace(/„|”/g, '').trim();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Școli de circumscripție ${sectorName} București`,
    numberOfItems: schools.length,
    itemListElement: schools.slice(0, 10).map((s, i) => ({
      '@type': 'ListItem', position: i + 1,
      url: `https://activkids.ro/circumscriptii/${toSlug(s.name, s.id)}`, name: clean(s.name),
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ActivKids', item: 'https://activkids.ro' },
      { '@type': 'ListItem', position: 2, name: 'Circumscripții școlare', item: 'https://activkids.ro/circumscriptii' },
      { '@type': 'ListItem', position: 3, name: sectorName, item: `https://activkids.ro/circumscriptii/sector/${sector}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-sm flex-wrap">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <a href="/circumscriptii" className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Circumscripții</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-[var(--color-text-main)] font-medium">{sectorName}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">
            Circumscripții școlare în {sectorName}, București
          </h1>
          <p className="text-[var(--color-text-light)] mb-2">
            {schools.length} școli gimnaziale de stat cu circumscripție în {sectorName}.
          </p>
          <p className="text-xs text-[var(--color-text-light)] mb-6 flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>Informații oficiale de la{' '}
              <a href="https://ismb.ro/primar/circumscriptii.php" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-primary)]">ISMB</a>
              {' '}(Inspectoratul Școlar al Municipiului București), an școlar 2026-2027.
            </span>
          </p>

          {info && (
            <div className="mb-8 space-y-5 max-w-2xl">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Despre circumscripțiile din {sectorName}</h2>
                <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{info.despre}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Sfaturi practice</h2>
                <ul className="space-y-1.5">
                  {info.sfaturi.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                      <span className="text-[var(--color-primary)] mt-0.5 flex-shrink-0">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Navigare sectoare */}
          <div className="flex flex-wrap gap-2 mb-8">
            {Object.entries(SECTOR_NAMES).map(([s, nm]) => (
              <a key={s} href={`/circumscriptii/sector/${s}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${s === sector
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                {nm}
              </a>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {schools.map((s) => (
              <a key={s.id} href={`/circumscriptii/${toSlug(s.name, s.id)}`}
                className="block bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[var(--color-text-main)]">{clean(s.name)}</span>
                  {s.type !== 'gimnaziu' && <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{CIRC_TYPE_LABEL[s.type] || s.type}</span>}
                </div>
                {s.address && <div className="text-sm text-[var(--color-text-light)] mt-1">{s.address}</div>}
              </a>
            ))}
          </div>

          {structures.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-[var(--color-text-light)] mb-2">Structuri arondate în {sectorName}:</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {structures.map((s) => (
                  <a key={s.id} href={`/circumscriptii/${toSlug(s.name, s.id)}`} className="text-sm text-[var(--color-primary)] hover:underline">{clean(s.name)}</a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            <a href="/circumscriptii" className="text-sm text-[var(--color-primary)] hover:underline">← Caută după stradă</a>
            <a href={`/afterschool/sector/${sector}`} className="text-sm text-[var(--color-primary)] hover:underline">Afterschool-uri în {sectorName} →</a>
          </div>
        </div>
      </div>
    </>
  );
}

import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug, idFromSlug } from '@/lib/slug';
import { isContactVisible } from '@/lib/contactVisibility';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import {
  getCircSchool, getAllCircSchools, getCircStreets, getNearbyAfterschools, getActivityCounts,
  DEFAULT_RADIUS_KM, CIRC_TYPE_LABEL, type CircSchool,
} from '@/lib/circumscriptii';
import { CLUB_CATEGORY_LABELS, type ClubCategory } from '@/lib/clubs';
import AfterSchoolCard from '@/components/AfterSchoolCard';
import type { Metadata } from 'next';
import type { AfterSchool } from '@/lib/db';

type Props = { params: Promise<{ slug: string }> };

const CATEGORY_ICONS: Record<ClubCategory, string> = {
  inot: '🏊', fotbal: '⚽', dansuri: '💃', arte_martiale: '🥋', gimnastica: '🤸',
  limbi_straine: '🌍', robotica: '🤖', muzica: '🎵', arte_creative: '🎨',
};
const ALL_CATEGORIES = Object.keys(CLUB_CATEGORY_LABELS) as ClubCategory[];

const SECTOR_NAMES: Record<number, string> = {
  1: 'Sectorul 1', 2: 'Sectorul 2', 3: 'Sectorul 3', 4: 'Sectorul 4', 5: 'Sectorul 5', 6: 'Sectorul 6',
};

function displayName(name: string): string {
  return name.replace(/"/g, '').replace(/„|”/g, '').trim();
}
function parseJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export async function generateStaticParams() {
  const rows = getAllCircSchools(getDb());
  return rows.map((r) => ({ slug: toSlug(r.name, r.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const school = getCircSchool(db, idFromSlug(slug));
  if (!school) return { title: 'Pagina negăsită' };
  const name = displayName(school.name);
  const sec = school.sector ? ` – ${SECTOR_NAMES[school.sector]}` : '';
  return {
    title: `${name}${sec} – Circumscripție, înscriere și afterschool în zonă 2026 | ActivKids`,
    description: `Circumscripția școlară (străzile arondate), programul de înscriere, criteriile de departajare și afterschool-urile din raza de ${DEFAULT_RADIUS_KM} km pentru ${name}${sec}, București.`,
    alternates: { canonical: `https://activkids.ro/circumscriptii/${toSlug(school.name, school.id)}` },
    openGraph: {
      title: `${name}${sec} – Circumscripție și afterschool în zonă`,
      description: `Străzile arondate, înscriere și afterschool-uri lângă ${name}.`,
      url: `https://activkids.ro/circumscriptii/${toSlug(school.name, school.id)}`,
    },
  };
}

export default async function CircSchoolPage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();
  const school = getCircSchool(db, idFromSlug(slug)) as CircSchool | undefined;
  if (!school) notFound();

  const name = displayName(school.name);
  const streets = getCircStreets(db, school.id);
  const plan = parseJson<{ tip_clasa: string; nr_clase: number; nr_locuri: number }[]>(school.plan, []);
  const criterii = parseJson<string[]>(school.criterii, []);
  const facilities = parseJson<string[]>(school.facilities, []);

  const hasCoords = school.lat != null && school.lng != null;
  let afterschools: (AfterSchool & { distance: number })[] = hasCoords
    ? (getNearbyAfterschools(db, school.lat!, school.lng!) as unknown as (AfterSchool & { distance: number })[])
    : [];
  // Toate randurile din afterschools sunt deja filtrate <= DEFAULT_RADIUS_KM (2km), deci
  // toate premium din lista sunt oricum aproape de scoala - fara nevoie de spotlightEligible
  // geografic (ca la cautarea homepage), suprapunerea rotatiei se face pe intreaga lista.
  afterschools = applyPremiumSpotlight(afterschools, readSpotlightConfig(db)) as (AfterSchool & { distance: number })[];
  const activityCounts = hasCoords ? getActivityCounts(db, school.lat!, school.lng!) : {};

  // show_all_contacts: comutator per-scoala din admin, deblocheaza contactul tuturor
  // afterschool-urilor din apropiere pe aceasta pagina, indiferent de contacts_hidden/premium.
  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode && !school.show_all_contacts) {
    afterschools = afterschools.map((as) => isContactVisible(as)
      ? { ...as, contacts_masked: false }
      : { ...as, phone: null, email: null, contacts_masked: true, has_phone: !!as.phone, has_email: !!as.email });
  }
  const afterschoolsShown = afterschools.slice(0, 18);

  // Scoli surori din acelasi sector
  const siblings = school.sector
    ? (db.prepare(`SELECT id, name FROM circ_schools WHERE sector = ? AND id != ? AND type != 'structura' ORDER BY name`).all(school.sector, school.id) as { id: number; name: string }[])
    : [];

  const totalActivities = Object.values(activityCounts).reduce((a, b) => a + b, 0);
  const totalPlanLocuri = plan.reduce((a, p) => a + (p.nr_locuri || 0), 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': school.type === 'gimnaziu' || school.type === 'structura' ? 'ElementarySchool' : 'School',
    name,
    address: school.address ? { '@type': 'PostalAddress', streetAddress: school.address, addressLocality: 'București', addressCountry: 'RO' } : undefined,
    telephone: school.phone || undefined,
    url: school.website || undefined,
    areaServed: `${SECTOR_NAMES[school.sector || 0] || 'București'}, București`,
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ActivKids', item: 'https://activkids.ro' },
      { '@type': 'ListItem', position: 2, name: 'Circumscripții școlare', item: 'https://activkids.ro/circumscriptii' },
      ...(school.sector ? [{ '@type': 'ListItem', position: 3, name: SECTOR_NAMES[school.sector], item: `https://activkids.ro/circumscriptii/sector/${school.sector}` }] : []),
      { '@type': 'ListItem', position: school.sector ? 4 : 3, name, item: `https://activkids.ro/circumscriptii/${toSlug(school.name, school.id)}` },
    ],
  };
  const itemList = afterschoolsShown.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Afterschool-uri lângă ${name}`,
    numberOfItems: afterschools.length,
    itemListElement: afterschoolsShown.slice(0, 10).map((as, i) => ({
      '@type': 'ListItem', position: i + 1,
      url: `https://activkids.ro/afterschool/${toSlug(as.name, as.id)}`, name: as.name,
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {itemList && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />}

      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-sm flex-wrap">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <a href="/circumscriptii" className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Circumscripții</a>
            {school.sector && (<>
              <span className="text-[var(--color-text-light)]">/</span>
              <a href={`/circumscriptii/sector/${school.sector}`} className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">{SECTOR_NAMES[school.sector]}</a>
            </>)}
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {school.sector && <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{SECTOR_NAMES[school.sector]}</span>}
            {school.type !== 'gimnaziu' && <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{CIRC_TYPE_LABEL[school.type] || school.type}</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">{name}</h1>
          {school.address && <p className="text-[var(--color-text-light)] mb-3">{school.address}, București</p>}
          <p className="text-xs text-[var(--color-text-light)] mb-4 flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>Circumscripție și date oficiale de la{' '}
              <a href="https://ismb.ro/primar/circumscriptii.php" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-primary)]">ISMB</a>
              {' '}(Inspectoratul Școlar București), an școlar 2026-2027.
            </span>
          </p>

          {/* Info rapida: contact + media EN */}
          <div className="flex flex-wrap gap-2 mb-6">
            {school.phone && (
              <a href={`tel:${school.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-main)] hover:border-[var(--color-primary)]">
                📞 {school.phone}
              </a>
            )}
            {school.website && (
              <a href={school.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-primary)] hover:border-[var(--color-primary)]">
                🌐 Site oficial
              </a>
            )}
            {school.news_url && (
              <a href={school.news_url} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100">
                📰 Ultimele știri de la școală
              </a>
            )}
          </div>

          {school.media_en != null && (
            <div className="mb-6 inline-flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-2xl font-bold text-green-700">{school.media_en.toFixed(2)}</span>
              <span className="text-sm text-green-800">
                Media la Evaluarea Națională{school.media_en_year ? ` ${school.media_en_year}` : ''}
                <span className="block text-xs text-green-600">medie orientativă, actualizată anual</span>
              </span>
            </div>
          )}

          {/* Despre scoala */}
          {school.despre && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Despre {name}</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{school.despre}</p>
            </div>
          )}

          {/* Puncte forte / facilitati */}
          {(school.facilities_highlight || facilities.length > 0) && (
            <div className="mb-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Facilități și puncte forte</h2>
              {school.facilities_highlight && <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-2">{school.facilities_highlight}</p>}
              {facilities.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {facilities.map((f, i) => (
                    <li key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Scoala dupa scoala */}
          {school.ssd_available ? (
            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-purple-800 uppercase tracking-wide mb-1">Program „Școală după școală”</h2>
              <p className="text-sm text-purple-700 leading-relaxed">
                {school.ssd_info || 'Această școală organizează program „Școală după școală”. Pentru procedura de înscriere, eligibilitate și orarul disponibil, contactați secretariatul școlii.'}
              </p>
            </div>
          ) : null}

          {/* Plan de scolarizare */}
          {plan.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Plan de școlarizare 2026-2027</h2>
              <div className="flex flex-wrap gap-2">
                {plan.map((p, i) => (
                  <div key={i} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm">
                    <span className="font-semibold text-[var(--color-text-main)]">{p.tip_clasa}</span>
                    <span className="text-[var(--color-text-light)]"> · {p.nr_clase} {p.nr_clase === 1 ? 'clasă' : 'clase'} · {p.nr_locuri} locuri</span>
                  </div>
                ))}
              </div>
              {totalPlanLocuri > 0 && <p className="text-xs text-[var(--color-text-light)] mt-1">Total: {totalPlanLocuri} locuri în clasa pregătitoare.</p>}
            </div>
          )}

          {/* Criterii de departajare */}
          {criterii.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Criterii de departajare la înscriere</h2>
              <p className="text-xs text-[var(--color-text-light)] mb-2">
                Locul la școala de circumscripție este garantat pentru adresele arondate. Când numărul de
                cereri depășește locurile, se aplică următoarele criterii:
              </p>
              <ol className="space-y-1.5">
                {criterii.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Strazi arondate */}
          {streets.length > 0 && (
            <details className="mb-8 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--color-text-main)]">
                Străzi arondate ({streets.length}) – circumscripția școlară
              </summary>
              <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                {streets.map((s, i) => (
                  <li key={i} className="text-sm text-[var(--color-text-light)]">{s}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Afterschool-uri in zona */}
          <div className="border-t border-[var(--color-border)] pt-6">
            <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">
              Afterschool-uri lângă {name}
            </h2>
            <p className="text-sm text-[var(--color-text-light)] mb-4">
              {afterschools.length > 0
                ? `${afterschools.length} afterschool-uri în raza de ${DEFAULT_RADIUS_KM} km, ordonate după distanță (partenerii premium apar primii).`
                : `Nu am găsit afterschool-uri în raza de ${DEFAULT_RADIUS_KM} km momentan.`}
            </p>
            {afterschoolsShown.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                {afterschoolsShown.map((as, i) => (
                  <AfterSchoolCard key={as.id} data={as} rank={i + 1} businessMode={businessMode} />
                ))}
              </div>
            )}
            {afterschools.length > afterschoolsShown.length && (
              <p className="text-sm text-[var(--color-text-light)] mt-4">
                Se afișează primele {afterschoolsShown.length}. <a href="/" className="text-[var(--color-primary)] hover:underline">Caută toate afterschool-urile din zonă →</a>
              </p>
            )}
          </div>

          {/* Activitati in zona */}
          {totalActivities > 0 && (
            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-3">Activități pentru copii în zonă</h2>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((cat) => {
                  const count = activityCounts[cat] || 0;
                  const params2 = new URLSearchParams({ category: cat, lat: String(school.lat), lng: String(school.lng), label: name });
                  return (
                    <a key={cat} href={`/activitati?${params2.toString()}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${count > 0 ? 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-400 opacity-60'}`}>
                      <span>{CATEGORY_ICONS[cat]}</span>
                      <span className="font-medium">{CLUB_CATEGORY_LABELS[cat]}</span>
                      <span className="text-xs">({count})</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scoli surori */}
          {siblings.length > 0 && (
            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">
                Alte școli de circumscripție din {SECTOR_NAMES[school.sector!]}:
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {siblings.map((s) => (
                  <a key={s.id} href={`/circumscriptii/${toSlug(s.name, s.id)}`} className="text-sm text-[var(--color-primary)] hover:underline">
                    {displayName(s.name).replace(/^SCOALA GIMNAZIALA /i, 'Șc. ')}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Cross-link */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`/circumscriptii/sector/${school.sector}`} className="text-sm text-[var(--color-primary)] hover:underline">← Toate circumscripțiile din {SECTOR_NAMES[school.sector || 1]}</a>
            {school.sector && <a href={`/afterschool/sector/${school.sector}`} className="text-sm text-[var(--color-primary)] hover:underline">Afterschool-uri în {SECTOR_NAMES[school.sector]} →</a>}
          </div>
        </div>
      </div>
    </>
  );
}

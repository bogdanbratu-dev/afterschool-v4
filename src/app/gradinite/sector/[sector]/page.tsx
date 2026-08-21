import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { getCartierStats } from '@/lib/cartiere';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import { isContactVisible } from '@/lib/contactVisibility';
import KindergartenCard from '@/components/KindergartenCard';
import type { Kindergarten } from '@/lib/db';

type Props = { params: Promise<{ sector: string }> };

const SECTOR_NAMES: Record<string, string> = {
  '1': 'Sectorul 1', '2': 'Sectorul 2', '3': 'Sectorul 3',
  '4': 'Sectorul 4', '5': 'Sectorul 5', '6': 'Sectorul 6',
};

const SECTOR_INFO: Record<string, { despre: string; oferta: string; recomandari: string[] }> = {
  '1': {
    despre: 'Sectorul 1 acopera Aviatorilor, Floreasca, Dorobanti, Baneasa si Herastrau, zone cu cea mai mare densitate de gradinite si crese private premium din Bucuresti, multe cu program bilingv sau internatiional.',
    oferta: 'Gradinitele private din Sectorul 1 ofera adesea curriculum bilingv (engleza/franceza), clase mici cu maximum 12-15 copii si spatii special amenajate cu curte proprie. Multe crese acopera de la varsta de 1 an, cu program prelungit pana la 18:00-19:00.',
    recomandari: [
      'Preturile sunt cele mai ridicate din oras, bugetati intre 2.000 si 5.000 RON/luna',
      'Vizitati unitatea inainte de inscriere, verificati curtea, spatiile de somn si masa',
      'Locurile la cresele bune se ocupa cu 6-12 luni inainte, inscrieti-va din timp',
      'Intrebati despre raportul educator/copil, mai ales pentru grupele de crese (sub 2 ani)',
    ],
  },
  '2': {
    despre: 'Sectorul 2 cuprinde zone foarte diferite: Floreasca si Iancului la vest, Colentina si Pantelimon la est, Voluntari la periferie. Oferta de gradinite si crese variaza corespunzator, de la unitati premium pana la optiuni accesibile de cartier.',
    oferta: 'In zona Floreasca gasiti gradinite premium cu program bilingv, in timp ce Pantelimon si Colentina ofera optiuni mai accesibile, orientate spre program traditional romanesc cu activitati extra (limbi straine, muzica, sport).',
    recomandari: [
      'Verificati accesul auto in orele de varf, mai ales pe Sos. Pantelimon si Colentina',
      'Zona Iancului ofera un raport bun calitate-pret pentru gradinite private',
      'Intrebati despre programul de vara, multe unitati raman deschise si in august',
      'Daca aveti nevoie de cresa de la varsta mica, verificati disponibilitatea din timp, locurile sunt limitate',
    ],
  },
  '3': {
    despre: 'Sectorul 3 include Titan, Vitan, Dristor, Balta Alba si IOR, cartiere cu multe familii tinere si o piata activa de gradinite si crese private, in crestere constanta in ultimii ani.',
    oferta: 'Zona Titan concentreaza cele mai multe gradinite private din sector, cu preturi mai accesibile decat Sectoarele 1-2 si program flexibil adaptat parintilor cu job full-time. Multe unitati ofera si program de cresa de la 1-2 ani.',
    recomandari: [
      'Titan are cea mai mare oferta din sector, comparati cel putin 3 unitati inainte de a decide',
      'Verificati accesul cu transportul in comun, tramvaiele sunt aglomerate dimineata',
      'Preturile medii sunt intre 1.200 si 2.500 RON/luna',
      'Intrebati despre mesele oferite, multe gradinite din zona au bucatarie proprie',
    ],
  },
  '4': {
    despre: 'Sectorul 4 acopera Berceni, Oltenitei, Giurgiului si Brancusi, cartiere rezidentiale cu o comunitate stabila de familii tinere si cerere in crestere pentru locuri la gradinita si cresa privata.',
    oferta: 'Gradinitele din Sectorul 4 se remarca prin preturi competitive fata de media orasului si program prelungit, potrivit parintilor cu ore de lucru extinse. Multe unitati ofera si transport de la domiciliu.',
    recomandari: [
      'Zona Berceni are cele mai multe optiuni de gradinite si crese din sector',
      'Verificati accesul la metrou (linia M2) pentru un traseu mai simplu dimineata',
      'Cereti referinte de la alti parinti din zona, comunitatea este activa pe grupurile de Facebook locale',
      'Sectorul 4 ofera unul dintre cele mai bune rapoarte calitate-pret din Bucuresti',
    ],
  },
  '5': {
    despre: 'Sectorul 5 acopera zona Cotroceni si 13 Septembrie la nord si Rahova/Ferentari la sud. Oferta de gradinite si crese private e concentrata aproape in totalitate in partea de nord a sectorului.',
    oferta: 'Gradinitele din zona Cotroceni si 13 Septembrie sunt in general de calitate ridicata, cu grupe mici si program personalizat, beneficiind si de proximitatea Parcului Izvor si a Gradinii Botanice pentru activitati in aer liber.',
    recomandari: [
      'Oferta e mai limitata decat in alte sectoare, rezervati locul din timp',
      'Zona Cotroceni atrage familii cu asteptari ridicate, intrebati despre calificarile educatorilor',
      'Daca locuiti spre Rahova sau Ferentari, luati in calcul si unitati din Sectorul 4 sau 6',
      'Traficul pe Calea 13 Septembrie e intens dimineata, planificati ruta din timp',
    ],
  },
  '6': {
    despre: 'Sectorul 6 include Drumul Taberei, Militari, Giulesti si Crangasi, cartiere mari cu zeci de mii de familii tinere si una dintre cele mai active comunitati de parinti din Bucuresti.',
    oferta: 'Oferta de gradinite si crese e extinsa, de la unitati mici de cartier pana la gradinite cu facilitati complete: curte mare, sala de sport, ateliere de arta. Concurenta ridicata a dus la preturi competitive si standarde bune.',
    recomandari: [
      'Metroul (linia M4 spre Drumul Taberei) e un avantaj real, alegeti o unitate aproape de statie',
      'Zona Militari are cele mai multe unitati noi, deschise recent, cu dotari moderne',
      'Drumul Taberei are o comunitate mare de parinti activi online, cautati recomandari pe grupurile de cartier',
      'Preturile medii sunt intre 1.000 si 2.200 RON/luna, cu reduceri pentru plata semestriala',
    ],
  },
};

export function generateStaticParams() {
  return ['1','2','3','4','5','6'].map(sector => ({ sector }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params;
  if (!SECTOR_NAMES[sector]) return { title: 'Sector negasit' };
  const name = SECTOR_NAMES[sector];
  const title = `Gradinite si crese private ${name} Bucuresti | ActivKids`;
  const description = `Gradinite si crese private in ${name}, Bucuresti. Program, preturi, varste si contact pentru fiecare unitate.`;
  const canonical = `https://activkids.ro/gradinite/sector/${sector}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, siteName: 'ActivKids', locale: 'ro_RO', type: 'website' }, twitter: { card: 'summary', title, description } };
}

export default async function KindergartenSectorPage({ params }: Props) {
  const { sector } = await params;
  if (!SECTOR_NAMES[sector]) notFound();
  const db = getDb();
  let items = db.prepare('SELECT * FROM kindergartens WHERE sector = ? ORDER BY is_featured DESC, is_premium DESC, rating IS NULL, rating DESC, name').all(parseInt(sector)) as Kindergarten[];

  items = applyPremiumSpotlight(items, readSpotlightConfig(db));

  const businessMode = (db.prepare("SELECT value FROM settings WHERE key = 'business_mode'").get() as { value: string } | undefined)?.value === 'true';
  if (businessMode) {
    items = items.map(k => isContactVisible(k)
      ? { ...k, contacts_masked: false }
      : { ...k, phone: null, email: null, contacts_masked: true, has_phone: !!k.phone, has_email: !!k.email });
  }

  const cartiereInSector = getCartierStats(db, 'kindergartens', 'AND sector = ?', [parseInt(sector)]);

  const sectorName = SECTOR_NAMES[sector];
  const sectorInfo = SECTOR_INFO[sector];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Gradinite si crese private ${sectorName} Bucuresti`,
    url: `https://activkids.ro/gradinite/sector/${sector}`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((k, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://activkids.ro/gradinite/${toSlug(k.name, k.id)}`,
      name: k.name,
    })),
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/gradinite" className="text-pink-600 hover:underline text-sm">← Gradinite</a>
          <span className="text-[var(--color-text-light)]">/</span>
          <span className="text-sm text-[var(--color-text-light)]">Sector {sector}</span>
        </div>
      </header>
      <section className="bg-gradient-to-br from-pink-600 to-pink-800 text-white py-8">
        <div className="max-w-6xl mx-auto text-center px-4">
          <h1 className="text-xl sm:text-3xl font-bold">Gradinite si crese private in Sectorul {sector}</h1>
          <p className="text-pink-100 text-sm mt-2">{items.length} unitati gasite</p>
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {sectorInfo && (
          <div className="mb-8 space-y-5 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Despre zona</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{sectorInfo.despre}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Ce gasesti aici</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{sectorInfo.oferta}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Recomandari practice</h2>
              <ul className="space-y-1.5">
                {sectorInfo.recomandari.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                    <span className="text-pink-600 mt-0.5 flex-shrink-0">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(SECTOR_NAMES).map(([s, name]) => (
            <a key={s} href={`/gradinite/sector/${s}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${s === sector
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-pink-600'}`}>
              {name}
            </a>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-[var(--color-text-light)] mb-4">Nu avem inca gradinite sau crese listate in acest sector.</p>
            <a href="/promovare" className="inline-block px-5 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-semibold">
              Adauga prima gradinita din {sectorName}
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map(k => (
              <KindergartenCard key={k.id} data={k} businessMode={businessMode} />
            ))}
          </div>
        )}

        <div className="mt-10 bg-pink-50 border border-pink-200 rounded-2xl p-6 text-center">
          <h3 className="font-bold text-pink-800 mb-2">Ai o gradinita sau cresa in {sectorName}?</h3>
          <p className="text-sm text-pink-700 mb-4">Listeaza-te gratuit sau premium si ajunge in fata parintilor din sector.</p>
          <a href="/promovare" className="inline-block px-6 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-semibold">
            Adauga / Revendica listarea →
          </a>
        </div>

        {cartiereInSector.length > 0 && (
          <div className="mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">Gradinite si crese pe cartiere in {sectorName}:</p>
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {cartiereInSector.map(c => (
                <a key={c.slug} href={`/gradinite/cartier/${c.slug}`}
                  className="text-sm text-pink-600 hover:underline">
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">Gradinite si crese in alte sectoare:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SECTOR_NAMES).filter(([s]) => s !== sector).map(([s, name]) => (
              <a key={s} href={`/gradinite/sector/${s}`} className="text-sm text-pink-600 hover:underline">
                Gradinite {name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

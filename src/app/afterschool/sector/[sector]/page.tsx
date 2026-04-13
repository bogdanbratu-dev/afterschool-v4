import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import type { Metadata } from 'next';
import type { AfterSchool } from '@/lib/db';

type Props = { params: Promise<{ sector: string }> };

const SECTOR_NAMES: Record<string, string> = {
  '1': 'Sectorul 1', '2': 'Sectorul 2', '3': 'Sectorul 3',
  '4': 'Sectorul 4', '5': 'Sectorul 5', '6': 'Sectorul 6',
};

const SECTOR_INFO: Record<string, { despre: string; oferta: string; recomandari: string[] }> = {
  '1': {
    despre: 'Sectorul 1 acoperă zone rezidențiale de prestigiu: Aviatorilor, Floreasca, Dorobanți, Băneasa și Herăstrău. Este sectorul cu cel mai mare număr de after school-uri private premium din București, datorită densității ridicate de familii cu venituri medii și mari.',
    oferta: 'Programele sunt în general mai diversificate — includ limbi străine, robotică, arte și sport în același pachet. Multe after school-uri din Sectorul 1 oferă transport școlar, masă caldă și activități extracurriculare incluse în preț. Clasele sunt mai mici, ceea ce înseamnă mai multă atenție individuală pentru fiecare copil.',
    recomandari: [
      'Prețurile sunt mai ridicate față de media orașului — bugetați între 800 și 1.800 RON/lună',
      'Vizitați cel puțin 2–3 opțiuni înainte de a decide — diferențele de calitate sunt semnificative',
      'Dacă copilul merge la o școală internațională în zonă, căutați un after school cu program în engleză',
      'Locurile se ocupă rapid — recomandăm să vă înscriați din vară pentru toamna următoare',
    ],
  },
  '2': {
    despre: 'Sectorul 2 este unul dintre cele mai extinse sectoare ale Bucureștiului, cuprinzând cartiere foarte diferite ca profil: Floreasca și Iancului la vest, Colentina și Pantelimon spre est, Fundeni și Voluntari la periferie. Această diversitate se reflectă și în oferta de after school-uri.',
    oferta: 'Veți găsi atât after school-uri cu tarife accesibile în cartierele de blocuri din Pantelimon și Colentina, cât și centre mai bine dotate în zona Floreasca. Programele variază mult — de la simpla supraveghere și teme până la pachete complete cu masă, sport și ateliere.',
    recomandari: [
      'Traficul este o problemă reală după-amiaza pe Șos. Colentina și Șos. Pantelimon — alegeți un after school în raza de 1 km față de școala copilului',
      'Dacă locuiți spre Pantelimon sau Fundeni, verificați dacă after school-ul oferă transport — poate face diferența',
      'Zona Iancului are o concentrație bună de after school-uri cu raport calitate-preț ridicat',
      'Întrebați dacă programul se prelungește până la 18:00 sau 19:00 — important pentru părinții cu program de lucru fix',
    ],
  },
  '3': {
    despre: 'Sectorul 3 cuprinde cartierele Titan, Vitan, Dristor, Balta Albă și IOR — unele dintre cele mai populate zone rezidențiale din București. Este un sector tânăr ca demografic, cu multe familii cu copii de vârstă școlară, ceea ce creează o piață activă de servicii educaționale.',
    oferta: 'Oferta este diversificată și în continuă creștere. Prețurile sunt în general mai accesibile față de sectoarele 1 și 2, iar calitatea serviciilor a crescut semnificativ în ultimii ani. Multe after school-uri din Titan și Balta Albă sunt poziționate strategic lângă școlile mari din zonă.',
    recomandari: [
      'Zona Titan are cea mai mare concentrație de after school-uri din sector — un avantaj dacă locuiți acolo',
      'Verificați accesul cu mijloacele de transport în comun — tramvaiele din zonă sunt aglomerate dimineața și seara',
      'Prețurile medii sunt între 500 și 1.000 RON/lună — negociabil pentru înscrierea din timp sau pentru frați',
      'Întrebați despre programul de vară — multe after school-uri din Sector 3 oferă tabere urbane în iulie–august',
    ],
  },
  '4': {
    despre: 'Sectorul 4 include zonele Berceni, Olteniței, Giurgiului și Brâncuși — cartiere predominant rezidențiale, cu o comunitate stabilă și mulți copii de vârstă școlară. Este unul dintre sectoarele cu cea mai mare creștere a cererii de locuri la after school în ultimii ani.',
    oferta: 'After school-urile din Sectorul 4 se remarcă prin prețuri competitive și programe adaptate familiilor cu program de lucru prelungit. Orarul extins până la 18:30–19:00 este o caracteristică comună, iar unele centre oferă și transport de la școală.',
    recomandari: [
      'Zona Berceni are cele mai multe opțiuni — dacă locuiți acolo, aveți de unde alege',
      'Verificați accesul la metrou (linia M2 traversează sectorul) — un after school lângă o stație simplifică mult logistica zilnică',
      'Cereți referințe de la alți părinți din școala copilului — comunitatea din Sectorul 4 este unită și recomandările contează',
      'Dacă bugetul este limitat, Sectorul 4 oferă unele dintre cele mai bune rapoarte calitate-preț din București',
    ],
  },
  '5': {
    despre: 'Sectorul 5 acoperă cartiere cu profiluri foarte diferite: zona elegantă Cotroceni și 13 Septembrie la nord, și cartierele Rahova și Ferentari spre sud. Oferta de after school-uri este concentrată preponderent în partea de nord a sectorului.',
    oferta: 'After school-urile din zona Cotroceni și 13 Septembrie sunt în general de calitate ridicată, cu clase mici și programe personalizate. Proximitatea față de Parcul Izvor și Grădina Botanică oferă un avantaj unic — unele centre organizează activități în aer liber în aceste spații verzi.',
    recomandari: [
      'Oferta este mai limitată față de alte sectoare — rezervați locul din timp, clasele se completează rapid',
      'Zona Cotroceni atrage familii cu standarde ridicate — întrebați despre calificările educatorilor și metodele pedagogice folosite',
      'Dacă locuiți în sudul sectorului (Rahova, Ferentari), luați în calcul și after school-uri din Sectorul 4 sau 6 care pot fi mai aproape',
      'Traficul pe Calea 13 Septembrie și Splaiul Independenței este intens — planificați ruta de preluare în consecință',
    ],
  },
  '6': {
    despre: 'Sectorul 6 cuprinde Drumul Taberei, Militari, Giulești și Crângași — cartiere mari cu zeci de mii de familii cu copii. Este sectorul cu cea mai mare densitate de blocuri din București și una dintre cele mai active comunități de părinți din oraș.',
    oferta: 'Oferta este extinsă și variată: de la centre mici de cartier până la after school-uri cu facilități complete — sală de sport, piscină, atelier de robotică. Concurența ridicată între after school-uri a dus la standarde bune și prețuri competitive.',
    recomandari: [
      'Metroul (linia M4 spre Drumul Taberei) și rețeaua de tramvaie sunt un avantaj real — alegeți un after school aproape de o stație',
      'Zona Militari are cele mai multe opțiuni noi deschise recent — merită să explorați centre moderne cu dotări actuale',
      'Drumul Taberei are o comunitate mare de părinți activi online — căutați grupuri de Facebook ale cartierului pentru recomandări directe',
      'Prețurile medii sunt între 500 și 900 RON/lună, cu reduceri frecvente pentru plata semestrială sau anuală',
    ],
  },
};

export async function generateStaticParams() {
  return ['1','2','3','4','5','6'].map(s => ({ sector: s }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params;
  if (!SECTOR_NAMES[sector]) return { title: 'Pagina negăsită' };
  const name = SECTOR_NAMES[sector];
  return {
    title: `After School ${name} București | ActivKids`,
    description: `Găsește cele mai bune after school-uri din ${name} al Bucureștiului. Compară prețuri, program și activități. Listă completă și actualizată.`,
    alternates: { canonical: `https://activkids.ro/afterschool/sector/${sector}` },
    openGraph: {
      title: `After School ${name} București | ActivKids`,
      description: `Lista after school-urilor din ${name} București. Prețuri, program, contact.`,
      url: `https://activkids.ro/afterschool/sector/${sector}`,
    },
  };
}

export default async function SectorPage({ params }: Props) {
  const { sector } = await params;
  if (!SECTOR_NAMES[sector]) notFound();

  const db = getDb();
  const afterschools = db.prepare(
    'SELECT * FROM afterschools WHERE sector = ? ORDER BY is_premium DESC, name ASC'
  ).all(parseInt(sector)) as AfterSchool[];

  const sectorName = SECTOR_NAMES[sector];
  const sectorInfo = SECTOR_INFO[sector];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `After School-uri ${sectorName} București`,
    description: `Lista completă a after school-urilor din ${sectorName} București`,
    url: `https://activkids.ro/afterschool/sector/${sector}`,
    numberOfItems: afterschools.length,
    itemListElement: afterschools.slice(0, 10).map((as, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://activkids.ro/afterschool/${toSlug(as.name, as.id)}`,
      name: as.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <a href="/" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">After School-uri</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-main)] font-medium">{sectorName}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">
            After School-uri în {sectorName} București
          </h1>
          <p className="text-[var(--color-text-light)] mb-2">
            {afterschools.length > 0
              ? `${afterschools.length} after school-uri găsite în ${sectorName}`
              : `Nu am găsit after school-uri în ${sectorName} momentan.`}
          </p>
          {/* Continut editorial structurat */}
          {sectorInfo && (
            <div className="mb-8 space-y-5 max-w-2xl">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Despre zonă</h2>
                <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{sectorInfo.despre}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Ce găsești aici</h2>
                <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{sectorInfo.oferta}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Recomandări practice</h2>
                <ul className="space-y-1.5">
                  {sectorInfo.recomandari.map((r, i) => (
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
            {Object.entries(SECTOR_NAMES).map(([s, name]) => (
              <a key={s} href={`/afterschool/sector/${s}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${s === sector
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                {name}
              </a>
            ))}
          </div>

          {afterschools.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
              <p className="text-[var(--color-text-light)] mb-4">Nu avem încă listări pentru {sectorName}.</p>
              <a href="/promovare" className="inline-block px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                Adaugă primul after school din {sectorName}
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {afterschools.map(as => (
                <a key={as.id} href={`/afterschool/${toSlug(as.name, as.id)}`}
                  className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 hover:shadow-md transition-shadow block">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-bold text-[var(--color-text-main)] text-base leading-snug">{as.name}</h2>
                    {as.is_premium === 1 && (
                      <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">★ Premium</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-light)] mb-3">{as.address}</p>
                  <div className="flex flex-wrap gap-2">
                    {as.price_min && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        {as.price_min}–{as.price_max} lei/lună
                      </span>
                    )}
                    {as.age_min && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                        {as.age_min}–{as.age_max} ani
                      </span>
                    )}
                    {as.availability === 'available' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">Locuri disponibile</span>
                    )}
                    {as.availability === 'full' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg">Complet</span>
                    )}
                  </div>
                  {as.description && (
                    <p className="text-xs text-[var(--color-text-light)] mt-3 line-clamp-2">{as.description}</p>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Ai un after school în {sectorName}?</h3>
            <p className="text-sm text-blue-700 mb-4">Listează-te gratuit sau premium și ajunge în fața părinților din sector.</p>
            <a href="/promovare" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Adaugă / Revendică listarea →
            </a>
          </div>

          {/* Link-uri interne catre celelalte sectoare */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">After school-uri în alte sectoare:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SECTOR_NAMES).filter(([s]) => s !== sector).map(([s, name]) => (
                <a key={s} href={`/afterschool/sector/${s}`}
                  className="text-sm text-[var(--color-primary)] hover:underline">
                  After School {name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

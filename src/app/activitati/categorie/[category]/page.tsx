import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import type { Metadata } from 'next';
import type { Club } from '@/lib/db';

type Props = { params: Promise<{ category: string }> };

const CATEGORIES: Record<string, { label: string; title: string; description: string; longDescription: string; emoji: string }> = {
  inot:          { emoji: '🏊', label: 'Înot', title: 'Cursuri de Înot pentru Copii', description: 'Găsește cele mai bune cursuri de înot pentru copii în București. Bazine, instructori și prețuri.', longDescription: 'Înotul este una dintre cele mai complete activități fizice pentru copii, dezvoltând atât musculatura, cât și coordonarea și rezistența. În București există numeroase bazine de înot care oferă cursuri adaptate vârstei, de la grupa de bebeluși (baby swim) până la copii de liceu. Instructorii calificați asigură un mediu sigur și progresiv, iar copiii dobândesc o abilitate esențială pentru toată viața.' },
  fotbal:        { emoji: '⚽', label: 'Fotbal', title: 'Fotbal pentru Copii', description: 'Academii și cluburi de fotbal pentru copii în București. Antrenamente, campionate și dezvoltare.', longDescription: 'Fotbalul rămâne cel mai popular sport de echipă pentru băieți în România. Academiile și cluburile de fotbal din București oferă antrenamente structurate pe grupe de vârstă, cu antrenori licențiați. Pe lângă tehnica mingii, copiii învață spiritul de echipă, disciplina și gestionarea câștigului sau înfrângerii — lecții valoroase pentru viață.' },
  dansuri:       { emoji: '💃', label: 'Dansuri', title: 'Cursuri de Dans pentru Copii', description: 'Cursuri de dans pentru copii în București: dans modern, balet, hip-hop, dans sportiv.', longDescription: 'Dansul combină mișcarea artistică cu exercițiul fizic, contribuind la dezvoltarea coordonării, ritmului și încrederii în sine. Școlile de dans din București oferă stiluri variate — balet clasic, hip-hop, dans modern, dans sportiv și zumba pentru copii. Spectacolele de final de an sunt momente speciale atât pentru copii, cât și pentru părinți.' },
  arte_martiale: { emoji: '🥋', label: 'Arte Marțiale', title: 'Arte Marțiale pentru Copii', description: 'Karate, judo, taekwondo și alte arte marțiale pentru copii în București. Disciplină și sport.', longDescription: 'Artele marțiale — karate, judo, taekwondo, kickboxing — sunt o alegere excelentă pentru copiii care au nevoie de structură, disciplină și încredere în sine. Spre deosebire de percepția generală, aceste sporturi promovează respectul față de adversar și autocontrolul. Cluburile din București organizează și competiții locale și naționale pentru cei care doresc să progreseze.' },
  gimnastica:    { emoji: '🤸', label: 'Gimnastică', title: 'Gimnastică pentru Copii', description: 'Cursuri de gimnastică artistică și aerobică pentru copii în București.', longDescription: 'Gimnastica artistică și aerobică sunt sporturi complete care lucrează flexibilitatea, forța, echilibrul și coordonarea. Centrele de gimnastică din București primesc copii de la vârste foarte mici (3–4 ani) și oferă programe progresive. Fetele și băieții deopotrivă pot practica gimnastica, care pune bazele oricărei alte activități sportive.' },
  robotica:      { emoji: '🤖', label: 'Robotică', title: 'Robotică și Programare pentru Copii', description: 'Cursuri de robotică, programare și STEM pentru copii în București. Pregătire pentru viitor.', longDescription: 'Robotica și programarea pentru copii sunt printre cele mai căutate activități ale momentului, pregătind generația viitoare pentru o piață a muncii dominată de tehnologie. Cursurile din București folosesc kit-uri LEGO Mindstorms, Scratch, Python sau Arduino, adaptate vârstei. Participarea la olimpiade și hackathoane de robotică este un plus important pentru CV-ul viitorului student.' },
  muzica:        { emoji: '🎵', label: 'Muzică', title: 'Cursuri de Muzică pentru Copii', description: 'Pian, chitară, vioară, canto și alte instrumente pentru copii în București.', longDescription: 'Studiul muzicii stimulează dezvoltarea cognitivă, memoria și disciplina la copii. Școlile de muzică și profesorii particulari din București oferă lecții de pian, chitară, vioară, tobe, canto și teoria muzicii. Copiii care studiază un instrument de mici au în general rezultate mai bune la matematică și limbi străine — o investiție în educația completă.' },
  arte_creative: { emoji: '🎨', label: 'Arte Creative', title: 'Arte Creative pentru Copii', description: 'Desen, pictură, sculptură și ateliere creative pentru copii în București.', longDescription: 'Atelierele de arte creative — desen, pictură, sculptură în lut, colaj, ceramică — oferă copiilor un spațiu de exprimare liberă și dezvoltare a imaginației. Centrele de artă din București organizează cursuri săptămânale și tabere de creație, cu profesori formați în artele plastice. Aceste activități sunt ideale pentru copiii cu temperament artistic sau pentru cei care au nevoie de un echilibru față de activitățile mai structurate.' },
  limbi_straine: { emoji: '🌍', label: 'Limbi Străine', title: 'Cursuri Limbi Străine pentru Copii', description: 'Engleză, franceză, germană și alte limbi străine pentru copii în București.', longDescription: 'Copilăria este perioada ideală pentru achiziția limbilor străine, creierul absorbind structuri lingvistice cu o ușurință remarcabilă. Centrele de limbi străine din București oferă cursuri de engleză, franceză, germană, spaniolă și chineză pentru copii de toate vârstele, cu metode interactive, jocuri și activități creative. Certificările Cambridge sau DELF sunt un avantaj solid pentru admiterea în licee și universități.' },
};

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map(c => ({ category: c }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORIES[category];
  if (!cat) return { title: 'Pagina negăsită' };
  return {
    title: `${cat.title} București | ActivKids`,
    description: cat.description,
    alternates: { canonical: `https://activkids.ro/activitati/categorie/${category}` },
    openGraph: {
      title: `${cat.title} București | ActivKids`,
      description: cat.description,
      url: `https://activkids.ro/activitati/categorie/${category}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = CATEGORIES[category];
  if (!cat) notFound();

  const db = getDb();
  const clubs = db.prepare(
    'SELECT * FROM clubs WHERE category = ? ORDER BY is_premium DESC, name ASC'
  ).all(category) as Club[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cat.title} București`,
    description: cat.description,
    url: `https://activkids.ro/activitati/categorie/${category}`,
    numberOfItems: clubs.length,
    itemListElement: clubs.slice(0, 10).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://activkids.ro/activitati/${toSlug(c.name, c.id)}`,
      name: c.name,
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
            <a href="/activitati" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">Activități</a>
            <span className="text-[var(--color-text-light)]">/</span>
            <span className="text-sm text-[var(--color-text-main)] font-medium">{cat.emoji} {cat.label}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">
            {cat.emoji} {cat.title} în București
          </h1>
          <p className="text-[var(--color-text-light)] mb-2">
            {clubs.length > 0
              ? `${clubs.length} cluburi și centre găsite în București`
              : `Nu am găsit listări pentru această categorie momentan.`}
          </p>
          <p className="text-sm text-[var(--color-text-light)] mb-6 leading-relaxed max-w-2xl">
            {cat.longDescription}
          </p>

          {/* Navigare categorii */}
          <div className="flex flex-wrap gap-2 mb-8">
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <a key={key} href={`/activitati/categorie/${key}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${key === category
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                {c.emoji} {c.label}
              </a>
            ))}
          </div>

          {clubs.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
              <p className="text-[var(--color-text-light)] mb-4">Nu avem încă listări pentru {cat.label}.</p>
              <a href="/promovare" className="inline-block px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
                Adaugă primul club de {cat.label} din București
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {clubs.map(club => (
                <a key={club.id} href={`/activitati/${toSlug(club.name, club.id)}`}
                  className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 hover:shadow-md transition-shadow block">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-bold text-[var(--color-text-main)] text-base leading-snug">{club.name}</h2>
                    {club.is_premium === 1 && (
                      <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">★ Premium</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-light)] mb-3">{club.address}</p>
                  <div className="flex flex-wrap gap-2">
                    {club.price_min && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        {club.price_min}–{club.price_max} lei/lună
                      </span>
                    )}
                    {club.age_min && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                        {club.age_min}–{club.age_max} ani
                      </span>
                    )}
                    {club.availability === 'available' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">Locuri disponibile</span>
                    )}
                  </div>
                  {club.description && (
                    <p className="text-xs text-[var(--color-text-light)] mt-3 line-clamp-2">{club.description}</p>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Ai un club de {cat.label} în București?</h3>
            <p className="text-sm text-blue-700 mb-4">Listează-te gratuit sau premium și ajunge în fața părinților care caută exact ce oferi tu.</p>
            <a href="/promovare" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Adaugă / Revendică listarea →
            </a>
          </div>

          {/* Link-uri interne catre alte categorii */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-3">Alte activități pentru copii în București:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(CATEGORIES).filter(([k]) => k !== category).map(([key, c]) => (
                <a key={key} href={`/activitati/categorie/${key}`}
                  className="text-sm text-[var(--color-primary)] hover:underline">
                  {c.emoji} {c.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

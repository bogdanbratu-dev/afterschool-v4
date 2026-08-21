import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import ProfessionalCard from '@/components/ProfessionalCard';
import {
  PROFESSIONAL_CATEGORY_LABELS,
  PROFESSIONAL_CATEGORY_ORDER,
  PROFESSIONAL_GROUPS,
  PROFESSIONAL_GROUP_LABELS,
  CATEGORY_TO_GROUP,
  type ProfessionalCategory,
} from '@/lib/professionals';
import type { Professional } from '@/lib/db';

type Props = { params: Promise<{ category: string }> };

function isValid(cat: string): cat is ProfessionalCategory {
  return (PROFESSIONAL_CATEGORY_ORDER as string[]).includes(cat);
}

const CATEGORY_INFO: Record<ProfessionalCategory, { despre: string; recomandari: string[] }> = {
  invatatori: {
    despre: 'Învățătorii și educatorii pentru after school preiau grupe de copii după orele de curs, supraveghează efectuarea temelor și organizează activități educative complementare programului de la școală. Mulți au experiență la catedră în învățământul primar sau gimnazial.',
    recomandari: [
      'Verifică experiența cu vârsta exactă a copilului tău (preșcolar, primar sau gimnazial)',
      'Întreabă despre metoda folosită la teme și felul în care comunică progresul copilului',
      'Cere referințe de la alți părinți sau de la un after school unde a mai lucrat',
      'Clarifică programul disponibil (part-time, full-time, doar anumite zile)',
    ],
  },
  personal_afterschool: {
    despre: 'Personalul de after school se ocupă de supravegherea copiilor, activități recreative, servirea mesei și rutina zilnică între finalul orelor de școală și venirea părinților. Este colaboratorul potrivit pentru completarea echipei unui after school sau grădiniță existentă.',
    recomandari: [
      'Verifică raportul copii/adult cu care a mai lucrat',
      'Întreabă despre experiența cu servirea mesei și rutina de gustare/somn, dacă e cazul',
      'Cere detalii despre tipurile de activități recreative pe care le organizează',
      'Clarifică disponibilitatea pe intervalul orar de care ai nevoie (14:00-19:00 e cel mai cerut)',
    ],
  },
  asistenta_teme: {
    despre: 'Colaboratorii specializați pe asistență la teme ajută copiii să își facă temele zilnice, explică materia neînțeleasă la clasă și consolidează deprinderile de învățare independentă. Mulți lucrează individual sau în grupuri mici de 2-4 copii.',
    recomandari: [
      'Verifică pentru ce materii/clase oferă sprijin (unii sunt specializați pe un singur ciclu de învățământ)',
      'Întreabă dacă lucrează individual sau în grup, și câți copii supraveghează simultan',
      'Cere un exemplu de progres obținut cu alt elev, dacă e posibil',
      'Clarifică dacă ședințele sunt la domiciliu, online sau la sediul lor',
    ],
  },
  limbi_straine: {
    despre: 'Profesorii de limbi străine pentru copii predau engleză, franceză, germană sau alte limbi în format after school, individual sau în grupe mici, adaptat vârstei și nivelului fiecărui copil.',
    recomandari: [
      'Verifică limba și nivelul predat (începător, conversațional, pregătire pentru examene Cambridge/DELF)',
      'Întreabă despre metoda de predare: joc, conversație, materiale scrise',
      'Cere o lecție de probă înainte de a te angaja pe un pachet de ședințe',
      'Clarifică dacă ședințele sunt online sau la domiciliu/sediu',
    ],
  },
  robotica: {
    despre: 'Instructorii de robotică și programare introduc copiii în gândirea computațională prin kituri LEGO, Arduino sau platforme de programare vizuală (Scratch), potrivite pentru vârste de la 6-7 ani în sus.',
    recomandari: [
      'Verifică ce echipamente/kituri folosește (LEGO Mindstorms, micro:bit, Arduino etc.)',
      'Întreabă dacă materialele sunt incluse în preț sau se cumpără separat',
      'Cere exemple de proiecte realizate de copii la ședințele anterioare',
      'Clarifică dacă atelierele sunt individuale sau în grup, și câți copii per grupă',
    ],
  },
  sah: {
    despre: 'Instructorii de șah pentru copii predau regulile jocului, strategie și tactică, adesea pregătind și pentru turnee școlare sau de club. Este o activitate populară pentru dezvoltarea gândirii logice și a răbdării.',
    recomandari: [
      'Verifică nivelul copilului (începător sau are deja cunoștințe de bază)',
      'Întreabă dacă instructorul pregătește și pentru turnee sau doar recreativ',
      'Cere detalii despre materialele folosite (table de șah fizice sau platforme online precum chess.com)',
      'Clarifică formatul: individual sau grup, și frecvența recomandată',
    ],
  },
  soroban: {
    despre: 'Instructorii de soroban predau aritmetică mentală folosind abacul japonez, o metodă populară pentru dezvoltarea vitezei de calcul și a concentrării la copii de vârstă școlară mică.',
    recomandari: [
      'Verifică vârsta minimă recomandată de instructor (de obicei de la 5-6 ani)',
      'Întreabă despre materialele folosite și dacă abacul e inclus în preț',
      'Cere detalii despre programul de progres (câte niveluri, cât durează fiecare)',
      'Clarifică formatul ședințelor: individual sau grup',
    ],
  },
  stiinte: {
    despre: 'Colaboratorii pe științe și STEM organizează experimente și ateliere practice de fizică, chimie sau biologie adaptate copiilor, cu scopul de a face materiile știi mai atractive prin descoperire directă.',
    recomandari: [
      'Verifică ce domenii acoperă (fizică, chimie, biologie, sau un mix)',
      'Întreabă dacă materialele pentru experimente sunt incluse în preț',
      'Cere exemple de experimente realizate anterior cu copii de vârsta ta',
      'Clarifică măsurile de siguranță folosite pentru experimentele cu substanțe chimice',
    ],
  },
  educatie_financiara: {
    despre: 'Colaboratorii de educație financiară predau copiilor noțiuni de bază despre bani, economisire și buget, prin jocuri și exerciții practice adaptate vârstei, o materie rar întâlnită în programa școlară standard.',
    recomandari: [
      'Verifică vârsta minimă recomandată și structura programului (câte ședințe)',
      'Întreabă despre metodele folosite: jocuri, simulări, materiale interactive',
      'Cere un exemplu de temă acoperită la o ședință tipică',
      'Clarifică formatul: individual, grup sau atelier de tip workshop',
    ],
  },
  lectura: {
    despre: 'Cluburile și colaboratorii de lectură încurajează pasiunea pentru citit la copii prin discuții despre cărți, exerciții de comprehensiune și recomandări adaptate vârstei și intereselor fiecărui copil.',
    recomandari: [
      'Verifică ce grupe de vârstă acoperă și tipul de cărți folosite',
      'Întreabă dacă lucrează pe cărți alese de instructor sau de copil/părinte',
      'Cere detalii despre formatul întâlnirilor: club de grup sau ședințe individuale',
      'Clarifică dacă include și exerciții de scriere sau doar discuții',
    ],
  },
  caligrafie: {
    despre: 'Instructorii de caligrafie lucrează cu copiii pe formarea unui scris frumos și corect, utilă mai ales în clasele primare, dar și ca activitate de relaxare și concentrare pentru copii mai mari.',
    recomandari: [
      'Verifică dacă lucrează pe caligrafie latină clasică sau doar corectare de scris curent',
      'Întreabă despre materialele necesare (caiete speciale, instrumente de scris)',
      'Cere un exemplu de progres obținut cu alți copii',
      'Clarifică frecvența recomandată pentru rezultate vizibile',
    ],
  },
  muzica: {
    despre: 'Profesorii de muzică pentru copii predau instrumente (pian, chitară, vioară), canto sau teorie muzicală, adaptând programa la vârsta și nivelul fiecărui elev, individual sau în grupe mici.',
    recomandari: [
      'Verifică instrumentul/instrumentele predate și dacă e nevoie să ai deja unul acasă',
      'Întreabă despre pregătirea muzicală a instructorului (studii, experiență cu copii)',
      'Cere o lecție de probă înainte de a te angaja pe un pachet',
      'Clarifică dacă pregătește și pentru examene/concursuri, dacă te interesează',
    ],
  },
  arta: {
    despre: 'Colaboratorii de arte plastice organizează ateliere de pictură, desen și lucru manual pentru copii, dezvoltând creativitatea și motricitatea fină prin tehnici adaptate fiecărei vârste.',
    recomandari: [
      'Verifică tehnicile predate (pictură, desen, modelaj, colaj)',
      'Întreabă dacă materialele sunt incluse în preț sau se cumpără separat',
      'Cere exemple de lucrări realizate de copii la ședințele anterioare',
      'Clarifică formatul: atelier de grup sau ședințe individuale',
    ],
  },
  teatru: {
    despre: 'Instructorii de teatru și actorie lucrează cu copiii pe exprimare, dicție și încredere în public, prin jocuri de rol și exerciții de improvizație adaptate vârstei, adesea culminând cu un mic spectacol.',
    recomandari: [
      'Verifică dacă programul include un spectacol final sau e strict de antrenament',
      'Întreabă despre grupa de vârstă și numărul de copii per grupă',
      'Cere detalii despre tipul de exerciții folosite (improvizație, texte, jocuri de rol)',
      'Clarifică locația: la domiciliu, online sau într-un spațiu dedicat',
    ],
  },
  dans: {
    despre: 'Instructorii de dans predau diverse stiluri (balet, modern, hip-hop, dansuri de societate) copiilor, dezvoltând coordonarea, ritmul și disciplina, individual sau în grupe organizate pe vârstă.',
    recomandari: [
      'Verifică stilul de dans predat și dacă se potrivește cu interesul copilului',
      'Întreabă despre ținuta și echipamentul necesar (papuci, colanți etc.)',
      'Cere detalii despre eventuale spectacole sau evaluări de sfârșit de sezon',
      'Clarifică formatul: grupă organizată pe vârstă sau ședințe individuale',
    ],
  },
  public_speaking: {
    despre: 'Colaboratorii de public speaking și dezbateri lucrează cu copiii pe exprimare orală, argumentare și încredere în fața unui public, printr-un format de exerciții practice și dezbateri simulate.',
    recomandari: [
      'Verifică vârsta minimă recomandată, întrucât exercițiile de argumentare cer un nivel minim de exprimare',
      'Întreabă despre structura programului: număr de ședințe și progresie',
      'Cere exemple de teme de dezbatere folosite la vârsta copilului tău',
      'Clarifică dacă programul include participarea la concursuri de dezbateri',
    ],
  },
  sport_indoor: {
    despre: 'Instructorii de sport indoor organizează activități fizice în spații interioare (gimnastică, karate, tenis de masă, fitness pentru copii), potrivite pe tot parcursul anului, indiferent de vreme.',
    recomandari: [
      'Verifică tipul exact de sport practicat și echipamentul necesar',
      'Întreabă despre spațiul folosit: sală proprie, sală închiriată sau la domiciliu',
      'Cere detalii despre nivelul de intensitate și dacă e potrivit pentru un începător',
      'Clarifică dacă e nevoie de o adeverință medicală pentru înscriere',
    ],
  },
  yoga: {
    despre: 'Instructorii de yoga și mindfulness pentru copii predau exerciții de respirație, poziții adaptate și tehnici de relaxare, utile pentru gestionarea emoțiilor și a energiei la vârste mici.',
    recomandari: [
      'Verifică vârsta minimă recomandată și formatul ședințelor (individual sau grup)',
      'Întreabă despre pregătirea instructorului în lucrul specific cu copii',
      'Cere detalii despre echipamentul necesar (saltea proprie sau asigurată de instructor)',
      'Clarifică dacă ședințele sunt fizice sau se pot desfășura și online',
    ],
  },
  dezvoltare_personala: {
    despre: 'Colaboratorii de dezvoltare personală lucrează cu copiii pe încredere în sine, gestionarea emoțiilor și abilități sociale, prin activități ludice și exerciții de grup adaptate vârstei.',
    recomandari: [
      'Verifică ce teme specifice acoperă programul (încredere, prietenii, gestionarea emoțiilor)',
      'Întreabă despre formarea instructorului (psihopedagogie, coaching pentru copii)',
      'Cere detalii despre formatul întâlnirilor: individual sau grup',
      'Clarifică frecvența recomandată pentru rezultate vizibile',
    ],
  },
  gatit: {
    despre: 'Atelierele culinare pentru copii îi învață noțiuni de bază de gătit și igienă alimentară prin rețete simple și sigure, adaptate vârstei, într-un format practic și distractiv.',
    recomandari: [
      'Verifică vârsta minimă recomandată și măsurile de siguranță folosite (cuptor, cuțite)',
      'Întreabă dacă ingredientele sunt incluse în preț',
      'Cere exemple de rețete realizate la ateliere anterioare',
      'Clarifică locația: la domiciliul tău sau la un spațiu dedicat al instructorului',
    ],
  },
  foto_video: {
    despre: 'Colaboratorii de foto/video pentru evenimente surprind aniversări, serbări și spectacole ale copiilor, oferind adesea pachete adaptate special pentru evenimente școlare și de after school.',
    recomandari: [
      'Verifică portofoliul cu evenimente similare pentru copii (aniversări, serbări)',
      'Întreabă despre formatul livrării: fotografii editate, album, video montat',
      'Cere un preț clar pentru durata evenimentului tău',
      'Clarifică termenul de livrare al materialelor finale',
    ],
  },
  altele: {
    despre: 'Categoria "Altele" reunește colaboratori cu specializări care nu se încadrează în categoriile standard, dar sunt relevante pentru activitățile extracurriculare ale copiilor.',
    recomandari: [
      'Citește cu atenție descrierea profilului pentru a înțelege exact specializarea',
      'Contactează direct colaboratorul pentru detalii despre serviciul oferit',
      'Cere referințe sau exemple de activitate anterioară cu copii',
      'Clarifică prețul și formatul înainte de a te angaja pe un pachet de ședințe',
    ],
  },
  logopedie: {
    despre: 'Logopezii lucrează cu copiii pe corectarea tulburărilor de pronunție, dezvoltarea limbajului și fluența vorbirii, prin exerciții personalizate adaptate vârstei și tipului de dificultate.',
    recomandari: [
      'Verifică specializarea exactă (tulburări de pronunție, întârziere de limbaj, bâlbâială)',
      'Întreabă dacă oferă și o evaluare inițială înainte de a stabili un plan de ședințe',
      'Cere detalii despre durata estimată a terapiei pentru dificultatea copilului tău',
      'Clarifică dacă ședințele sunt la domiciliu, la cabinet sau online',
    ],
  },
  psihologie: {
    despre: 'Psihologii și consilierii pentru copii oferă sprijin în gestionarea emoțiilor, anxietății, comportamentului sau adaptării școlare, prin ședințe individuale adaptate vârstei și nevoilor fiecărui copil.',
    recomandari: [
      'Verifică specializarea (psihologie clinică infantilă, consiliere școlară, terapie de familie)',
      'Întreabă despre abordarea terapeutică folosită și experiența cu vârsta copilului tău',
      'Cere detalii despre o eventuală ședință de evaluare inițială',
      'Clarifică confidențialitatea și modul de comunicare a progresului către părinți',
    ],
  },
  terapie: {
    despre: 'Terapeuții specializați (ABA, terapie ocupațională) lucrează cu copii cu cerințe educaționale speciale sau întârzieri de dezvoltare, prin programe individualizate axate pe deprinderi cognitive, motorii și sociale.',
    recomandari: [
      'Verifică tipul exact de terapie oferit (ABA, terapie ocupațională, senzorială)',
      'Întreabă despre experiența și certificările specifice terapiei respective',
      'Cere detalii despre procesul de evaluare inițială și stabilirea planului de terapie',
      'Clarifică frecvența recomandată și modul de măsurare a progresului',
    ],
  },
};

export function generateStaticParams() {
  return PROFESSIONAL_CATEGORY_ORDER.map(category => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  if (!isValid(category)) return { title: 'Categorie negasita' };
  const label = PROFESSIONAL_CATEGORY_LABELS[category];
  const title = `${label} pentru copii in Bucuresti | ActivKids`;
  const description = `Gaseste ${label.toLowerCase()} pentru copii in Bucuresti. Colaboratori verificati, disponibili online sau la domiciliu, filtrati pe sector.`;
  const canonical = `https://activkids.ro/colaboratori/categorie/${category}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'ActivKids', locale: 'ro_RO', type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  if (!isValid(category)) notFound();
  const label = PROFESSIONAL_CATEGORY_LABELS[category];
  const info = CATEGORY_INFO[category];
  const group = CATEGORY_TO_GROUP[category];

  const db = getDb();
  let items = db.prepare(
    'SELECT * FROM professionals WHERE category = ? ORDER BY is_featured DESC, is_premium DESC, rating IS NULL, rating DESC, name'
  ).all(category) as Professional[];

  items = applyPremiumSpotlight(items, readSpotlightConfig(db), {
    tieBreak: (a, b) => (((a.rating == null ? 1 : 0) - (b.rating == null ? 1 : 0)) || ((b.rating || 0) - (a.rating || 0)) || String(a.name || '').localeCompare(String(b.name || ''))),
  });

  const jsonLdList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${label} pentru copii in Bucuresti`,
    url: `https://activkids.ro/colaboratori/categorie/${category}`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://activkids.ro/colaboratori/${toSlug(p.name, p.id)}`,
      name: p.name,
    })),
  };

  const siblingCategories = PROFESSIONAL_GROUPS[group].filter(c => c !== category);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdList) }} />

      <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/colaboratori" className="text-indigo-600 hover:underline text-sm">← Colaboratori</a>
          <span className="text-[var(--color-text-light)]">/</span>
          <span className="text-sm text-[var(--color-text-light)]">{label}</span>
        </div>
      </header>

      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white py-7 sm:py-10">
        <div className="max-w-6xl mx-auto text-center px-4">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-3">{label} pentru copii in Bucuresti</h1>
          <p className="text-indigo-100 text-sm sm:text-base max-w-2xl mx-auto">
            {items.length} colaboratori disponibili in Bucuresti si Ilfov
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {info && (
          <div className="mb-8 space-y-5 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Despre {label.toLowerCase()}</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{info.despre}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Recomandari practice</h2>
              <ul className="space-y-1.5">
                {info.recomandari.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                    <span className="text-indigo-600 mt-0.5 flex-shrink-0">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {siblingCategories.length > 0 && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-[var(--color-text-light)] mb-2">{PROFESSIONAL_GROUP_LABELS[group]}:</p>
            <div className="flex flex-wrap gap-2">
              <a href={`/colaboratori/categorie/${category}`} className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-indigo-600 text-white border-indigo-600">
                {label}
              </a>
              {siblingCategories.map(c => (
                <a key={c} href={`/colaboratori/categorie/${c}`}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-indigo-600 transition-colors">
                  {PROFESSIONAL_CATEGORY_LABELS[c]}
                </a>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-[var(--color-text-light)] mb-4">Nu avem inca colaboratori listati pentru {label.toLowerCase()}.</p>
            <a href="/promovare" className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
              Adauga primul colaborator din aceasta categorie
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map(p => (
              <ProfessionalCard key={p.id} data={p} businessMode />
            ))}
          </div>
        )}

        <div className="mt-10 bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center">
          <h3 className="font-bold text-indigo-800 mb-2">Esti {label.toLowerCase()} si lucrezi cu copii?</h3>
          <p className="text-sm text-indigo-700 mb-4">Listeaza-te gratuit sau premium si ajunge in fata parintilor si a afterschool-urilor din Bucuresti.</p>
          <a href="/promovare" className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
            Adauga / Revendica profilul →
          </a>
        </div>
      </div>

      <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-light)]">
          <span>ActivKids · {label} Bucuresti</span>
          <div className="flex gap-4">
            <a href="/colaboratori" className="hover:underline">Toti colaboratorii</a>
            <a href="https://www.facebook.com/profile.php?id=61591256207467" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import { readSpotlightConfig, applyPremiumSpotlight } from '@/lib/premiumRanking';
import TutorCard from '@/components/TutorCard';
import { TUTOR_SUBJECT_LABELS, TUTOR_SUBJECT_ORDER, type TutorSubject } from '@/lib/tutors';
import type { Tutor } from '@/lib/db';

type Props = { params: Promise<{ subject: string }> };

function isValid(cat: string): cat is TutorSubject {
  return (TUTOR_SUBJECT_ORDER as string[]).includes(cat);
}

const SUBJECT_INFO: Record<TutorSubject, { despre: string; recomandari: string[] }> = {
  matematica: {
    despre: 'Meditatorii de matematica lucreaza cu elevii pe intelegerea notiunilor de baza, rezolvarea de exercitii si pregatirea pentru teze, Evaluarea Nationala sau Bacalaureat, adaptand ritmul la nivelul fiecarui elev.',
    recomandari: [
      'Verifica pentru ce clasa/nivel este specializat meditatorul (gimnaziu, liceu, examene)',
      'Intreaba despre metoda de lucru: exercitii ghidate, teme suplimentare, simulari de test',
      'Cere un test de nivel initial pentru a stabili exact unde sunt lacunele',
      'Clarifica frecventa recomandata in functie de obiectiv (mentinere vs. recuperare)',
    ],
  },
  romana: {
    despre: 'Meditatorii de limba si literatura romana ajuta elevii cu gramatica, analiza literara si exprimare scrisa, pregatind pentru teze, Evaluarea Nationala sau Bacalaureat.',
    recomandari: [
      'Verifica daca meditatorul acopera atat gramatica, cat si literatura (comentariu, eseu)',
      'Intreaba despre materialele folosite: manuale, culegeri, modele de subiecte de examen',
      'Cere un exemplu de plan de pregatire pentru obiectivul tau (teza, examen national)',
      'Clarifica daca ofera si corectura/feedback pe lucrari scrise de elev',
    ],
  },
  fizica: {
    despre: 'Meditatorii de fizica explica notiunile teoretice si ajuta la rezolvarea de probleme, de la mecanica de baza pana la pregatirea pentru Bacalaureat sau olimpiade scolare.',
    recomandari: [
      'Verifica nivelul acoperit (gimnaziu, liceu, pregatire olimpiada)',
      'Intreaba despre abordare: teorie urmata de exercitii, sau direct pe rezolvare de probleme',
      'Cere un test de nivel pentru a identifica exact capitolele problematice',
      'Clarifica materialele de lucru folosite (culegeri, subiecte de Bacalaureat din anii anteriori)',
    ],
  },
  chimie: {
    despre: 'Meditatorii de chimie ajuta elevii sa inteleaga notiunile de chimie anorganica si organica, cu accent pe rezolvarea de exercitii si pregatirea pentru teze sau Bacalaureat.',
    recomandari: [
      'Verifica daca meditatorul acopera atat chimia anorganica, cat si organica',
      'Intreaba despre materialele folosite si daca include exercitii tip Bacalaureat',
      'Cere un test de nivel initial pentru a stabili planul de lucru',
      'Clarifica frecventa recomandata pana la examenul vizat',
    ],
  },
  biologie: {
    despre: 'Meditatorii de biologie predau notiuni de anatomie, genetica si botanica, ajutand elevii sa memoreze eficient si sa inteleaga procesele biologice pentru teze sau Bacalaureat.',
    recomandari: [
      'Verifica pentru ce nivel/an este specializat meditatorul',
      'Intreaba despre metodele folosite pentru memorare eficienta a materialului',
      'Cere un exemplu de plan de pregatire pentru examenul vizat',
      'Clarifica daca ofera materiale suplimentare (scheme, sinteze)',
    ],
  },
  informatica: {
    despre: 'Meditatorii de informatica predau algoritmica si programare (C++, Python, Java), pregatind elevii pentru teze, Bacalaureat la informatica sau pentru primii pasi in programare.',
    recomandari: [
      'Verifica limbajul de programare predat si daca se potriveste cu cel studiat la scoala',
      'Intreaba despre nivelul de pornire acceptat (incepator sau are deja baze solide)',
      'Cere exemple de probleme/proiecte rezolvate cu alti elevi',
      'Clarifica daca sedintele sunt online (cu partajare de ecran) sau la domiciliu',
    ],
  },
  istorie: {
    despre: 'Meditatorii de istorie ajuta elevii sa structureze si sa memoreze eficient materia, cu accent pe pregatirea pentru teze, Evaluarea Nationala sau Bacalaureat.',
    recomandari: [
      'Verifica pentru ce nivel/examen este specializat meditatorul',
      'Intreaba despre metoda de lucru: scheme, linii temporale, exercitii de tip grila/eseu',
      'Cere un exemplu de material de sinteza folosit la sedinte',
      'Clarifica frecventa recomandata pana la examenul vizat',
    ],
  },
  geografie: {
    despre: 'Meditatorii de geografie predau notiuni de geografie fizica si umana, ajutand elevii cu localizarea pe harta si pregatirea pentru teze sau Bacalaureat.',
    recomandari: [
      'Verifica pentru ce nivel/examen este specializat meditatorul',
      'Intreaba despre materialele folosite (atlase, harti, fise de sinteza)',
      'Cere un exemplu de plan de pregatire pentru examenul vizat',
      'Clarifica frecventa recomandata pana la examen',
    ],
  },
  limbi_straine: {
    despre: 'Meditatorii de engleza si alte limbi straine lucreaza pe conversatie, gramatica si vocabular, adaptand programul pentru scoala, examene internationale (Cambridge, IELTS) sau uz general.',
    recomandari: [
      'Verifica limba si nivelul predat (incepator, conversational, pregatire examene internationale)',
      'Intreaba despre metoda de predare: conversatie, gramatica, materiale scrise',
      'Cere o lectie de proba inainte de a te angaja pe un pachet de sedinte',
      'Clarifica daca sedintele sunt online sau la domiciliu',
    ],
  },
  evaluare_nationala: {
    despre: 'Meditatorii specializati pe pregatirea pentru Evaluarea Nationala lucreaza intensiv pe matematica si limba romana, cu simulari periodice si strategii de gestionare a timpului la examen.',
    recomandari: [
      'Verifica experienta meditatorului cu elevi de clasa a VIII-a in anii anteriori',
      'Intreaba despre frecventa simularilor de examen incluse in program',
      'Cere un plan clar de pregatire, structurat pana la data examenului',
      'Clarifica daca acopera ambele materii (matematica si romana) sau doar una',
    ],
  },
  bacalaureat: {
    despre: 'Meditatorii specializati pe pregatirea pentru Bacalaureat lucreaza pe materia de examen a fiecarei probe, cu simulari si strategii de gestionare a timpului, adaptate profilului elevului.',
    recomandari: [
      'Verifica pentru ce proba/materie de Bacalaureat este specializat meditatorul',
      'Intreaba despre frecventa simularilor de examen incluse in program',
      'Cere un plan clar de pregatire, structurat pana la data examenului',
      'Clarifica experienta meditatorului cu rezultatele obtinute de elevi anteriori',
    ],
  },
  altele: {
    despre: 'Categoria "Alte materii" reuneste meditatori cu specializari care nu se incadreaza in materiile standard, dar sunt relevante pentru parcursul scolar al copilului.',
    recomandari: [
      'Citeste cu atentie descrierea profilului pentru a intelege exact specializarea',
      'Contacteaza direct meditatorul pentru detalii despre materia predata',
      'Cere referinte sau exemple de rezultate obtinute cu alti elevi',
      'Clarifica pretul si formatul inainte de a te angaja pe un pachet de sedinte',
    ],
  },
};

export function generateStaticParams() {
  return TUTOR_SUBJECT_ORDER.map(subject => ({ subject }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject } = await params;
  if (!isValid(subject)) return { title: 'Categorie negasita' };
  const label = TUTOR_SUBJECT_LABELS[subject];
  const title = `${label} pentru copii in Bucuresti | ActivKids`;
  const description = `Gaseste meditatori la ${label.toLowerCase()} pentru copii in Bucuresti. Meditatori verificati, disponibili online sau la domiciliu, filtrati pe sector.`;
  const canonical = `https://activkids.ro/meditatii/materie/${subject}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'ActivKids', locale: 'ro_RO', type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function SubjectPage({ params }: Props) {
  const { subject } = await params;
  if (!isValid(subject)) notFound();
  const label = TUTOR_SUBJECT_LABELS[subject];
  const info = SUBJECT_INFO[subject];

  const db = getDb();
  let items = db.prepare(
    'SELECT * FROM tutors WHERE subject = ? ORDER BY is_featured DESC, is_premium DESC, rating IS NULL, rating DESC, name'
  ).all(subject) as Tutor[];

  items = applyPremiumSpotlight(items, readSpotlightConfig(db), {
    tieBreak: (a, b) => (((a.rating == null ? 1 : 0) - (b.rating == null ? 1 : 0)) || ((b.rating || 0) - (a.rating || 0)) || String(a.name || '').localeCompare(String(b.name || ''))),
  });

  const jsonLdList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${label} pentru copii in Bucuresti`,
    url: `https://activkids.ro/meditatii/materie/${subject}`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://activkids.ro/meditatii/${toSlug(t.name, t.id)}`,
      name: t.name,
    })),
  };

  const siblingSubjects = TUTOR_SUBJECT_ORDER.filter(s => s !== subject);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdList) }} />

      <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/meditatii" className="text-indigo-600 hover:underline text-sm">← Meditatii</a>
          <span className="text-[var(--color-text-light)]">/</span>
          <span className="text-sm text-[var(--color-text-light)]">{label}</span>
        </div>
      </header>

      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white py-7 sm:py-10">
        <div className="max-w-6xl mx-auto text-center px-4">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-3">{label} pentru copii in Bucuresti</h1>
          <p className="text-indigo-100 text-sm sm:text-base max-w-2xl mx-auto">
            {items.length} meditatori disponibili in Bucuresti si Ilfov
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

        <div className="mb-8">
          <p className="text-sm font-semibold text-[var(--color-text-light)] mb-2">Alte materii:</p>
          <div className="flex flex-wrap gap-2">
            <a href={`/meditatii/materie/${subject}`} className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-indigo-600 text-white border-indigo-600">
              {label}
            </a>
            {siblingSubjects.map(s => (
              <a key={s} href={`/meditatii/materie/${s}`}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-indigo-600 transition-colors">
                {TUTOR_SUBJECT_LABELS[s]}
              </a>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-[var(--color-text-light)] mb-4">Nu avem inca meditatori listati pentru {label.toLowerCase()}.</p>
            <a href="/promovare" className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
              Adauga primul meditator din aceasta materie
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map(t => (
              <TutorCard key={t.id} data={t} businessMode />
            ))}
          </div>
        )}

        <div className="mt-10 bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center">
          <h3 className="font-bold text-indigo-800 mb-2">Esti meditator la {label.toLowerCase()}?</h3>
          <p className="text-sm text-indigo-700 mb-4">Listeaza-te gratuit sau premium si ajunge in fata parintilor din Bucuresti.</p>
          <a href="/promovare" className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
            Adauga / Revendica profilul →
          </a>
        </div>
      </div>

      <footer className="bg-[var(--color-card)] border-t border-[var(--color-border)] py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-light)]">
          <span>ActivKids · {label} Bucuresti</span>
          <div className="flex gap-4">
            <a href="/meditatii" className="hover:underline">Toti meditatorii</a>
            <a href="https://www.facebook.com/profile.php?id=61591256207467" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

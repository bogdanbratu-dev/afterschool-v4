import type { getDb } from './db';

export type OutreachTplType = 'afterschool' | 'club' | 'caterer' | 'kindergarten' | 'professional' | 'tutor' | 'microsite_pitch';
export const OUTREACH_TPL_TYPES: OutreachTplType[] = ['afterschool', 'club', 'caterer', 'kindergarten', 'professional', 'tutor', 'microsite_pitch'];

// Fraza folosita in mesajul catre cluburi la "am cautat ___ din oras", per categorie ClubCategory
// (src/lib/clubs.ts). Tine cont doar de formularea din email, nu duplica CLUB_CATEGORY_LABELS
// (care e pentru UI, nu pentru o propozitie naturala).
const CLUB_CATEGORY_SEARCH_TEXT: Record<string, string> = {
  inot: 'cluburi de înot',
  fotbal: 'cluburi de fotbal',
  dansuri: 'cluburi de dansuri',
  arte_martiale: 'cluburi de arte marțiale',
  gimnastica: 'cluburi de gimnastică',
  limbi_straine: 'cursuri de limbi străine pentru copii',
  robotica: 'cluburi de robotică și programare',
  muzica: 'cluburi de muzică',
  arte_creative: 'ateliere de arte creative',
};
function categoryText(category?: string): string {
  return (category && CLUB_CATEGORY_SEARCH_TEXT[category]) || 'activități pentru copii';
}

// Pitch-ul de parteneriat cu afterschool-uri ("furnizor de activitate optionala") are sens doar
// pentru categoriile care nu au nevoie de o facilitate dedicata (bazin, teren, sala de sport) -
// un afterschool obisnuit poate gazdui un curs de dans sau robotica intr-o sala normala, dar nu
// poate improviza un bazin de inot. Categoriile care necesita spatiu/echipament special (inot,
// fotbal, gimnastica) nu primesc acest paragraf.
const CLUB_CATEGORIES_SUITABLE_FOR_AFTERSCHOOL_PARTNERSHIP = new Set([
  'dansuri', 'arte_martiale', 'limbi_straine', 'robotica', 'muzica', 'arte_creative',
]);
// Numele activitatii la forma naturala intr-o propozitie ("furnizori de dansuri"), spre deosebire
// de CLUB_CATEGORY_SEARCH_TEXT ("cluburi de dansuri") care e gandit pentru "Am cautat X din oras".
const PARTNERSHIP_ACTIVITY_TEXT: Record<string, string> = {
  dansuri: 'dansuri',
  arte_martiale: 'arte marțiale',
  limbi_straine: 'limbi străine',
  robotica: 'robotică',
  muzica: 'muzică',
  arte_creative: 'arte creative',
};
function partnershipText(category?: string): string {
  if (!category || !CLUB_CATEGORIES_SUITABLE_FOR_AFTERSCHOOL_PARTNERSHIP.has(category)) return '';
  const activity = PARTNERSHIP_ACTIVITY_TEXT[category] || 'activități opționale';
  return `Un lucru care poate v-ar interesa: multe afterschool-uri și grădinițe private din București ar fi interesate de furnizori de ${activity}. Cu planul Premium, vă facem o introducere directă către cele din zona dvs. care caută așa ceva.`;
}

// Sabloanele implicite (text simplu, cu placeholder-e {nume} si {clickuri}) - continutul e
// identic cu ce trimiteau inainte buildHtmlAfterSchool/buildHtmlClub/buildHtmlCaterer, doar
// convertit din HTML in text simplu ca sa poata fi editat direct din admin.
const DEFAULT_SUBJECT: Record<OutreachTplType, string> = {
  afterschool: 'ActivKids.ro - propunere de listare gratuita pentru {nume}',
  club: 'ActivKids.ro - propunere de listare gratuita pentru {nume}',
  caterer: 'Propunere de colaborare pentru {nume} cu afterschool-urile din București',
  kindergarten: 'ActivKids.ro - propunere de listare gratuita pentru {nume}',
  professional: 'ActivKids.ro - propunere de listare gratuita pentru {nume}',
  tutor: 'ActivKids.ro - propunere de listare gratuita pentru {nume}',
  microsite_pitch: 'ActivKids.ro - propunere de listare gratuită și site de prezentare pentru {nume}',
};

const DEFAULT_MESSAGE: Record<OutreachTplType, string> = {
  afterschool: `Îmi cer scuze de deranj. Mă numesc Bogdan și am construit ActivKids.ro, un site prin care părinții din București caută afterschool-uri și activități pentru copii. Am pornit acest proiect ca să ajut și părinții, care caută un loc de încredere pentru copii, și afacerile din acest domeniu, de care cred că e mare nevoie.

Cred că {nume} s-ar potrivi foarte bine audienței noastre și aș vrea să vă listez, gratuit. Dacă am acordul dvs., pagina de confirmare e scurtă: bifați acordul cu termenii și politica de confidențialitate, iar apoi primiți acces direct la platformă, pe planul gratuit: {link}

Putem completa noi listarea pe baza informațiilor publice deja disponibile despre {nume} (descriere, program, poze), iar dvs. puteți reveni oricând să verificați și să modificați ce apare.

Listarea de bază rămâne gratuită oricând, fără nicio obligație. Dacă la un moment dat vreți și mai multă vizibilitate, există și un plan Premium:
• poziție prioritară în rezultatele căutării
• badge Premium pe profil
• statistici de vizite
• acces la catalogul nostru de colaboratori: logopezi, psihologi, meditatori și alți specialiști pentru copii

{promo}

Dacă aveți întrebări sau orice idee de colaborare, sunați-mă cu încredere la 0747 646 543. Sunt flexibil și deschis la orice propunere care ne-ar ajuta pe amândoi.`,
  club: `Îmi cer scuze de deranj. Mă numesc Bogdan și am construit ActivKids.ro, o platformă cu afterschool-uri, grădinițe private și activități pentru copii din București și zonele limitrofe. Am căutat {categorie} din oraș și mi s-a părut că {nume} s-ar potrivi foarte bine pe platformă, așa că aș vrea să vă listez, gratuit.

Dacă am acordul dvs., confirmarea e simplă: intrați pe pagina de confirmare, bifați acordul cu termenii și politica de confidențialitate, iar apoi primiți acces direct la platformă, pe planul gratuit, ca să apăreți în căutările părinților din zona dvs. și să puteți actualiza oricând profilul (program, prețuri, poze): {link}

{parteneriat}

Dacă la un moment dat vreți și mai multă vizibilitate, avem și un plan Premium:
• Formular de contact: când un părinte de pe activkids.ro vede profilul dvs. și vrea mai multe detalii, completează un formular care ajunge direct pe WhatsApp-ul dvs.
• poziție prioritară în rezultatele căutării
• badge Premium pe profil
• statistici de vizite

{promo}

Dacă aveți întrebări sau orice idee de colaborare, sunați-mă cu încredere la 0747 646 543. Sunt flexibil și deschis la orice propunere care ne-ar ajuta pe amândoi.

Iar dacă nu vreți ca {nume} să apară pe platforma noastră, nicio problemă: puteți refuza aici: {remove}`,
  caterer: `Îmi cer scuze pentru deranj. Mă numesc Bogdan și vă scriu din partea site-ului ActivKids.ro, platforma unde părinții din București găsesc afterschool-uri, grădinițe și activități pentru copii. Lucrez direct cu o rețea mare din oraș: peste 400 de afterschool-uri și peste 240 de grădinițe private.

Unele dintre ele ar putea avea nevoie de un furnizor de mâncare de încredere pentru copii, așa că m-am gândit la {nume}.

V-aș propune ceva simplu: pentru 150 lei vă fac o listare Premium pe 6 luni pe activkids.ro și, în plus, trimit personal un email de prezentare în numele dvs., cu o propunere de colaborare, către rețeaua de peste 400 de afterschool-uri și peste 240 de grădinițe private din București. Ajungeți direct la cei care ar putea avea nevoie de catering pentru copii, fără să dați dvs. mail după mail.

Iar dacă livrați doar în anumite zone, nu-i nicio problemă. Îmi spuneți ce zonă vă interesează și trimit prezentarea doar către afterschool-urile și grădinițele de acolo. Dacă acoperiți tot orașul, o trimit în tot Bucureștiul.

Ce primiți în listarea Premium: poziție prioritară în rezultate (apăreți printre primii din zona dvs.), profil complet cu poze, meniu, prețuri și date de contact la vedere, un badge de „Premium” pe card, ca să inspirați încredere, și statistici lunare cu câți părinți și afterschool-uri v-au văzut și v-au contactat.

Dacă vă interesează, răspundeți la acest email sau sunați-mă la 0747 646 543 și vă spun tot ce trebuie. Și dacă aveți orice altă idee sau propunere, sunați-mă cu încredere; îmi face plăcere să stăm de vorbă și să vă ajut cu ce pot.`,
  kindergarten: `Îmi cer scuze de deranj. Mă numesc Bogdan și am construit ActivKids.ro, un site prin care părinții din București caută grădinițe, afterschool-uri și activități pentru copii. Am pornit acest proiect ca să ajut și părinții, care caută un loc de încredere pentru copii, și afacerile din acest domeniu, de care cred că e mare nevoie.

Cred că {nume} s-ar potrivi foarte bine audienței noastre și aș vrea să vă listez, gratuit. Dacă am acordul dvs., pagina de confirmare e scurtă: bifați acordul cu termenii și politica de confidențialitate, iar apoi primiți acces direct la platformă, pe planul gratuit: {link}

Putem completa noi listarea pe baza informațiilor publice deja disponibile despre {nume} (descriere, program, poze), iar dvs. puteți reveni oricând să verificați și să modificați ce apare.

Listarea de bază rămâne gratuită oricând, fără nicio obligație. Dacă la un moment dat vreți și mai multă vizibilitate, există și un plan Premium:
• poziție prioritară în rezultatele căutării
• badge Premium pe profil
• statistici de vizite
• acces la catalogul nostru de colaboratori: logopezi, psihologi, meditatori și alți specialiști pentru copii

{promo}

Dacă aveți întrebări sau orice idee de colaborare, sunați-mă cu încredere la 0747 646 543. Sunt flexibil și deschis la orice propunere care ne-ar ajuta pe amândoi.`,
  professional: `Ma numesc Bogdan si am construit ActivKids.ro, un site prin care parintii din Bucuresti cauta profesionisti pentru copii: meditatii, terapie, consiliere si alte servicii individuale.

Cred ca {nume} s-ar potrivi bine audientei noastre si as vrea sa va listez, gratuit. Va las posibilitatea sa gestionati chiar dvs. acest profil.

Profilul de baza e gratuit, puteti actualiza informatiile oricand. Daca vreti mai multa vizibilitate, avem un plan Premium la 100 RON / 3 luni care include pozitie prioritara in rezultate, statistici lunare si un badge vizibil pe card.

Daca am acordul dvs., va puteti inregistra aici: https://activkids.ro/promovare

Daca aveti intrebari sau vreti sa discutam direct, ma puteti suna oricand la 0747 646 543. Sunt deschis la orice colaborare sau idee care credeti ca v-ar ajuta la promovare.`,
  tutor: `Ma numesc Bogdan si am construit ActivKids.ro, un site prin care parintii din Bucuresti cauta meditatii si profesori particulari pentru copii.

Cred ca {nume} s-ar potrivi bine audientei noastre si as vrea sa va listez, gratuit. Va las posibilitatea sa gestionati chiar dvs. acest profil.

Profilul de baza e gratuit, puteti actualiza informatiile oricand. Daca vreti mai multa vizibilitate, avem un plan Premium la 100 RON / 3 luni care include pozitie prioritara in rezultate, statistici lunare si un badge vizibil pe card.

Daca am acordul dvs., va puteti inregistra aici: https://activkids.ro/promovare

Daca aveti intrebari sau vreti sa discutam direct, ma puteti suna oricand la 0747 646 543. Sunt deschis la orice colaborare sau idee care credeti ca v-ar ajuta la promovare.`,
  microsite_pitch: `Îmi cer scuze de deranj. Mă numesc Bogdan și am construit ActivKids.ro, un site prin care părinții din București caută afterschool-uri, grădinițe, cluburi de sporturi și activități și alți furnizori de servicii pentru copii. Am căutat și am contactat mai multe astfel de afaceri din oraș ca să construiesc platforma, și am dat și de {nume}, așa că aș vrea, cu permisiunea dvs, să vă adaug gratuit.

Fiind adăugați pe activkids.ro, aveți gratuit:
• apariție în căutările părinților din zona dvs. care caută exact ce oferiți
• profil complet, cu poze, descriere, program și date de contact
• posibilitatea să actualizați oricând informațiile, direct din propriul cont

Dacă sunteți de acord, confirmarea e scurtă: bifați acordul cu termenii și politica de confidențialitate, iar apoi primiți acces direct la platformă, pe planul gratuit: {link}

Am observat totuși că nu aveți un site propriu. Un site v-ar ajuta nu doar să vă îmbunătățiți listările pe astfel de platforme, dar potențialii clienți vă pot găsi și prin Google sau chiar prin ChatGPT în zilele acestea.

Listarea pe activkids.ro este gratuită, iar pachetul Premium (100 lei/3 luni) vă aduce în plus poziție prioritară în rezultate, badge Premium, carusel foto mai vizibil, contact direct de la părinți, statistici de vizite și acces la catalogul nostru de colaboratori (logopezi, psihologi, meditatori).

Un site cu orice funcționalități doriți vi-l pot face cu 500 lei, o singură dată - și aș putea include în acei 500 lei și prețul unei listări Premium, ca să nu plătiți separat pentru ea. Mă ocup și de mentenanța sitului după aceea.

Nu cer niciun avans: plata se face abia la final, după ce vedeți rezultatul și sunteți mulțumit.

Dacă nu vă interesează site-ul, nicio problemă: listarea gratuită rămâne disponibilă oricum, pe baza altor linkuri pe care le aveți deja (rețele sociale, Google Maps etc.).

Dacă vă interesează sau aveți întrebări, răspundeți la acest email sau sunați-mă la 0747 646 543. Sunt flexibil și deschis la orice idee care v-ar ajuta.`,
};

function clicksText(type: OutreachTplType, clicks: number): string {
  if (type === 'club') {
    if (clicks <= 0) return '.';
    return ` pe platformă. De atunci, profilul dvs. a primit deja ${clicks} click-uri de la vizitatorii noștri.`;
  }
  if (clicks <= 0) return '';
  if (type === 'afterschool') return ` si a primit ${clicks} clickuri de la parinti care va cauta activ`;
  if (type === 'kindergarten' || type === 'professional' || type === 'tutor') return ` si a primit ${clicks} clickuri de la parinti interesati`;
  return '';
}

function promoText(): string {
  return 'Planul Premium costă 100 RON pentru 3 luni.';
}

export function getDefaultSubject(type: OutreachTplType): string {
  return DEFAULT_SUBJECT[type];
}

export function getDefaultMessage(type: OutreachTplType): string {
  return DEFAULT_MESSAGE[type];
}

function keyFor(type: OutreachTplType, field: 'subject' | 'message' | 'attachment_url' | 'attachment_name'): string {
  return `outreach_tpl_${type}_${field}`;
}

export function getTemplate(db: ReturnType<typeof getDb>, type: OutreachTplType): { subject: string; message: string; isCustom: boolean; attachmentUrl: string | null; attachmentName: string | null } {
  const subjectRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(keyFor(type, 'subject')) as { value: string } | undefined;
  const messageRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(keyFor(type, 'message')) as { value: string } | undefined;
  const attachmentUrlRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(keyFor(type, 'attachment_url')) as { value: string } | undefined;
  const attachmentNameRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(keyFor(type, 'attachment_name')) as { value: string } | undefined;
  return {
    subject: subjectRow?.value || DEFAULT_SUBJECT[type],
    message: messageRow?.value || DEFAULT_MESSAGE[type],
    isCustom: !!(subjectRow?.value || messageRow?.value),
    attachmentUrl: attachmentUrlRow?.value || null,
    attachmentName: attachmentNameRow?.value || null,
  };
}

// Sir gol pentru un camp => revenire la valoarea implicita (stergem rândul din settings in loc
// sa stocam string gol, ca sa nu ramana "blocat" pe un mesaj vid).
export function saveTemplate(db: ReturnType<typeof getDb>, type: OutreachTplType, subject: string, message: string): void {
  const s = subject.trim();
  const m = message.trim();
  if (s) db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(keyFor(type, 'subject'), s);
  else db.prepare('DELETE FROM settings WHERE key = ?').run(keyFor(type, 'subject'));
  if (m) db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(keyFor(type, 'message'), m);
  else db.prepare('DELETE FROM settings WHERE key = ?').run(keyFor(type, 'message'));
}

// Atasament (ex. meniu de catering) - un singur fisier per tip de sablon, separat de subiect/mesaj
// ca sa poata fi setat/sters fara sa atinga textul sablonului.
export function saveAttachment(db: ReturnType<typeof getDb>, type: OutreachTplType, url: string | null, name: string | null): void {
  if (url) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(keyFor(type, 'attachment_url'), url);
    if (name) db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(keyFor(type, 'attachment_name'), name);
    else db.prepare('DELETE FROM settings WHERE key = ?').run(keyFor(type, 'attachment_name'));
  } else {
    db.prepare('DELETE FROM settings WHERE key = ?').run(keyFor(type, 'attachment_url'));
    db.prepare('DELETE FROM settings WHERE key = ?').run(keyFor(type, 'attachment_name'));
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function messageToHtml(message: string): string {
  return message.trim().split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0)
    .map(para => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`).join('\n  ');
}

export function renderSubject(type: OutreachTplType, subjectTpl: string, name: string): string {
  return subjectTpl.replace(/\{nume\}/g, name);
}

export function renderHtml(type: OutreachTplType, messageTpl: string, name: string, clicks: number, unsubscribeUrl?: string, confirmUrl?: string, category?: string, removeUrl?: string): string {
  const filled = messageTpl
    .replace(/\{nume\}/g, name)
    .replace(/\{clickuri\}/g, clicksText(type, clicks))
    .replace(/\{link\}/g, confirmUrl || 'https://activkids.ro/promovare')
    .replace(/\{promo\}/g, promoText())
    .replace(/\{categorie\}/g, categoryText(category))
    .replace(/\{parteneriat\}/g, partnershipText(category))
    .replace(/\{remove\}/g, removeUrl || 'https://activkids.ro');
  const bodyHtml = messageToHtml(filled);
  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="margin-top: 20px; font-size: 11px; color: #999;">Nu mai doriți să primiți astfel de emailuri? <a href="${unsubscribeUrl}" style="color: #999;">Dezabonare</a></p>`
    : '';
  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6;">
  <p>Buna ziua,</p>
  ${bodyHtml}
  <p style="margin-top: 24px;">Cu stimă,<br><strong>Bogdan</strong><br>ActivKids.ro<br>activkidsromania@gmail.com<br>0747 646 543</p>
  ${unsubscribeHtml}
</body>
</html>`;
}

import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { toSlug } from '@/lib/slug';
import type { Metadata } from 'next';
import type { Club } from '@/lib/db';

type Props = { params: Promise<{ category: string }> };

interface CategoryInfo {
  label: string;
  title: string;
  description: string;
  emoji: string;
  despre: string;
  beneficii: string[];
  oferta: string;
  ghid?: { emoji: string; nume: string; descriere: string }[];
  recomandari: string[];
  faq: { q: string; a: string }[];
}

const CATEGORIES: Record<string, CategoryInfo> = {
  inot: {
    emoji: '🏊', label: 'Înot', title: 'Cursuri de Înot pentru Copii',
    description: 'Găsește cele mai bune cursuri de înot pentru copii în București. Bazine, instructori și prețuri.',
    despre: 'Înotul este una dintre cele mai complete activități fizice pentru copii, dezvoltând simultan musculatura, coordonarea, rezistența și tehnica respirației. Este totodată o abilitate esențială de siguranță — un copil care știe să înoate este un copil mai protejat în orice situație cu apă. Spre deosebire de multe alte sporturi, înotul nu pune presiune pe articulații, ceea ce îl face potrivit pentru aproape orice copil, indiferent de vârstă sau condiție fizică.',
    beneficii: [
      'Dezvoltă musculatura întregului corp în mod echilibrat',
      'Îmbunătățește capacitatea pulmonară și tehnica respirației',
      'Crește rezistența cardiovasculară fără impact pe articulații',
      'Abilitate esențială de siguranță pe tot parcursul vieții',
      'Reduce stresul și anxietatea — apa are efect calmant dovedit',
      'Socializare în grup și competiție sănătoasă',
    ],
    oferta: 'Programele sunt organizate pe grupe de vârstă — de la baby swim (6 luni–3 ani, cu părintele în apă) până la grupe avansate pentru adolescenți. Instructorii sunt calificați și experți în lucrul cu copiii. Unele cluburi oferă și pregătire pentru competiții pentru cei care vor să progreseze spre performanță.',
    recomandari: [
      'Verificați dacă bazinul este acoperit și încălzit — cursurile trebuie să se desfășoare confortabil tot anul',
      'Raportul instructor/copii este important: ideal sub 6 copii per instructor',
      'Întrebați dacă există vestiare și dușuri curate — confortul după antrenament contează',
      'Prețurile variază între 150 și 400 RON/lună — comparați ce include abonamentul',
      'Copiii sub 3 ani au nevoie de costume speciale de înot — verificați recomandările clubului',
    ],
    faq: [
      { q: 'De la ce vârstă poate începe un copil înotul?', a: 'De la 6 luni există cursuri de baby swim unde părintele intră în apă cu copilul. Cursurile independente sunt recomandate de la 3–4 ani, când copilul are autonomie suficientă.' },
      { q: 'Câte ședințe pe săptămână sunt necesare pentru progres?', a: 'Minim 2 ședințe pe săptămână pentru progres vizibil. O singură ședință săptămânal menține nivelul dar nu avansează tehnica.' },
      { q: 'Ce echipament este necesar?', a: 'Costum de baie mulat, ochelari de înot și căciulă de baie — echipament de bază care costă 80–150 RON total. Unele cluburi furnizează căciula.' },
      { q: 'Înotul ajută și la alte sporturi?', a: 'Da — înotul dezvoltă capacitatea pulmonară și coordonarea care se transferă direct în orice alt sport. Mulți antrenori recomandă înotul ca activitate complementară.' },
      { q: 'Cât durează până când un copil știe să înoate?', a: 'Cu 2 ședințe pe săptămână, un copil de 5–6 ani ajunge să înoate independent în 3–6 luni. Progresul depinde mult de frecvență și de teama inițială față de apă.' },
    ],
  },
  fotbal: {
    emoji: '⚽', label: 'Fotbal', title: 'Fotbal pentru Copii',
    description: 'Academii și cluburi de fotbal pentru copii în București. Antrenamente, campionate și dezvoltare.',
    despre: 'Fotbalul rămâne cel mai popular sport de echipă pentru copii în România. Academiile și cluburile din București oferă programe structurate pe grupe de vârstă, cu antrenori licențiați UEFA. Dincolo de tehnica mingii, fotbalul formează caracterul — copiii învață să câștige cu modestie, să piardă cu demnitate și să lupte pentru echipă mai presus de propriul ego.',
    beneficii: [
      'Dezvoltă viteza, rezistența și coordonarea picioare-ochi',
      'Formează spiritul de echipă și comunicarea',
      'Învață gestionarea emoțiilor în situații de presiune',
      'Disciplină și respectarea regulilor',
      'Prietenii durabile formate în jurul unui obiectiv comun',
      'Posibilitate de progres spre performanță și competiții naționale',
    ],
    oferta: 'Există două tipuri de cluburi: academii cu orientare spre performanță (cu selecție și participare la campionate federale) și cluburi recreaționale, potrivite pentru copiii care vor să se miște și să se distreze fără presiunea rezultatelor. Ambele sunt valoroase — alegerea depinde de temperamentul copilului.',
    recomandari: [
      'Întrebați dacă terenul este sintetic sau natural și dacă antrenamentele continuă pe vreme rea',
      'Verificați dacă clubul participă la campionate oficiale — o motivație suplimentară pentru copiii competitivi',
      'Echipamentul inițial (ghete, jambiere, tricou) poate costa 200–400 RON — întrebați dacă clubul îl furnizează',
      'Vârsta de start ideală este 5–7 ani, dar multe cluburi acceptă și copii de 4 ani la grupe de inițiere',
      'Dacă copilul are talent, întrebați de posibilitatea avansării la o grupă superioară',
    ],
    faq: [
      { q: 'Academie de fotbal sau club recreațional — cum aleg?', a: 'Dacă copilul e pasionat și competitiv, academia e potrivită. Dacă vrea să se distreze cu prietenii fără presiune, un club recreațional e alegerea mai bună.' },
      { q: 'De câte ori pe săptămână sunt antrenamentele?', a: 'La nivel recreațional, 2 antrenamente pe săptămână. La academii de performanță, 3–5 antrenamente plus meciuri de weekend.' },
      { q: 'Fetele pot face fotbal?', a: 'Absolut. Fotbalul feminin este în creștere în România și există grupe dedicate pentru fete în mai multe cluburi din București.' },
      { q: 'Ce ghete cumpăr pentru un copil care începe?', a: 'Ghete pentru teren sintetic (AG — artificial grass). Evitați ghetuțele cu crampoane lungi (FG) pentru copiii mici pe terenuri sintetice.' },
      { q: 'Cât de important este portarul în echipele de copii?', a: 'La grupele mici (5–8 ani) toți copiii rotesc pe toate pozițiile — nu există specialiști încă. Specializarea apare de obicei după 10 ani.' },
    ],
  },
  dansuri: {
    emoji: '💃', label: 'Dansuri', title: 'Cursuri de Dans pentru Copii',
    description: 'Cursuri de dans pentru copii în București: dans modern, balet, hip-hop, dans sportiv.',
    despre: 'Dansul combină mișcarea artistică cu exercițiul fizic, contribuind la dezvoltarea coordonării, ritmului, flexibilității și încrederii în sine. Este una dintre rarele activități care lucrează simultan corpul și expresia emoțională — copiii învață nu doar să se miște, ci să comunice prin mișcare. Spectacolele de final de an adaugă o dimensiune unică: experiența scenei și a publicului.',
    beneficii: [
      'Dezvoltă coordonarea, ritmul și flexibilitatea',
      'Crește încrederea în sine și expresia corporală',
      'Îmbunătățește postura și echilibrul',
      'Disciplină și memorie prin învățarea coregrafiilor',
      'Experiența scenei — un avantaj pentru întreaga viață',
      'Prietenii în grupuri creative și pozitive',
    ],
    oferta: 'Școlile de dans oferă stiluri variate adaptate vârstei și personalității copilului. De la disciplina clasică a baletului până la energia hip-hop-ului, fiecare copil poate găsi un stil care i se potrivește.',
    ghid: [
      { emoji: '🩰', nume: 'Balet clasic', descriere: 'Cel mai structurat și disciplinat stil. Pune bazele oricărui alt dans, dezvoltă postura, flexibilitatea și muzicalitatea. Potrivit pentru copiii cu răbdare și determinare. Vârstă start: 4–5 ani.' },
      { emoji: '💥', nume: 'Hip-hop', descriere: 'Dinamic, energic, bazat pe ritm și improvizație. Ideal pentru copiii activi care vor să se exprime liber. Mai puțin formal decât baletul, accent pe distracție. Vârstă start: 6 ani.' },
      { emoji: '🌀', nume: 'Dans modern', descriere: 'Combină tehnici din balet cu mișcări contemporane. Mai fluid și expresiv decât baletul clasic, mai structurat decât hip-hop-ul. Vârstă start: 6 ani.' },
      { emoji: '🏆', nume: 'Dans sportiv', descriere: 'Dans în pereche (standard și latino), cu competiții oficiale. Costumele și antrenamentele sunt mai costisitoare, dar experiența competițională e unică. Vârstă start: 5–6 ani.' },
      { emoji: '🎉', nume: 'Zumba Kids', descriere: 'Dans recreațional pe muzică latino și pop. Fără presiunea tehnicii, accent pe mișcare și voie bună. Ideal ca primă experiență de dans. Vârstă start: 4 ani.' },
    ],
    recomandari: [
      'Baletul necesită disciplină ridicată — potrivit pentru copiii cu răbdare, nu pentru cei care se plictisesc repede',
      'Verificați dacă sala are pardoseală specială pentru dans — important pentru articulații',
      'Costumele de spectacol pot fi costisitoare — întrebați dinainte ce costuri implică recitalul de final de an',
      'Cursurile de 2 ori pe săptămână sunt optime pentru progres vizibil',
      'Lăsați copilul să aleagă stilul — motivația vine din pasiune, nu din decizia părintelui',
    ],
    faq: [
      { q: 'Baletul e doar pentru fete?', a: 'Nu — baletul este practicat de băieți în toată lumea, iar marii dansatori masculini sunt extrem de apreciați. În România percepția se schimbă treptat.' },
      { q: 'De la ce vârstă e potrivit dansul?', a: 'De la 3–4 ani există grupe de dans creativ (ritm și mișcare liberă). Stilurile structurate (balet, hip-hop) sunt potrivite de la 5–6 ani.' },
      { q: 'Trebuie să cumpăr echipament special?', a: 'Depinde de stil. Baletul necesită baleți și colant specific. Hip-hop-ul necesită doar pantofi sport comozi. Dans sportiv — pantofi de dans și costume (mai costisitoare).' },
      { q: 'Câte ore pe săptămână sunt necesare pentru progres?', a: '2 ore pe săptămână pentru progres moderat. Copiii care vizează performanța în dans sportiv sau balet ajung la 4–6 ore săptămânal.' },
    ],
  },
  arte_martiale: {
    emoji: '🥋', label: 'Arte Marțiale', title: 'Arte Marțiale pentru Copii',
    description: 'Karate, judo, taekwondo și alte arte marțiale pentru copii în București. Disciplină și sport.',
    despre: 'Artele marțiale sunt printre cele mai complete activități pentru dezvoltarea copilului — nu doar fizic, ci și în caracter. Disciplina, respectul față de adversar, autocontrolul și perseverența sunt valori transmise în fiecare antrenament. Contrar percepției populare, artele marțiale reduc agresivitatea la copii, nu o amplifică — pentru că îi învață să gestioneze conflictele cu calm.',
    beneficii: [
      'Disciplină și autocontrol în situații dificile',
      'Încredere în sine și curaj',
      'Forță, flexibilitate și coordonare',
      'Respect față de ceilalți și fair-play',
      'Gestionarea emoțiilor — calm în situații de stres',
      'Sistem de centuri care motivează progresul constant',
    ],
    oferta: 'Cluburile din București oferă mai multe stiluri de arte marțiale, fiecare cu filozofie și tehnică proprie. Iată ghidul complet pentru a alege stilul potrivit copilului tău.',
    ghid: [
      { emoji: '🥋', nume: 'Karate', descriere: 'Cel mai răspândit stil în România. Accent pe lovituri cu mâna și piciorul și pe kata (forme tehnice). Competițional și structurat, cu sistem de centuri clar. Potrivit pentru copiii energici și competitivi. Vârstă start: 5 ani.' },
      { emoji: '🥋', nume: 'Judo', descriere: 'Sport olimpic bazat pe tehnici de proiectare și imobilizare. Unul dintre principiile fundamentale este că tehnica și echilibrul bat forța brută — orice copil, indiferent de constituție, poate excela. Practicanții poartă kimono (judogi) și avansează prin sistemul de centuri. Vârstă start: 5 ani.' },
      { emoji: '🟦', nume: 'BJJ (Brazilian Jiu-Jitsu)', descriere: 'Artă marțială bazată pe lupta la sol și tehnici de supunere prin pârghii articulare. Extrem de tehnic și strategic — adesea comparat cu șahul în mișcare. Câștigă popularitate rapidă în București. Potrivit pentru copiii metodici. Vârstă start: 6 ani.' },
      { emoji: '🦵', nume: 'Taekwondo', descriere: 'Sport olimpic cu accent pe lovituri spectaculoase de picior. Foarte dinamic vizual, cu competiții la toate nivelurile. Ideal pentru copiii agili și rapizi. Vârstă start: 5 ani.' },
      { emoji: '🥊', nume: 'Kickboxing', descriere: 'Combină tehnici de box cu lovituri de picior. Mai potrivit pentru copiii mai mari, de la 8–10 ani. Excelent pentru fitness și apărare personală.' },
      { emoji: '🤼', nume: 'Lupte libere (Wrestling)', descriere: 'Sport olimpic bazat pe proiectare și control la sol. Diferit de judo prin lipsa kimono-ului și prin regulamentul specific. Foarte eficient pentru forță și controlul corpului. Vârstă start: 7 ani.' },
    ],
    recomandari: [
      'Vizitați un antrenament înainte de înscriere — atmosfera clubului și relația antrenor-copii spun totul',
      'Kimono-ul de bază costă 100–200 RON — unele cluburi îl includ în pachetul de înscriere',
      'Examenele de centură au loc de 2–3 ori pe an și implică o taxă de 50–100 RON',
      'Artele marțiale sunt excelente pentru copiii cu ADHD sau anxietate — structura are efect terapeutic dovedit',
      'Nu alegeți stilul după filme — vizitați clubul și lăsați copilul să simtă atmosfera',
    ],
    faq: [
      { q: 'Care artă marțială e mai bună pentru apărare personală?', a: 'BJJ și judo sunt considerate cele mai eficiente în situații reale. Karate și taekwondo sunt excelente pentru disciplină și competiție sportivă.' },
      { q: 'Artele marțiale fac copiii mai agresivi?', a: 'Dimpotrivă — studiile arată că practicanții de arte marțiale au un nivel mai scăzut de agresivitate. Disciplina și respectul sunt valori centrale în orice dojo.' },
      { q: 'De câte ori pe săptămână sunt antrenamentele?', a: '2 antrenamente pe săptămână pentru nivel recreațional, 3–4 pentru cei care vizează competițiile.' },
      { q: 'Fetele pot face arte marțiale?', a: 'Absolut — judo, karate și taekwondo au secțiuni feminine puternice la nivel național și olimpic.' },
    ],
  },
  gimnastica: {
    emoji: '🤸', label: 'Gimnastică', title: 'Gimnastică pentru Copii',
    description: 'Cursuri de gimnastică artistică și aerobică pentru copii în București.',
    despre: 'Gimnastica este considerată sportul care pune cele mai solide baze pentru orice altă activitate fizică. Flexibilitatea, forța, echilibrul și coordonarea dezvoltate prin gimnastică se transferă direct în orice alt sport. Copiii care fac gimnastică în primii ani de viață au un avantaj fizic vizibil față de semenii lor pe tot parcursul copilăriei.',
    beneficii: [
      'Flexibilitate excepțională dacă se începe de mic',
      'Forță funcțională — control corporal, nu masă musculară',
      'Postură corectă și echilibru',
      'Coordonare și conștiință spațială',
      'Disciplină și concentrare',
      'Baza ideală pentru orice alt sport',
    ],
    oferta: 'Centrele de gimnastică primesc copii de la vârste foarte mici și oferă programe progresive. Există două direcții principale: gimnastica artistică (cu aparate — bară, paralele, cal, sol) și gimnastica aerobică (fără aparate, pe muzică). Ambele sunt valoroase și complementare.',
    recomandari: [
      'Vârsta ideală de start este 4–6 ani — flexibilitatea naturală se cultivă cel mai ușor în această perioadă',
      'Verificați dotările sălii: saltele groase, bare reglabile, cal — siguranța primează',
      'Gimnastica de performanță necesită 3–5 antrenamente pe săptămână; recreațional, 1–2 sunt suficiente',
      'Îmbrăcămintea trebuie să fie elastică și mulată — colant sau tricou sport strâns',
      'Nu forțați copilul spre performanță — progresul natural este cel mai sănătos',
    ],
    faq: [
      { q: 'Gimnastica e doar pentru fete?', a: 'Nu — gimnastica masculină (la aparate: inele, paralele, cal cu mâneri) este un sport olimpic distinct și solicită o forță extraordinară.' },
      { q: 'Este gimnastica periculoasă?', a: 'Cu echipament adecvat și antrenori calificați, riscul de accidentare este minim la nivel recreațional. Gimnastica de performanță implică riscuri mai mari, ca orice sport de înaltă performanță.' },
      { q: 'La ce vârstă e prea târziu să înceapă gimnastica?', a: 'Pentru performanță, ideal înainte de 6 ani. Pentru recreațional și fitness, orice vârstă e potrivită — gimnastica aerobică se poate practica fără limită de vârstă.' },
      { q: 'Gimnastica ajută la alte sporturi?', a: 'Da — înotătorii, fotbaliștii și tenismenii care au făcut gimnastică în copilărie au coordonare și conștiință corporală net superioare.' },
    ],
  },
  robotica: {
    emoji: '🤖', label: 'Robotică', title: 'Robotică și Programare pentru Copii',
    description: 'Cursuri de robotică, programare și STEM pentru copii în București. Pregătire pentru viitor.',
    despre: 'Robotica și programarea pentru copii sunt activitățile cu cea mai rapidă creștere în popularitate în ultimii ani. Nu este vorba doar despre tehnologie — robotica dezvoltă gândirea logică, creativitatea, rezolvarea problemelor și lucrul în echipă. Un copil care face robotică învață să gândească structurat și să persevereze în fața eșecului — abilități valabile în orice domeniu.',
    beneficii: [
      'Gândire logică și algoritmică',
      'Creativitate în rezolvarea problemelor tehnice',
      'Perseverență — robotica implică mult trial and error',
      'Lucru în echipă la proiecte comune',
      'Pregătire pentru piața muncii viitorului',
      'Participare la competiții naționale și internaționale',
    ],
    oferta: 'Cursurile sunt structurate pe vârstă și nivel, folosind platforme progresive. De la blocuri LEGO colorate pentru cei mai mici, până la programare text în Python sau C++ pentru avansați — există o cale clară de dezvoltare pentru fiecare copil.',
    ghid: [
      { emoji: '🟡', nume: 'Inițiere (5–7 ani)', descriere: 'LEGO WeDo, Cubetto, BeeBot. Accent pe logică spațială și secvențiere prin joc. Fără ecran sau cod text.' },
      { emoji: '🟠', nume: 'Intermediar (7–10 ani)', descriere: 'LEGO Mindstorms, Scratch. Programare vizuală prin blocuri. Primele proiecte funcționale: roboți care evită obstacole, jocuri simple.' },
      { emoji: '🔴', nume: 'Avansat (10–14 ani)', descriere: 'Arduino, Raspberry Pi, Python. Programare text reală. Proiecte complexe: stații meteo, brațe robotice, jocuri video.' },
      { emoji: '🔵', nume: 'Performanță (12+ ani)', descriere: 'Pregătire pentru competiții First Lego League, RoboChallenge, olimpiade de informatică.' },
    ],
    recomandari: [
      'Grupele mici (4–8 copii) sunt esențiale — fiecare copil trebuie să aibă timp efectiv la tastatură și kit',
      'Verificați ce platformă folosesc — LEGO e ideal sub 10 ani, programare text pentru cei mai mari',
      'Întrebați dacă clubul participă la competiții naționale — motivant pentru copiii ambițioși',
      'Cursurile costă mai mult decât sporturile clasice — bugetați 300–600 RON/lună',
      'Nu e nevoie de cunoștințe anterioare — majoritatea cluburilor primesc copii fără experiență de la 5–6 ani',
    ],
    faq: [
      { q: 'Robotica e doar pentru băieți?', a: 'Absolut nu — fetele excelează în robotică și programare. Multe competiții au echipe mixte sau exclusiv feminine cu rezultate remarcabile.' },
      { q: 'Are nevoie copilul de un calculator acasă?', a: 'Nu neapărat pentru cursuri, dar e util pentru exersare. Scratch și multe alte platforme funcționează gratuit în browser.' },
      { q: 'Robotica ajută la matematică și fizică?', a: 'Da — aplicațiile practice din robotică fac matematica și fizica mai tangibile și mai motivante. Mulți profesori observă îmbunătățiri la aceste materii.' },
      { q: 'La ce vârstă e ideal să înceapă?', a: 'De la 5–6 ani cu platforme de joc (BeeBot, Cubetto). Programarea text devine accesibilă în jurul vârstei de 9–10 ani.' },
    ],
  },
  muzica: {
    emoji: '🎵', label: 'Muzică', title: 'Cursuri de Muzică pentru Copii',
    description: 'Pian, chitară, vioară, canto și alte instrumente pentru copii în București.',
    despre: 'Studiul muzicii este una dintre cele mai valoroase investiții în dezvoltarea unui copil. Cercetările arată că copiii care studiază un instrument au rezultate mai bune la matematică, limbi străine și citit — muzica antrenează exact aceleași rețele neuronale. Dincolo de beneficiile cognitive, muzica oferă un limbaj universal de exprimare emoțională pe tot parcursul vieții.',
    beneficii: [
      'Îmbunătățește memoria și concentrarea',
      'Rezultate mai bune la matematică și limbi străine',
      'Disciplină — progresul prin practică zilnică',
      'Exprimare emoțională sănătoasă',
      'Răbdare și perseverență în fața dificultăților',
      'O abilitate pentru toată viața',
    ],
    oferta: 'Școlile de muzică și profesorii particulari din București oferă lecții individuale și de grup pentru o gamă largă de instrumente. Există atât școli de muzică clasică, cât și centre moderne cu accent pe muzică pop, rock și producție muzicală.',
    ghid: [
      { emoji: '🎹', nume: 'Pian', descriere: 'Instrumentul recomandat ca punct de start pentru orice copil. Vizualizarea notelor pe claviatură face teoria muzicală mult mai ușor de înțeles. Pune bazele pentru orice alt instrument. Vârstă start: 5–6 ani.' },
      { emoji: '🎸', nume: 'Chitară', descriere: 'Cel mai popular instrument în rândul băieților de 8+ ani. Există chitară clasică (nylon) și chitară electrică/acustică (pop, rock). Vârstă start: 7–8 ani.' },
      { emoji: '🎻', nume: 'Vioară', descriere: 'Instrument complex, cu curbă de învățare mai lungă, dar extrem de valoros. Există viori de dimensiuni mici special pentru copii (1/4, 1/2). Potrivit pentru copiii cu răbdare și ureche muzicală. Vârstă start: 4–5 ani.' },
      { emoji: '🎺', nume: 'Instrumente de suflat', descriere: 'Flaut, clarinet, trompetă — dezvoltă capacitatea pulmonară și disciplina respirației. Potrivite de la 7–8 ani când copilul are suficientă forță de suflat.' },
      { emoji: '🥁', nume: 'Tobe', descriere: 'Favorite ale copiilor energici. Dezvoltă coordonarea independentă a mâinilor și picioarelor. Necesită spațiu sau cameră izolată fonic acasă. Vârstă start: 6–7 ani.' },
      { emoji: '🎤', nume: 'Canto', descriere: 'Lecții de voce pentru copiii cu aptitudini vocale. Include tehnica respirației, dicție și repertoriu. Potrivit de la 7–8 ani când vocea e suficient de dezvoltată.' },
    ],
    recomandari: [
      'Pianul este cel mai recomandat ca prim instrument — teoria muzicală devine vizuală și ușor de înțeles',
      'Lecțiile individuale de 30–45 minute o dată pe săptămână sunt standardul — exersatul zilnic acasă e esențial',
      'Asigurați-vă că aveți un instrument acasă pentru exersat — fără practică zilnică, progresul e minim',
      'Prețurile: 80–200 RON/ședință individuală, 150–350 RON/lună pentru cursuri de grup',
      'Cumpărați instrumentul după primele 2–3 luni — să vedeți întâi că pasiunea e reală',
    ],
    faq: [
      { q: 'La ce vârstă e ideal să înceapă lecțiile de muzică?', a: 'De la 4–5 ani pentru pian și vioară. Pentru chitară și instrumente de suflat, 7–8 ani e mai potrivit din motive fizice.' },
      { q: 'Trebuie să cumpăr un instrument scump?', a: 'Nu la început. O pianină digitală de 800–1.500 RON e suficientă pentru primii 2–3 ani. Chitare de calitate bună pentru începători există de la 300–500 RON.' },
      { q: 'Cât de des trebuie să exerseze acasă?', a: '15–20 minute zilnic pentru copiii mici, 30–45 minute pentru cei mai mari. Regularitatea bate durata — mai bine puțin în fiecare zi decât 2 ore o dată pe săptămână.' },
      { q: 'E nevoie de talent înnăscut pentru muzică?', a: 'Nu — talentul ajută, dar disciplina și practica constantă contează mai mult. Mulți muzicieni de succes nu au fost prodigii în copilărie.' },
    ],
  },
  arte_creative: {
    emoji: '🎨', label: 'Arte Creative', title: 'Arte Creative pentru Copii',
    description: 'Desen, pictură, sculptură și ateliere creative pentru copii în București.',
    despre: 'Atelierele de arte creative oferă copiilor ceva rar în lumea modernă: un spațiu în care nu există răspuns greșit. Desenul, pictura, sculptura și ceramica dezvoltă imaginația, răbdarea și capacitatea de exprimare vizuală. Este activitatea ideală pentru copiii introvertiți sau pentru cei care au nevoie de un echilibru față de programul academic intens.',
    beneficii: [
      'Dezvoltă creativitatea și imaginația',
      'Îmbunătățește motricitatea fină și coordonarea mână-ochi',
      'Răbdare și atenție la detalii',
      'Exprimare emoțională sănătoasă prin artă',
      'Încredere în sine prin crearea unor lucrări proprii',
      'Relaxare și echilibru față de activitățile competitive',
    ],
    oferta: 'Centrele de artă organizează cursuri săptămânale, ateliere tematice de weekend și tabere de creație în vacanțe. Profesorii sunt formați în artele plastice și adaptează tehnicile la vârsta și nivelul fiecărui copil.',
    ghid: [
      { emoji: '🖊️', nume: 'Desen și pictură', descriere: 'Cel mai accesibil punct de start. De la creioane colorate și acuarele pentru cei mici, până la ulei și acril pentru avansați. Vârstă start: 3 ani.' },
      { emoji: '🏺', nume: 'Ceramică și sculptură în lut', descriere: 'Modelarea în lut dezvoltă motricitatea fină și creativitatea tridimensională. Lucrările arse în cuptor devin obiecte reale — o satisfacție enormă pentru copii. Vârstă start: 5 ani.' },
      { emoji: '✂️', nume: 'Colaj și arte mixte', descriere: 'Combină materiale diverse (hârtie, țesături, materiale naturale) într-o lucrare unitară. Ideal pentru copiii care nu se consideră "buni la desen". Vârstă start: 4 ani.' },
      { emoji: '💻', nume: 'Ilustrație digitală', descriere: 'Desen pe tabletă grafică, din ce în ce mai popular la copiii de 9–10+ ani. Deschide ușa spre design grafic și animație. Vârstă start: 8–9 ani.' },
    ],
    recomandari: [
      'Verificați ce materiale sunt incluse în preț — pensule, vopsele și pânze pot fi costisitoare separat',
      'Atelierele de ceramică necesită cuptor — asigurați-vă că centrul are echipamentul complet',
      'Grupele mici (6–10 copii) permit profesorului să ofere feedback individual',
      'Artele creative sunt ideale ca activitate de echilibru pentru copiii cu program academic intens',
      'Tabere de creație din vacanțe sunt excelente pentru explorarea mai multor tehnici într-o săptămână',
    ],
    faq: [
      { q: 'Trebuie să aibă copilul talent la desen pentru a face arte creative?', a: 'Nu — artele creative nu sunt despre a desena "frumos" după standarde fixe, ci despre exprimare personală. Orice copil poate beneficia.' },
      { q: 'Ce tehnică e potrivită pentru un copil de 5 ani?', a: 'Pictură cu degetele, acuarele, modelare în lut și colaj — tehnici care nu necesită precizie, ci libertate de exprimare.' },
      { q: 'Ce facem cu lucrările copilului acasă?', a: 'Fotografiați-le și faceți un portofoliu digital. Cele mai bune pot fi înrămate sau donate bunicilor — un cadou cu valoare sentimentală reală.' },
    ],
  },
  limbi_straine: {
    emoji: '🌍', label: 'Limbi Străine', title: 'Cursuri Limbi Străine pentru Copii',
    description: 'Engleză, franceză, germană și alte limbi străine pentru copii în București.',
    despre: 'Copilăria este perioada de aur pentru achiziția limbilor străine — creierul absoarbe structuri lingvistice cu o ușurință pe care adulții nu o mai pot atinge. Un copil bilingv sau trilingv are avantaje cognitive demonstrate: memorie mai bună, flexibilitate mentală superioară, capacitate de concentrare crescută și performanțe academice mai bune în general.',
    beneficii: [
      'Abilitate de comunicare globală esențială în carieră',
      'Avantaje cognitive: memorie, concentrare, flexibilitate mentală',
      'Deschidere culturală și empatie',
      'Acces la resurse educaționale în alte limbi',
      'Avantaj solid la admiterea în licee bilingve și universități',
      'Certificări internaționale recunoscute (Cambridge, DELF, Goethe)',
    ],
    oferta: 'Centrele de limbi străine din București oferă cursuri de engleză, franceză, germană, spaniolă, italiană și chineză, cu metode interactive adaptate vârstei: jocuri, cântece, povești și activități practice. Există atât grupuri de copii cât și lecții individuale.',
    ghid: [
      { emoji: '🇬🇧', nume: 'Engleză', descriere: 'Prioritatea absolută în contextul actual. Limba internetului, a științei și a afacerilor. Certificările Cambridge (YLE, KET, PET, FCE) sunt recunoscute global. Vârstă start: 3–4 ani.' },
      { emoji: '🇫🇷', nume: 'Franceză', descriere: 'A doua limbă de diplomație și cultură. Foarte utilă în Europa și Africa francofonă. Certificarea DELF are valoare la admiterea în licee și universități. Vârstă start: 5–6 ani.' },
      { emoji: '🇩🇪', nume: 'Germană', descriere: 'Limba economiei europene. Germania are cel mai mic șomaj din UE — o investiție pragmatică pe termen lung. Certificarea Goethe-Institut e recunoscută universitar. Vârstă start: 6–7 ani.' },
      { emoji: '🇪🇸', nume: 'Spaniolă', descriere: 'A doua limbă ca număr de vorbitori nativi în lume. Relativă ușurință de învățare pentru vorbitorii de română. Deschide accesul spre America Latină și Spania. Vârstă start: 6 ani.' },
      { emoji: '🇨🇳', nume: 'Chineză (Mandarin)', descriere: 'În creștere rapidă ca popularitate. Dificilă, dar tot mai valoroasă economic. Unele centre din București oferă cursuri cu profesori nativi. Vârstă start: 6–7 ani.' },
    ],
    recomandari: [
      'Verificați nivelul real al copilului înainte de înscriere — o grupă greșită demotivează rapid',
      'Metodele bazate pe joc și conversație sunt mai eficiente decât gramatica formală pentru copiii sub 10 ani',
      'Verificați dacă profesorii sunt nativi sau au certificări internaționale de predare (CELTA, DELTA)',
      'Cursurile de 2 ori pe săptămână sunt minimul pentru progres real',
      'Expunerea acasă contează — desene animate, cărți și muzică în limba țintă accelerează progresul',
    ],
    faq: [
      { q: 'La ce vârstă e ideal să înceapă engleza?', a: 'Cu cât mai devreme, cu atât mai bine — de la 3–4 ani prin joc și cântece. Până la 7 ani, copiii ating pronunție nativă mult mai ușor decât adulții.' },
      { q: 'Ce certificare Cambridge e potrivită pentru copilul meu?', a: 'YLE (Starters, Movers, Flyers) pentru 7–12 ani. KET/PET pentru 12–15 ani. FCE pentru 15+ ani sau copii avansați mai mici.' },
      { q: 'Are sens să înceapă a doua limbă dacă engleza nu e perfectă?', a: 'Da — creierul copilului poate gestiona mai multe limbi simultan fără confuzie. Franceza sau germana pot fi introduse de la 6–7 ani chiar dacă engleza e în progres.' },
      { q: 'Cursuri de grup sau lecții individuale?', a: 'Grupele mici (4–6 copii) oferă cel mai bun echilibru: interacțiune socială + atenție individuală. Lecțiile individuale sunt mai rapide ca progres dar mai scumpe și mai puțin motivante social.' },
    ],
  },
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cat.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const listJsonLd = {
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

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
          <p className="text-[var(--color-text-light)] mb-6">
            {clubs.length > 0
              ? `${clubs.length} cluburi și centre găsite în București`
              : `Nu am găsit listări pentru această categorie momentan.`}
          </p>

          {/* Continut editorial */}
          <div className="mb-8 space-y-6 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Despre activitate</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{cat.despre}</p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Beneficii</h2>
              <ul className="space-y-1.5">
                {cat.beneficii.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-1">Ce găsești în București</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{cat.oferta}</p>
            </div>

            {cat.ghid && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-3">Ghid stiluri / niveluri</h2>
                <div className="space-y-3">
                  {cat.ghid.map((g, i) => (
                    <div key={i} className="flex gap-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-3">
                      <span className="text-xl flex-shrink-0">{g.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-main)]">{g.nume}</p>
                        <p className="text-xs text-[var(--color-text-light)] mt-0.5 leading-relaxed">{g.descriere}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-main)] uppercase tracking-wide mb-2">Recomandări practice</h2>
              <ul className="space-y-1.5">
                {cat.recomandari.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                    <span className="text-[var(--color-primary)] mt-0.5 flex-shrink-0">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

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

          {/* FAQ */}
          <div className="mt-10 max-w-2xl">
            <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">Întrebări frecvente</h2>
            <div className="space-y-4">
              {cat.faq.map(({ q, a }, i) => (
                <div key={i} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <p className="text-sm font-semibold text-[var(--color-text-main)] mb-1">{q}</p>
                  <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-blue-800 mb-2">Ai un club de {cat.label} în București?</h3>
            <p className="text-sm text-blue-700 mb-4">Listează-te gratuit sau premium și ajunge în fața părinților care caută exact ce oferi tu.</p>
            <a href="/promovare" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold">
              Adaugă / Revendică listarea →
            </a>
          </div>

          {/* Link-uri interne */}
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

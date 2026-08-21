import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Confidențialitate | ActivKids',
  description: 'Politica de confidențialitate a platformei ActivKids.ro.',
};

export default function ConfidentialitatePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">Politica de confidențialitate</h1>
        <p className="text-sm text-[var(--color-text-light)] mb-8">Ultima actualizare: iulie 2026</p>

        <div className="space-y-6 text-sm sm:text-base text-[var(--color-text-main)] leading-relaxed">
          <section>
            <h2 className="font-bold text-lg mb-2">1. Ce date colectăm</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Date despre afacerile listate</strong>: nume, adresă, telefon, email, website,
                rețele sociale, prețuri și program. Provin din surse publice (site-ul afacerii, pagini
                Facebook, Google Maps) sau sunt introduse direct de reprezentantul afacerii la
                înregistrare/revendicare.
              </li>
              <li>
                <strong>Conturi de utilizator (părinți și proprietari de listări)</strong>: nume, email,
                telefon, parolă criptată.
              </li>
              <li>
                <strong>Cereri de contact (leads)</strong>: datele pe care un părinte le trimite voluntar
                când contactează o afacere listată prin site.
              </li>
              <li>
                <strong>Date de utilizare a site-ului</strong>: pagini vizitate, căutări efectuate,
                click-uri pe rezultate, colectate printr-un sistem propriu de analiză și prin Google
                Analytics, pentru a înțelege ce caută părinții și a îmbunătăți site-ul.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">2. Temeiul legal al prelucrării</h2>
            <p>
              Datele publice de contact ale afacerilor (adrese generice de tip office@, contact@, sau
              date de firmă) sunt prelucrate în baza interesului legitim de a construi și menține un
              director util pentru părinți, similar unui catalog public de afaceri. Datele conturilor de
              utilizator sunt prelucrate în baza relației contractuale (crearea și administrarea
              contului). Comunicările de tip parteneriat (outreach) către afaceri se bazează tot pe
              interes legitim și includ întotdeauna o opțiune de dezabonare. Vizibilitatea datelor de
              contact ale unei afaceri către alți utilizatori-afaceri prin modulul Colaboratori (vezi
              secțiunea 3) se bazează pe acordul explicit dat de reprezentantul afacerii la revendicarea
              sau adăugarea listării, prin bifarea căsuței de acord cu Termenii și Condițiile.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">3. Cui îi transmitem datele</h2>
            <p>
              Nu vindem datele colectate către terți. Folosim furnizori tehnici (găzduire, trimitere de
              emailuri prin Resend, analiză de trafic prin Google Analytics) doar în măsura necesară
              funcționării platformei. Datele de contact ale afacerilor și profesioniștilor listați
              (telefon, email, adresă, website) sunt vizibile și pot fi folosite de alți
              utilizatori-afaceri ai platformei (alte after school-uri, cluburi, grădinițe) prin modulul
              de Colaboratori din contul de utilizator, pentru a iniția colaborări sau mesaje de outreach
              legate de parteneriate în domeniul activităților pentru copii. Această utilizare este
              acoperită de acordul dat la revendicarea sau adăugarea listării (bifarea căsuței de acord
              cu Termenii și Condițiile).
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">4. Drepturile tale</h2>
            <p>
              Poți solicita oricând acces, corectarea sau ștergerea datelor tale, sau ale afacerii pe
              care o reprezinți, scriind la{' '}
              <a href="mailto:activkidsromania@gmail.com" className="text-[var(--color-primary)] hover:underline">activkidsromania@gmail.com</a>{' '}
              sau sunând la 0747 646 543. Dacă ai primit un email de la noi și nu mai vrei să fii
              contactat, poți folosi linkul de dezabonare din email sau ne poți scrie direct.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">5. Securitate</h2>
            <p>
              Parolele conturilor sunt stocate criptat. Accesul la baza de date este restricționat la
              administratorul platformei.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">6. Contact</h2>
            <p>
              Pentru orice întrebare legată de datele tale: <a href="mailto:activkidsromania@gmail.com" className="text-[var(--color-primary)] hover:underline">activkidsromania@gmail.com</a>, 0747 646 543.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

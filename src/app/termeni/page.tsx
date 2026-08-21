import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Termeni și condiții | ActivKids',
  description: 'Termenii și condițiile de utilizare a platformei ActivKids.ro.',
};

export default function TermeniPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] mb-2">Termeni și condiții</h1>
        <p className="text-sm text-[var(--color-text-light)] mb-8">Ultima actualizare: iulie 2026</p>

        <div className="space-y-6 text-sm sm:text-base text-[var(--color-text-main)] leading-relaxed">
          <section>
            <h2 className="font-bold text-lg mb-2">1. Despre ActivKids</h2>
            <p>
              ActivKids.ro este un director online prin care părinții din București și Ilfov găsesc
              after school-uri, cluburi de activități, grădinițe, meditații și alți colaboratori pentru
              copii. Platforma este operată de Bogdan Bratu, contact: activkidsromania@gmail.com,
              telefon 0747 646 543.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">2. Sursa informațiilor din listări</h2>
            <p>
              Majoritatea listărilor de pe site sunt adăugate de echipa ActivKids pe baza informațiilor
              disponibile public (site-ul propriu al afacerii, pagini Facebook, Google Maps, alte surse
              publice), pentru a construi un director cât mai complet și util pentru părinți. Aceste
              informații pot conține, ocazional, inexactități sau pot fi neactualizate. Orice
              reprezentant al unei afaceri listate poate solicita corectarea, actualizarea sau
              eliminarea listării în orice moment, gratuit, conform secțiunii 4.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">3. Revendicarea unei listări</h2>
            <p>
              Reprezentanții unei afaceri listate pe ActivKids pot revendica gratuit listarea proprie
              printr-un cont, pentru a-i actualiza informațiile, a adăuga poze și a gestiona datele de
              contact afișate. Platforma oferă și un plan opțional Premium, cu vizibilitate
              suplimentară, ale cărui detalii sunt descrise pe pagina{' '}
              <a href="/promovare" className="text-[var(--color-primary)] hover:underline">/promovare</a>.
              Revendicarea și planul de bază sunt gratuite; nicio afacere nu este obligată să
              plătească pentru a fi listată sau pentru a-și corecta datele.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">4. Corectare și eliminare listări</h2>
            <p>
              Dacă reprezinți o afacere listată pe ActivKids și dorești corectarea informațiilor sau
              eliminarea completă a listării, ne poți contacta oricând la{' '}
              <a href="mailto:activkidsromania@gmail.com" className="text-[var(--color-primary)] hover:underline">activkidsromania@gmail.com</a>{' '}
              sau la 0747 646 543. Cererile de eliminare sunt procesate în cel mult câteva zile
              lucrătoare.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">5. Comunicări către afaceri (outreach)</h2>
            <p>
              ActivKids poate contacta ocazional, prin email sau alte canale, reprezentanți ai unor
              afaceri (after school-uri, cluburi, furnizori de catering, etc.) cu propuneri de
              parteneriat sau colaborare, folosind date de contact publice ale afacerii (nu date
              personale ale unor persoane fizice private). Fiecare astfel de comunicare include un mod
              simplu de dezabonare de la comunicări viitoare.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">6. Colaborarea între afaceri de pe platformă (modulul Colaboratori)</h2>
            <p>
              ActivKids oferă proprietarilor de after school-uri, cluburi și grădinițe un modul dedicat
              (disponibil în contul de utilizator) prin care pot găsi și contacta alți colaboratori de
              pe platformă (profesori, terapeuți, meditatori și alți profesioniști listați la secțiunile
              Colaboratori și Meditații), în scopul stabilirii unor parteneriate de afaceri. Prin
              revendicarea sau adăugarea unei listări și bifarea căsuței de acord cu acești termeni la
              trimiterea formularului, reprezentantul afacerii sau al profesionistului este de acord ca
              datele de contact afișate pe listare (telefon, email, adresă, website) să poată fi văzute
              și folosite de alți utilizatori-afaceri ai platformei prin acest modul, inclusiv pentru a
              le transmite cereri de colaborare sau mesaje de outreach legate de o posibilă
              parteneriere. Aceste comunicări sunt întotdeauna legate strict de scopul de colaborare în
              domeniul activităților pentru copii și includ, unde e aplicabil, o modalitate de a
              răspunde sau de a refuza colaborarea.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">7. Limitarea răspunderii</h2>
            <p>
              Informațiile despre prețuri, program și disponibilitate se pot schimba fără notificare
              din partea afacerilor listate. Recomandăm confirmarea directă cu furnizorul înainte de a
              lua o decizie. ActivKids nu este parte în relația contractuală dintre părinți și
              afacerile listate și nu răspunde pentru serviciile prestate de acestea.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">8. Modificări</h2>
            <p>
              Acești termeni pot fi actualizați periodic. Versiunea în vigoare este întotdeauna cea
              publicată pe această pagină.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">9. Contact</h2>
            <p>
              Pentru orice întrebare legată de acești termeni: <a href="mailto:activkidsromania@gmail.com" className="text-[var(--color-primary)] hover:underline">activkidsromania@gmail.com</a>, 0747 646 543.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

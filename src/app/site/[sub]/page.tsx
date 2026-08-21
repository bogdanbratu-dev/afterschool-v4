import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import PhotoCarousel from '@/components/PhotoCarousel';
import PageviewTracker from '@/components/PageviewTracker';
import BookingForm from '@/components/BookingForm';
import MicrositeContactInfo from '@/components/MicrositeContactInfo';
import { getMicrositeData, micrositeTheme, defaultBookingLabel, stripHtml, type MicrositeListingType } from '@/lib/microsite';

type Props = { params: Promise<{ sub: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sub } = await params;
  const data = getMicrositeData(sub);
  if (!data) return { title: 'Site negăsit' };
  const { ms, listing } = data;
  const name = listing.name as string;
  const title = `${name}${ms.tagline ? ' — ' + ms.tagline : ''}`;
  const desc = stripHtml((ms.about_long as string) || (listing.editorial_summary as string) || (listing.description as string) || '').slice(0, 160);
  const photos = listing.photo_urls ? (JSON.parse(listing.photo_urls as string) as string[]) : [];
  const canonical = `https://${sub}.activkids.ro`;
  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: { title, description: desc, url: canonical, siteName: name, locale: 'ro_RO', type: 'website', images: photos[0] ? [photos[0]] : [] },
  };
}

export default async function MicrositePage({ params }: Props) {
  const { sub } = await params;
  const data = getMicrositeData(sub);
  if (!data) notFound();
  const { ms, listing } = data;
  const theme = micrositeTheme(ms);
  const photos: string[] = listing.photo_urls ? (JSON.parse(listing.photo_urls as string) as string[]) : [];
  const about = (ms.about_long as string) || (listing.editorial_summary as string) || (listing.description as string) || '';
  const lt = ms.listing_type as MicrositeListingType;
  const bookingLabel = (ms.booking_label as string) || defaultBookingLabel(lt);
  const bookingKind = lt === 'club' ? 'trial' : 'visit';
  const name = listing.name as string;
  const listingId = listing.id as number;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    description: stripHtml(about).slice(0, 300),
    url: `https://${sub}.activkids.ro`,
    telephone: (listing.phone as string) || undefined,
    address: listing.address ? { '@type': 'PostalAddress', streetAddress: listing.address as string, addressLocality: 'București', addressCountry: 'RO' } : undefined,
    image: photos[0] || undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageviewTracker page={`/site/${sub}`} />

      {/* Hero */}
      <header className={`bg-gradient-to-br ${theme.hero} text-white`}>
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{name}</h1>
          {ms.tagline ? <p className="mt-3 text-base sm:text-lg text-white/90">{ms.tagline as string}</p> : null}
          {listing.address ? (
            <p className="mt-3 text-sm text-white/80 inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {listing.address as string}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className="px-5 py-3 bg-white text-gray-900 font-semibold rounded-xl shadow-sm text-sm hover:bg-gray-100 transition-colors">Contactează-ne</Link>
            {ms.booking_enabled ? <a href="#programare" className="px-5 py-3 bg-white/15 hover:bg-white/25 backdrop-blur text-white font-semibold rounded-xl text-sm transition-colors border border-white/30">{bookingLabel}</a> : null}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Galerie */}
        {photos.length > 0 ? (
          <section>
            <PhotoCarousel photos={photos} name={name} />
          </section>
        ) : null}

        {/* Despre - sectiunea principala de continut, marita ca sa aiba greutate reala pe pagina */}
        {about ? (
          <section className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-7 sm:p-9">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-4">Despre noi</h2>
            <div className="text-base sm:text-lg text-[var(--color-text-light)] leading-relaxed sm:leading-loose [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5" dangerouslySetInnerHTML={{ __html: about }} />
          </section>
        ) : null}

        {/* Programare - singurul formular ramas pe pagina principala */}
        {ms.booking_enabled ? (
          <section id="programare" className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6 scroll-mt-4">
            <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">{bookingLabel}</h2>
            <p className="text-sm text-[var(--color-text-light)] mb-4">Alege o dată preferată și te contactăm pentru confirmare.</p>
            <BookingForm micrositeId={ms.id as number} listingType={lt} listingId={listingId} listingName={name} kind={bookingKind} btnClass={theme.btn} ringClass={theme.ring} />
          </section>
        ) : null}

        {/* Date de contact + social */}
        <section className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">Date de contact</h2>
          <MicrositeContactInfo ms={ms} listing={listing} lt={lt} theme={theme} />
        </section>
      </main>
    </>
  );
}

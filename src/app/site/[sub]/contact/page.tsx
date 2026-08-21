import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageviewTracker from '@/components/PageviewTracker';
import MicrositeContactForm from '@/components/MicrositeContactForm';
import MicrositeContactInfo from '@/components/MicrositeContactInfo';
import { getMicrositeData, micrositeTheme, type MicrositeListingType } from '@/lib/microsite';

type Props = { params: Promise<{ sub: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sub } = await params;
  const data = getMicrositeData(sub);
  if (!data) return { title: 'Site negăsit' };
  const name = data.listing.name as string;
  return {
    title: `Contact · ${name}`,
    alternates: { canonical: `https://${sub}.activkids.ro/contact` },
  };
}

export default async function MicrositeContactPage({ params }: Props) {
  const { sub } = await params;
  const data = getMicrositeData(sub);
  if (!data) notFound();
  const { ms, listing } = data;
  const theme = micrositeTheme(ms);
  const lt = ms.listing_type as MicrositeListingType;
  const name = listing.name as string;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <PageviewTracker page={`/site/${sub}/contact`} />

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-main)]">Contactează {name}</h1>
        {listing.address ? <p className="mt-2 text-sm text-[var(--color-text-light)]">{listing.address as string}</p> : null}
      </div>

      <section className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">Trimite-ne un mesaj</h2>
        <p className="text-sm text-[var(--color-text-light)] mb-4">Lasă datele tale și revenim cu un răspuns.</p>
        <MicrositeContactForm listingType={lt} listingId={listing.id as number} listingName={name} btnClass={theme.btn} ringClass={theme.ring} />
      </section>

      <section className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">Date de contact</h2>
        <MicrositeContactInfo ms={ms} listing={listing} lt={lt} theme={theme} />
      </section>
    </main>
  );
}

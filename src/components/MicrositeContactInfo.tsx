import TrackedLink from '@/components/TrackedLink';
import { micrositeSocials, type MicrositeListingType } from '@/lib/microsite';

interface Props {
  ms: Record<string, unknown>;
  listing: Record<string, unknown>;
  lt: MicrositeListingType;
  theme: { btn: string; text: string };
}

// Bloc "Date de contact" (linkuri directe, nu formular) - folosit atat pe pagina principala
// a micro-site-ului cat si pe /contact, ca sa nu fie duplicata marcarea (tel/email/website/
// whatsapp/social) in doua fisiere.
export default function MicrositeContactInfo({ ms, listing, lt, theme }: Props) {
  const listingId = listing.id as number;
  const name = listing.name as string;
  const socials = micrositeSocials(ms, listing);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {listing.phone ? (
          <TrackedLink href={`tel:${listing.phone}`} type={lt} itemId={listingId} itemName={name} linkType="phone" className={`inline-flex items-center gap-2 px-4 py-2.5 ${theme.btn} text-white text-sm font-semibold rounded-xl transition-colors`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            {listing.phone as string}
          </TrackedLink>
        ) : null}
        {listing.email ? (
          <TrackedLink href={`mailto:${listing.email}`} type={lt} itemId={listingId} itemName={name} linkType="email" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Email
          </TrackedLink>
        ) : null}
        {listing.website ? (
          <TrackedLink href={listing.website as string} type={lt} itemId={listingId} itemName={name} linkType="website" target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z" /></svg>
            Website
          </TrackedLink>
        ) : null}
        {ms.whatsapp ? (
          <TrackedLink href={`https://wa.me/${(ms.whatsapp as string).replace(/[^0-9]/g, '')}`} type={lt} itemId={listingId} itemName={name} linkType="whatsapp" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
            WhatsApp
          </TrackedLink>
        ) : null}
      </div>

      {socials.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-3">
          {socials.map((s) => (
            <TrackedLink key={s.key} href={s.href} type={lt} itemId={listingId} itemName={name} linkType={s.key} target="_blank" rel="noopener noreferrer" className={`text-sm font-medium ${theme.text} hover:underline`}>
              {s.label}
            </TrackedLink>
          ))}
        </div>
      ) : null}
    </>
  );
}

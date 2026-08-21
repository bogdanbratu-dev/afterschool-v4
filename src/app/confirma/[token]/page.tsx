import Navbar from '@/components/Navbar';
import { getDb } from '@/lib/db';
import ConfirmClient from './ConfirmClient';

export const metadata = {
  title: 'Confirmă listarea | ActivKids',
  description: 'Confirmă că reprezinți această listare pentru a primi acces la platforma ActivKids.',
};

const TABLE_FOR: Record<string, string> = {
  afterschool: 'afterschools',
  club: 'clubs',
  caterer: 'caterers',
  kindergarten: 'kindergartens',
  professional: 'professionals',
  tutor: 'tutors',
};

const TYPE_LABEL: Record<string, string> = {
  afterschool: 'after school',
  club: 'activitate pentru copii',
  caterer: 'catering',
  kindergarten: 'grădiniță / creșă',
  professional: 'profesionist',
  tutor: 'meditator',
};

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🔗</p>
        <h1 className="text-xl font-bold text-[var(--color-text-main)] mb-2">{title}</h1>
        <p className="text-sm text-[var(--color-text-light)]">{message}</p>
      </div>
    </div>
  );
}

export default async function ConfirmaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token || token.length !== 64) {
    return <ErrorBox title="Link invalid" message="Acest link nu este valid." />;
  }

  const db = getDb();
  const contact = db.prepare(
    'SELECT listing_type, listing_id, confirmed_at FROM outreach_contacts WHERE confirm_token = ?'
  ).get(token) as { listing_type: string; listing_id: number; confirmed_at: number | null } | undefined;

  if (!contact) {
    return <ErrorBox title="Link invalid" message="Acest link nu este valid sau a expirat." />;
  }

  const table = TABLE_FOR[contact.listing_type];
  const listing = table
    ? (db.prepare(`SELECT name FROM ${table} WHERE id = ?`).get(contact.listing_id) as { name: string } | undefined)
    : undefined;

  if (!listing) {
    return <ErrorBox title="Listare negăsită" message="Această listare nu mai există pe platformă." />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">Confirmă listarea</h1>
        <p className="text-sm text-[var(--color-text-light)] mb-6">
          Confirmi că reprezinți <strong>{listing.name}</strong> ({TYPE_LABEL[contact.listing_type] || 'listare'})?
          După confirmare primești acces direct la platformă, pe planul gratuit, ca să poți gestiona
          singur/ă informațiile afișate.
        </p>
        <ConfirmClient token={token} alreadyConfirmed={!!contact.confirmed_at} />
      </div>
    </div>
  );
}

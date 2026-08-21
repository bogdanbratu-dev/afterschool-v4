import { getDb } from '@/lib/db';
import PublicListingEditForm from '@/components/PublicListingEditForm';

export const metadata = {
  robots: { index: false, follow: false },
};

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };

interface TokenRow {
  listing_type: string;
  listing_id: number;
  revoked: number;
}

function InvalidLink() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,.1)' }}>
        <p style={{ fontSize: 48, margin: '0 0 12px' }}>🔗</p>
        <h1 style={{ color: '#1f2937', margin: '8px 0' }}>Link invalid</h1>
        <p style={{ color: '#6b7280' }}>Acest link nu mai este valid. Daca listarea a fost stearsa sau linkul a fost revocat, contacteaza-ne pentru un link nou.</p>
      </div>
    </div>
  );
}

export default async function EditareTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const tokenRow = (token && token.length === 64)
    ? (db.prepare('SELECT listing_type, listing_id, revoked FROM listing_edit_tokens WHERE id = ?').get(token) as TokenRow | undefined)
    : undefined;

  if (!tokenRow || tokenRow.revoked) return <InvalidLink />;

  const table = TABLE[tokenRow.listing_type];
  if (!table) return <InvalidLink />;

  const listing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(tokenRow.listing_id) as Record<string, unknown> | undefined;
  if (!listing) return <InvalidLink />;

  return (
    <PublicListingEditForm
      token={token}
      listingType={tokenRow.listing_type}
      listing={listing}
    />
  );
}

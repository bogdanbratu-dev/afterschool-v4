// Decide daca telefonul/emailul unei listari trebuie afisate public.
// Vizibil daca e premium, daca proprietarul a revendicat listarea (owner_user_id setat),
// sau daca nimeni nu a marcat explicit contactul ca ascuns (contacts_hidden).
export function isContactVisible(row: { is_premium: number; contacts_hidden: number; owner_user_id: number | null }): boolean {
  return !!row.is_premium || row.owner_user_id != null || !row.contacts_hidden;
}

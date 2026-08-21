import type { getDb } from './db';
import { PROFESSIONAL_CATEGORY_LABELS, type ProfessionalCategory } from './professionals';

export interface SenderInfo {
  type: string;
  name: string;
  contactName?: string | null;
  phone: string;
  email: string;
  replyTo: string;
  website: string;
  address: string;
  desc: string;
  category?: string | null;
}

const TABLE: Record<string, string> = { afterschool: 'afterschools', club: 'clubs', caterer: 'caterers', professional: 'professionals', kindergarten: 'kindergartens' };

export function getSenderInfo(db: ReturnType<typeof getDb>, ms: Record<string, unknown>): SenderInfo {
  const senderTable = TABLE[ms.listing_type as string];
  const senderCols = ms.listing_type === 'professional'
    ? 'name, phone, email, website, address, category, editorial_summary'
    : 'name, phone, email, website, address, editorial_summary';
  const listing = senderTable
    ? db.prepare(`SELECT ${senderCols} FROM ${senderTable} WHERE id = ?`).get(ms.listing_id as number) as Record<string, string | null> | undefined
    : undefined;

  return {
    type: ms.listing_type as string,
    name: (listing?.name as string) || 'Partener',
    contactName: (ms.outreach_contact_name as string) || null,
    phone: (listing?.phone as string) || '',
    email: (ms.outreach_from_email as string) || (listing?.email as string) || '',
    replyTo: (ms.outreach_reply_to as string) || (ms.outreach_from_email as string) || (listing?.email as string) || '',
    website: (listing?.website as string) || `https://${ms.subdomain}.activkids.ro`,
    address: (listing?.address as string) || '',
    desc: (ms.about_long as string) || (listing?.editorial_summary as string) || '',
    category: (listing?.category as string) || null,
  };
}

// Textul implicit de intro/pitch pe tip de expeditor - targetToken e fie numele real al
// destinatarului (la trimitere), fie placeholder-ul "{nume}" (la afisarea sablonului editabil).
export function defaultIntroPitch(sender: SenderInfo, targetToken: string): { intro: string; pitch: string } {
  if (sender.type === 'professional') {
    const catLabel = sender.category ? (PROFESSIONAL_CATEGORY_LABELS[sender.category as ProfessionalCategory] || 'colaborator') : 'colaborator';
    return {
      intro: `Va contactez in calitate de ${catLabel} (${sender.name}) si as dori sa propun o colaborare cu ${targetToken}.`,
      pitch: `Ofer servicii adaptate nevoilor copiilor din afterschool-ul dvs. As fi bucuros(oasa) sa discutam cum putem colabora - fie prin sedinte recurente, fie prin ateliere periodice.`,
    };
  }
  if (sender.type === 'afterschool') {
    return {
      intro: `Va contactam din partea afterschool-ului ${sender.name} si suntem interesati de o colaborare cu dumneavoastra.`,
      pitch: `Cautam un colaborator de incredere pentru copiii nostri si am dori sa discutam disponibilitatea si conditiile unei colaborari.`,
    };
  }
  if (sender.type === 'caterer') {
    return {
      intro: `Va contactam din partea firmei de catering ${sender.name} si am dori sa va propunem o colaborare pentru masa calda a copiilor de la ${targetToken}.`,
      pitch: `Oferim meniuri adaptate varstei, livrare zilnica si flexibilitate pe program. Am fi bucurosi sa discutam conditiile unei colaborari.`,
    };
  }
  return {
    intro: `Va contactam din partea ${sender.name} si am dori sa discutam o colaborare cu ${targetToken}.`,
    pitch: `Va stam la dispozitie pentru orice detalii legate de serviciile noastre.`,
  };
}

export function defaultSubject(sender: SenderInfo): string {
  return `${sender.name} – propunere de colaborare`;
}

// Mesajul implicit complet (intro + descriere scurta + pitch), folosit atat ca sablon sugerat
// in editor cat si ca fallback la trimitere cand partenerul nu a personalizat nimic.
export function defaultMessage(sender: SenderInfo, desc: string, targetToken: string): string {
  const { intro, pitch } = defaultIntroPitch(sender, targetToken);
  return desc ? `${intro}\n\n${desc}\n\n${pitch}` : `${intro}\n\n${pitch}`;
}

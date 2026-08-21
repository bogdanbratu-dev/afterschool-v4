import Database from 'better-sqlite3';
import path from 'path';
import { stripDiacritics } from './slug';

const DB_PATH = path.join(process.cwd(), 'data', 'afterschool.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.function('unaccent', { deterministic: true }, (s: unknown) => stripDiacritics(String(s ?? '')));
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      sector INTEGER,
      lat REAL NOT NULL,
      lng REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS afterschools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      sector INTEGER,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      phone TEXT,
      email TEXT,
      website TEXT,
      price_min INTEGER,
      price_max INTEGER,
      pickup_time TEXT,
      end_time TEXT,
      age_min INTEGER,
      age_max INTEGER,
      description TEXT,
      activities TEXT,
      image_url TEXT,
      availability TEXT NOT NULL DEFAULT 'unknown',
      is_premium INTEGER NOT NULL DEFAULT 0,
      contacts_hidden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      sector INTEGER,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      phone TEXT,
      email TEXT,
      website TEXT,
      price_min INTEGER,
      price_max INTEGER,
      schedule TEXT,
      age_min INTEGER,
      age_max INTEGER,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'inot',
      availability TEXT NOT NULL DEFAULT 'unknown',
      is_premium INTEGER NOT NULL DEFAULT 0,
      contacts_hidden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS caterers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      sector INTEGER,
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      coverage_area TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      facebook_url TEXT,
      price_min INTEGER,
      price_max INTEGER,
      description TEXT,
      editorial_summary TEXT,
      photo_urls TEXT,
      video_urls TEXT,
      reviews_url TEXT,
      rating REAL,
      reviews_count INTEGER,
      maps_url TEXT,
      banner_url TEXT,
      availability TEXT NOT NULL DEFAULT 'unknown',
      is_premium INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      contacts_hidden INTEGER NOT NULL DEFAULT 0,
      owner_user_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('cron_enabled', 'true');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('business_mode', 'false');
  `);

  // Adauga coloane noi daca nu exista (pentru DB-uri existente)
  try { db.exec(`ALTER TABLE professionals ADD COLUMN kind TEXT NOT NULL DEFAULT 'institutie'`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN is_premium INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN contacts_hidden INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN leads_enabled INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN leads_enabled INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE caterers ADD COLUMN leads_enabled INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN banner_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN banner_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN logo_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN logo_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE kindergartens ADD COLUMN logo_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE professionals ADD COLUMN logo_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE tutors ADD COLUMN logo_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE caterers ADD COLUMN logo_url TEXT`); } catch {}

  // Tabele analytics
  db.exec(`
    CREATE TABLE IF NOT EXISTS pageviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL,
      device TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      referrer TEXT,
      source TEXT,
      country TEXT,
      city TEXT
    );
    CREATE TABLE IF NOT EXISTS searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS result_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `);

  // Migration: adauga coloane noi in pageviews (pentru DB-uri existente)
  try { db.exec(`ALTER TABLE pageviews ADD COLUMN referrer TEXT`); } catch {}
  try { db.exec(`ALTER TABLE pageviews ADD COLUMN source TEXT`); } catch {}
  try { db.exec(`ALTER TABLE pageviews ADD COLUMN country TEXT`); } catch {}
  try { db.exec(`ALTER TABLE pageviews ADD COLUMN city TEXT`); } catch {}
  try { db.exec(`ALTER TABLE result_clicks ADD COLUMN link_type TEXT`); } catch {}

  // Migration: istoric cautari permanent - din ce ecran vine cautarea, coordonate rezolvate,
  // sectorul zonei si daca a fost gasita o potrivire (vezi src/lib/logSearch.ts). Nu exista nicio
  // stergere/curatare programata pe tabela asta, e intentionat permanenta.
  try { db.exec(`ALTER TABLE searches ADD COLUMN source TEXT`); } catch {}
  try { db.exec(`ALTER TABLE searches ADD COLUMN lat REAL`); } catch {}
  try { db.exec(`ALTER TABLE searches ADD COLUMN lng REAL`); } catch {}
  try { db.exec(`ALTER TABLE searches ADD COLUMN sector INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE searches ADD COLUMN resolved INTEGER`); } catch {}

  // Import CSV din Meta Ads Manager, pentru recalibrarea periodica a benchmark-urilor de buget din
  // src/lib/adBenchmarks.ts (vezi getEffectiveBenchmarks). Randurile brute raman aici indiferent de
  // obiectiv; doar cele etichetate manual cu objective='trafic' intra in recalculare, pentru ca o
  // campanie cu alt obiectiv (ex. followers) are alt tip de cost si nu e un proxy valid.
  db.exec(`
    CREATE TABLE IF NOT EXISTS ad_campaign_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL,
      campaign_name TEXT,
      ad_set_name TEXT,
      date_start TEXT,
      date_stop TEXT,
      amount_spent_lei REAL,
      impressions INTEGER,
      reach INTEGER,
      link_clicks INTEGER,
      ctr_pct REAL,
      cpc_lei REAL,
      cpm_lei REAL,
      results INTEGER,
      cost_per_result_lei REAL,
      objective TEXT,
      category TEXT,
      imported_at INTEGER NOT NULL
    );
  `);

  // Tabela rapoarte verificare
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      total_checked INTEGER NOT NULL DEFAULT 0,
      changed_avail INTEGER NOT NULL DEFAULT 0,
      changed_price INTEGER NOT NULL DEFAULT 0,
      changed_schedule INTEGER NOT NULL DEFAULT 0,
      changed_name INTEGER NOT NULL DEFAULT 0,
      errors INTEGER NOT NULL DEFAULT 0,
      discovery_ran INTEGER NOT NULL DEFAULT 0,
      discovery_as INTEGER NOT NULL DEFAULT 0,
      discovery_clubs INTEGER NOT NULL DEFAULT 0,
      details TEXT
    );
  `);

  // Utilizatori (proprietari de listari)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      is_premium INTEGER NOT NULL DEFAULT 0,
      premium_until INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pending_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_type TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      sector INTEGER,
      category TEXT,
      price_min INTEGER,
      price_max INTEGER,
      age_min INTEGER,
      age_max INTEGER,
      availability TEXT NOT NULL DEFAULT 'unknown',
      phone TEXT,
      email TEXT,
      website TEXT,
      description TEXT,
      photo_urls TEXT,
      video_urls TEXT,
      reviews_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      reviewed_at INTEGER,
      admin_note TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS claim_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      listing_name TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      reviewed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Coloane premium_pending pe users
  try { db.exec(`ALTER TABLE users ADD COLUMN premium_pending INTEGER NOT NULL DEFAULT 0`); } catch {}

  // Tabel istoric plati
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL DEFAULT 50,
      currency TEXT NOT NULL DEFAULT 'RON',
      status TEXT NOT NULL DEFAULT 'confirmed',
      period_start INTEGER NOT NULL,
      period_end INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Tabel cereri pachet "Introducere Directa" (outreach catre afterschool-uri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      listing_name TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 150,
      currency TEXT NOT NULL DEFAULT 'RON',
      reference TEXT,
      status TEXT NOT NULL DEFAULT 'pending_verification',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      reviewed_at INTEGER,
      admin_note TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Coloane noi pe afterschools si clubs
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN owner_user_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN video_urls TEXT`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN reviews_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN facebook_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN owner_user_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN video_urls TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN reviews_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN facebook_url TEXT`); } catch {}

  // Tabel leads (cereri de informatii de la parinti)
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      listing_name TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    )
  `);

  // Tabel pending_edits pentru modificari trimise de proprietari
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_edits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      changes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      reviewed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Coloane noi pe claim_requests (contact direct, fara cont)
  try { db.exec(`ALTER TABLE claim_requests ADD COLUMN first_name TEXT`); } catch {}
  try { db.exec(`ALTER TABLE claim_requests ADD COLUMN last_name TEXT`); } catch {}
  try { db.exec(`ALTER TABLE claim_requests ADD COLUMN contact_email TEXT`); } catch {}
  try { db.exec(`ALTER TABLE claim_requests ADD COLUMN contact_phone TEXT`); } catch {}
  try { db.exec(`ALTER TABLE claim_requests ADD COLUMN contact_website TEXT`); } catch {}
  try { db.exec(`ALTER TABLE claim_requests ADD COLUMN admin_note TEXT`); } catch {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_tokens (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Token public de editare listare, fara autentificare (link securizat dat direct
  // proprietarului). Distinct de access_tokens (login-bypass legat de un cont).
  db.exec(`
    CREATE TABLE IF NOT EXISTS listing_edit_tokens (
      id TEXT PRIMARY KEY,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      terms_accepted_at INTEGER,
      revoked INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Colaboratori individuali (meditatori, logopezi, psihologi, animatori, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS professionals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      address TEXT,
      sector INTEGER,
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      coverage_area TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      facebook_url TEXT,
      price_min INTEGER,
      price_max INTEGER,
      description TEXT,
      editorial_summary TEXT,
      photo_urls TEXT,
      video_urls TEXT,
      reviews_url TEXT,
      rating REAL,
      reviews_count INTEGER,
      maps_url TEXT,
      banner_url TEXT,
      place_id TEXT,
      availability TEXT NOT NULL DEFAULT 'unknown',
      online_available INTEGER NOT NULL DEFAULT 0,
      home_service INTEGER NOT NULL DEFAULT 0,
      is_premium INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      contacts_hidden INTEGER NOT NULL DEFAULT 0,
      leads_enabled INTEGER,
      owner_user_id INTEGER
    )
  `);

  // Meditatii - vertical propriu, categorisit pe materii
  db.exec(`
    CREATE TABLE IF NOT EXISTS tutors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'altele',
      kind TEXT NOT NULL DEFAULT 'independent',
      address TEXT,
      sector INTEGER,
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      coverage_area TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      facebook_url TEXT,
      maps_url TEXT,
      price_min INTEGER,
      price_max INTEGER,
      description TEXT,
      editorial_summary TEXT,
      photo_urls TEXT,
      video_urls TEXT,
      rating REAL,
      reviews_count INTEGER,
      banner_url TEXT,
      place_id TEXT,
      online_available INTEGER NOT NULL DEFAULT 0,
      home_service INTEGER NOT NULL DEFAULT 0,
      availability TEXT NOT NULL DEFAULT 'unknown',
      is_premium INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      contacts_hidden INTEGER NOT NULL DEFAULT 0,
      leads_enabled INTEGER,
      owner_user_id INTEGER
    )
  `);

  // Gradinite si crese private (model afterschools, cautare dupa adresa)
  db.exec(`
    CREATE TABLE IF NOT EXISTS kindergartens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'gradinita',
      address TEXT NOT NULL,
      sector INTEGER,
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      phone TEXT,
      email TEXT,
      website TEXT,
      facebook_url TEXT,
      price_min INTEGER,
      price_max INTEGER,
      program TEXT,
      age_min INTEGER,
      age_max INTEGER,
      description TEXT,
      editorial_summary TEXT,
      activities TEXT,
      photo_urls TEXT,
      video_urls TEXT,
      reviews_url TEXT,
      rating REAL,
      reviews_count INTEGER,
      maps_url TEXT,
      banner_url TEXT,
      place_id TEXT,
      availability TEXT NOT NULL DEFAULT 'unknown',
      is_premium INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      contacts_hidden INTEGER NOT NULL DEFAULT 0,
      leads_enabled INTEGER,
      owner_user_id INTEGER
    )
  `);

  // Cereri de colaborare intre afterschooluri si colaboratori (matchmaking bidirectional)
  db.exec(`
    CREATE TABLE IF NOT EXISTS collaboration_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_type TEXT NOT NULL,
      from_id INTEGER NOT NULL,
      to_type TEXT NOT NULL,
      to_id INTEGER NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      responded_at INTEGER
    )
  `);

  // Tabel outreach tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      contacted_at INTEGER,
      UNIQUE(listing_type, listing_id)
    )
  `);
  // Coloana folosita de ruta send-email (Resend) pt. cap-ul zilnic; pe productie a fost adaugata
  // manual, dar pe un DB proaspat lipsea -> getDailySent() dadea "no column named email_sent_at".
  // ALTER dupa CREATE (nu in blocul de sus, care ruleaza inainte sa existe tabela).
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN email_sent_at INTEGER`); } catch {}
  // Cine a trimis (microsite-ul partenerului), pt. a nu confunda o campanie globala (admin)
  // cu trimiterile proprii ale unui client (caterer/club/etc) catre acelasi target.
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN partner_ms_id INTEGER`); } catch {}
  // Id-ul emailului in Resend + status de livrare (interogat la cerere via GET /emails/{id},
  // nu prin webhook) — alimenteaza panoul de raport din dashboard-ul clientului.
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN resend_email_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN delivery_status TEXT`); } catch {}
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN delivery_checked_at INTEGER`); } catch {}
  // Optiune de dezabonare de la outreach (link in fiecare email trimis) - odata setat, ruta
  // de trimitere sare peste acest listing indiferent de campanie (admin sau partener).
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN opted_out INTEGER DEFAULT 0`); } catch {}
  // Token de confirmare pt. campania de outreach la rece: mailul nu duce direct la link-ul
  // securizat (access_tokens), ci la /confirma/<token> unde destinatarul bifeaza T&C inainte
  // sa i se dezvaluie link-ul de acces. confirmed_at marcheaza momentul confirmarii (idempotent).
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN confirm_token TEXT`); } catch {}
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN confirmed_at INTEGER`); } catch {}
  // Marcaj server-side pt. "trimis" pe WhatsApp (panoul WaOutreach) — inainte era tinut doar in
  // localStorage, cheie pe indexul pozitional al batch-ului. Cum query-urile sursa nu aveau ORDER BY,
  // aceeasi pozitie putea ajunge sa insemne alt contact intre doua sesiuni, aratand batch-uri
  // trimise ca "netrimise". Acum se leaga de (listing_type, listing_id), ca email_sent_at.
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN whatsapp_sent_at INTEGER`); } catch {}
  // Campania separata "pachet site de prezentare" (50 lei, ad-hoc, nu pe /promovare) - coloane
  // proprii ca sa nu se confunde cu email_sent_at/whatsapp_sent_at/status ale campaniei generale
  // de listare gratuita (aceeasi listare poate fi contactata independent de ambele campanii).
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN microsite_pitch_email_sent_at INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE outreach_contacts ADD COLUMN microsite_pitch_whatsapp_sent_at INTEGER`); } catch {}

  // Batch-uri de outreach salvate de partener (grupari personalizate de cartiere/sectoare,
  // pe langa cele 3 implicite: cartierul propriu / sectorul propriu / tot Bucurestiul).
  // "values" e JSON.stringify(string[]) cu numele cartierelor sau numerele sectoarelor selectate.
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_ms_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      name TEXT NOT NULL,
      filter_type TEXT NOT NULL,
      values_json TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    )
  `);

  // Micro-site-uri de prezentare (subdomenii wildcard nume.activkids.ro)
  db.exec(`
    CREATE TABLE IF NOT EXISTS microsites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subdomain TEXT NOT NULL UNIQUE,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      owner_user_id INTEGER,
      theme_color TEXT DEFAULT 'teal',
      tagline TEXT,
      about_long TEXT,
      instagram_url TEXT,
      tiktok_url TEXT,
      youtube_url TEXT,
      whatsapp TEXT,
      booking_enabled INTEGER NOT NULL DEFAULT 1,
      booking_label TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      UNIQUE(listing_type, listing_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      microsite_id INTEGER NOT NULL,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      preferred_date TEXT,
      preferred_slot TEXT,
      message TEXT,
      kind TEXT NOT NULL DEFAULT 'visit',
      status TEXT NOT NULL DEFAULT 'new',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS fb_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      member_count INTEGER,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      last_posted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // Domeniu de trimitere verificat in Resend (subdomeniu *.activkids.ro), pt. partenerii care
  // nu-si pot verifica propriul domeniu (fara acces DNS) - vezi outreach/send/route.ts.
  try { db.exec(`ALTER TABLE microsites ADD COLUMN outreach_send_domain TEXT`); } catch {}

  // Sablon de email personalizat de partener (subiect + mesaj) - daca sunt NULL, send/route.ts
  // genereaza automat continutul din datele listarii (comportamentul de dinainte).
  try { db.exec(`ALTER TABLE microsites ADD COLUMN outreach_email_subject TEXT`); } catch {}
  try { db.exec(`ALTER TABLE microsites ADD COLUMN outreach_email_message TEXT`); } catch {}

  // Nume persoana de contact (ex. "Florin Turcu"), afisat in semnatura emailului de outreach
  // sub numele firmei - optional, cade pe doar numele firmei daca nu e setat.
  try { db.exec(`ALTER TABLE microsites ADD COLUMN outreach_contact_name TEXT`); } catch {}

  // Atasament (ex. meniu) trimis cu fiecare email de outreach al partenerului - un singur fisier
  // per microsite, stocat in public/uploads/attachments/ (vezi upload/route.ts + send/route.ts).
  try { db.exec(`ALTER TABLE microsites ADD COLUMN outreach_attachment_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE microsites ADD COLUMN outreach_attachment_name TEXT`); } catch {}

  // Adresa unde ajung raspunsurile (header Reply-To) - separata de outreach_from_email, care e
  // doar adresa "From" (poate fi un subdomeniu *.activkids.ro fara cutie postala reala, vezi mai
  // sus). Daca nu e setata, cade pe outreach_from_email / emailul listarii (comportamentul vechi).
  try { db.exec(`ALTER TABLE microsites ADD COLUMN outreach_reply_to TEXT`); } catch {}

  // Cartier (cel mai apropiat "quarter"/"suburb" din OpenStreetMap de lat/lng-ul listarii),
  // completat de scripts/enrich-neighborhoods.js - vezi outreach pe cartier.
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN neighborhood TEXT`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN is_paused INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN neighborhood TEXT`); } catch {}
  try { db.exec(`ALTER TABLE kindergartens ADD COLUMN neighborhood TEXT`); } catch {}
  try { db.exec(`ALTER TABLE professionals ADD COLUMN neighborhood TEXT`); } catch {}
  try { db.exec(`ALTER TABLE caterers ADD COLUMN neighborhood TEXT`); } catch {}

  // Program numeric (ora aducere / ora luare) pentru filtrare, separat de coloana
  // "program" (text liber afisat pe card) - vezi scripts/enrich-kindergartens-info.js.
  try { db.exec(`ALTER TABLE kindergartens ADD COLUMN program_start TEXT`); } catch {}
  try { db.exec(`ALTER TABLE kindergartens ADD COLUMN program_end TEXT`); } catch {}

  // Nota interna admin pt randuri cu geodata neclara/ambigua ce nu s-a putut rezolva automat
  // (vezi project_geodata_cleanup) - flag pt revizuire manuala, nu afecteaza randarea publica.
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN admin_note TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN admin_note TEXT`); } catch {}
  try { db.exec(`ALTER TABLE kindergartens ADD COLUMN admin_note TEXT`); } catch {}

  // Auto-postare Facebook (fbAutoPost.ts): "cutia cu bile" - rotatia alege mereu randul cu
  // fb_last_promoted_at cel mai vechi (NULL = niciodata promovat, prioritar), ca toate listarile
  // sa fie mentionate inainte sa se repete vreuna.
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN fb_last_promoted_at INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN fb_last_promoted_at INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE kindergartens ADD COLUMN fb_last_promoted_at INTEGER`); } catch {}

  // Jurnal postari automate pe Pagina de Facebook (audit + afisaj in admin).
  db.exec(`
    CREATE TABLE IF NOT EXISTS fb_post_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      posted_at INTEGER NOT NULL,
      template TEXT NOT NULL,
      anchor_type TEXT NOT NULL,
      anchor_id INTEGER NOT NULL,
      mentioned_json TEXT,
      message TEXT NOT NULL,
      fb_post_id TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      error TEXT
    )
  `);

  // generated_at = momentul generarii (queue/preview/postare), imutabil. posted_at ramane
  // momentul relevant curent (generare cat timp e in coada, ora postarii reale cand devine
  // 'sent') - separate ca istoricul din admin sa poata arata ambele momente pt un rand.
  try { db.exec(`ALTER TABLE fb_post_log ADD COLUMN generated_at INTEGER`); } catch {}
}

export interface School {
  id: number;
  number: string;
  name: string;
  address: string;
  sector: number;
  lat: number;
  lng: number;
}

export interface AfterSchool {
  id: number;
  name: string;
  address: string;
  sector: number;
  lat: number;
  lng: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  price_min: number | null;
  price_max: number | null;
  facebook_url: string | null;
  pickup_time: string | null;
  end_time: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  activities: string | null;
  image_url: string | null;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  is_featured: number;
  contacts_hidden: number;
  is_paused: number;
  leads_enabled: number | null;
  owner_user_id: number | null;
  distance?: number;
  rating?: number | null;
  reviews_count?: number | null;
  maps_url?: string | null;
  editorial_summary?: string | null;
  photo_urls?: string | null;
  video_urls?: string | null;
  reviews_url?: string | null;
  neighborhood?: string | null;
  logo_url?: string | null;
}

export type { ClubCategory } from './clubs';
export { CLUB_CATEGORY_LABELS } from './clubs';
export type { ProfessionalCategory } from './professionals';
export { PROFESSIONAL_CATEGORY_LABELS, PROFESSIONAL_CATEGORY_ORDER, KIND_LABELS } from './professionals';
export type { TutorSubject } from './tutors';
export { TUTOR_SUBJECT_LABELS, TUTOR_SUBJECT_ORDER, TUTOR_KIND_LABELS } from './tutors';
import type { TutorSubject } from './tutors';
export type { CollaboratorKind } from './professionals';
import type { ProfessionalCategory, CollaboratorKind } from './professionals';
import type { ClubCategory } from './clubs';

export interface Club {
  id: number;
  name: string;
  address: string;
  sector: number;
  lat: number;
  lng: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  price_min: number | null;
  price_max: number | null;
  schedule: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  category: ClubCategory;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  is_featured: number;
  contacts_hidden: number;
  leads_enabled: number | null;
  owner_user_id: number | null;
  distance?: number;
  rating?: number | null;
  reviews_count?: number | null;
  maps_url?: string | null;
  editorial_summary?: string | null;
  photo_urls?: string | null;
  video_urls?: string | null;
  reviews_url?: string | null;
  neighborhood?: string | null;
  logo_url?: string | null;
}


export interface Caterer {
  id: number;
  name: string;
  address: string;
  sector: number;
  lat: number;
  lng: number;
  coverage_area: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  price_min: number | null;
  price_max: number | null;
  description: string | null;
  editorial_summary: string | null;
  photo_urls: string | null;
  video_urls: string | null;
  reviews_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  maps_url: string | null;
  banner_url: string | null;
  logo_url: string | null;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  is_featured: number;
  contacts_hidden: number;
  leads_enabled: number | null;
  owner_user_id: number | null;
  distance?: number;
}

export interface Professional {
  id: number;
  name: string;
  category: ProfessionalCategory;
  kind: CollaboratorKind;
  address: string | null;
  sector: number | null;
  lat: number;
  lng: number;
  coverage_area: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  price_min: number | null;
  price_max: number | null;
  description: string | null;
  editorial_summary: string | null;
  photo_urls: string | null;
  video_urls: string | null;
  reviews_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  maps_url: string | null;
  banner_url: string | null;
  logo_url: string | null;
  place_id: string | null;
  availability: 'available' | 'full' | 'unknown';
  online_available: number;
  home_service: number;
  is_premium: number;
  is_featured: number;
  contacts_hidden: number;
  leads_enabled: number | null;
  owner_user_id: number | null;
  distance?: number;
}

export interface Kindergarten {
  id: number;
  name: string;
  type: 'gradinita' | 'cresa';
  address: string;
  sector: number | null;
  lat: number;
  lng: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  price_min: number | null;
  price_max: number | null;
  program: string | null;
  program_start: string | null;
  program_end: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  editorial_summary: string | null;
  activities: string | null;
  photo_urls: string | null;
  video_urls: string | null;
  reviews_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  maps_url: string | null;
  banner_url: string | null;
  logo_url: string | null;
  place_id: string | null;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  is_featured: number;
  contacts_hidden: number;
  leads_enabled: number | null;
  owner_user_id: number | null;
  distance?: number;
  neighborhood?: string | null;
}

export interface Tutor {
  id: number;
  name: string;
  subject: TutorSubject;
  kind: 'independent' | 'institutie';
  address: string | null;
  sector: number | null;
  lat: number;
  lng: number;
  coverage_area: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  maps_url: string | null;
  price_min: number | null;
  price_max: number | null;
  description: string | null;
  editorial_summary: string | null;
  photo_urls: string | null;
  video_urls: string | null;
  rating: number | null;
  reviews_count: number | null;
  banner_url: string | null;
  logo_url: string | null;
  place_id: string | null;
  online_available: number;
  home_service: number;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  is_featured: number;
  contacts_hidden: number;
  leads_enabled: number | null;
  owner_user_id: number | null;
  distance?: number;
}

export interface CollaborationRequest {
  id: number;
  from_type: string;
  from_id: number;
  to_type: string;
  to_id: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
  responded_at: number | null;
}

export interface Microsite {
  id: number;
  subdomain: string;
  listing_type: 'afterschool' | 'club' | 'caterer';
  listing_id: number;
  owner_user_id: number | null;
  theme_color: string | null;
  tagline: string | null;
  about_long: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  whatsapp: string | null;
  booking_enabled: number;
  booking_label: string | null;
  is_active: number;
  created_at: number;
}

export interface Booking {
  id: number;
  microsite_id: number;
  listing_type: 'afterschool' | 'club' | 'caterer';
  listing_id: number;
  name: string;
  phone: string;
  email: string | null;
  preferred_date: string | null;
  preferred_slot: string | null;
  message: string | null;
  kind: 'visit' | 'trial';
  status: 'new' | 'confirmed' | 'done' | 'cancelled';
  created_at: number;
}

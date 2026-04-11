import Database from 'better-sqlite3';
import path from 'path';

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
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN is_premium INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN contacts_hidden INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN banner_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN banner_url TEXT`); } catch {}

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

  // Coloane noi pe afterschools si clubs
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN owner_user_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN video_urls TEXT`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN reviews_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE afterschools ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN owner_user_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN video_urls TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN reviews_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE clubs ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0`); } catch {}

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
  distance?: number;
  rating?: number | null;
  reviews_count?: number | null;
  maps_url?: string | null;
  editorial_summary?: string | null;
  photo_urls?: string | null;
  video_urls?: string | null;
  reviews_url?: string | null;
}

export type { ClubCategory } from './clubs';
export { CLUB_CATEGORY_LABELS } from './clubs';
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
  distance?: number;
  rating?: number | null;
  reviews_count?: number | null;
  maps_url?: string | null;
  editorial_summary?: string | null;
  photo_urls?: string | null;
  video_urls?: string | null;
  reviews_url?: string | null;
}

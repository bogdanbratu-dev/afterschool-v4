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
  contacts_hidden: number;
  distance?: number;
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
  contacts_hidden: number;
  distance?: number;
}

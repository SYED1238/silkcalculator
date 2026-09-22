import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { Ledger, SilkEntry } from './types';
import { getTodayDateString } from './calculations';

const DB_PATH = path.join(process.cwd(), 'silk_ledger.db');

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    const isFirstRun = !fs.existsSync(DB_PATH);
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA journal_mode = WAL;');
    _db.exec('PRAGMA foreign_keys = ON;');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledgers (
      id TEXT PRIMARY KEY,
      ledger_number INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      ledger_id TEXT NOT NULL,
      entry_number INTEGER NOT NULL,
      received_date TEXT NOT NULL,
      received_weight_grams INTEGER NOT NULL CHECK(received_weight_grams > 0),
      returned_date TEXT,
      returned_weight_grams INTEGER CHECK(returned_weight_grams IS NULL OR returned_weight_grams > 0),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entries_ledger ON entries(ledger_id);
    CREATE INDEX IF NOT EXISTS idx_entries_received_date ON entries(received_date);
    CREATE INDEX IF NOT EXISTS idx_entries_returned_date ON entries(returned_date);
  `);

  // Ensure an active ledger exists
  const activeStmt = db.prepare(`SELECT * FROM ledgers WHERE status = 'active' LIMIT 1`);
  const active = activeStmt.get() as unknown as Ledger | undefined;

  if (!active) {
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ledgers`);
    const countRow = countStmt.get() as unknown as { count: number };
    const nextNumber = (countRow?.count || 0) + 1;
    const padNum = String(nextNumber).padStart(3, '0');
    const id = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const today = getTodayDateString();
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO ledgers (id, ledger_number, name, started_at, ended_at, status, created_at)
      VALUES (?, ?, ?, ?, NULL, 'active', ?)
    `);
    insert.run(id, nextNumber, `Ledger #${padNum}`, today, now);
  }
}

// ---------------- Ledger Operations ----------------

export function getActiveLedger(): Ledger {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM ledgers WHERE status = 'active' ORDER BY ledger_number DESC LIMIT 1`);
  let active = stmt.get() as unknown as Ledger | undefined;
  if (!active) {
    initSchema(db);
    active = stmt.get() as unknown as Ledger;
  }
  return active;
}

export function getArchivedLedgers(): Ledger[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM ledgers WHERE status = 'archived' ORDER BY ledger_number DESC`);
  return stmt.all() as unknown as Ledger[];
}

export function getLedgerById(id: string): Ledger | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM ledgers WHERE id = ?`);
  const row = stmt.get(id) as unknown as Ledger | undefined;
  return row || null;
}

export function startNewLedger(): { previousLedger: Ledger; newLedger: Ledger } {
  const db = getDb();
  const today = getTodayDateString();
  const now = new Date().toISOString();

  // 1. Get current active ledger
  const current = getActiveLedger();

  // 2. Archive current ledger
  const archiveStmt = db.prepare(`
    UPDATE ledgers 
    SET status = 'archived', ended_at = ? 
    WHERE id = ?
  `);
  archiveStmt.run(today, current.id);

  // 3. Create fresh new active ledger
  const nextNumber = current.ledger_number + 1;
  const padNum = String(nextNumber).padStart(3, '0');
  const newId = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const createStmt = db.prepare(`
    INSERT INTO ledgers (id, ledger_number, name, started_at, ended_at, status, created_at)
    VALUES (?, ?, ?, ?, NULL, 'active', ?)
  `);
  createStmt.run(newId, nextNumber, `Ledger #${padNum}`, today, now);

  const updatedPrev = getLedgerById(current.id)!;
  const newActive = getLedgerById(newId)!;

  return { previousLedger: updatedPrev, newLedger: newActive };
}

// ---------------- Entry Operations ----------------

export function getEntriesForLedger(ledgerId: string): SilkEntry[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM entries 
    WHERE ledger_id = ? 
    ORDER BY entry_number ASC
  `);
  return stmt.all(ledgerId) as unknown as SilkEntry[];
}

export function getAllEntries(): SilkEntry[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM entries 
    ORDER BY received_date DESC, entry_number DESC
  `);
  return stmt.all() as unknown as SilkEntry[];
}

export function getEntryById(id: string): SilkEntry | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM entries WHERE id = ?`);
  const row = stmt.get(id) as unknown as SilkEntry | undefined;
  return row || null;
}

export function createEntry(data: {
  ledger_id?: string;
  received_date: string;
  received_weight_grams: number;
  returned_date?: string | null;
  returned_weight_grams?: number | null;
  notes?: string | null;
}): SilkEntry {
  const db = getDb();
  const active = getActiveLedger();
  const targetLedgerId = data.ledger_id || active.id;

  // Compute next entry_number for this ledger
  const maxStmt = db.prepare(`
    SELECT COALESCE(MAX(entry_number), 0) as maxNum 
    FROM entries 
    WHERE ledger_id = ?
  `);
  const maxRow = maxStmt.get(targetLedgerId) as unknown as { maxNum: number };
  const nextEntryNumber = (maxRow?.maxNum || 0) + 1;

  const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO entries (
      id, ledger_id, entry_number, 
      received_date, received_weight_grams, 
      returned_date, returned_weight_grams, 
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    targetLedgerId,
    nextEntryNumber,
    data.received_date,
    data.received_weight_grams,
    data.returned_date || null,
    data.returned_weight_grams !== undefined ? data.returned_weight_grams : null,
    data.notes || null,
    now,
    now
  );

  return getEntryById(id)!;
}

export function updateEntry(
  id: string,
  data: {
    received_date: string;
    received_weight_grams: number;
    returned_date?: string | null;
    returned_weight_grams?: number | null;
    notes?: string | null;
  }
): SilkEntry | null {
  const db = getDb();
  const existing = getEntryById(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE entries 
    SET received_date = ?, 
        received_weight_grams = ?, 
        returned_date = ?, 
        returned_weight_grams = ?, 
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.received_date,
    data.received_weight_grams,
    data.returned_date !== undefined ? data.returned_date : null,
    data.returned_weight_grams !== undefined ? data.returned_weight_grams : null,
    data.notes !== undefined ? data.notes : null,
    now,
    id
  );

  return getEntryById(id);
}

export function deleteEntry(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM entries WHERE id = ?`);
  const info = stmt.run(id);
  return Number(info.changes) > 0;
}

// ---------------- Backup & Restore ----------------

export function exportFullBackup() {
  const db = getDb();
  const ledgers = db.prepare(`SELECT * FROM ledgers ORDER BY ledger_number ASC`).all() as unknown as Ledger[];
  const entries = db.prepare(`SELECT * FROM entries ORDER BY ledger_id, entry_number ASC`).all() as unknown as SilkEntry[];
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    ledgers,
    entries,
  };
}

export function restoreFullBackup(backupData: { ledgers: Ledger[]; entries: SilkEntry[] }) {
  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec(`DELETE FROM entries;`);
    db.exec(`DELETE FROM ledgers;`);

    const insertLedger = db.prepare(`
      INSERT INTO ledgers (id, ledger_number, name, started_at, ended_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const l of backupData.ledgers) {
      insertLedger.run(l.id, l.ledger_number, l.name, l.started_at, l.ended_at, l.status, l.created_at);
    }

    const insertEntry = db.prepare(`
      INSERT INTO entries (
        id, ledger_id, entry_number, 
        received_date, received_weight_grams, 
        returned_date, returned_weight_grams, 
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const e of backupData.entries) {
      insertEntry.run(
        e.id,
        e.ledger_id,
        e.entry_number,
        e.received_date,
        e.received_weight_grams,
        e.returned_date,
        e.returned_weight_grams,
        e.notes || null,
        e.created_at,
        e.updated_at
      );
    }

    db.exec('COMMIT;');
    return { success: true };
  } catch (err: any) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

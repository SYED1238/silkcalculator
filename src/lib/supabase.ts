import { createClient } from '@supabase/supabase-js';
import { Ledger, SilkEntry } from './types';
import { getTodayDateString, calculateDaysBetween } from './calculations';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tuwolozvyuwdkapescus.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1d29sb3p2eXV3ZGthcGVzY3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTc1ODMsImV4cCI6MjEwNTYzMzU4M30.Davg2iJrhOhW6HR2Z1rrAYl1HdX09G2ZYy2AUTPW2rA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function mapLedgerRow(row: any): Ledger {
  const num = parseInt(row.ledger_number, 10) || 1;
  const pad = String(num).padStart(3, '0');
  const startedAt = row.start_date
    ? row.start_date.split('T')[0]
    : getTodayDateString();
  const endedAt = row.end_date ? row.end_date.split('T')[0] : null;

  let name = row.notes || `Ledger #${pad}`;
  let costPerKg: number | null = null;

  if (row.cost_per_kg !== undefined && row.cost_per_kg !== null) {
    costPerKg = Number(row.cost_per_kg);
  }

  if (row.notes) {
    try {
      const parsed = JSON.parse(row.notes);
      if (parsed && typeof parsed === 'object') {
        if (parsed.name) name = parsed.name;
        if (parsed.cost_per_kg !== undefined && parsed.cost_per_kg !== null) {
          costPerKg = Number(parsed.cost_per_kg);
        }
      }
    } catch {
      const match = row.notes.match(/^(.*?)\s*\[COST:([0-9.]+)\]$/);
      if (match) {
        name = match[1].trim();
        costPerKg = Number(match[2]);
      }
    }
  }

  return {
    id: row.id,
    ledger_number: num,
    name: name,
    started_at: startedAt,
    ended_at: endedAt,
    status: row.status as 'active' | 'archived',
    created_at: row.created_at,
    cost_per_kg: costPerKg,
  };
}

function mapEntryRow(row: any): SilkEntry {
  const rawGrams = Math.round(Number(row.received_weight || 0) * 1000);
  const retGrams =
    row.returned_weight !== null &&
    row.returned_weight !== undefined &&
    Number(row.returned_weight) > 0
      ? Math.round(Number(row.returned_weight) * 1000)
      : null;

  return {
    id: row.id,
    ledger_id: row.ledger_id,
    entry_number: parseInt(row.entry_number, 10) || 1,
    received_date: row.received_date,
    received_weight_grams: rawGrams,
    returned_date: row.returned_date || null,
    returned_weight_grams: retGrams,
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------- Ledger Operations ----------------

export async function getActiveLedger(): Promise<Ledger> {
  const { data, error } = await supabase
    .from('ledgers')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Supabase error getting active ledger: ${error.message}`);
  }

  if (data && data.length > 0) {
    return mapLedgerRow(data[0]);
  }

  const today = getTodayDateString();
  const { data: newLedger, error: createErr } = await supabase
    .from('ledgers')
    .insert([
      {
        ledger_number: '1',
        status: 'active',
        start_date: today,
        notes: 'Ledger #001',
      },
    ])
    .select()
    .single();

  if (createErr) {
    throw new Error(`Failed to create initial active ledger: ${createErr.message}`);
  }

  return mapLedgerRow(newLedger);
}

export async function getArchivedLedgers(): Promise<Ledger[]> {
  const { data, error } = await supabase
    .from('ledgers')
    .select('*')
    .eq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get archived ledgers: ${error.message}`);
  }

  return (data || []).map(mapLedgerRow);
}

export async function getLedgerById(id: string): Promise<Ledger | null> {
  const { data, error } = await supabase
    .from('ledgers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapLedgerRow(data);
}

export async function startNewLedger(): Promise<{ previousLedger: Ledger; newLedger: Ledger }> {
  const current = await getActiveLedger();
  const today = getTodayDateString();

  const { error: archiveErr } = await supabase
    .from('ledgers')
    .update({
      status: 'archived',
      end_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', current.id);

  if (archiveErr) {
    throw new Error(`Failed to archive ledger: ${archiveErr.message}`);
  }

  const nextNumber = current.ledger_number + 1;
  const padNum = String(nextNumber).padStart(3, '0');

  const { data: created, error: createErr } = await supabase
    .from('ledgers')
    .insert([
      {
        ledger_number: String(nextNumber),
        status: 'active',
        start_date: today,
        notes: `Ledger #${padNum}`,
      },
    ])
    .select()
    .single();

  if (createErr) {
    throw new Error(`Failed to create new ledger: ${createErr.message}`);
  }

  const updatedPrev = await getLedgerById(current.id);
  return {
    previousLedger: updatedPrev!,
    newLedger: mapLedgerRow(created),
  };
}

export async function updateLedgerCost(
  ledgerId: string,
  costPerKg: number | null
): Promise<Ledger> {
  const current = await getLedgerById(ledgerId);
  if (!current) {
    throw new Error('Ledger not found');
  }

  const cleanName = current.name;
  const newNotes =
    costPerKg !== null && costPerKg !== undefined && !isNaN(Number(costPerKg)) && Number(costPerKg) >= 0
      ? `${cleanName} [COST:${Number(costPerKg)}]`
      : cleanName;

  const { data, error } = await supabase
    .from('ledgers')
    .update({
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ledgerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update ledger cost: ${error.message}`);
  }

  return mapLedgerRow(data);
}

// ---------------- Silk Entry Operations ----------------

export async function getEntriesForLedger(ledgerId: string): Promise<SilkEntry[]> {
  const { data, error } = await supabase
    .from('silk_entries')
    .select('*')
    .eq('ledger_id', ledgerId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch entries: ${error.message}`);
  }

  return (data || []).map(mapEntryRow);
}

export async function getAllEntries(): Promise<SilkEntry[]> {
  const { data, error } = await supabase
    .from('silk_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch all entries: ${error.message}`);
  }

  return (data || []).map(mapEntryRow);
}

export async function getEntryById(id: string): Promise<SilkEntry | null> {
  const { data, error } = await supabase
    .from('silk_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapEntryRow(data);
}

export async function createEntry(data: {
  ledger_id?: string;
  received_date?: string | null;
  received_weight_grams?: number | null;
  returned_date?: string | null;
  returned_weight_grams?: number | null;
  notes?: string | null;
}): Promise<SilkEntry> {
  let targetLedgerId = data.ledger_id;
  if (!targetLedgerId) {
    const active = await getActiveLedger();
    targetLedgerId = active.id;
  }

  // Get next entry_number
  const { data: existingEntries } = await supabase
    .from('silk_entries')
    .select('entry_number')
    .eq('ledger_id', targetLedgerId);

  let nextEntryNumber = 1;
  if (existingEntries && existingEntries.length > 0) {
    const nums = existingEntries.map((e) => parseInt(e.entry_number, 10) || 0);
    nextEntryNumber = Math.max(...nums) + 1;
  }

  const rawGrams = Math.round(Number(data.received_weight_grams || 0));
  const retGrams =
    data.returned_weight_grams !== null && data.returned_weight_grams !== undefined
      ? Math.round(Number(data.returned_weight_grams))
      : null;

  const hasReceived = rawGrams > 0;
  const hasReturned = retGrams !== null && retGrams > 0;

  const recDate = data.received_date || (hasReturned ? data.returned_date! : getTodayDateString());
  const retDate = data.returned_date || null;

  const rawKg = rawGrams / 1000;
  const retKg = hasReturned ? retGrams! / 1000 : 0;
  const diffKg = hasReceived && hasReturned ? (rawGrams - retGrams!) / 1000 : 0;
  const daysTaken = hasReceived && hasReturned ? (calculateDaysBetween(recDate, retDate) || 0) : 0;

  const rowToInsert = {
    ledger_id: targetLedgerId,
    entry_number: String(nextEntryNumber),
    status: hasReturned ? 'returned' : 'pending',
    received_date: recDate,
    received_weight: rawKg,
    returned_date: retDate,
    returned_weight: retKg,
    weight_difference: diffKg,
    processing_days: daysTaken,
    notes: data.notes || null,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('silk_entries')
    .insert([rowToInsert])
    .select()
    .single();

  if (insertErr) {
    throw new Error(`Failed to create entry in Supabase: ${insertErr.message}`);
  }

  return mapEntryRow(inserted);
}

export async function updateEntry(
  id: string,
  data: {
    received_date?: string | null;
    received_weight_grams?: number | null;
    returned_date?: string | null;
    returned_weight_grams?: number | null;
    notes?: string | null;
  }
): Promise<SilkEntry | null> {
  const existing = await getEntryById(id);
  if (!existing) return null;

  const rawGrams =
    data.received_weight_grams !== undefined && data.received_weight_grams !== null
      ? Math.round(Number(data.received_weight_grams))
      : existing.received_weight_grams;

  const retGrams =
    data.returned_weight_grams !== undefined
      ? (data.returned_weight_grams !== null ? Math.round(Number(data.returned_weight_grams)) : null)
      : existing.returned_weight_grams;

  const recDate = data.received_date !== undefined ? data.received_date : existing.received_date;
  const retDate = data.returned_date !== undefined ? data.returned_date : existing.returned_date;

  const hasReceived = rawGrams > 0;
  const hasReturned = retGrams !== null && retGrams > 0;

  const rawKg = rawGrams / 1000;
  const retKg = hasReturned ? retGrams! / 1000 : 0;
  const diffKg = hasReceived && hasReturned ? (rawGrams - retGrams!) / 1000 : 0;
  const daysTaken = hasReceived && hasReturned && recDate && retDate ? (calculateDaysBetween(recDate, retDate) || 0) : 0;

  const updateFields: any = {
    received_date: recDate,
    received_weight: rawKg,
    returned_date: retDate,
    returned_weight: retKg,
    weight_difference: diffKg,
    processing_days: daysTaken,
    status: hasReturned ? 'returned' : 'pending',
    updated_at: new Date().toISOString(),
  };

  if (data.notes !== undefined) {
    updateFields.notes = data.notes || null;
  }

  const { data: updated, error } = await supabase
    .from('silk_entries')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update entry in Supabase: ${error.message}`);
  }

  return mapEntryRow(updated);
}

export async function deleteEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from('silk_entries').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete entry in Supabase: ${error.message}`);
  }
  return true;
}

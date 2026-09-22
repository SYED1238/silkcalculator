export type LedgerStatus = 'active' | 'archived';

export interface Ledger {
  id: string;
  ledger_number: number;
  name: string;
  started_at: string; // YYYY-MM-DD
  ended_at: string | null; // YYYY-MM-DD
  status: LedgerStatus;
  created_at: string;
  cost_per_kg?: number | null;
}

export interface SilkEntry {
  id: string;
  ledger_id: string;
  entry_number: number;
  received_date: string; // YYYY-MM-DD
  received_weight_grams: number; // exact integer grams
  returned_date: string | null; // YYYY-MM-DD
  returned_weight_grams: number | null; // exact integer grams
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerSummary {
  totalEntries: number;
  completedEntries: number;
  pendingEntries: number;
  totalRawGrams: number;
  totalReturnedGrams: number;
  outstandingGrams: number;
  weightDifferenceGrams: number;
  totalProcessingDays: number;
  averageProcessingDays: number | null;
}

export interface DayActivity {
  date: string; // YYYY-MM-DD
  hasReceived: boolean;
  hasReturned: boolean;
  entries: SilkEntry[];
}

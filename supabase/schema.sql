-- ==========================================================
-- SILK WEIGHT LEDGER - SUPABASE POSTGRESQL SCHEMA
-- ==========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ledgers Table
CREATE TABLE IF NOT EXISTS public.ledgers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ledger_number BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  started_at DATE NOT NULL,
  ended_at DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying active/archived ledgers quickly
CREATE INDEX IF NOT EXISTS idx_ledgers_status ON public.ledgers(status);
CREATE INDEX IF NOT EXISTS idx_ledgers_number ON public.ledgers(ledger_number DESC);

-- 2. Entries Table
CREATE TABLE IF NOT EXISTS public.entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ledger_id UUID NOT NULL REFERENCES public.ledgers(id) ON DELETE CASCADE,
  entry_number BIGINT NOT NULL,
  received_date DATE NOT NULL,
  received_weight_grams BIGINT NOT NULL CHECK (received_weight_grams > 0),
  returned_date DATE,
  returned_weight_grams BIGINT CHECK (returned_weight_grams IS NULL OR returned_weight_grams > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Lender column ready for future multi-lender support without rebuilding the app
  lender_id UUID,
  CONSTRAINT uq_ledger_entry_number UNIQUE (ledger_id, entry_number)
);

-- Indexes for entries
CREATE INDEX IF NOT EXISTS idx_entries_ledger_id ON public.entries(ledger_id);
CREATE INDEX IF NOT EXISTS idx_entries_received_date ON public.entries(received_date);
CREATE INDEX IF NOT EXISTS idx_entries_returned_date ON public.entries(returned_date);

-- 3. Initial Active Ledger Seed (if empty)
INSERT INTO public.ledgers (ledger_number, name, started_at, status)
SELECT 1, 'Ledger #001', CURRENT_DATE, 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.ledgers);

-- Row Level Security (RLS) - Optional for authenticated / single-user setups
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for local ledger" 
ON public.ledgers FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-write for entries" 
ON public.entries FOR ALL 
USING (true) WITH CHECK (true);

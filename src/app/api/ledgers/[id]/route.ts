import { NextRequest, NextResponse } from 'next/server';
import { getLedgerById, getEntriesForLedger } from '@/lib/supabase';
import { calculateLedgerSummary } from '@/lib/calculations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ledger = await getLedgerById(id);
    if (!ledger) {
      return NextResponse.json({ error: 'Ledger not found' }, { status: 404 });
    }

    const entries = await getEntriesForLedger(id);
    const summary = calculateLedgerSummary(entries);

    return NextResponse.json({
      ledger,
      entries,
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch ledger' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import {
  getActiveLedger,
  getArchivedLedgers,
  getEntriesForLedger,
  startNewLedger,
  updateLedgerCost,
} from '@/lib/supabase';
import { calculateLedgerSummary } from '@/lib/calculations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeLedger = await getActiveLedger();
    const archivedLedgers = await getArchivedLedgers();

    const activeEntries = await getEntriesForLedger(activeLedger.id);
    const activeSummary = calculateLedgerSummary(activeEntries);

    // Calculate summaries for archived ledgers
    const archivedWithSummaries = await Promise.all(
      archivedLedgers.map(async (l) => {
        const entries = await getEntriesForLedger(l.id);
        return {
          ...l,
          summary: calculateLedgerSummary(entries),
        };
      })
    );

    return NextResponse.json({
      activeLedger: {
        ...activeLedger,
        summary: activeSummary,
      },
      archivedLedgers: archivedWithSummaries,
    });
  } catch (error: any) {
    console.error('Error fetching ledgers:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch ledgers' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await startNewLedger();
    return NextResponse.json({
      success: true,
      message: 'New ledger started successfully. Previous ledger has been archived.',
      ...result,
    });
  } catch (error: any) {
    console.error('Error starting new ledger:', error);
    return NextResponse.json({ error: error?.message || 'Failed to start new ledger' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, cost_per_kg, password } = body;

    if (password !== undefined && password !== '0000') {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    let targetLedgerId = id;
    if (!targetLedgerId) {
      const active = await getActiveLedger();
      targetLedgerId = active.id;
    }

    const costVal =
      cost_per_kg !== null && cost_per_kg !== undefined && cost_per_kg !== ''
        ? Number(cost_per_kg)
        : null;

    if (costVal !== null && (isNaN(costVal) || costVal < 0)) {
      return NextResponse.json(
        { error: 'Cost per kg must be a positive number or zero' },
        { status: 400 }
      );
    }

    const updated = await updateLedgerCost(targetLedgerId, costVal);

    return NextResponse.json({
      success: true,
      ledger: updated,
    });
  } catch (error: any) {
    console.error('Error updating ledger cost:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update ledger cost' },
      { status: 500 }
    );
  }
}

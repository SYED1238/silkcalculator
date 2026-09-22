import { NextRequest, NextResponse } from 'next/server';
import { getActiveLedger, getEntriesForLedger, getAllEntries, createEntry } from '@/lib/supabase';
import { calculateDaysBetween } from '@/lib/calculations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const all = searchParams.get('all') === 'true';
    const ledgerId = searchParams.get('ledger_id');

    if (all) {
      const entries = await getAllEntries();
      return NextResponse.json({ entries });
    }

    const active = await getActiveLedger();
    const targetLedgerId = ledgerId || active.id;
    const entries = await getEntriesForLedger(targetLedgerId);

    return NextResponse.json({ entries, ledger_id: targetLedgerId });
  } catch (error: any) {
    console.error('Error fetching entries:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ledger_id,
      received_date,
      received_weight_grams,
      returned_date,
      returned_weight_grams,
      notes,
    } = body;

    const rawGrams = typeof received_weight_grams === 'number' ? Math.round(received_weight_grams) : 0;
    const retGrams = typeof returned_weight_grams === 'number' ? Math.round(returned_weight_grams) : 0;

    // Must have either received weight or returned weight > 0
    if (rawGrams <= 0 && retGrams <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid weight in kg and grams' },
        { status: 400 }
      );
    }

    if (rawGrams > 0 && (!received_date || typeof received_date !== 'string')) {
      return NextResponse.json({ error: 'Received date is required' }, { status: 400 });
    }

    if (retGrams > 0 && (!returned_date || typeof returned_date !== 'string')) {
      return NextResponse.json({ error: 'Return date is required' }, { status: 400 });
    }

    if (rawGrams > 0 && retGrams > 0 && received_date && returned_date) {
      const days = calculateDaysBetween(received_date, returned_date);
      if (days !== null && days < 0) {
        return NextResponse.json(
          { error: 'Return date cannot be earlier than received date' },
          { status: 400 }
        );
      }
    }

    const entry = await createEntry({
      ledger_id,
      received_date: received_date ? received_date.trim() : null,
      received_weight_grams: rawGrams > 0 ? rawGrams : 0,
      returned_date: returned_date ? returned_date.trim() : null,
      returned_weight_grams: retGrams > 0 ? retGrams : null,
      notes: notes ? String(notes).trim() : null,
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create entry' }, { status: 500 });
  }
}

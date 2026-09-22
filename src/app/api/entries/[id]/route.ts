import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, updateEntry, deleteEntry } from '@/lib/supabase';
import { calculateDaysBetween } from '@/lib/calculations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PIN = '0000';

function verifyPassword(req: NextRequest, bodyPassword?: string): boolean {
  const headerPin = req.headers.get('x-entry-password');
  return headerPin === VALID_PIN || bodyPassword === VALID_PIN;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!verifyPassword(request, body.password)) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const existing = await getEntryById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const {
      received_date,
      received_weight_grams,
      returned_date,
      returned_weight_grams,
      notes,
    } = body;

    const rawGrams =
      received_weight_grams !== undefined ? Math.round(Number(received_weight_grams)) : existing.received_weight_grams;
    const retGrams =
      returned_weight_grams !== undefined
        ? (returned_weight_grams !== null ? Math.round(Number(returned_weight_grams)) : null)
        : existing.returned_weight_grams;

    if (rawGrams <= 0 && (!retGrams || retGrams <= 0)) {
      return NextResponse.json({ error: 'Weight must be greater than 0' }, { status: 400 });
    }

    const updated = await updateEntry(id, {
      received_date: received_date !== undefined ? (received_date ? received_date.trim() : null) : existing.received_date,
      received_weight_grams: rawGrams,
      returned_date: returned_date !== undefined ? (returned_date ? returned_date.trim() : null) : existing.returned_date,
      returned_weight_grams: retGrams,
      notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes,
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (error: any) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty if sent via header
    }

    if (!verifyPassword(request, body.password)) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const success = await deleteEntry(id);
    if (!success) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Entry deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete entry' }, { status: 500 });
  }
}

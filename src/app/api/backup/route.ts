import { NextRequest, NextResponse } from 'next/server';
import { exportFullBackup, restoreFullBackup } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PIN = '0000';

export async function GET() {
  try {
    const backup = exportFullBackup();
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="silk-ledger-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to export backup' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.password !== VALID_PIN) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    if (!body.backupData || !Array.isArray(body.backupData.ledgers) || !Array.isArray(body.backupData.entries)) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    restoreFullBackup(body.backupData);
    return NextResponse.json({ success: true, message: 'Data restored successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to restore backup' }, { status: 500 });
  }
}

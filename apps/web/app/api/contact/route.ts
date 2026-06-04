import { NextResponse } from 'next/server';

/* ============================================================================
   POST /api/contact — placeholder handler
   Returns 200 immediately. Wire up Resend (or similar) in a future sprint.
   ============================================================================ */

export async function POST() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

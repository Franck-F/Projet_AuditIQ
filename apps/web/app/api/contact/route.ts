import { NextResponse } from 'next/server';
import { z } from 'zod';

/* ============================================================================
   POST /api/contact — envoi réel via l'API HTTP Resend.
   - RESEND_API_KEY absent → 503 (le front affiche un message honnête avec
     l'adresse contact@auditiq.fr, jamais de faux « Message envoyé »).
   - Destinataire : contact@auditiq.fr.
   ============================================================================ */

const CONTACT_TO = 'contact@auditiq.fr';

const ContactSchema = z.object({
  nom: z.string().min(1).max(200),
  email: z.string().email().max(320),
  societe: z.string().max(200).optional().default(''),
  sujet: z.string().max(200).optional().default('Contact'),
  message: z.string().min(1).max(10_000),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return NextResponse.json(
      { ok: false, error: 'service_unavailable' },
      { status: 503 },
    );
  }

  let parsed;
  try {
    parsed = ContactSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const { nom, email, societe, sujet, message } = parsed.data;

  const html = [
    `<p><strong>Nom :</strong> ${escapeHtml(nom)}</p>`,
    `<p><strong>E-mail :</strong> ${escapeHtml(email)}</p>`,
    societe ? `<p><strong>Société :</strong> ${escapeHtml(societe)}</p>` : '',
    `<p><strong>Sujet :</strong> ${escapeHtml(sujet)}</p>`,
    `<hr /><p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>`,
  ].join('');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [CONTACT_TO],
        reply_to: email,
        subject: `[Contact AuditIQ] ${sujet} — ${nom}`,
        html,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: 'send_failed' },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

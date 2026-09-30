import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabaseClient';

// Same salt/hashing approach as /api/verify-code — see that file for the
// production note about setting IP_HASH_SALT in Vercel env vars.
const DEFAULT_SALT = 'halqen-dev-salt-change-in-production';
const SALT = process.env.IP_HASH_SALT || DEFAULT_SALT;

const ALLOWED_ORIGIN_SUFFIXES = ['halqen.com', '.vercel.app', 'localhost'];

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + SALT).digest('hex');
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '0.0.0.0';
}

function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname;
    return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  // Honeypot: a real visitor never fills this hidden field in. Bots that
  // blindly fill every input do. Silently pretend success so scripts don't
  // learn to skip the field.
  if (body?.website) {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  const { error } = await supabase.rpc('submit_beta_signup', {
    input_name: name,
    input_email: email,
    input_phone: typeof body?.phone === 'string' ? body.phone.trim() || null : null,
    input_area: typeof body?.area === 'string' ? body.area.trim() || null : null,
    input_use_case: typeof body?.useCase === 'string' ? body.useCase || null : null,
    input_platform: typeof body?.platform === 'string' ? body.platform || null : null,
    input_heard_from: typeof body?.heardFrom === 'string' ? body.heardFrom.trim() || null : null,
    input_notes: typeof body?.notes === 'string' ? body.notes.trim() || null : null,
    client_ip_hash: ipHash,
  });

  if (error) {
    if (error.message.includes('Too many submissions')) {
      return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 });
    }
    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    try {
      await supabase.from('client_errors').insert({
        message: error.message,
        context: 'submit_beta_signup RPC error',
        page_url: '/api/beta-signup',
      });
    } catch {
      // Intentionally silent
    }
    return NextResponse.json({ error: 'Something went wrong. Try again in a moment.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

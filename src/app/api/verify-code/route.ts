import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabaseClient';

// This hashing salt should live in an environment variable in production
// (e.g. IP_HASH_SALT) so raw IPs can never be reverse-engineered from the
// hash even if the failed_attempts/access_logs tables were ever exposed.
const DEFAULT_SALT = 'halqen-dev-salt-change-in-production';
const SALT = process.env.IP_HASH_SALT || DEFAULT_SALT;

if (SALT === DEFAULT_SALT) {
  // Surfaces in Vercel's function logs so a missing production salt isn't silent
  console.warn('[halqen] IP_HASH_SALT is not set — using the insecure default. Set a real value in Vercel env vars.');
}

const ALLOWED_ORIGIN_SUFFIXES = ['halqen.com', '.vercel.app', 'localhost'];

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + SALT).digest('hex');
}

function getClientIp(req: NextRequest): string {
  // Vercel populates this header with the real client IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '0.0.0.0';
}

function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin requests often omit this header — don't block those
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
  const code = body?.code;

  if (!code || typeof code !== 'string' || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
  }

  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  const { data, error } = await supabase.rpc('verify_code', {
    input_code: code,
    client_ip_hash: ipHash,
  });

  if (error) {
    // The rate-limit exception raised in Postgres surfaces here
    if (error.message.includes('Too many attempts')) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }
    // Log the real detail for later review, but never expose it to the caller
    try {
      await supabase.from('client_errors').insert({
        message: error.message,
        context: 'verify-code RPC error',
        page_url: '/api/verify-code',
      });
    } catch {
      // Intentionally silent — logging failures should never break the response
    }
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
  }

  return NextResponse.json({ profile: data[0] });
}

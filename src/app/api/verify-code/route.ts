import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabaseClient';

// This hashing salt should live in an environment variable in production
// (e.g. IP_HASH_SALT) so raw IPs can never be reverse-engineered from the
// hash even if the failed_attempts/access_logs tables were ever exposed.
const SALT = process.env.IP_HASH_SALT || 'halqen-dev-salt-change-in-production';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + SALT).digest('hex');
}

function getClientIp(req: NextRequest): string {
  // Vercel populates this header with the real client IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '0.0.0.0';
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
  }

  return NextResponse.json({ profile: data[0] });
}

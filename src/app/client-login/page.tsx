'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { PageShell, Card, Spinner } from '@/components/Layout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function ClientLoginPage() {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setError(null);
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/client-dashboard` },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <PageShell maxWidth={380}>
      <Card>
        <h1 style={{ fontSize: 16, marginBottom: 6, textAlign: 'center', color: '#F2EEE6', fontWeight: 600 }}>
          Client / property manager login
        </h1>
        {sent ? (
          <div style={{ textAlign: 'center', animation: 'hq-fade-in 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%', background: 'rgba(95,174,143,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5FAE8F', fontSize: 18,
                }}
              >
                ✓
              </div>
            </div>
            <p style={{ color: '#8B93B8', fontSize: 14 }}>Check your email for a sign-in link.</p>
          </div>
        ) : (
          <form onSubmit={sendLink}>
            <p style={{ color: '#8B93B8', fontSize: 13, marginBottom: 18, textAlign: 'center' }}>
              See the vendors who&apos;ve granted you standing access to their verification status.
            </p>
            <Input
              type="email"
              required
              placeholder="you@propertymanagement.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#8B93B8', marginBottom: 14, cursor: 'pointer', lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>
                I agree to Halqen&apos;s{' '}
                <Link href="/terms" target="_blank" style={{ color: '#5AA7FF' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" style={{ color: '#5AA7FF' }}>Privacy Policy</Link>.
              </span>
            </label>
            {error && <p style={{ color: '#e07a63', fontSize: 12, marginBottom: 10 }}>{error}</p>}
            <Button type="submit" full disabled={sending || !agreed}>
              {sending ? <Spinner size={16} /> : 'Send login link'}
            </Button>
          </form>
        )}
      </Card>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#5c6588', marginTop: 20 }}>
        Trouble logging in? <a href="mailto:bill@halqen.com" style={{ color: '#5AA7FF' }}>bill@halqen.com</a>
      </p>
    </PageShell>
  );
}

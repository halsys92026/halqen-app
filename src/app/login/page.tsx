'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div
      style={{
        background: '#0A1330', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 360, background: '#111a3d', border: '1px solid #22305e', borderRadius: 24, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo size={36} wordmarkSize={22} />
        </div>
        <h1 style={{ fontSize: 16, marginBottom: 8, textAlign: 'center', color: '#8B93B8', fontWeight: 500 }}>Owner login</h1>
        {sent ? (
          <p style={{ color: '#8B93B8', fontSize: 14, textAlign: 'center' }}>
            Check your email for a sign-in link — no password needed.
          </p>
        ) : (
          <form onSubmit={sendLink}>
            <p style={{ color: '#8B93B8', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              We&apos;ll email you a secure link — no password to remember.
            </p>
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: 12, borderRadius: 12, border: '1px solid #22305e',
                background: '#0A1330', color: '#F2EEE6', marginBottom: 14, fontSize: 14,
              }}
            />
            {error && <p style={{ color: '#e07a63', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <button
              type="submit"
              style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#5AA7FF,#2F6BFF)', color: '#0A1330', fontWeight: 700, cursor: 'pointer' }}
            >
              Send login link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
        background: '#1C1B19', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 360, background: '#221F1B', border: '1px solid #3a352c', borderRadius: 24, padding: 32 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Owner login</h1>
        {sent ? (
          <p style={{ color: '#8A8478', fontSize: 14 }}>
            Check your email for a sign-in link — no password needed.
          </p>
        ) : (
          <form onSubmit={sendLink}>
            <p style={{ color: '#8A8478', fontSize: 13, marginBottom: 16 }}>
              We&apos;ll email you a secure link — no password to remember.
            </p>
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: 12, borderRadius: 12, border: '1px solid #3a352c',
                background: '#1C1B19', color: '#F2EEE6', marginBottom: 14, fontSize: 14,
              }}
            />
            {error && <p style={{ color: '#c96b56', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <button
              type="submit"
              style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#C08A4E', color: '#1C1B19', fontWeight: 600, cursor: 'pointer' }}
            >
              Send login link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

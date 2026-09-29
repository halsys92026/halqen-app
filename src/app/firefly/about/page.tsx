'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { LoadingScreen } from '@/components/Layout';

function Point({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 8, height: 8, borderRadius: 999, background: '#F5D76E',
          boxShadow: '0 0 8px rgba(245,215,110,0.7)', marginTop: 6, flexShrink: 0,
        }}
      />
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 13, color: '#8B93B8', lineHeight: 1.6 }}>{body}</p>
      </div>
    </div>
  );
}

export default function FireflyAboutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [onList, setOnList] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const { data } = await supabase.rpc('firefly_waitlist_status');
      setOnList(!!data);
      setLoading(false);
    })();
  }, [router]);

  const keepMePosted = async () => {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('firefly_join_waitlist');
    setBusy(false);
    if (rpcError) { setError(rpcError.message); return; }
    setOnList(true);
  };

  if (loading) return <LoadingScreen label="Loading Firefly…" />;

  return (
    <div style={{ background: 'radial-gradient(circle at 20% 0%, #16204f 0%, #0A1330 45%)', minHeight: '100vh', color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <Logo size={30} wordmarkSize={18} />
          <a href="/firefly" style={{ color: '#8B93B8', fontSize: 13, textDecoration: 'none' }}>← Firefly</a>
        </div>

        <h1 style={{ fontSize: 24, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
          Firefly <span style={{ color: '#F5D76E', textShadow: '0 0 10px rgba(245,215,110,0.6)' }}>•</span>
        </h1>
        <p style={{ fontSize: 13, color: '#8B93B8', marginBottom: 24, letterSpacing: '0.04em' }}>Ping. Verify. Connect.</p>

        <div style={{ background: '#111a3f', border: '1px solid #22305e', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: '#C7CCE6', lineHeight: 1.7, marginBottom: 0 }}>
            Firefly is a real-time service-matching feature built into Halqen. When a property manager,
            homeowner, or business needs help — plumbing, electrical, a lockout, a leak — they send a
            short, anonymous ping describing what they need and where. Nearby verified providers who are
            currently available get notified instantly and can respond directly.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
          <Point
            title="Verified, not a stranger"
            body="Every provider on Firefly is tied to a Halqen identity, so the license, insurance, and other credentials behind a response are already confirmed."
          />
          <Point
            title="Anonymous until you connect"
            body="Pings show a service type and a general area, not a name, until a provider responds and the two of you are connected."
          />
          <Point
            title="Set it and forget it"
            body="Providers can go available on demand or set a recurring weekly schedule for the locations they cover, so pings find them automatically."
          />
          <Point
            title="Why it isn't on yet"
            body="Matching only works when there are enough verified providers nearby to answer a ping. We're building that provider base area by area before turning Firefly on."
          />
        </div>

        <div style={{ background: '#111a3f', border: '1px solid #22305e', borderRadius: 14, padding: '24px', textAlign: 'center' }}>
          {onList ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>You&apos;re on the list ✓</p>
              <p style={{ fontSize: 13, color: '#8B93B8' }}>We&apos;ll email you the moment Firefly is live in your area.</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Want to know when it launches?</p>
              <p style={{ fontSize: 13, color: '#8B93B8', marginBottom: 16 }}>
                We&apos;ll send one email to your account address when Firefly opens up — nothing else.
              </p>
              <Button onClick={keepMePosted} disabled={busy}>
                {busy ? 'Adding you…' : 'Keep me posted'}
              </Button>
              {error && <p style={{ fontSize: 12, color: '#e07a63', marginTop: 12 }}>{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

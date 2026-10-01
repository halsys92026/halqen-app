'use client';

import { useState, FormEvent } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

function Point({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 8, height: 8, borderRadius: 999, background: '#5AA7FF',
          boxShadow: '0 0 8px rgba(90,167,255,0.7)', marginTop: 6, flexShrink: 0,
        }}
      />
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 13, color: '#8B93B8', lineHeight: 1.6 }}>{body}</p>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #22305e',
  background: '#0A1330',
  color: '#F2EEE6',
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#8B93B8',
  marginBottom: 6,
  letterSpacing: '0.04em',
};

export default function BetaSignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [useCase, setUseCase] = useState('');
  const [platform, setPlatform] = useState('');
  const [heardFrom, setHeardFrom] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, area, useCase, platform, heardFrom, notes, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Something went wrong.');
        setBusy(false);
        return;
      }
      setDone(true);
      setBusy(false);
    } catch {
      setError('Something went wrong. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <div style={{ background: 'radial-gradient(circle at 20% 0%, #16204f 0%, #0A1330 45%)', minHeight: '100vh', color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 48 }}>
        <div style={{ marginBottom: 28 }}>
          <Logo size={30} wordmarkSize={18} />
        </div>

        <h1 style={{ fontSize: 26, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, marginBottom: 6 }}>
          Become a Halqen beta tester
        </h1>
        <p style={{ fontSize: 13, color: '#8B93B8', marginBottom: 24, lineHeight: 1.6 }}>
          We&apos;re opening up early access ahead of launch. Here&apos;s what Halqen is, and what we&apos;d
          ask of you as a tester.
        </p>

        <div style={{ background: '#111a3f', border: '1px solid #22305e', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#5AA7FF', marginBottom: 10 }}>
            WHAT HALQEN IS
          </p>
          <p style={{ fontSize: 14, color: '#C7CCE6', lineHeight: 1.7, marginBottom: 0 }}>
            Halqen is a code-gated identity card. Instead of handing over your phone number, email, or a photo
            of your license just to prove who you are, you share a short code — or tap an NFC card — and the
            other person instantly sees your verified name, photo, business, and title. Nothing more, and
            nothing stored on their end. It&apos;s built for property managers, landlords, contractors, and
            field techs who show up at someone&apos;s door and need to be trusted fast, without oversharing
            personal contact information to get there.
          </p>
        </div>

        <div style={{ background: 'rgba(224,122,99,0.1)', border: '1px solid rgba(224,122,99,0.35)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 12.5, color: '#e0a999', lineHeight: 1.6, marginBottom: 0 }}>
            Halqen verifies that a profile belongs to the person presenting it — it is not a substitute for a
            government-issued ID, driver&apos;s license, passport, or any other legal document, and should not
            be relied on as one.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 20 }}>
          <Point
            title="What we'd like you to do"
            body="Set up your real profile, then actually use your code or card in the field for a couple of weeks — with tenants, clients, coworkers, whoever you'd normally have to identify yourself to."
          />
          <Point
            title="Tell us where it breaks"
            body="Confusing screen, a code that didn't scan, something that felt off — we want the rough edges before this goes wide, not after."
          />
          <Point
            title="No cost, no catch"
            body="Beta access is free. You keep your account after launch either way."
          />
        </div>

        {done ? (
          <div style={{ background: '#111a3f', border: '1px solid #22305e', borderRadius: 14, padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>You&apos;re in ✓</p>
            <p style={{ fontSize: 13, color: '#8B93B8' }}>
              We&apos;ll reach out at {email} with next steps to set up your account.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: '#111a3f', border: '1px solid #22305e', borderRadius: 14, padding: '24px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#5AA7FF', marginBottom: 16 }}>
              TESTER INTAKE
            </p>

            {/* Honeypot — hidden from real visitors, filled in by bots */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />

            <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Rivera" />
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            <Input label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
            <Input label="City / area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Portland, OR" />

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>How would you mainly use it?</label>
              <select style={selectStyle} value={useCase} onChange={(e) => setUseCase(e.target.value)}>
                <option value="">Select one</option>
                <option value="personal">Personal identity</option>
                <option value="property_manager">Property manager / landlord</option>
                <option value="contractor">Contractor / field service</option>
                <option value="company">Company with employees</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Phone platform</label>
              <select style={selectStyle} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="">Select one</option>
                <option value="ios">iPhone (iOS)</option>
                <option value="android">Android</option>
                <option value="both">Both</option>
                <option value="unsure">Not sure</option>
              </select>
            </div>

            <Input label="How'd you hear about Halqen? (optional)" value={heardFrom} onChange={(e) => setHeardFrom(e.target.value)} placeholder="Referral, social, etc." />

            <div style={{ marginBottom: 4 }}>
              <label style={labelStyle}>Anything else? (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ ...selectStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {error && <p style={{ fontSize: 12, color: '#e07a63', margin: '12px 0 0' }}>{error}</p>}

            <div style={{ marginTop: 18 }}>
              <Button type="submit" full disabled={busy}>
                {busy ? 'Submitting…' : 'Sign me up'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

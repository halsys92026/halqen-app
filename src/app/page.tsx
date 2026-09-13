'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';

export default function Home() {
  return (
    <div
      style={{
        background: 'radial-gradient(circle at 25% 10%, #16204f 0%, #0A1330 55%)',
        minHeight: '100vh',
        color: '#F2EEE6',
        fontFamily: 'Inter, sans-serif',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ animation: 'hq-fade-in 0.5s ease', marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          <Logo size={56} wordmarkSize={30} />
        </div>
        <p
          style={{
            color: '#8B93B8',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontSize: 11,
            marginBottom: 28,
            animation: 'hq-fade-in 0.5s ease 0.1s backwards',
          }}
        >
          Identity. <span style={{ color: '#5AA7FF' }}>Verified</span>. Trusted.
        </p>

        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, lineHeight: 1.3,
            marginBottom: 18, animation: 'hq-fade-in 0.5s ease 0.12s backwards',
          }}
        >
          Welcome to Halqen — let&apos;s get started
        </h1>

        <p style={{ fontSize: 15, color: '#c9cfe8', lineHeight: 1.6, marginBottom: 32, animation: 'hq-fade-in 0.5s ease 0.15s backwards' }}>
          Halqen is a digital identity card for contractors and tradespeople.
          Tap or scan it to see a real, verified profile — name, license,
          insurance status — not just a phone number.
        </p>

        <div
          style={{
            display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 36,
            animation: 'hq-fade-in 0.5s ease 0.2s backwards', flexWrap: 'wrap',
          }}
        >
          {[
            { n: '1', t: 'Get your card', d: 'Sign up free and set up your profile in minutes.' },
            { n: '2', t: 'Add your credentials', d: 'License, insurance, bond — verified, not just claimed.' },
            { n: '3', t: 'Share with confidence', d: 'Tap or scan puts your verified info in front of anyone.' },
          ].map((step) => (
            <div key={step.n} style={{ width: 130, textAlign: 'left' }}>
              <div style={{ color: '#5AA7FF', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{step.n}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{step.t}</div>
              <div style={{ fontSize: 11.5, color: '#8B93B8', lineHeight: 1.5 }}>{step.d}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', animation: 'hq-fade-in 0.5s ease 0.25s backwards', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Get started</Button>
          </Link>
          <Link href="/scan" style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Try the scan</Button>
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#5c6588', marginTop: 18, animation: 'hq-fade-in 0.5s ease 0.28s backwards' }}>
          Already have an account? <Link href="/login" style={{ color: '#5AA7FF' }}>Log in</Link>
        </p>

        <div
          style={{
            marginTop: 40, paddingTop: 28, borderTop: '1px solid #22305e',
            animation: 'hq-fade-in 0.5s ease 0.3s backwards',
          }}
        >
          <p style={{ fontSize: 13, color: '#8B93B8', marginBottom: 10 }}>
            Checking a vendor&apos;s status?
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 13 }}>
            <Link href="/client-login" style={{ color: '#5AA7FF', textDecoration: 'underline' }}>Sign up</Link>
            <span style={{ color: '#3a4270' }}>·</span>
            <Link href="/client-login" style={{ color: '#5AA7FF', textDecoration: 'underline' }}>Log in</Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center', animation: 'hq-fade-in 0.5s ease 0.35s backwards' }}>
          <Link href="/terms" style={{ color: '#5c6588', fontSize: 11, textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/privacy" style={{ color: '#5c6588', fontSize: 11, textDecoration: 'none' }}>Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F2EEE6',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ animation: 'hq-fade-in 0.5s ease', marginBottom: 20 }}>
        <Logo size={64} wordmarkSize={34} />
      </div>
      <p
        style={{
          color: '#8B93B8',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontSize: 11,
          marginBottom: 40,
          animation: 'hq-fade-in 0.5s ease 0.1s backwards',
        }}
      >
        Identity. <span style={{ color: '#5AA7FF' }}>Verified</span>. Trusted.
      </p>
      <div style={{ display: 'flex', gap: 12, animation: 'hq-fade-in 0.5s ease 0.2s backwards' }}>
        <Link href="/scan" style={{ textDecoration: 'none' }}>
          <Button variant="primary">Try the scan</Button>
        </Link>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <Button variant="secondary">Owner login</Button>
        </Link>
      </div>
      <Link
        href="/client-login"
        style={{ color: '#8B93B8', fontSize: 12, marginTop: 28, textDecoration: 'underline', animation: 'hq-fade-in 0.5s ease 0.3s backwards' }}
      >
        Property manager or client? Sign in here
      </Link>
      <div style={{ display: 'flex', gap: 16, marginTop: 40, animation: 'hq-fade-in 0.5s ease 0.35s backwards' }}>
        <Link href="/terms" style={{ color: '#5c6588', fontSize: 11, textDecoration: 'none' }}>Terms of Service</Link>
        <Link href="/privacy" style={{ color: '#5c6588', fontSize: 11, textDecoration: 'none' }}>Privacy Policy</Link>
      </div>
    </div>
  );
}

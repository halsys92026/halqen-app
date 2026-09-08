'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div style={{ background: '#0A1330', minHeight: '100vh', color: '#F2EEE6', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/">
            <Logo size={28} wordmarkSize={16} />
          </Link>
        </div>
        <h1 style={{ fontSize: 28, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, marginBottom: 6 }}>
          {title}
        </h1>
        <p style={{ fontSize: 12, color: '#8B93B8', marginBottom: 36 }}>Last updated: {updated}</p>
        <div style={{ fontSize: 14.5, lineHeight: 1.75, color: '#d6dbef' }}>{children}</div>
      </div>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F2EEE6', marginTop: 36, marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontSize: 14.5, fontWeight: 600, color: '#F2EEE6', marginTop: 20, marginBottom: 8 }}>
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ marginBottom: 14 }}>{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul style={{ marginBottom: 14, paddingLeft: 22, listStyle: 'disc' }}>{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: '#111a3d', border: '1px solid #22305e', borderRadius: 12,
        padding: '14px 16px', marginTop: 32, fontSize: 12.5, color: '#8B93B8', lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

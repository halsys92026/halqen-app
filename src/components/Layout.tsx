'use client';

import { ReactNode } from 'react';
import { Logo } from './Logo';

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#111a3d',
        border: '1px solid #22305e',
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 24px 48px -16px rgba(0,0,0,0.55)',
        animation: 'hq-fade-in 0.35s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PageShell({
  children,
  maxWidth = 420,
  showLogo = true,
}: {
  children: ReactNode;
  maxWidth?: number;
  showLogo?: boolean;
}) {
  return (
    <div
      style={{
        background: 'radial-gradient(circle at 25% 10%, #16204f 0%, #0A1330 55%)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 20px',
      }}
    >
      <div style={{ width: '100%', maxWidth }}>
        {showLogo && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <Logo size={34} wordmarkSize={20} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function expirationBadge(expirationDate: string | null): { text: string; color: string; bg: string } | null {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { text: '⛔ Expired', color: '#e07a63', bg: 'rgba(224,122,99,0.12)' };
  if (daysLeft <= 30) return { text: `⚠️ Expires in ${daysLeft}d`, color: '#e0a663', bg: 'rgba(224,166,99,0.12)' };
  return null;
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2.5px solid #22305e',
        borderTopColor: '#5AA7FF',
        animation: 'hq-spin 0.7s linear infinite',
      }}
    />
  );
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      style={{
        background: '#0A1330',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        color: '#8B93B8',
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
      }}
    >
      <Spinner size={26} />
      {label}
    </div>
  );
}

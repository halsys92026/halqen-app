'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  children: ReactNode;
}

const base: React.CSSProperties = {
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  padding: '13px 22px',
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #5AA7FF, #2F6BFF)',
    color: '#0A1330',
    boxShadow: '0 10px 24px -10px rgba(47,107,255,0.6)',
  },
  secondary: {
    background: 'transparent',
    color: '#F2EEE6',
    border: '1px solid #22305e',
  },
  ghost: {
    background: 'transparent',
    color: '#8B93B8',
    padding: '8px 4px',
  },
  danger: {
    background: 'transparent',
    color: '#e07a63',
    padding: '8px 4px',
  },
};

export function Button({ variant = 'primary', full, style, children, ...rest }: Props) {
  return (
    <button
      style={{
        ...base,
        ...variants[variant],
        width: full ? '100%' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

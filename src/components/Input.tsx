'use client';

import { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...rest }: Props) {
  return (
    <div style={{ marginBottom: 12, width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, color: '#8B93B8', marginBottom: 6, letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px solid #22305e',
          background: '#0A1330',
          color: '#F2EEE6',
          fontSize: 14,
          ...style,
        }}
        {...rest}
      />
    </div>
  );
}

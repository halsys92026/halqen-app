'use client';

import { Component, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Best-effort logging — if this insert itself fails, we deliberately
    // swallow it rather than throwing a second error on top of the first.
    (async () => {
      try {
        await supabase.from('client_errors').insert({
          message: error.message,
          context: error.stack?.slice(0, 2000) || null,
          page_url: typeof window !== 'undefined' ? window.location.pathname : null,
        });
      } catch {
        // Intentionally silent — logging errors should never crash on their own
      }
    })();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: '#0A1330', minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: '#F2EEE6', fontFamily: 'Inter, sans-serif',
            padding: 24, textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 8 }}>Something went wrong.</p>
          <p style={{ fontSize: 13, color: '#8B93B8', marginBottom: 20 }}>
            This has been noted. Try reloading, or contact{' '}
            <a href="mailto:bill@halqen.com" style={{ color: '#5AA7FF' }}>bill@halqen.com</a> if it continues.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#5AA7FF', color: '#0A1330', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

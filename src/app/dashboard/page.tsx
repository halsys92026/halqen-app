'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Identity = {
  id: string;
  code: string;
  business: string;
  display_name: string;
  title: string;
  phone: string;
  email: string;
  color: string;
  is_active: boolean;
  photo_url: string | null;
};

const BLANK: Omit<Identity, 'id'> = {
  code: '', business: '', display_name: '', title: '', phone: '', email: '', color: '#2F6F6B',
  is_active: true, photo_url: null,
};

function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #3a352c' }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', background: '#2F6F6B33', color: '#5FAE8F',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace',
        fontSize: size * 0.36, border: '1px solid #3a352c', flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Identity | (Omit<Identity, 'id'> & { id?: undefined }) | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
      await loadIdentities();
      setLoading(false);
    })();
  }, [router]);

  async function loadIdentities() {
    const { data } = await supabase.from('identities').select('*').order('created_at');
    if (data) setIdentities(data as Identity[]);
  }

  async function uploadPhoto(file: File) {
    if (!userId || !editing) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('identity-photos').upload(path, file, {
      upsert: true,
    });

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('identity-photos').getPublicUrl(path);
    setEditing({ ...editing, photo_url: data.publicUrl });
    setUploading(false);
  }

  async function save() {
    if (!editing) return;
    setSaveError(null);

    if (!/^\d{4}$/.test(editing.code)) {
      setSaveError('Code must be exactly 4 digits');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if ('id' in editing && editing.id) {
      const { error } = await supabase.from('identities').update(editing).eq('id', editing.id);
      if (error) { setSaveError(error.message); return; }
    } else {
      const { error } = await supabase.from('identities').insert({ ...editing, owner_id: user.id });
      if (error) { setSaveError(error.message); return; }
    }
    setEditing(null);
    setUploadError(null);
    await loadIdentities();
  }

  async function revoke(id: string) {
    await supabase.from('identities').update({ is_active: false }).eq('id', id);
    await loadIdentities();
  }

  async function reactivate(id: string) {
    await supabase.from('identities').update({ is_active: true }).eq('id', id);
    await loadIdentities();
  }

  async function remove(id: string) {
    await supabase.from('identities').delete().eq('id', id);
    await loadIdentities();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div style={{ background: '#1C1B19', minHeight: '100vh', color: '#8A8478', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ background: '#1C1B19', minHeight: '100vh', color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22 }}>Your identities ({identities.length}/5)</h1>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#8A8478', cursor: 'pointer', fontSize: 13 }}>
            Log out
          </button>
        </div>

        {identities.map((id) => (
          <div key={id.id} style={{ background: '#221F1B', border: '1px solid #3a352c', borderRadius: 14, padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: id.is_active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar url={id.photo_url} name={id.display_name || id.business} size={36} />
              <div>
                <span style={{ fontFamily: 'monospace', color: '#C08A4E', marginRight: 10 }}>{id.code}</span>
                <span>{id.business}</span>
                {!id.is_active && <span style={{ color: '#c96b56', fontSize: 11, marginLeft: 8 }}>REVOKED</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(id)} style={{ background: 'none', border: 'none', color: '#8A8478', cursor: 'pointer' }}>Edit</button>
              {id.is_active ? (
                <button onClick={() => revoke(id.id)} style={{ background: 'none', border: 'none', color: '#c96b56', cursor: 'pointer' }}>Revoke</button>
              ) : (
                <button onClick={() => reactivate(id.id)} style={{ background: 'none', border: 'none', color: '#5FAE8F', cursor: 'pointer' }}>Reactivate</button>
              )}
              <button onClick={() => remove(id.id)} style={{ background: 'none', border: 'none', color: '#8A8478', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}

        {identities.length < 5 && !editing && (
          <button
            onClick={() => setEditing({ ...BLANK })}
            style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px dashed #3a352c', background: 'none', color: '#C08A4E', cursor: 'pointer' }}
          >
            + Add identity
          </button>
        )}

        {editing && (
          <div style={{ background: '#221F1B', border: '1px solid #3a352c', borderRadius: 14, padding: 20, marginTop: 12 }}>
            {saveError && <p style={{ color: '#c96b56', fontSize: 12, marginBottom: 10 }}>{saveError}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Avatar url={editing.photo_url} name={editing.display_name || editing.business} size={48} />
              <label style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid #3a352c', color: '#8A8478', cursor: 'pointer' }}>
                {uploading ? 'Uploading…' : editing.photo_url ? 'Change photo' : 'Add photo'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }}
                  style={{ display: 'none' }}
                />
              </label>
              {editing.photo_url && !uploading && (
                <button
                  onClick={() => setEditing({ ...editing, photo_url: null })}
                  style={{ background: 'none', border: 'none', color: '#8A8478', fontSize: 12, cursor: 'pointer' }}
                >
                  Remove
                </button>
              )}
            </div>
            {uploadError && <p style={{ color: '#c96b56', fontSize: 12, marginBottom: 10 }}>{uploadError}</p>}

            {(
              [
                ['code', 'Code (4 digits)'],
                ['business', 'Business name'],
                ['display_name', 'Your name'],
                ['title', 'Title'],
                ['phone', 'Phone'],
                ['email', 'Email'],
              ] as [keyof typeof BLANK, string][]
            ).map(([field, label]) => (
              <input
                key={field}
                placeholder={label}
                value={editing[field] as string || ''}
                onChange={(e) => setEditing({ ...editing, [field]: e.target.value })}
                style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #3a352c', background: '#1C1B19', color: '#F2EEE6' }}
              />
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={save} disabled={uploading} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#C08A4E', color: '#1C1B19', fontWeight: 600, cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={() => { setEditing(null); setUploadError(null); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #3a352c', background: 'none', color: '#F2EEE6', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingScreen, Spinner } from '@/components/Layout';

// ------------------------------------------------------------------ constants

const SERVICES: { value: string; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'Heating & cooling' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'appliance_repair', label: 'Appliance repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'pest_control', label: 'Pest control' },
  { value: 'painting', label: 'Painting' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'water_fire_restoration', label: 'Water / fire restoration' },
  { value: 'general_contractor', label: 'General contractor' },
];

const USER_TYPES: { value: string; label: string }[] = [
  { value: 'property_manager', label: 'Property manager' },
  { value: 'homeowner', label: 'Homeowner' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'business', label: 'Business / facility manager' },
  { value: 'real_estate_agent', label: 'Real estate agent' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'other', label: 'Other' },
];

const CREDENTIAL_LABELS: Record<string, string> = {
  contractor_license: 'Licensed',
  insurance_coi: 'Insured',
  bond: 'Bonded',
  business_license: 'Business license',
  background_check: 'Background checked',
};

const serviceLabel = (v: string) => SERVICES.find((s) => s.value === v)?.label || v;
const userTypeLabel = (v: string) => USER_TYPES.find((t) => t.value === v)?.label || 'Halqen user';

// ------------------------------------------------------------------ types

type Profile = {
  display_name: string;
  user_type: string;
  provider_identity_id: string | null;
  services: string[];
  available_until: string | null;
  schedule_active: boolean;
};

type Identity = { id: string; business: string; display_name: string; is_active: boolean };

type InboxPing = {
  ping_id: string;
  service: string;
  requester_type: string;
  requester_label: string | null;
  distance_km: number | null;
  note: string | null;
  photo_path: string | null;
  expires_at: string;
};

type MyPingRow = {
  ping_id: string;
  service: string;
  created_at: string;
  expires_at: string;
  is_open: boolean;
  connection_id: string | null;
  business: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  photo_path: string | null;
  verified: string[] | null;
};

type SavedLocation = { id: string; label: string; lat: number; lng: number };

type ScheduleWindow = {
  id: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  location_id: string;
  location_label: string;
  enabled: boolean;
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function minuteToTime(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

type Connection = {
  connection_id: string;
  my_role: 'requester' | 'provider';
  other_label: string;
  service: string;
  created_at: string;
  blocked: boolean;
};

type Block = { block_id: string; blocked_label: string; private_note: string | null; created_at: string };

// ------------------------------------------------------------------ helpers

const card: React.CSSProperties = {
  background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 20, marginBottom: 14,
  animation: 'hq-fade-in 0.3s ease',
};
const h2: React.CSSProperties = { fontSize: 15, fontWeight: 600, marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif" };
const muted: React.CSSProperties = { fontSize: 12, color: '#8B93B8' };
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #22305e', background: '#0A1330',
  color: '#F2EEE6', fontSize: 14, marginBottom: 12,
};

function minutesLeft(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
}

function getLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not available on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Allow location access so Firefly can find people near you. It is rounded to about 1 km and never stored as a history.')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

function friendlyError(message: string) {
  // Postgres exceptions raised in the Firefly functions are already user-facing
  return message.replace(/^.*?ERROR:\s*/, '');
}

// Limited to formats every browser can actually display in an <img> tag --
// notably excludes TIFF and other formats that count as "image/*" but that
// browsers cannot render, which would otherwise upload fine and then show
// nothing.
const RENDERABLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function uploadPingPhoto(file: File, uid: string): Promise<string> {
  if (!RENDERABLE_IMAGE_TYPES.includes(file.type)) throw new Error('Please choose a JPG, PNG, WEBP or GIF image');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5MB');
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('firefly-ping-photos').upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

async function getSignedPhotoUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage.from('firefly-ping-photos').createSignedUrl(path, 600);
  if (error) return { url: null, error: error.message };
  if (!data?.signedUrl) return { url: null, error: 'No signed URL returned' };
  return { url: data.signedUrl, error: null };
}

function PhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    getSignedPhotoUrl(path).then((r) => {
      if (!alive) return;
      setUrl(r.url);
      setError(r.error);
    });
    return () => { alive = false; };
  }, [path]);
  if (error) {
    return <p style={{ fontSize: 11, color: '#e07a63', marginTop: 8 }}>Photo failed to load: {error}</p>;
  }
  if (!url) return null;
  if (imgFailed) {
    return <p style={{ fontSize: 11, color: '#e07a63', marginTop: 8 }}>Photo link resolved but the image itself would not load.</p>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Photo from the ping" onError={() => setImgFailed(true)} style={{ width: '100%', maxWidth: 260, borderRadius: 10, marginTop: 10, display: 'block' }} />;
}

// Shared across tabs: the caller's saved locations, for picking instead of
// a live GPS lookup each time.
function useSavedLocations() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const reload = useCallback(() => {
    supabase.rpc('firefly_list_locations').then(({ data }) => {
      if (data) setLocations(data as SavedLocation[]);
    });
  }, []);
  useEffect(() => { reload(); }, [reload]);

  async function addLocation(label: string, lat: number, lng: number) {
    await supabase.rpc('firefly_save_location', { p_label: label, p_lat: lat, p_lng: lng });
    reload();
  }
  async function removeLocation(id: string) {
    await supabase.rpc('firefly_delete_location', { p_id: id });
    reload();
  }
  return { locations, addLocation, removeLocation, reload };
}

// ------------------------------------------------------------------ profile

function ProfileSection({ profile, identities, onSaved }: {
  profile: Profile | null;
  identities: Identity[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(!profile);
  const [draft, setDraft] = useState({
    display_name: profile?.display_name || '',
    user_type: profile?.user_type || 'property_manager',
    provider: !!profile?.provider_identity_id,
    provider_identity_id: profile?.provider_identity_id || '',
    services: profile?.services || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeIdentities = identities.filter((i) => i.is_active);

  async function save() {
    setError(null);
    if (draft.provider && (!draft.provider_identity_id || draft.services.length === 0)) {
      setError('To receive pings, pick which identity to show and at least one service.');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.rpc('firefly_save_profile', {
      p_display_name: draft.display_name,
      p_user_type: draft.user_type,
      p_provider_identity_id: draft.provider ? draft.provider_identity_id : null,
      p_services: draft.provider ? draft.services : [],
    });
    setSaving(false);
    if (err) { setError(friendlyError(err.message)); return; }
    setEditing(false);
    onSaved();
  }

  if (!editing && profile) {
    const identity = identities.find((i) => i.id === profile.provider_identity_id);
    return (
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <p style={{ fontSize: 14 }}>{profile.display_name || userTypeLabel(profile.user_type)}</p>
            <p style={muted}>{userTypeLabel(profile.user_type)}</p>
            {identity ? (
              <p style={{ ...muted, marginTop: 6 }}>
                Receives pings as <span style={{ color: '#F2EEE6' }}>{identity.business || identity.display_name}</span> for{' '}
                {profile.services.map(serviceLabel).join(', ')}
              </p>
            ) : (
              <p style={{ ...muted, marginTop: 6 }}>Sends pings only</p>
            )}
          </div>
          <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <h2 style={h2}>{profile ? 'Edit your Firefly profile' : 'Set up Firefly'}</h2>
      <p style={{ ...muted, marginBottom: 14 }}>
        Anyone can send a ping for help: property managers, homeowners, landlords, businesses, agents and contractors.
      </p>
      <label style={{ ...muted, display: 'block', marginBottom: 6 }}>I am a</label>
      <select value={draft.user_type} onChange={(e) => setDraft({ ...draft, user_type: e.target.value })} style={selectStyle}>
        {USER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <Input
        label="Name or company (optional, shown to a provider only after they answer your ping)"
        value={draft.display_name}
        maxLength={80}
        onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
      />

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, margin: '8px 0 12px', cursor: 'pointer' }}>
        <input type="checkbox" checked={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.checked })} />
        I also provide services and want to receive pings
      </label>

      {draft.provider && (
        <div style={{ borderLeft: '2px solid #22305e', paddingLeft: 14, marginBottom: 12 }}>
          {activeIdentities.length === 0 ? (
            <p style={{ fontSize: 12, color: '#e0a663' }}>
              You need an active identity first. <a href="/dashboard" style={{ color: '#5AA7FF' }}>Create one on your dashboard</a>.
            </p>
          ) : (
            <>
              <label style={{ ...muted, display: 'block', marginBottom: 6 }}>Identity shown when you answer a ping</label>
              <select
                value={draft.provider_identity_id}
                onChange={(e) => setDraft({ ...draft, provider_identity_id: e.target.value })}
                style={selectStyle}
              >
                <option value="">Choose…</option>
                {activeIdentities.map((i) => <option key={i.id} value={i.id}>{i.business || i.display_name}</option>)}
              </select>
              <label style={{ ...muted, display: 'block', marginBottom: 8 }}>Services you offer</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SERVICES.map((s) => {
                  const on = draft.services.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setDraft({
                        ...draft,
                        services: on ? draft.services.filter((v) => v !== s.value) : [...draft.services, s.value],
                      })}
                      style={{
                        fontSize: 12, padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                        border: `1px solid ${on ? '#5AA7FF' : '#22305e'}`,
                        background: on ? 'rgba(90,167,255,0.12)' : 'transparent',
                        color: on ? '#5AA7FF' : '#8B93B8',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p style={{ color: '#e07a63', fontSize: 12, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button full onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        {profile && <Button full variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ need help (requester)

function NeedHelpTab({ userId }: { userId: string }) {
  const [service, setService] = useState('plumbing');
  const [radius, setRadius] = useState(15);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MyPingRow[]>([]);
  const [locationId, setLocationId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [newLocationLabel, setNewLocationLabel] = useState('');
  const { locations, addLocation, removeLocation } = useSavedLocations();

  const [tick, setTick] = useState(0);
  const load = () => setTick((n) => n + 1);

  useEffect(() => {
    let alive = true;
    const run = () => supabase.rpc('firefly_my_pings').then(({ data }) => {
      if (alive && data) setRows(data as MyPingRow[]);
    });
    run();
    const t = setInterval(run, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [tick]);

  async function saveCurrentLocation() {
    if (!newLocationLabel.trim()) { setError('Give this location a name first, e.g. "Main office".'); return; }
    setSavingLocation(true); setError(null);
    try {
      const { lat, lng } = await getLocation();
      await addLocation(newLocationLabel.trim(), lat, lng);
      setNewLocationLabel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that location.');
    }
    setSavingLocation(false);
  }

  async function send() {
    setError(null); setStatus(null); setSending(true);
    try {
      let lat: number, lng: number;
      if (locationId) {
        const loc = locations.find((l) => l.id === locationId);
        if (!loc) throw new Error('That saved location is gone. Pick another or use your current location.');
        lat = loc.lat; lng = loc.lng;
      } else {
        ({ lat, lng } = await getLocation());
      }
      let photoPath: string | null = null;
      if (photo) photoPath = await uploadPingPhoto(photo, userId);
      const { data, error: err } = await supabase.rpc('firefly_send_ping', {
        p_service: service, p_lat: lat, p_lng: lng, p_radius_km: radius, p_note: note, p_photo_path: photoPath,
      });
      if (err) throw new Error(friendlyError(err.message));
      const n = (data as { recipients: number }[])?.[0]?.recipients ?? 0;
      setStatus(n === 0
        ? 'Ping sent, but no verified providers for that service are available nearby right now. Try a wider radius or check back soon.'
        : `Ping sent to ${n} available provider${n === 1 ? '' : 's'}. Answers show up below; the ping closes in 30 minutes.`);
      setNote(''); setPhoto(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
    setSending(false);
  }

  async function closePing(pingId: string) {
    await supabase.rpc('firefly_close_ping', { p_ping_id: pingId });
    load();
  }

  // Group rows (one per answer) back into pings
  const pings: { ping_id: string; service: string; created_at: string; expires_at: string; is_open: boolean; photo_path: string | null; answers: MyPingRow[] }[] = [];
  for (const r of rows) {
    let p = pings.find((x) => x.ping_id === r.ping_id);
    if (!p) { p = { ping_id: r.ping_id, service: r.service, created_at: r.created_at, expires_at: r.expires_at, is_open: r.is_open, photo_path: r.photo_path, answers: [] }; pings.push(p); }
    if (r.connection_id) p.answers.push(r);
  }

  return (
    <>
      <div style={card}>
        <h2 style={h2}>Send a ping</h2>
        <label style={{ ...muted, display: 'block', marginBottom: 6 }}>What do you need?</label>
        <select value={service} onChange={(e) => setService(e.target.value)} style={selectStyle}>
          {SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label style={{ ...muted, display: 'block', marginBottom: 6 }}>How far: {radius} km (about {Math.round(radius * 0.62)} miles)</label>
        <input type="range" min={2} max={80} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: '100%', marginBottom: 14 }} />

        <label style={{ ...muted, display: 'block', marginBottom: 6 }}>Where from</label>
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={selectStyle}>
          <option value="">Use my current location</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            placeholder="Save current location as… e.g. Main office"
            value={newLocationLabel}
            maxLength={60}
            onChange={(e) => setNewLocationLabel(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }}
          />
          <Button variant="ghost" onClick={saveCurrentLocation} disabled={savingLocation}>
            {savingLocation ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {locations.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {locations.map((l) => (
              <span key={l.id} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: 'rgba(139,147,184,0.12)', color: '#8B93B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                {l.label}
                <button type="button" onClick={() => { removeLocation(l.id); if (locationId === l.id) setLocationId(''); }} style={{ background: 'none', border: 'none', color: '#8B93B8', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
        )}

        <Input
          label="Short note (optional, no addresses or names)"
          value={note}
          maxLength={140}
          placeholder="e.g. Water heater leaking"
          onChange={(e) => setNote(e.target.value)}
        />
        <label style={{ ...muted, display: 'block', marginBottom: 6 }}>Photo (optional)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          style={{ ...muted, marginBottom: 14, display: 'block' }}
        />
        <Button full onClick={send} disabled={sending}>
          {sending && <Spinner size={14} />}
          {sending ? 'Sending…' : 'Send ping'}
        </Button>
        <p style={{ ...muted, marginTop: 10 }}>
          Only verified providers who are available right now see it, and they see only the service, a rough distance and your category. Blocked people never receive your pings.
        </p>
        {status && <p style={{ fontSize: 13, color: '#5FAE8F', marginTop: 10 }}>{status}</p>}
        {error && <p style={{ fontSize: 13, color: '#e07a63', marginTop: 10 }}>{error}</p>}
      </div>

      <h2 style={{ ...h2, marginTop: 20 }}>Your pings (last 24 hours)</h2>
      {pings.length === 0 && <p style={muted}>No pings yet.</p>}
      {pings.map((p) => (
        <div key={p.ping_id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: p.answers.length ? 12 : 0 }}>
            <div>
              <p style={{ fontSize: 14 }}>{serviceLabel(p.service)}</p>
              <p style={muted}>
                {new Date(p.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ·{' '}
                {p.is_open ? `open, ${minutesLeft(p.expires_at)} min left` : 'closed'}
              </p>
            </div>
            {p.is_open && <Button variant="ghost" onClick={() => closePing(p.ping_id)}>Close</Button>}
          </div>
          {p.photo_path && <PhotoThumb path={p.photo_path} />}
          {p.answers.length === 0 && p.is_open && <p style={muted}>Waiting for an answer…</p>}
          {p.answers.map((a) => (
            <div key={a.connection_id} style={{ background: '#0A1330', border: '1px solid #22305e', borderRadius: 12, padding: 14, marginTop: 8 }}>
              <p style={{ fontSize: 15, fontWeight: 600 }}>{a.business}</p>
              {a.contact_name && <p style={muted}>{a.contact_name}</p>}
              <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                {a.phone && <a href={`tel:${a.phone}`} style={{ color: '#5AA7FF', fontSize: 13 }}>{a.phone}</a>}
                {a.email && <a href={`mailto:${a.email}`} style={{ color: '#5AA7FF', fontSize: 13 }}>{a.email}</a>}
              </div>
              {a.verified && a.verified.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {a.verified.map((v) => (
                    <span key={v} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, color: '#5FAE8F', background: 'rgba(95,174,143,0.12)' }}>
                      ✓ {CREDENTIAL_LABELS[v] || v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// ------------------------------------------------------------------ available (provider)

function AvailableTab({ availableUntil, scheduleActive, onChange }: {
  availableUntil: string | null; scheduleActive: boolean; onChange: () => void;
}) {
  const [minutes, setMinutes] = useState(120);
  const [locationId, setLocationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxPing[]>([]);
  const isAvailable = !!availableUntil && new Date(availableUntil) > new Date();
  const { locations, addLocation, removeLocation } = useSavedLocations();

  const [tick, setTick] = useState(0);
  const load = () => setTick((n) => n + 1);

  useEffect(() => {
    let alive = true;
    const run = () => supabase.rpc('firefly_inbox').then(({ data }) => {
      if (alive && data) setInbox(data as InboxPing[]);
    });
    run();
    const t = setInterval(run, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [tick]);

  async function goAvailable() {
    setError(null); setBusy(true);
    try {
      let lat: number, lng: number;
      if (locationId) {
        const loc = locations.find((l) => l.id === locationId);
        if (!loc) throw new Error('That saved location is gone. Pick another or use your current location.');
        lat = loc.lat; lng = loc.lng;
      } else {
        ({ lat, lng } = await getLocation());
      }
      const { error: err } = await supabase.rpc('firefly_set_available', { p_lat: lat, p_lng: lng, p_minutes: minutes });
      if (err) throw new Error(friendlyError(err.message));
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
    setBusy(false);
  }

  async function goOffline() {
    setBusy(true);
    await supabase.rpc('firefly_go_offline');
    setBusy(false);
    onChange();
  }

  async function respond(pingId: string, accept: boolean) {
    const { error: err } = await supabase.rpc('firefly_respond', { p_ping_id: pingId, p_accept: accept });
    if (err) setError(friendlyError(err.message));
    load();
  }

  const showAsGlowing = isAvailable || scheduleActive;

  return (
    <>
      <div style={{ ...card, borderColor: showAsGlowing ? '#5FAE8F' : '#22305e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            width: 12, height: 12, borderRadius: '50%',
            background: showAsGlowing ? '#F5D76E' : '#22305e',
            boxShadow: showAsGlowing ? '0 0 12px 3px rgba(245,215,110,0.6)' : 'none',
          }} />
          <h2 style={{ ...h2, marginBottom: 0 }}>
            {isAvailable ? `You're glowing: available for ${minutesLeft(availableUntil!)} more min`
              : scheduleActive ? "You're glowing via your recurring schedule"
              : "You're offline"}
          </h2>
        </div>
        {isAvailable ? (
          <Button full variant="secondary" onClick={goOffline} disabled={busy}>Go offline now</Button>
        ) : (
          <>
            {scheduleActive && (
              <p style={{ ...muted, marginBottom: 10 }}>
                A recurring schedule window is active right now, so you&rsquo;re already receiving pings. Manually going available adds extra time on top.
              </p>
            )}
            <label style={{ ...muted, display: 'block', marginBottom: 6 }}>From</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={selectStyle}>
              <option value="">Use my current location</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <label style={{ ...muted, display: 'block', marginBottom: 6 }}>Stay available for</label>
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={selectStyle}>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
            </select>
            <Button full onClick={goAvailable} disabled={busy}>
              {busy && <Spinner size={14} />}
              Go available
            </Button>
          </>
        )}
        <p style={{ ...muted, marginTop: 10 }}>
          Your location is taken once, rounded to about 1 km, and deleted when you go offline or time runs out. Nobody can see a map of you.
        </p>
        {error && <p style={{ fontSize: 13, color: '#e07a63', marginTop: 10 }}>{error}</p>}
      </div>

      <ScheduleSection locations={locations} onAddLocation={addLocation} onRemoveLocation={removeLocation} />

      <h2 style={{ ...h2, marginTop: 20 }}>Incoming pings</h2>
      {inbox.length === 0 && <p style={muted}>{showAsGlowing ? 'Nothing right now. New pings appear here automatically.' : 'Go available to receive pings.'}</p>}
      {inbox.map((p) => (
        <div key={p.ping_id} style={card}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>{serviceLabel(p.service)}</p>
          <p style={muted}>
            {p.requester_label ? <>{p.requester_label} (you&rsquo;ve connected before)</> : userTypeLabel(p.requester_type)}
            {p.distance_km != null && <> · about {p.distance_km} km away</>} · closes in {minutesLeft(p.expires_at)} min
          </p>
          {p.note && <p style={{ fontSize: 13, marginTop: 8 }}>&ldquo;{p.note}&rdquo;</p>}
          {p.photo_path && <PhotoThumb path={p.photo_path} />}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Button full onClick={() => respond(p.ping_id, true)}>I can help</Button>
            <Button full variant="secondary" onClick={() => respond(p.ping_id, false)}>Pass</Button>
          </div>
          <p style={{ ...muted, marginTop: 8 }}>
            &ldquo;I can help&rdquo; shares your business name, phone, email and verified credentials with them.
          </p>
        </div>
      ))}
    </>
  );
}

// Recurring weekly availability windows, each tied to a saved location.
function ScheduleSection({ locations, onAddLocation, onRemoveLocation }: {
  locations: SavedLocation[];
  onAddLocation: (label: string, lat: number, lng: number) => Promise<void>;
  onRemoveLocation: (id: string) => Promise<void>;
}) {
  const [windows, setWindows] = useState<ScheduleWindow[]>([]);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');
  const [locationId, setLocationId] = useState('');
  const [newLocationLabel, setNewLocationLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    supabase.rpc('firefly_list_schedule').then(({ data }) => {
      if (data) setWindows(data as ScheduleWindow[]);
    });
  }, []);
  useEffect(() => { reload(); }, [reload]);

  async function saveLocation() {
    if (!newLocationLabel.trim()) { setError('Give this location a name first.'); return; }
    setBusy(true); setError(null);
    try {
      const { lat, lng } = await getLocation();
      await onAddLocation(newLocationLabel.trim(), lat, lng);
      setNewLocationLabel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that location.');
    }
    setBusy(false);
  }

  async function addWindow() {
    setError(null);
    if (!locationId) { setError('Pick a location for this window first.'); return; }
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    if (endMin <= startMin) { setError('End time must be after start time.'); return; }
    setBusy(true);
    const { error: err } = await supabase.rpc('firefly_save_schedule_window', {
      p_day_of_week: day, p_start_minute: startMin, p_end_minute: endMin, p_location_id: locationId,
    });
    setBusy(false);
    if (err) { setError(friendlyError(err.message)); return; }
    reload();
  }

  async function toggleWindow(id: string, enabled: boolean) {
    await supabase.rpc('firefly_set_schedule_window_enabled', { p_id: id, p_enabled: enabled });
    reload();
  }

  async function deleteWindow(id: string) {
    await supabase.rpc('firefly_delete_schedule_window', { p_id: id });
    reload();
  }

  return (
    <div style={card}>
      <h2 style={h2}>Recurring availability</h2>
      <p style={{ ...muted, marginBottom: 12 }}>
        Set weekly hours instead of remembering to toggle available each day. Times are in your local (Pacific) time.
      </p>

      {windows.length === 0 && <p style={{ ...muted, marginBottom: 12 }}>No recurring windows yet.</p>}
      {windows.map((w) => (
        <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #22305e' }}>
          <div>
            <p style={{ fontSize: 13, opacity: w.enabled ? 1 : 0.5 }}>
              {DAY_LABELS[w.day_of_week]} · {minuteToTime(w.start_minute)}–{minuteToTime(w.end_minute)}
            </p>
            <p style={{ ...muted, opacity: w.enabled ? 1 : 0.5 }}>{w.location_label}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => toggleWindow(w.id, !w.enabled)}>{w.enabled ? 'Pause' : 'Resume'}</Button>
            <Button variant="ghost" onClick={() => deleteWindow(w.id)}>Delete</Button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 14, borderTop: '1px solid #22305e', paddingTop: 14 }}>
        <label style={{ ...muted, display: 'block', marginBottom: 6 }}>Add a window</label>
        <select value={day} onChange={(e) => setDay(Number(e.target.value))} style={selectStyle}>
          {DAY_LABELS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 13 }} />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 13 }} />
        </div>
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={selectStyle}>
          <option value="">Choose a location…</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        {locations.length === 0 && <p style={{ ...muted, marginBottom: 8 }}>No saved locations yet — add one below first.</p>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Save current location as… e.g. Shop"
            value={newLocationLabel}
            maxLength={60}
            onChange={(e) => setNewLocationLabel(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }}
          />
          <Button variant="ghost" onClick={saveLocation} disabled={busy}>Save</Button>
        </div>
        {locations.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {locations.map((l) => (
              <span key={l.id} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: 'rgba(139,147,184,0.12)', color: '#8B93B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                {l.label}
                <button type="button" onClick={() => onRemoveLocation(l.id)} style={{ background: 'none', border: 'none', color: '#8B93B8', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
        )}
        <Button full onClick={addWindow} disabled={busy}>Add window</Button>
        {error && <p style={{ fontSize: 12, color: '#e07a63', marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ history & blocks

function HistoryTab({ userId }: { userId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blocking, setBlocking] = useState<Connection | null>(null);
  const [privateNote, setPrivateNote] = useState('');
  const [pingingAgain, setPingingAgain] = useState<Connection | null>(null);
  const [againNote, setAgainNote] = useState('');
  const [againPhoto, setAgainPhoto] = useState<File | null>(null);
  const [againLocationId, setAgainLocationId] = useState('');
  const [againBusy, setAgainBusy] = useState(false);
  const [againStatus, setAgainStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locations } = useSavedLocations();

  const [tick, setTick] = useState(0);
  const load = () => setTick((n) => n + 1);

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.rpc('firefly_connections_list'),
      supabase.rpc('firefly_my_blocks'),
    ]).then(([{ data: c }, { data: b }]) => {
      if (!alive) return;
      if (c) setConnections(c as Connection[]);
      if (b) setBlocks(b as Block[]);
    });
    return () => { alive = false; };
  }, [tick]);

  async function confirmBlock() {
    if (!blocking) return;
    setError(null);
    const { error: err } = await supabase.rpc('firefly_block', {
      p_connection_id: blocking.connection_id, p_private_note: privateNote,
    });
    if (err) { setError(friendlyError(err.message)); return; }
    setBlocking(null); setPrivateNote('');
    load();
  }

  async function unblock(id: string) {
    await supabase.rpc('firefly_unblock', { p_block_id: id });
    load();
  }

  async function sendPingAgain() {
    if (!pingingAgain) return;
    setAgainBusy(true); setError(null); setAgainStatus(null);
    try {
      let lat: number, lng: number;
      if (againLocationId) {
        const loc = locations.find((l) => l.id === againLocationId);
        if (!loc) throw new Error('That saved location is gone. Pick another or use your current location.');
        lat = loc.lat; lng = loc.lng;
      } else {
        ({ lat, lng } = await getLocation());
      }
      let photoPath: string | null = null;
      if (againPhoto) photoPath = await uploadPingPhoto(againPhoto, userId);
      const { error: err } = await supabase.rpc('firefly_ping_again', {
        p_connection_id: pingingAgain.connection_id, p_lat: lat, p_lng: lng, p_note: againNote, p_photo_path: photoPath,
      });
      if (err) throw new Error(friendlyError(err.message));
      setAgainStatus(`Pinged ${pingingAgain.other_label} directly. Check the Need help tab for their answer.`);
      setAgainNote(''); setAgainPhoto(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
    setAgainBusy(false);
  }

  return (
    <>
      <h2 style={h2}>Past connections (90 days)</h2>
      <p style={{ ...muted, marginBottom: 12 }}>
        Had a bad experience? Block them. Neither of you will receive the other&rsquo;s pings again. They aren&rsquo;t notified, and blocks are never shown to anyone else.
      </p>
      {connections.length === 0 && <p style={muted}>No Firefly connections yet.</p>}
      {connections.map((c) => (
        <div key={c.connection_id} style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <p style={{ fontSize: 14 }}>{c.other_label}</p>
              <p style={muted}>
                {serviceLabel(c.service)} · {c.my_role === 'requester' ? 'answered your ping' : 'you answered their ping'} ·{' '}
                {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
            {!c.blocked && (
              <div style={{ display: 'flex', gap: 8 }}>
                {c.my_role === 'requester' && (
                  <Button variant="ghost" onClick={() => { setPingingAgain(c); setAgainNote(''); setAgainPhoto(null); setAgainLocationId(''); setAgainStatus(null); setError(null); }}>
                    Ping again
                  </Button>
                )}
                <Button variant="danger" onClick={() => { setBlocking(c); setPrivateNote(''); setError(null); }}>Block</Button>
              </div>
            )}
            {c.blocked && <span style={{ fontSize: 11, color: '#e07a63' }}>Blocked</span>}
          </div>
          {blocking?.connection_id === c.connection_id && (
            <div style={{ marginTop: 14, borderTop: '1px solid #22305e', paddingTop: 14 }}>
              <p style={{ fontSize: 13, marginBottom: 10 }}>
                Block <strong>{c.other_label}</strong>? You won&rsquo;t match with each other on Firefly until you unblock.
              </p>
              <textarea
                placeholder="Private note to yourself (optional), e.g. what happened. Only you can see this."
                value={privateNote}
                maxLength={280}
                rows={2}
                onChange={(e) => setPrivateNote(e.target.value)}
                style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
              />
              {error && <p style={{ fontSize: 12, color: '#e07a63', marginBottom: 8 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <Button full onClick={confirmBlock} style={{ background: '#e07a63', boxShadow: 'none' }}>Block</Button>
                <Button full variant="secondary" onClick={() => setBlocking(null)}>Cancel</Button>
              </div>
            </div>
          )}
          {pingingAgain?.connection_id === c.connection_id && (
            <div style={{ marginTop: 14, borderTop: '1px solid #22305e', paddingTop: 14 }}>
              <p style={{ fontSize: 13, marginBottom: 10 }}>
                Ping <strong>{c.other_label}</strong> directly for {serviceLabel(c.service)} — this goes straight to them, no radius matching needed since you&rsquo;ve already connected.
              </p>
              <select value={againLocationId} onChange={(e) => setAgainLocationId(e.target.value)} style={selectStyle}>
                <option value="">Use my current location</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              <textarea
                placeholder="Short note (optional)"
                value={againNote}
                maxLength={140}
                rows={2}
                onChange={(e) => setAgainNote(e.target.value)}
                style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
              />
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setAgainPhoto(e.target.files?.[0] || null)} style={{ ...muted, marginBottom: 10, display: 'block' }} />
              {error && <p style={{ fontSize: 12, color: '#e07a63', marginBottom: 8 }}>{error}</p>}
              {againStatus && <p style={{ fontSize: 12, color: '#5FAE8F', marginBottom: 8 }}>{againStatus}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <Button full onClick={sendPingAgain} disabled={againBusy}>{againBusy ? 'Sending…' : 'Send ping'}</Button>
                <Button full variant="secondary" onClick={() => setPingingAgain(null)}>Close</Button>
              </div>
            </div>
          )}
        </div>
      ))}

      <h2 style={{ ...h2, marginTop: 24 }}>People you&rsquo;ve blocked</h2>
      {blocks.length === 0 && <p style={muted}>Nobody.</p>}
      {blocks.map((b) => (
        <div key={b.block_id} style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <p style={{ fontSize: 14 }}>{b.blocked_label}</p>
              <p style={muted}>Blocked {new Date(b.created_at).toLocaleDateString()}</p>
              {b.private_note && <p style={{ fontSize: 12, color: '#F2EEE6', marginTop: 6 }}>{b.private_note}</p>}
            </div>
            <Button variant="ghost" onClick={() => unblock(b.block_id)}>Unblock</Button>
          </div>
        </div>
      ))}
    </>
  );
}

// ------------------------------------------------------------------ page

type Tab = 'help' | 'available' | 'history';

export default function FireflyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [tab, setTab] = useState<Tab>('help');
  const [userId, setUserId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase.rpc('firefly_get_profile');
    setProfile(((data as Profile[] | null) || [])[0] || null);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);
      const { data: ids } = await supabase.from('identities').select('id, business, display_name, is_active').order('created_at');
      if (ids) setIdentities(ids as Identity[]);
      await loadProfile();
      setLoading(false);
    })();
  }, [router, loadProfile]);

  if (loading) return <LoadingScreen label="Loading Firefly…" />;

  const isProvider = !!profile?.provider_identity_id;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'help', label: 'Need help' },
    ...(isProvider ? [{ key: 'available' as Tab, label: 'Available' }] : []),
    { key: 'history', label: 'History & blocks' },
  ];

  return (
    <div style={{ background: 'radial-gradient(circle at 20% 0%, #16204f 0%, #0A1330 45%)', minHeight: '100vh', color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <Logo size={30} wordmarkSize={18} />
          <a href="/dashboard" style={{ color: '#8B93B8', fontSize: 13, textDecoration: 'none' }}>← Dashboard</a>
        </div>
        <h1 style={{ fontSize: 24, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
          Firefly <span style={{ color: '#F5D76E', textShadow: '0 0 10px rgba(245,215,110,0.6)' }}>•</span>
        </h1>
        <p style={{ fontSize: 13, color: '#8B93B8', marginBottom: 20, letterSpacing: '0.04em' }}>Ping. Verify. Connect.</p>

        <ProfileSection key={profile ? 'saved' : 'new'} profile={profile} identities={identities} onSaved={loadProfile} />

        {profile && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #22305e' }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '10px 12px',
                    color: tab === t.key ? '#F2EEE6' : '#8B93B8',
                    borderBottom: `2px solid ${tab === t.key ? '#5AA7FF' : 'transparent'}`,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === 'help' && userId && <NeedHelpTab userId={userId} />}
            {tab === 'available' && isProvider && (
              <AvailableTab availableUntil={profile.available_until} scheduleActive={profile.schedule_active} onChange={loadProfile} />
            )}
            {tab === 'history' && userId && <HistoryTab userId={userId} />}
          </>
        )}
      </div>
    </div>
  );
}

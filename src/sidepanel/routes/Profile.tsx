import { useEffect, useState } from 'react';
import { PageTransition } from '../components/ui/PageTransition';
import { Button } from '../components/ui/Button';
import { getProfile, saveProfile } from '../../background/storage/profile';
import type { Profile as ProfileType } from '../../shared/types';

export function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getProfile().then(setProfile);
  }, []);

  if (!profile) return <PageTransition><div className="p-6 text-sm">Loading…</div></PageTransition>;

  const update = (patch: Partial<ProfileType>) =>
    setProfile({ ...profile, ...patch });

  return (
    <PageTransition>
      <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
        <h1
          className="font-[var(--font-display)] text-[var(--text-2xl)] font-medium tracking-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          Profile
        </h1>
        <Button
          size="sm"
          intent="accent"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await saveProfile(profile);
            setSaving(false);
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
        <Field label="Full name" value={profile.fullName} onChange={(v) => update({ fullName: v })} />
        <Field label="Email" value={profile.email} onChange={(v) => update({ email: v })} type="email" />
        <Field label="Location" value={profile.location} onChange={(v) => update({ location: v })} />
        <Field
          label="Target roles (comma-separated)"
          value={profile.targetRoles.join(', ')}
          onChange={(v) =>
            update({ targetRoles: v.split(',').map((s) => s.trim()).filter(Boolean) })
          }
        />
        <div className="grid grid-cols-3 gap-2">
          <Field
            label="Salary min"
            value={String(profile.salaryTarget.min)}
            onChange={(v) =>
              update({ salaryTarget: { ...profile.salaryTarget, min: Number(v) || 0 } })
            }
            type="number"
          />
          <Field
            label="Salary max"
            value={String(profile.salaryTarget.max)}
            onChange={(v) =>
              update({ salaryTarget: { ...profile.salaryTarget, max: Number(v) || 0 } })
            }
            type="number"
          />
          <Field
            label="Currency"
            value={profile.salaryTarget.currency}
            onChange={(v) =>
              update({
                salaryTarget: { ...profile.salaryTarget, currency: v.toUpperCase().slice(0, 3) },
              })
            }
          />
        </div>
      </div>
    </PageTransition>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span
        className="block text-[var(--text-xs)] uppercase tracking-[0.08em] mb-1"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)]"
        style={{
          background: 'var(--color-surface-sunk)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-ink)',
        }}
      />
    </label>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useSettings } from '../hooks/useSettings';
import { saveProfile, saveCv } from '../../background/storage/profile';

const STEPS = ['welcome', 'apiKey', 'profile', 'cv', 'ready'] as const;
type Step = (typeof STEPS)[number];

export function Onboarding() {
  const { settings, update } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [fullName, setFullName] = useState('');
  const [targetRoles, setTargetRoles] = useState('');
  const [cvText, setCvText] = useState('');

  if (!settings) return <div className="p-6 text-sm">Loading…</div>;

  const next = () => setStep(STEPS[STEPS.indexOf(step) + 1] ?? 'ready');
  const back = () => setStep(STEPS[STEPS.indexOf(step) - 1] ?? 'welcome');

  const finish = async () => {
    await saveProfile({
      fullName,
      targetRoles: targetRoles.split(',').map((s) => s.trim()).filter(Boolean),
    });
    if (cvText.trim()) await saveCv(cvText);
    await update({ onboardingComplete: true });
    navigate('/tracker');
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-7">
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full"
              style={{
                background:
                  STEPS.indexOf(s) <= STEPS.indexOf(step)
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {step === 'welcome' && (
              <>
                <h1
                  className="font-[var(--font-display)] text-[var(--text-3xl)] font-semibold leading-tight tracking-tight"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Your job search, <br />
                  evaluated in seconds.
                </h1>
                <p className="text-[var(--text-sm)]" style={{ color: 'var(--color-ink-soft)' }}>
                  career-ops scores every posting A–F against your CV, tracks the pipeline, and
                  generates ATS-ready PDFs — all inside your browser.
                </p>
                <Button intent="accent" size="lg" onClick={next} className="w-full">
                  Get started
                </Button>
              </>
            )}

            {step === 'apiKey' && (
              <>
                <h2
                  className="font-[var(--font-display)] text-[var(--text-xl)] font-medium"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Your Anthropic API key
                </h2>
                <p className="text-[var(--text-xs)]" style={{ color: 'var(--color-ink-faint)' }}>
                  Used directly from this browser to call Claude. Never leaves your machine.
                  Get one at{' '}
                  <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
                    console.anthropic.com
                  </a>
                  .
                </p>
                <input
                  type="password"
                  value={settings.anthropicApiKey}
                  onChange={(e) => void update({ anthropicApiKey: e.target.value })}
                  placeholder="sk-ant-…"
                  className="w-full h-10 px-3 rounded-[var(--radius-sm)] border font-[var(--font-mono)] text-[var(--text-sm)]"
                  style={{
                    background: 'var(--color-surface-sunk)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-ink)',
                  }}
                />
                <div className="flex gap-2">
                  <Button intent="ghost" onClick={back}>
                    Back
                  </Button>
                  <Button
                    intent="accent"
                    disabled={!settings.anthropicApiKey}
                    onClick={next}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === 'profile' && (
              <>
                <h2
                  className="font-[var(--font-display)] text-[var(--text-xl)] font-medium"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Who are you?
                </h2>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full h-10 px-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)]"
                  style={{
                    background: 'var(--color-surface-sunk)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-ink)',
                  }}
                />
                <input
                  value={targetRoles}
                  onChange={(e) => setTargetRoles(e.target.value)}
                  placeholder="Target roles (e.g. AI Engineer, Head of Applied AI)"
                  className="w-full h-10 px-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)]"
                  style={{
                    background: 'var(--color-surface-sunk)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-ink)',
                  }}
                />
                <div className="flex gap-2">
                  <Button intent="ghost" onClick={back}>
                    Back
                  </Button>
                  <Button intent="accent" onClick={next} className="flex-1">
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === 'cv' && (
              <>
                <h2
                  className="font-[var(--font-display)] text-[var(--text-xl)] font-medium"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Drop in your CV
                </h2>
                <p className="text-[var(--text-xs)]" style={{ color: 'var(--color-ink-faint)' }}>
                  Paste as markdown. You can edit it anytime under CV. Skip for now if you want to
                  start evaluating first.
                </p>
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="# Your Name&#10;&#10;## Summary&#10;..."
                  className="w-full min-h-[180px] p-3 rounded-[var(--radius-sm)] border font-[var(--font-mono)] text-[var(--text-xs)] resize-y"
                  style={{
                    background: 'var(--color-surface-sunk)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-ink)',
                  }}
                />
                <div className="flex gap-2">
                  <Button intent="ghost" onClick={back}>
                    Back
                  </Button>
                  <Button intent="accent" onClick={next} className="flex-1">
                    {cvText.trim() ? 'Continue' : 'Skip for now'}
                  </Button>
                </div>
              </>
            )}

            {step === 'ready' && (
              <>
                <h2
                  className="font-[var(--font-display)] text-[var(--text-2xl)] font-medium"
                  style={{ color: 'var(--color-ink)' }}
                >
                  You're all set.
                </h2>
                <p className="text-[var(--text-sm)]" style={{ color: 'var(--color-ink-soft)' }}>
                  Open any LinkedIn, Greenhouse, Ashby or Lever posting. Click the floating badge
                  to evaluate. Everything appears here.
                </p>
                <Button intent="accent" size="lg" onClick={finish} className="w-full">
                  Enter career-ops
                </Button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}

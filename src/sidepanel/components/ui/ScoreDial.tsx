import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { scoreBand } from '../../../shared/constants';

interface Props {
  score: number; // 0..5
  size?: number;
  streaming?: boolean;
}

const BAND_LABELS: Record<string, string> = {
  strong: 'Strong',
  good: 'Good',
  borderline: 'Borderline',
  weak: 'Weak',
};

/**
 * Animated score dial. Starts at 0 and tweens up to the target when it
 * first sees a real score. Band color follows the scoreBand() helper.
 */
export function ScoreDial({ score, size = 128, streaming = false }: Props) {
  const clamped = Math.max(0, Math.min(5, score));
  const progress = useMotionValue(0);
  const displayScore = useTransform(progress, (v) => (v * 5).toFixed(1));
  const dash = useTransform(progress, (v) => `${v * 339.3} 339.3`);
  const band = scoreBand(clamped);

  useEffect(() => {
    if (!Number.isFinite(clamped)) return;
    const controls = animate(progress, clamped / 5, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [clamped, progress]);

  const strokeColor = {
    strong: 'var(--color-success)',
    good: 'var(--color-accent)',
    borderline: 'var(--color-warning)',
    weak: 'var(--color-danger)',
  }[band];

  const glowColor = {
    strong: 'var(--glow-success)',
    good: 'var(--glow-accent)',
    borderline: 'var(--glow-accent)',
    weak: 'var(--glow-danger)',
  }[band];

  const textGlowColor = {
    strong: 'oklch(65% 0.17 145 / 0.4)',
    good: 'oklch(72% 0.18 55 / 0.4)',
    borderline: 'oklch(78% 0.16 85 / 0.4)',
    weak: 'oklch(60% 0.22 28 / 0.4)',
  }[band];

  const badgeColor = {
    strong: { bg: 'var(--color-success-soft)', text: 'var(--color-success)' },
    good: { bg: 'var(--color-accent-soft)', text: 'var(--color-accent)' },
    borderline: { bg: 'var(--color-accent-soft)', text: 'var(--color-warning)' },
    weak: { bg: 'var(--color-danger-soft)', text: 'var(--color-danger)' },
  }[band];

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      {streaming && (
        <style>{`
          @keyframes score-dial-pulse {
            0% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
            70% { opacity: 0; transform: translate(-50%, -50%) scale(1.45); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.45); }
          }
          @keyframes orbit {
            from { transform: rotate(0deg) translateX(${size * 0.46}px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(${size * 0.46}px) rotate(-360deg); }
          }
        `}</style>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        {/* conic gradient background for atmosphere */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background: `conic-gradient(from 0deg, ${strokeColor}, transparent 30%, transparent 70%, ${strokeColor})`,
            filter: 'blur(8px)',
          }}
        />
        {streaming && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: size,
              height: size,
              border: '2px solid var(--color-accent)',
              animation: 'score-dial-pulse 1.8s cubic-bezier(0.16, 1, 0.3, 1) infinite',
            }}
          />
        )}
        {/* orbital dots during streaming */}
        {streaming && (
          <>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 4,
                  height: 4,
                  background: 'var(--color-accent)',
                  left: '50%',
                  top: '50%',
                  marginLeft: -2,
                  marginTop: -2,
                  animation: `orbit ${2.4 + i * 0.4}s linear infinite`,
                  animationDelay: `${i * -0.8}s`,
                  opacity: 0.7 - i * 0.15,
                  boxShadow: '0 0 6px var(--color-accent)',
                }}
              />
            ))}
          </>
        )}
        <svg width={size} height={size} viewBox="0 0 128 128" className="-rotate-90">
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
            opacity="0.5"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke={strokeColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={dash}
            style={{
              filter: `drop-shadow(0 0 12px currentColor)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-[var(--font-display)] tabular-nums font-semibold"
            style={{
              fontSize: size * 0.3,
              color: 'var(--color-ink)',
              lineHeight: 1,
              textShadow: `0 0 20px ${textGlowColor}`,
            }}
          >
            {displayScore}
          </motion.span>
          <span
            className="text-[10px] uppercase tracking-[0.12em] mt-0.5"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            {streaming ? 'streaming' : '/ 5'}
          </span>
        </div>
      </div>
      {/* band label pill badge */}
      {!streaming && clamped > 0 && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 inline-block px-2.5 py-0.5 rounded-[var(--radius-full)] text-[10px] uppercase tracking-[0.1em] font-semibold"
          style={{
            background: badgeColor.bg,
            color: badgeColor.text,
            boxShadow: glowColor,
          }}
        >
          {BAND_LABELS[band]}
        </motion.span>
      )}
    </div>
  );
}

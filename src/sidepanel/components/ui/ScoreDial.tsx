import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { scoreBand } from '../../../shared/constants';

interface Props {
  score: number; // 0..5
  size?: number;
  streaming?: boolean;
}

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

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 128 128" className="-rotate-90">
        <circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="8"
        />
        <motion.circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dash}
          style={{ filter: 'drop-shadow(0 0 16px currentColor)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-[var(--font-display)] tabular-nums"
          style={{ fontSize: size * 0.32, color: 'var(--color-ink)', lineHeight: 1 }}
        >
          {displayScore}
        </motion.span>
        <span
          className="text-[10px] uppercase tracking-[0.12em] mt-1"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          {streaming ? 'streaming' : '/ 5'}
        </span>
      </div>
    </div>
  );
}

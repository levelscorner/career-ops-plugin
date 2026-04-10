import type { HTMLAttributes, PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

const card = tv({
  base: 'rounded-[var(--radius-lg)] border shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)]',
});

export function Card({
  className,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={card({ className })}
      style={{
        backdropFilter: 'blur(var(--blur-md))',
        WebkitBackdropFilter: 'blur(var(--blur-md))',
        background: 'var(--color-glass)',
        borderColor: 'var(--color-glass-border)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'oklch(72% 0.18 55 / 0.25)';
        el.style.boxShadow = 'var(--shadow-md), inset 0 1px 0 oklch(100% 0 0 / 0.04)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

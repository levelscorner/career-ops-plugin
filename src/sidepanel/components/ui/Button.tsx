import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const button = tv({
  base: 'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.97]',
  variants: {
    intent: {
      primary:
        'bg-[var(--color-ink)] text-[var(--color-surface)] hover:bg-[var(--color-ink-soft)] shadow-[var(--shadow-sm)]',
      accent: [
        'text-[var(--color-surface-sunk)] font-semibold',
        'shadow-[var(--shadow-accent)]',
        'hover:shadow-[var(--glow-accent)]',
      ].join(' '),
      ghost: [
        'text-[var(--color-ink)]',
        'border border-[var(--color-glass-border)]',
      ].join(' '),
      danger:
        'bg-[var(--color-danger-soft)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white',
      link: 'bg-transparent text-[var(--color-accent-strong)] hover:underline p-0 h-auto',
    },
    size: {
      sm: 'text-xs px-3 h-7',
      md: 'text-sm px-4 h-9',
      lg: 'text-base px-5 h-11',
    },
  },
  defaultVariants: {
    intent: 'primary',
    size: 'md',
  },
});

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { intent, size, className, style, ...rest },
  ref,
) {
  const accentGradient =
    intent === 'accent'
      ? {
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-strong))',
          boxShadow: 'var(--shadow-accent), inset 0 1px 0 oklch(100% 0 0 / 0.15)',
        }
      : undefined;

  const ghostGlass =
    intent === 'ghost'
      ? {
          backdropFilter: 'blur(var(--blur-sm))',
          WebkitBackdropFilter: 'blur(var(--blur-sm))',
          background: 'var(--color-glass)',
        }
      : undefined;

  return (
    <button
      ref={ref}
      className={button({ intent, size, className })}
      style={{ ...accentGradient, ...ghostGlass, ...style }}
      {...rest}
    />
  );
});

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const button = tv({
  base: 'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:opacity-50 disabled:pointer-events-none select-none',
  variants: {
    intent: {
      primary:
        'bg-[var(--color-ink)] text-[var(--color-surface)] hover:bg-[var(--color-ink-soft)] shadow-[var(--shadow-sm)] active:scale-[0.98]',
      accent:
        'bg-[var(--color-accent)] text-[var(--color-ink)] hover:bg-[var(--color-accent-strong)] hover:text-[var(--color-surface)] shadow-[var(--shadow-md)] active:scale-[0.98]',
      ghost:
        'bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface-sunk)] border border-[var(--color-border)]',
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
  { intent, size, className, ...rest },
  ref,
) {
  return <button ref={ref} className={button({ intent, size, className })} {...rest} />;
});

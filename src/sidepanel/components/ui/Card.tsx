import type { HTMLAttributes, PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

const card = tv({
  base: 'rounded-[var(--radius-lg)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]',
});

export function Card({
  className,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={card({ className })} {...rest}>
      {children}
    </div>
  );
}

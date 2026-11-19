import React from 'react';

interface BadgeProps {
  variant?: 'verified' | 'pending' | 'rejected' | 'neutral' | 'accent';
  children: React.ReactNode;
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    verified: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    pending: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25',
    rejected: 'bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/25',
    accent: 'bg-accent/20 text-fg border-accent/40',
    neutral: 'bg-surface-subtle text-fg-muted border-border',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

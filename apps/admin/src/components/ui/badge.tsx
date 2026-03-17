import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-800 focus:ring-offset-2 dark:focus:ring-offset-neutral-900',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-800 text-white',
        secondary: 'border-transparent bg-secondary-500 text-white',
        destructive: 'border-transparent bg-red-500 text-white',
        outline: 'text-neutral-900 dark:text-neutral-50 border-neutral-200 dark:border-neutral-700',
        success: 'border-transparent bg-success text-white',
        warning: 'border-transparent bg-warning text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

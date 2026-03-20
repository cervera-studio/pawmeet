'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

/**
 * Status variant configuration maps for reuse across admin pages.
 * Labels come from translations; these only define badge variants.
 */

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'outline' | 'default' | 'secondary';

const USER_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  active: 'success',
  suspended: 'warning',
  banned: 'destructive',
};

const REPORT_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'warning',
  resolved: 'success',
  dismissed: 'outline',
};

const SUPPORT_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  open: 'warning',
  in_progress: 'default',
  resolved: 'success',
  closed: 'secondary',
};

const STATUS_VARIANT_CONFIGS = {
  user: USER_STATUS_VARIANTS,
  report: REPORT_STATUS_VARIANTS,
  support: SUPPORT_STATUS_VARIANTS,
} as const;

type StatusType = keyof typeof STATUS_VARIANT_CONFIGS;

interface StatusBadgeProps {
  /** The raw status string (e.g. "active", "pending") */
  status: string;
  /** Which domain this status belongs to — determines label and color mapping */
  type: StatusType;
  /** Fallback badge variant when the status is not found in the config */
  fallbackVariant?: BadgeVariant;
}

/**
 * Shared status badge component that maps status strings to colored badges.
 * Centralizes the status-to-variant mappings used across
 * the users list, user detail, and moderation reports pages.
 * Labels are resolved via next-intl translations.
 */
export function StatusBadge({ status, type, fallbackVariant = 'outline' }: StatusBadgeProps) {
  const t = useTranslations('status');
  const variantConfig = STATUS_VARIANT_CONFIGS[type];
  const variant = variantConfig[status] ?? fallbackVariant;
  const label = t(`${type}.${status}` as Parameters<typeof t>[0]);

  return <Badge variant={variant}>{label}</Badge>;
}

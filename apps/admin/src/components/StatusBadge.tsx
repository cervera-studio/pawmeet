import { Badge } from '@/components/ui/badge';

/**
 * Status configuration maps for reuse across admin pages.
 * Each entry maps a status key to its display label (Italian) and badge variant.
 */

const USER_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Attivo', variant: 'success' },
  suspended: { label: 'Sospeso', variant: 'warning' },
  banned: { label: 'Bannato', variant: 'destructive' },
};

const REPORT_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'In attesa', variant: 'warning' },
  resolved: { label: 'Risolto', variant: 'success' },
  dismissed: { label: 'Archiviato', variant: 'outline' },
};

const STATUS_CONFIGS = {
  user: USER_STATUS_CONFIG,
  report: REPORT_STATUS_CONFIG,
} as const;

type StatusType = keyof typeof STATUS_CONFIGS;

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'outline' | 'default' | 'secondary';

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
 * Centralizes the status-to-label and status-to-variant mappings used across
 * the users list, user detail, and moderation reports pages.
 */
export function StatusBadge({ status, type, fallbackVariant = 'outline' }: StatusBadgeProps) {
  const config = STATUS_CONFIGS[type];
  const entry = config[status];
  const variant = entry?.variant ?? fallbackVariant;
  const label = entry?.label ?? status;

  return <Badge variant={variant}>{label}</Badge>;
}

/** Re-export configs for use in view-models that need status info without rendering */
export { USER_STATUS_CONFIG, REPORT_STATUS_CONFIG };

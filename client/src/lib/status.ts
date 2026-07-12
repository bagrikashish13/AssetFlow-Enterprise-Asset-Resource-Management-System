/** Single source of truth for status → color semantics (from DESIGN_TOKENS). */

export interface ColorSpec {
  bg: string;
  text: string;
  ring: string;
  dot: string;
  solid: string;
}

export const COLORS: Record<string, ColorSpec> = {
  emerald: { bg: '#ecfdf5', text: '#047857', ring: 'rgba(5,150,105,.2)', dot: '#10b981', solid: '#059669' },
  indigo: { bg: '#eef2ff', text: '#4338ca', ring: 'rgba(79,70,229,.2)', dot: '#6366f1', solid: '#4f46e5' },
  sky: { bg: '#f0f9ff', text: '#0369a1', ring: 'rgba(2,132,199,.2)', dot: '#38bdf8', solid: '#0284c7' },
  amber: { bg: '#fffbeb', text: '#b45309', ring: 'rgba(217,119,6,.25)', dot: '#f59e0b', solid: '#d97706' },
  rose: { bg: '#fff1f2', text: '#be123c', ring: 'rgba(225,29,72,.2)', dot: '#f43f5e', solid: '#e11d48' },
  slate: { bg: 'var(--line)', text: '#64748b', ring: 'rgba(71,85,105,.2)', dot: '#94a3b8', solid: '#64748b' },
  violet: { bg: '#f5f3ff', text: '#6d28d9', ring: 'rgba(124,58,237,.2)', dot: '#8b5cf6', solid: '#7c3aed' },
  zinc: { bg: '#27272a', text: '#e4e4e7', ring: 'rgba(24,24,27,.4)', dot: '#71717a', solid: '#18181b' },
};

export const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'emerald', ALLOCATED: 'indigo', RESERVED: 'sky', UNDER_MAINTENANCE: 'amber',
  LOST: 'rose', RETIRED: 'slate', DISPOSED: 'zinc',
  UPCOMING: 'sky', ONGOING: 'emerald', COMPLETED: 'slate', CANCELLED: 'rose',
  PENDING: 'amber', APPROVED: 'sky', REJECTED: 'rose', ASSIGNED: 'violet',
  IN_PROGRESS: 'indigo', RESOLVED: 'emerald',
  LOW: 'slate', MEDIUM: 'sky', HIGH: 'amber', CRITICAL: 'rose',
  OPEN: 'emerald', CLOSED: 'slate',
  VERIFIED: 'emerald', MISSING: 'rose', DAMAGED: 'amber',
  ACTIVE: 'emerald', INACTIVE: 'slate',
  CONFIRMED: 'sky', RETURNED: 'slate',
};

export function statusColor(status: string): ColorSpec {
  return COLORS[STATUS_COLOR[status] ?? 'slate'];
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function healthColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 50) return '#d97706';
  return '#e11d48';
}

export function healthBandLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'Monitor';
  return 'At risk';
}

import { format, formatDistanceToNowStrict } from 'date-fns';

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return format(new Date(iso), 'dd MMM yyyy');
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return format(new Date(iso), 'dd MMM yyyy, HH:mm');
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return format(new Date(iso), 'HH:mm');
}

export function fmtAgo(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function fmtInr(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `₹${new Intl.NumberFormat('en-IN').format(value)}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_HUES = ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#d97706', '#059669', '#0284c7', '#be123c'];

export function avatarBg(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

export function daysBetween(a: string | Date, b: string | Date): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPT_HEAD: 'Dept Head',
  EMPLOYEE: 'Employee',
};

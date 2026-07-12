import type { Role } from '../types';

export interface NavItem {
  label: string;
  icon: string;
  path: string;
}
export interface NavSection {
  name: string;
  items: NavItem[];
}

export function navSections(role: Role): NavSection[] {
  const sections: NavSection[] = [
    { name: 'Overview', items: [{ label: 'Dashboard', icon: 'dash', path: '/dashboard' }] },
    {
      name: 'Operations',
      items: [
        { label: 'Assets', icon: 'box', path: '/assets' },
        { label: 'Allocations', icon: 'swap', path: '/allocations' },
        { label: 'Bookings', icon: 'cal', path: '/bookings' },
        { label: 'Maintenance', icon: 'wrench', path: '/maintenance' },
        { label: 'Audits', icon: 'clip', path: '/audits' },
      ],
    },
    {
      name: 'Insights',
      items:
        role === 'EMPLOYEE'
          ? [{ label: 'Activity', icon: 'pulse', path: '/activity' }]
          : [
              { label: 'Reports', icon: 'chart', path: '/reports' },
              { label: 'Activity', icon: 'pulse', path: '/activity' },
            ],
    },
  ];
  if (role === 'ADMIN') {
    sections.push({ name: 'Admin', items: [{ label: 'Organization', icon: 'building', path: '/organization' }] });
  }
  return sections;
}

export const CRUMB: Record<string, string> = {
  dashboard: 'Dashboard',
  assets: 'Assets',
  allocations: 'Allocations',
  bookings: 'Bookings',
  maintenance: 'Maintenance',
  audits: 'Audits',
  reports: 'Reports',
  notifications: 'Notifications',
  activity: 'Activity',
  organization: 'Organization',
};

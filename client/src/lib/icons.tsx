/** Inline SVG icon system — path strings from the design reference. */

export const ICONS: Record<string, string> = {
  dash: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  box: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7 12 12l8.7-5 M12 22V12',
  swap: 'M8 3 4 7l4 4 M4 7h16 M16 21l4-4-4-4 M20 17H4',
  cal: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  wrench:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  clip: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 3h6v4H9z M9 14l2 2 4-4',
  chart: 'M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3',
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
  building:
    'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18 M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M2 22h20',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  plus: 'M12 5v14 M5 12h14',
  x: 'M18 6 6 18 M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  alert:
    'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 16v-4 M12 8h.01',
  qr: 'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h2v2h-2z M19 15h2v2h-2z M15 19h2v2h-2z M19 19h2v2h-2z',
  laptop: 'M3 19h18 M6 5h12a1 1 0 0 1 1 1v9H5V6a1 1 0 0 1 1-1z',
  chair:
    'M6 19v2 M18 19v2 M5 11V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5 M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  truck:
    'M1 4h14v12H1z M15 9h4l3 3v4h-7V9 M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  door: 'M13 4h3a2 2 0 0 1 2 2v14 M2 20h20 M13 20V4a1 1 0 0 0-1.2-1l-6 1.2A2 2 0 0 0 4 6.2V20 M10 12h.01',
  video: 'M23 7l-7 5 7 5V7z M2 5h14v14H2z',
  cog: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.2 2.2 M16.9 16.9l2.2 2.2 M19.1 4.9 16.9 7 M7.1 16.9l-2.2 2.2',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  copy: 'M9 9h11v11H9z M15 9V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M6.3 17.7l-1.4 1.4 M19.1 4.9l-1.4 1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.35-4.35',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  chevL: 'm15 18-6-6 6-6',
  chevR: 'm9 18 6-6-6-6',
  chevD: 'm6 9 6 6 6-6',
};

export const CAT_ICON: Record<string, string> = {
  laptop: 'laptop',
  chair: 'chair',
  truck: 'truck',
  door: 'door',
  video: 'video',
  cog: 'cog',
  box: 'box',
};

export function notifIcon(type: string): string {
  if (type.startsWith('MAINTENANCE')) return 'wrench';
  if (type.startsWith('BOOKING')) return 'cal';
  if (type.startsWith('TRANSFER')) return 'swap';
  if (type.startsWith('AUDIT')) return 'clip';
  if (type.startsWith('RETURN')) return 'alert';
  return 'box';
}

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  style?: React.CSSProperties;
  color?: string;
}

export function Icon({ name, size = 16, stroke = 2, style, color }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, minWidth: size, ...style }}
    >
      <path d={ICONS[name] ?? ICONS.box} />
    </svg>
  );
}

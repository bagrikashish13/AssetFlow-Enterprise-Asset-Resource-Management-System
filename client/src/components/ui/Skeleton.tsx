export function Skeleton({ width = '100%', height = 14, radius = 6 }: { width?: number | string; height?: number; radius?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, var(--line) 0%, var(--border) 50%, var(--line) 100%)',
        backgroundSize: '200% 100%',
        animation: 'af-shimmer 1.4s ease-in-out infinite',
      }}
    />
  );
}

// Injected once globally via index.css companion — declared here for locality.
const styleTag = typeof document !== 'undefined' ? document.getElementById('af-shimmer-kf') : null;
if (typeof document !== 'undefined' && !styleTag) {
  const el = document.createElement('style');
  el.id = 'af-shimmer-kf';
  el.textContent = '@keyframes af-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
  document.head.appendChild(el);
}

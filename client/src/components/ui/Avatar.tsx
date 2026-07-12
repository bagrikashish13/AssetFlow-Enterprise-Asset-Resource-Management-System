import { avatarBg, initials } from '../../lib/format';

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: 999,
        background: avatarBg(name),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
      }}
    >
      {initials(name)}
    </div>
  );
}

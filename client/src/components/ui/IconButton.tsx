import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '../../lib/icons';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: number;
  title?: string;
}

export function IconButton({ icon, size = 16, style, ...rest }: Props) {
  return (
    <button
      style={{
        background: 'none',
        border: '1px solid transparent',
        borderRadius: 8,
        padding: 8,
        cursor: 'pointer',
        color: 'var(--text-2)',
        display: 'flex',
        transition: 'background .15s ease-out',
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

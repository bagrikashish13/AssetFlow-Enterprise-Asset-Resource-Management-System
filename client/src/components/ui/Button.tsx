import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../../lib/icons';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: string;
  isLoading?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, { bg: string; hoverBg: string; color: string; border: string }> = {
  primary: { bg: '#4f46e5', hoverBg: '#4338ca', color: '#fff', border: 'transparent' },
  secondary: { bg: 'var(--surface-2)', hoverBg: 'var(--line)', color: 'var(--text)', border: 'var(--border)' },
  outline: { bg: 'transparent', hoverBg: 'var(--surface-2)', color: 'var(--text)', border: 'var(--border)' },
  ghost: { bg: 'transparent', hoverBg: 'var(--line)', color: 'var(--text-2)', border: 'transparent' },
  danger: { bg: '#e11d48', hoverBg: '#be123c', color: '#fff', border: 'transparent' },
};

export function Button({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  isLoading,
  children,
  disabled,
  style,
  ...rest
}: Props) {
  const v = VARIANTS[variant];
  return (
    <button
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: 8,
        padding: size === 'sm' ? '6px 11px' : '9px 15px',
        fontSize: size === 'sm' ? 12.5 : 13.5,
        fontWeight: 600,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'background .15s ease-out, border-color .15s ease-out',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) e.currentTarget.style.background = v.hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = v.bg;
      }}
      {...rest}
    >
      {isLoading ? (
        <span
          style={{
            width: 13,
            height: 13,
            border: `2px solid ${variant === 'primary' || variant === 'danger' ? 'rgba(255,255,255,.4)' : 'rgba(79,70,229,.3)'}`,
            borderTopColor: variant === 'primary' || variant === 'danger' ? '#fff' : '#4f46e5',
            borderRadius: 999,
            animation: 'af-spin .7s linear infinite',
          }}
        />
      ) : (
        leftIcon && <Icon name={leftIcon} size={14} />
      )}
      {children}
    </button>
  );
}

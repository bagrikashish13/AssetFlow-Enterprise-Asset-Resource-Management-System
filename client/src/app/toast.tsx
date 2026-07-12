import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../lib/icons';

interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

const ToastContext = createContext<{ toast: (kind: Toast['kind'], message: string) => void }>({
  toast: () => {},
});

const KIND_STYLE: Record<Toast['kind'], { icon: string; color: string }> = {
  success: { icon: 'check', color: '#059669' },
  error: { icon: 'alert', color: '#e11d48' },
  info: { icon: 'info', color: '#0284c7' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((kind: Toast['kind'], message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${KIND_STYLE[t.kind].color}`,
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(15,23,42,.12)',
              padding: '11px 14px',
              minWidth: 260,
              maxWidth: 380,
              animation: 'af-toast .18s ease-out',
            }}
          >
            <Icon name={KIND_STYLE[t.kind].icon} size={15} color={KIND_STYLE[t.kind].color} />
            <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

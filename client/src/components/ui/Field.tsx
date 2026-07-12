import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const baseInput: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13.5,
  background: 'var(--surface)',
  color: 'var(--text)',
};

interface WrapProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}
function Wrap({ label, hint, error, children }: WrapProps) {
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 5 }}>{hint}</div>}
      {error && <div style={{ fontSize: 12, color: '#e11d48', marginTop: 5 }}>{error}</div>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}
export function Input({ label, hint, error, style, ...rest }: InputProps) {
  return (
    <Wrap label={label} hint={hint} error={error}>
      <input style={{ ...baseInput, ...(error ? { borderColor: '#fca5a5' } : {}), ...style }} {...rest} />
    </Wrap>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}
export function Textarea({ label, hint, error, style, ...rest }: TextareaProps) {
  return (
    <Wrap label={label} hint={hint} error={error}>
      <textarea style={{ ...baseInput, resize: 'vertical', minHeight: 80, fontFamily: 'inherit', ...style }} {...rest} />
    </Wrap>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}
export function Select({ label, hint, error, children, style, ...rest }: SelectProps) {
  return (
    <Wrap label={label} hint={hint} error={error}>
      <select style={{ ...baseInput, cursor: 'pointer', ...style }} {...rest}>
        {children}
      </select>
    </Wrap>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../lib/icons';
import { Input } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { authApi } from '../api/endpoints';
import { apiError } from '../api/client';
import { useAuth } from '../app/auth';

export function Login({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const strength = passwordStrength(password);

  const submit = async () => {
    setError('');
    if (mode === 'signup') {
      if (name.trim().length < 2) return setError('Enter your full name.');
      if (password !== password2) return setError('Passwords do not match.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');

    setPending(true);
    try {
      if (mode === 'signup') {
        await authApi.signup({ name, email, password });
      } else {
        await authApi.login({ email, password });
      }
      await refresh();
      const from = (location.state as { from?: Location })?.from;
      navigate(from ? `${from.pathname}${from.search}` : '/dashboard', { replace: true });
    } catch (err) {
      setError(apiError(err).message || 'Something went wrong.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: '45%', minWidth: 380, background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.07) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="box" size={19} color="#fff" />
          </div>
          <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.01em' }}>AssetFlow</span>
        </div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ margin: '0 0 14px', fontSize: 34, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15 }}>
            Every asset. Every desk.<br />One system.
          </h1>
          <p style={{ margin: '0 0 36px', color: '#94a3b8', fontSize: 15, lineHeight: 1.6, maxWidth: 380 }}>
            Track, allocate, book and audit everything your organization owns — from laptops to conference rooms.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 340 }}>
            {[
              { color: '#10b981', text: 'Real-time visibility across every department' },
              { color: '#38bdf8', text: 'Conflict-free allocation and booking' },
              { color: '#818cf8', text: 'Structured maintenance & audit workflows' },
            ].map((row) => (
              <div key={row.text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#cbd5e1' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: row.color }} />
                {row.text}
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 12, color: '#64748b' }}>Self-hosted · Your data never leaves your network</div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 2px rgba(15,23,42,.05)', padding: 32 }}>
          {mode === 'login' ? (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, letterSpacing: '-.01em' }}>Sign in</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-2)' }}>Welcome back to AssetFlow.</p>
            </>
          ) : (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, letterSpacing: '-.01em' }}>Create account</h2>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-2)' }}>Join your organization's workspace.</p>
              <div style={{ background: '#f0f9ff', border: '1px solid rgba(2,132,199,.25)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#0369a1', marginBottom: 20, lineHeight: 1.5 }}>
                New accounts join as <b>Employee</b>. Administrators grant roles from the Employee Directory.
              </div>
            </>
          )}
          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid rgba(225,29,72,.25)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#be123c', marginBottom: 16 }}>{error}</div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {mode === 'signup' && <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />}
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: 'absolute', right: 8, top: 7, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, padding: 4 }}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              {mode === 'signup' && password.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < strength.score ? strength.color : 'var(--line)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 4 }}>{strength.label}</div>
                </>
              )}
            </div>
            {mode === 'signup' && (
              <Input label="Confirm password" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" />
            )}
            <Button type="submit" variant="primary" isLoading={pending} style={{ width: '100%' }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
            {mode === 'login' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <button type="button" onClick={() => setForgotOpen(true)} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0 }}>
                    Forgot password?
                  </button>
                  <button type="button" onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                    Create account →
                  </button>
                </div>
              </>
            ) : (
              <button type="button" onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                ← Back to sign in
              </button>
            )}
          </form>
        </div>
      </div>

      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Reset your password" width={420}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          AssetFlow runs fully self-hosted — ask your administrator to reset your password from the Employee Directory.
        </p>
        <Button variant="primary" onClick={() => setForgotOpen(false)}>Got it</Button>
      </Modal>
    </div>
  );
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#e11d48', '#d97706', '#0284c7', '#059669'];
  const idx = Math.max(0, score - 1);
  return { score, label: labels[idx], color: colors[idx] };
}

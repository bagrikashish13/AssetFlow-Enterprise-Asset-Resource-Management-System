import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { Icon } from '../lib/icons';
import { Button } from '../components/ui/Button';

export function Forbidden() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Icon name="alert" size={26} color="#e11d48" />
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>You don't have access</h1>
      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 20px' }}>
        {user ? `Signed in as ${user.role.replace('_', ' ')}.` : 'Please sign in to continue.'}
      </p>
      <Button variant="primary" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 56, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '-.03em' }}>404</div>
      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '4px 0 20px' }}>Page not found.</p>
      <Button variant="primary" onClick={() => navigate('/dashboard')}>Go home</Button>
    </div>
  );
}

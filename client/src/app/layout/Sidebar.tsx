import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';
import { navSections } from '../nav';
import { Icon } from '../../lib/icons';
import { Avatar } from '../../components/ui/Avatar';
import { ROLE_LABEL } from '../../lib/format';
import { useSidebar } from './sidebar-state';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { open, setOpen } = useSidebar();
  if (!user) return null;
  const width = open ? 240 : 68;

  return (
    <div
      style={{
        width,
        background: '#0f172a',
        color: '#94a3b8',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
        transition: 'width .2s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px', borderBottom: '1px solid rgba(148,163,184,.12)' }}>
        <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 9, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="box" size={18} color="#fff" />
        </div>
        {open && <span style={{ fontSize: 16.5, fontWeight: 600, color: '#fff', letterSpacing: '-.01em' }}>AssetFlow</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {navSections(user.role).map((sec) => (
          <div key={sec.name} style={{ marginBottom: 18 }}>
            {open && (
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b', padding: '0 10px', marginBottom: 6 }}>
                {sec.name}
              </div>
            )}
            {sec.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  border: 'none',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: isActive ? '#4f46e5' : 'transparent',
                  color: isActive ? '#fff' : '#94a3b8',
                  textDecoration: 'none',
                })}
              >
                <Icon name={item.icon} size={17} />
                {open && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(148,163,184,.12)', padding: '12px 10px' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', color: '#64748b', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5 }}
        >
          <Icon name="chevL" size={16} style={{ transform: open ? 'none' : 'rotate(180deg)' }} />
          {open && <span>Collapse</span>}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, marginTop: 4, borderRadius: 10, background: 'rgba(148,163,184,.08)' }}>
          <Avatar name={user.name} size={32} />
          {open && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{ROLE_LABEL[user.role]}</div>
              </div>
              <button
                title="Log out"
                onClick={() => void logout().then(() => (window.location.href = '/login'))}
                style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 4 }}
              >
                <Icon name="logout" size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

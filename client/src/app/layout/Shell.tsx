import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SidebarContext } from './sidebar-state';
import { CommandPalette } from '../CommandPalette';
import { CRUMB } from '../nav';
import { useRealtime } from '../realtime';

export function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  useRealtime();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const segment = location.pathname.split('/')[1] || 'dashboard';
  const crumb = CRUMB[segment] ?? segment;
  const width = sidebarOpen ? 240 : 68;

  return (
    <SidebarContext.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: width, display: 'flex', flexDirection: 'column', minWidth: 0, transition: 'margin-left .2s ease-out' }}>
          <Topbar crumb={crumb} onOpenPalette={() => setPaletteOpen(true)} />
          <div style={{ flex: 1, width: '100%', maxWidth: 1400, margin: '0 auto', padding: '24px 32px 64px' }}>
            <Outlet />
          </div>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </SidebarContext.Provider>
  );
}

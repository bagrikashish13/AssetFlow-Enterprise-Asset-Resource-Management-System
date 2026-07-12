import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from './app/auth';
import { Shell } from './app/layout/Shell';
import { Login } from './pages/Login';
import { Forbidden } from './pages/Forbidden';
import { NotFound } from './pages/NotFound';
import { Dashboard } from './pages/Dashboard';
import { Assets } from './pages/Assets';
import { AssetDetail } from './pages/AssetDetail';
import { Allocations } from './pages/Allocations';
import { Bookings } from './pages/Bookings';
import { Maintenance } from './pages/Maintenance';
import { Audits } from './pages/Audits';
import { AuditDetail } from './pages/AuditDetail';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Activity } from './pages/Activity';
import { Organization } from './pages/Organization';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Login initialMode="signup" />} />
      <Route path="/403" element={<Forbidden />} />

      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/allocations" element={<Allocations />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/audits" element={<Audits />} />
        <Route path="/audits/:id" element={<AuditDetail />} />
        <Route path="/reports" element={<RequireRole roles={['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD']}><Reports /></RequireRole>} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/organization" element={<RequireRole roles={['ADMIN']}><Organization /></RequireRole>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

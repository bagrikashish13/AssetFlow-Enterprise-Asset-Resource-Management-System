import { api } from './client';
import type {
  ActivityLog,
  Allocation,
  AppNotification,
  Asset,
  AssetCategory,
  AssetCondition,
  AuditCycle,
  AuditRecord,
  AuditResult,
  Booking,
  DashboardKpis,
  Department,
  MaintenancePriority,
  MaintenanceRequest,
  Paginated,
  Role,
  SlotSuggestion,
  TransferRequest,
  User,
} from '../types';

type Query = Record<string, string | number | boolean | undefined>;

const get = async <T>(url: string, params?: Query): Promise<T> =>
  (await api.get<T>(url, { params })).data;
const post = async <T>(url: string, body?: unknown): Promise<T> =>
  (await api.post<T>(url, body)).data;
const patch = async <T>(url: string, body?: unknown): Promise<T> =>
  (await api.patch<T>(url, body)).data;

// ---- auth ----
export const authApi = {
  signup: (b: { name: string; email: string; password: string }) => post<{ message: string }>('/auth/signup', b),
  login: (b: { email: string; password: string }) => post<{ message: string }>('/auth/login', b),
  logout: () => post<{ message: string }>('/auth/logout'),
  me: () => get<User>('/auth/me'),
};

// ---- users / departments / categories ----
export const usersApi = {
  list: (q?: Query) => get<Paginated<User>>('/users', q),
  update: (id: string, b: Partial<Pick<User, 'name' | 'departmentId' | 'email'>>) => patch<User>(`/users/${id}`, b),
  setRole: (id: string, role: Role) => patch<User>(`/users/${id}/role`, { role }),
  setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => patch<User>(`/users/${id}/status`, { status }),
  resetPassword: (id: string) => post<{ tempPassword: string }>(`/users/${id}/reset-password`),
};
export const departmentsApi = {
  list: (q?: Query) => get<Paginated<Department>>('/departments', q),
  create: (b: { name: string; description?: string; headId?: string; parentId?: string }) =>
    post<Department>('/departments', b),
  update: (id: string, b: Partial<{ name: string; description: string; headId: string | null; parentId: string | null; status: 'ACTIVE' | 'INACTIVE' }>) =>
    patch<Department>(`/departments/${id}`, b),
};
export const categoriesApi = {
  list: (q?: Query) => get<Paginated<AssetCategory>>('/categories', q),
  create: (b: { name: string; description?: string; icon: string; fields: unknown[] }) =>
    post<AssetCategory>('/categories', b),
  update: (id: string, b: Partial<{ name: string; description: string; icon: string; fields: unknown[]; status: string }>) =>
    patch<AssetCategory>(`/categories/${id}`, b),
};

// ---- assets ----
export const assetsApi = {
  list: (q?: Query) => get<Paginated<Asset>>('/assets', q),
  one: (id: string) => get<Asset>(`/assets/${id}`),
  history: (id: string) =>
    get<{ allocations: Allocation[]; maintenance: MaintenanceRequest[] }>(`/assets/${id}/history`),
  create: (form: FormData) => post<Asset>('/assets', form),
  update: (id: string, b: Record<string, unknown>) => patch<Asset>(`/assets/${id}`, b),
  retire: (id: string) => post<{ message: string }>(`/assets/${id}/retire`),
  dispose: (id: string) => post<{ message: string }>(`/assets/${id}/dispose`),
  markFound: (id: string) => post<{ message: string }>(`/assets/${id}/mark-found`),
};

// ---- allocations / transfers ----
export const allocationsApi = {
  list: (q?: Query) => get<Paginated<Allocation>>('/allocations', q),
  create: (b: { assetId: string; holderUserId?: string; holderDepartmentId?: string; expectedReturnAt?: string; notes?: string }) =>
    post<Allocation>('/allocations', b),
  return: (id: string, b: { returnCondition?: AssetCondition; returnNotes?: string }) =>
    post<Allocation>(`/allocations/${id}/return`, b),
};
export const transfersApi = {
  list: (q?: Query) => get<Paginated<TransferRequest>>('/transfers', q),
  create: (b: { assetId: string; targetUserId?: string; targetDepartmentId?: string; reason: string }) =>
    post<TransferRequest>('/transfers', b),
  approve: (id: string) => post<TransferRequest>(`/transfers/${id}/approve`),
  reject: (id: string, decisionNote: string) => post<TransferRequest>(`/transfers/${id}/reject`, { decisionNote }),
  cancel: (id: string) => post<TransferRequest>(`/transfers/${id}/cancel`),
};

// ---- bookings ----
export const bookingsApi = {
  list: (q?: Query) => get<Paginated<Booking>>('/bookings', q),
  availability: (q: Query) =>
    get<{ busy: SlotSuggestion[]; suggestions: SlotSuggestion[] }>('/bookings/availability', q),
  create: (b: { assetId: string; purpose: string; startAt: string; endAt: string; forDepartmentId?: string }) =>
    post<Booking>('/bookings', b),
  reschedule: (id: string, b: { startAt: string; endAt: string }) => patch<Booking>(`/bookings/${id}`, b),
  cancel: (id: string) => post<Booking>(`/bookings/${id}/cancel`),
};

// ---- maintenance ----
export const maintenanceApi = {
  list: (q?: Query) => get<Paginated<MaintenanceRequest>>('/maintenance', q),
  create: (b: { assetId: string; title: string; description?: string; priority: MaintenancePriority }) =>
    post<MaintenanceRequest>('/maintenance', b),
  approve: (id: string) => post<MaintenanceRequest>(`/maintenance/${id}/approve`),
  reject: (id: string, rejectionReason: string) => post<MaintenanceRequest>(`/maintenance/${id}/reject`, { rejectionReason }),
  assign: (id: string, technicianName: string) => post<MaintenanceRequest>(`/maintenance/${id}/assign`, { technicianName }),
  start: (id: string) => post<MaintenanceRequest>(`/maintenance/${id}/start`),
  resolve: (id: string, b: { resolutionNotes: string; cost?: number }) => post<MaintenanceRequest>(`/maintenance/${id}/resolve`, b),
};

// ---- audits ----
export const auditsApi = {
  list: (q?: Query) => get<Paginated<AuditCycle>>('/audits', q),
  one: (id: string) => get<AuditCycle>(`/audits/${id}`),
  records: (id: string) => get<AuditRecord[]>(`/audits/${id}/records`),
  discrepancies: (id: string) => get<AuditRecord[]>(`/audits/${id}/discrepancies`),
  create: (b: { name: string; departmentId?: string; location?: string; startDate: string; endDate: string; auditorIds: string[] }) =>
    post<AuditCycle>('/audits', b),
  verdict: (cycleId: string, recordId: string, b: { result: AuditResult; notes?: string }) =>
    patch<AuditRecord>(`/audits/${cycleId}/records/${recordId}`, b),
  close: (id: string) => post<AuditCycle>(`/audits/${id}/close`),
};

// ---- dashboard / notifications / activity / reports ----
export const dashboardApi = {
  kpis: () => get<DashboardKpis>('/dashboard/kpis'),
  overdue: () => get<(Allocation & { daysOverdue: number })[]>('/dashboard/overdue'),
  upcomingReturns: () => get<Allocation[]>('/dashboard/upcoming-returns'),
  todayBookings: () => get<Booking[]>('/dashboard/today-bookings'),
};
export const notificationsApi = {
  list: (q?: Query) => get<Paginated<AppNotification>>('/notifications', q),
  read: (id: string) => post<AppNotification>(`/notifications/${id}/read`),
  readAll: () => post<{ updated: number }>('/notifications/read-all'),
};
export const activityApi = {
  list: (q?: Query) => get<Paginated<ActivityLog>>('/activity-logs', q),
};
export const reportsApi = {
  statusDistribution: () => get<{ status: string; count: number }[]>('/reports/status-distribution'),
  utilization: () => get<{ id: string; assetTag: string; name: string; allocationCount: number }[]>('/reports/utilization'),
  idleAssets: () => get<{ id: string; assetTag: string; name: string; location: string | null }[]>('/reports/idle-assets'),
  maintenanceFrequency: () => get<{ category: string; count: number }[]>('/reports/maintenance-frequency'),
  maintenanceCostTrend: () => get<{ month: string; cost: number }[]>('/reports/maintenance-cost-trend'),
  departmentAllocation: () => get<{ department: string; allocated: number }[]>('/reports/department-allocation'),
  bookingHeatmap: () => get<{ dow: number; hour: number; count: number }[]>('/reports/booking-heatmap'),
  healthDistribution: () =>
    get<{ distribution: { band: string; count: number }[]; atRisk: { id: string; assetTag: string; name: string; score: number }[] }>(
      '/reports/health-distribution',
    ),
  csvUrl: (report: string) => `/api/v1/reports/${report}?format=csv`,
};

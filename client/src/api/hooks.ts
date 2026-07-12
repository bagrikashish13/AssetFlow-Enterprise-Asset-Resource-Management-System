import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activityApi,
  allocationsApi,
  assetsApi,
  auditsApi,
  bookingsApi,
  categoriesApi,
  dashboardApi,
  departmentsApi,
  maintenanceApi,
  notificationsApi,
  reportsApi,
  transfersApi,
  usersApi,
} from './endpoints';

type Query = Record<string, string | number | boolean | undefined>;

// ---- dashboard ----
export const useKpis = () => useQuery({ queryKey: ['dashboard', 'kpis'], queryFn: dashboardApi.kpis, refetchInterval: 15000 });
export const useOverdue = () => useQuery({ queryKey: ['dashboard', 'overdue'], queryFn: dashboardApi.overdue });
export const useUpcomingReturns = () => useQuery({ queryKey: ['dashboard', 'upcoming'], queryFn: dashboardApi.upcomingReturns });
export const useTodayBookings = () => useQuery({ queryKey: ['dashboard', 'today-bookings'], queryFn: dashboardApi.todayBookings });

// ---- assets ----
export const useAssets = (q?: Query) => useQuery({ queryKey: ['assets', q], queryFn: () => assetsApi.list(q) });
export const useAsset = (id?: string) => useQuery({ queryKey: ['assets', id], queryFn: () => assetsApi.one(id!), enabled: !!id });
export const useAssetHistory = (id?: string) => useQuery({ queryKey: ['assets', id, 'history'], queryFn: () => assetsApi.history(id!), enabled: !!id });
export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: assetsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }) });
}
export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => assetsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}
export function useRetireAsset() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: assetsApi.retire, onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }) });
}
export function useMarkFound() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: assetsApi.markFound, onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }) });
}

// ---- categories / departments / users ----
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list({ limit: 100 }) });
export const useDepartments = () => useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list({ limit: 100 }) });
export const useUsers = (q?: Query) => useQuery({ queryKey: ['users', q], queryFn: () => usersApi.list(q) });

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: departmentsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }) });
}
export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => departmentsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: categoriesApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) });
}
export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'ADMIN' | 'ASSET_MANAGER' | 'DEPT_HEAD' | 'EMPLOYEE' }) => usersApi.setRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => usersApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
export function useResetPassword() {
  return useMutation({ mutationFn: usersApi.resetPassword });
}

// ---- allocations / transfers ----
export const useAllocations = (q?: Query) => useQuery({ queryKey: ['allocations', q], queryFn: () => allocationsApi.list(q) });
export function useCreateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: allocationsApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['allocations'] });
      void qc.invalidateQueries({ queryKey: ['assets'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
export function useReturnAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { returnCondition?: string; returnNotes?: string } }) =>
      allocationsApi.return(id, body as never),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['allocations'] });
      void qc.invalidateQueries({ queryKey: ['assets'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
export const useTransfers = (q?: Query) => useQuery({ queryKey: ['transfers', q], queryFn: () => transfersApi.list(q) });
export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: transfersApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }) });
}
export function useApproveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transfersApi.approve,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transfers'] });
      void qc.invalidateQueries({ queryKey: ['allocations'] });
      void qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
export function useRejectTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => transfersApi.reject(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });
}
export function useCancelTransfer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: transfersApi.cancel, onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }) });
}

// ---- bookings ----
export const useBookings = (q?: Query) => useQuery({ queryKey: ['bookings', q], queryFn: () => bookingsApi.list(q) });
export const useAvailability = (q: Query, enabled: boolean) =>
  useQuery({ queryKey: ['bookings', 'availability', q], queryFn: () => bookingsApi.availability(q), enabled });
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: bookingsApi.cancel, onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }) });
}

// ---- maintenance ----
export const useMaintenance = (q?: Query) => useQuery({ queryKey: ['maintenance', q], queryFn: () => maintenanceApi.list(q) });
export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: maintenanceApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }) });
}
function invalidateMaintenance(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['maintenance'] });
  void qc.invalidateQueries({ queryKey: ['assets'] });
}
export function useApproveMaintenance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: maintenanceApi.approve, onSuccess: () => invalidateMaintenance(qc) });
}
export function useRejectMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => maintenanceApi.reject(id, reason),
    onSuccess: () => invalidateMaintenance(qc),
  });
}
export function useAssignMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, technicianName }: { id: string; technicianName: string }) => maintenanceApi.assign(id, technicianName),
    onSuccess: () => invalidateMaintenance(qc),
  });
}
export function useStartMaintenance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: maintenanceApi.start, onSuccess: () => invalidateMaintenance(qc) });
}
export function useResolveMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { resolutionNotes: string; cost?: number } }) => maintenanceApi.resolve(id, body),
    onSuccess: () => invalidateMaintenance(qc),
  });
}

// ---- audits ----
export const useAudits = (q?: Query) => useQuery({ queryKey: ['audits', q], queryFn: () => auditsApi.list(q) });
export const useAudit = (id?: string) => useQuery({ queryKey: ['audits', id], queryFn: () => auditsApi.one(id!), enabled: !!id });
export const useAuditRecords = (id?: string) => useQuery({ queryKey: ['audits', id, 'records'], queryFn: () => auditsApi.records(id!), enabled: !!id });
export const useAuditDiscrepancies = (id?: string) =>
  useQuery({ queryKey: ['audits', id, 'discrepancies'], queryFn: () => auditsApi.discrepancies(id!), enabled: !!id });
export function useCreateAudit() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: auditsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['audits'] }) });
}
export function useRecordVerdict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, recordId, body }: { cycleId: string; recordId: string; body: { result: string; notes?: string } }) =>
      auditsApi.verdict(cycleId, recordId, body as never),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['audits', vars.cycleId] });
    },
  });
}
export function useCloseAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: auditsApi.close,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['audits'] });
      void qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

// ---- reports / activity ----
export const useStatusDistribution = () => useQuery({ queryKey: ['reports', 'status-distribution'], queryFn: reportsApi.statusDistribution });
export const useUtilization = () => useQuery({ queryKey: ['reports', 'utilization'], queryFn: reportsApi.utilization });
export const useIdleAssets = () => useQuery({ queryKey: ['reports', 'idle-assets'], queryFn: reportsApi.idleAssets });
export const useMaintenanceFrequency = () => useQuery({ queryKey: ['reports', 'maint-freq'], queryFn: reportsApi.maintenanceFrequency });
export const useMaintenanceCostTrend = () => useQuery({ queryKey: ['reports', 'maint-cost'], queryFn: reportsApi.maintenanceCostTrend });
export const useDepartmentAllocation = () => useQuery({ queryKey: ['reports', 'dept-alloc'], queryFn: reportsApi.departmentAllocation });
export const useBookingHeatmap = () => useQuery({ queryKey: ['reports', 'heatmap'], queryFn: reportsApi.bookingHeatmap });
export const useHealthDistribution = () => useQuery({ queryKey: ['reports', 'health'], queryFn: reportsApi.healthDistribution });
export const useActivity = (q?: Query) => useQuery({ queryKey: ['activity', q], queryFn: () => activityApi.list(q) });

// ---- notifications ----
export const useNotifications = (q?: Query) => useQuery({ queryKey: ['notifications', q], queryFn: () => notificationsApi.list(q) });
export function useReadNotification() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: notificationsApi.read, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
}
export function useReadAllNotifications() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: notificationsApi.readAll, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
}

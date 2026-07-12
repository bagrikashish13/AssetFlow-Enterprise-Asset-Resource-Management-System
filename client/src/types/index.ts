export type Role = 'ADMIN' | 'ASSET_MANAGER' | 'DEPT_HEAD' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type AssetStatus =
  | 'AVAILABLE'
  | 'ALLOCATED'
  | 'RESERVED'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED';
export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type AllocationStatus = 'ACTIVE' | 'RETURNED';
export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type BookingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AuditCycleStatus = 'OPEN' | 'CLOSED';
export type AuditResult = 'VERIFIED' | 'MISSING' | 'DAMAGED';
export type HealthBand = 'HEALTHY' | 'MONITOR' | 'AT_RISK';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
  department?: Department | null;
  createdAt: string;
}
export interface Department {
  id: string;
  name: string;
  description: string | null;
  headId: string | null;
  head?: User | null;
  parentId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  memberCount?: number;
  assetCount?: number;
  createdAt: string;
}
export interface CategoryField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
}
export interface AssetCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  fields: CategoryField[];
  assetCount?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}
export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  categoryId: string;
  category?: AssetCategory;
  serialNumber: string | null;
  acquisitionDate: string | null;
  acquisitionCost: number | null;
  condition: AssetCondition;
  location: string | null;
  photoUrl: string | null;
  customFieldValues: Record<string, string | number> | null;
  isBookable: boolean;
  status: AssetStatus;
  departmentId: string | null;
  department?: Department | null;
  healthScore: number;
  healthBand: HealthBand;
  currentAllocation?: Allocation | null;
  createdAt: string;
  updatedAt: string;
}
export interface Allocation {
  id: string;
  assetId: string;
  asset?: Asset;
  holderUserId: string | null;
  holderUser?: User | null;
  holderDepartmentId: string | null;
  holderDepartment?: Department | null;
  allocatedById: string;
  allocatedBy?: User;
  allocatedAt: string;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  returnCondition: AssetCondition | null;
  returnNotes: string | null;
  status: AllocationStatus;
  isOverdue?: boolean;
  notes: string | null;
}
export interface TransferRequest {
  id: string;
  assetId: string;
  asset?: Asset;
  fromAllocationId: string;
  fromAllocation?: Allocation;
  requestedById: string;
  requestedBy?: User;
  targetUserId: string | null;
  targetUser?: User | null;
  targetDepartmentId: string | null;
  targetDepartment?: Department | null;
  reason: string;
  status: TransferStatus;
  decidedById: string | null;
  decidedBy?: User | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}
export interface Booking {
  id: string;
  assetId: string;
  asset?: Asset;
  bookedById: string;
  bookedBy?: User;
  forDepartmentId: string | null;
  purpose: string;
  startAt: string;
  endAt: string;
  status: 'CONFIRMED' | 'CANCELLED';
  phase: BookingStatus;
  cancelledAt: string | null;
  createdAt: string;
}
export interface SlotSuggestion {
  startAt: string;
  endAt: string;
}
export interface MaintenanceRequest {
  id: string;
  assetId: string;
  asset?: Asset;
  raisedById: string;
  raisedBy?: User;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  photoUrl: string | null;
  status: MaintenanceStatus;
  decidedById: string | null;
  decidedBy?: User | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  technicianName: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  cost: number | null;
  createdAt: string;
}
export interface AuditCycle {
  id: string;
  name: string;
  departmentId: string | null;
  department?: Department | null;
  location: string | null;
  startDate: string;
  endDate: string;
  status: AuditCycleStatus;
  createdById: string;
  createdBy?: User;
  auditors: User[];
  closedAt: string | null;
  progress: {
    total: number;
    checked: number;
    verified: number;
    missing: number;
    damaged: number;
  };
  createdAt: string;
}
export interface AuditRecord {
  id: string;
  cycleId: string;
  assetId: string;
  asset?: Asset & {
    allocations?: {
      holderUser?: { id: string; name: string } | null;
      holderDepartment?: { id: string; name: string } | null;
    }[];
  };
  auditorId: string | null;
  auditor?: User | null;
  result: AuditResult | null;
  notes: string | null;
  checkedAt: string | null;
}
export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}
export interface ActivityLog {
  id: string;
  actorId: string | null;
  actor?: User;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
export interface DashboardKpis {
  assetsAvailable: number;
  assetsAllocated: number;
  maintenanceToday: number;
  activeBookings: number;
  pendingTransfers: number;
  upcomingReturns: number;
  overdueReturns: number;
}
export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount?: number;
  };
}
export interface ApiError {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: { field?: string; message: string }[];
  conflict?: { holderName: string; holderType: 'USER' | 'DEPARTMENT'; since: string };
  suggestions?: SlotSuggestion[];
}

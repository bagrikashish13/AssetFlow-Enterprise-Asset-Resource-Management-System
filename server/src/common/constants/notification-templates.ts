/**
 * Notification message templates for the AssetFlow enterprise application.
 * Contains pre-defined functions to generate titles and bodies for various
 * operational alerts using key-value string parameters.
 */
export const NOTIFICATION_TEMPLATES = {
  ASSET_ASSIGNED: {
    title: (_p: Record<string, string>): string => `Asset assigned to you`,
    body: (p: Record<string, string>): string =>
      `${p['assetName']} (${p['assetTag']}) has been allocated to you. Expected return: ${p['date'] || 'N/A'}.`,
  },
  MAINTENANCE_APPROVED: {
    title: (_p: Record<string, string>): string =>
      `Maintenance request approved`,
    body: (p: Record<string, string>): string =>
      `The maintenance request for ${p['assetName']} (${p['assetTag']}) has been approved. The asset is now under maintenance.`,
  },
  MAINTENANCE_REJECTED: {
    title: (_p: Record<string, string>): string =>
      `Maintenance request rejected`,
    body: (p: Record<string, string>): string =>
      `The maintenance request for ${p['assetName']} (${p['assetTag']}) has been rejected. Reason: ${p['reason'] || 'No reason provided'}.`,
  },
  BOOKING_CONFIRMED: {
    title: (_p: Record<string, string>): string => `Booking confirmed`,
    body: (p: Record<string, string>): string =>
      `Your booking for ${p['assetName']} (${p['assetTag']}) has been confirmed for ${p['date']} at ${p['time'] || 'scheduled time'}.`,
  },
  BOOKING_CANCELLED: {
    title: (_p: Record<string, string>): string => `Booking cancelled`,
    body: (p: Record<string, string>): string =>
      `Your booking for ${p['assetName']} (${p['assetTag']}) scheduled on ${p['date']} has been cancelled.`,
  },
  BOOKING_REMINDER: {
    title: (_p: Record<string, string>): string => `Upcoming booking reminder`,
    body: (p: Record<string, string>): string =>
      `Reminder: You have an upcoming booking for ${p['assetName']} (${p['assetTag']}) starting at ${p['time']}.`,
  },
  TRANSFER_REQUESTED: {
    title: (_p: Record<string, string>): string => `Transfer requested`,
    body: (p: Record<string, string>): string =>
      `A transfer request for asset ${p['assetName']} (${p['assetTag']}) has been initiated by ${p['userName']}.`,
  },
  TRANSFER_APPROVED: {
    title: (_p: Record<string, string>): string => `Transfer approved`,
    body: (p: Record<string, string>): string =>
      `The transfer request for ${p['assetName']} (${p['assetTag']}) has been approved. The asset is now allocated to you.`,
  },
  TRANSFER_REJECTED: {
    title: (_p: Record<string, string>): string => `Transfer request rejected`,
    body: (p: Record<string, string>): string =>
      `The transfer request for ${p['assetName']} (${p['assetTag']}) has been rejected by the approver.`,
  },
  RETURN_OVERDUE: {
    title: (_p: Record<string, string>): string => `Asset return overdue`,
    body: (p: Record<string, string>): string =>
      `Action Required: The allocation for ${p['assetName']} (${p['assetTag']}) was due on ${p['date']} and is now overdue.`,
  },
  AUDIT_ASSIGNED: {
    title: (_p: Record<string, string>): string => `Audit cycle assigned`,
    body: (p: Record<string, string>): string =>
      `You have been assigned as an auditor for the audit cycle "${p['cycleName']}".`,
  },
  AUDIT_DISCREPANCY: {
    title: (_p: Record<string, string>): string => `Audit discrepancy flagged`,
    body: (p: Record<string, string>): string =>
      `A discrepancy (missing/damaged) has been flagged for ${p['assetName']} (${p['assetTag']}) in the audit cycle "${p['cycleName']}".`,
  },
} as const;

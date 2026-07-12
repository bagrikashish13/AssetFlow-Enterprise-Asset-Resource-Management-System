import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import { useToast } from './toast';
import type { AppNotification } from '../types';

/**
 * Subscribes to the backend event gateway. Payloads are treated purely as
 * cache-invalidation hints — every event triggers a TanStack Query refetch.
 */
export function useRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const socket: Socket = io('/events', { withCredentials: true });

    socket.on('notification:new', (n: AppNotification) => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      toast('info', n.title);
    });
    socket.on('kpi:invalidate', ({ keys }: { keys: string[] }) => {
      for (const key of keys) void qc.invalidateQueries({ queryKey: [key] });
    });
    socket.on('asset:updated', () => {
      void qc.invalidateQueries({ queryKey: ['assets'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    });
    socket.on('booking:changed', () => {
      void qc.invalidateQueries({ queryKey: ['bookings'] });
    });
    socket.on('transfer:updated', () => {
      void qc.invalidateQueries({ queryKey: ['transfers'] });
      void qc.invalidateQueries({ queryKey: ['allocations'] });
    });
    socket.on('maintenance:updated', () => {
      void qc.invalidateQueries({ queryKey: ['maintenance'] });
      void qc.invalidateQueries({ queryKey: ['assets'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, qc, toast]);
}

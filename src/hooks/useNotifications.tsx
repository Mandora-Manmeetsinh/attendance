import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import client from '@/api/client';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
}

export function useNotifications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user) return [];

            // Mock data for now
            return [
                {
                    id: '1',
                    title: 'Welcome to GeoAttend!',
                    message: 'Your account has been successfully set up.',
                    type: 'success',
                    read: false,
                    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                },
                {
                    id: '2',
                    title: 'System Update',
                    message: 'We have updated the dashboard with new features.',
                    type: 'info',
                    read: true,
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                }
            ] as Notification[];
        },
        enabled: !!user,
    });

    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            // In a real app: await client.put(`/notifications/${id}/read`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
                return old?.map(n => n.id === id ? { ...n, read: true } : n) || [];
            });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            // In a real app: await client.put(`/notifications/read-all`);
            return true;
        },
        onSuccess: () => {
            queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
                return old?.map(n => ({ ...n, read: true })) || [];
            });
        },
    });

    const deleteNotification = useMutation({
        mutationFn: async (id: string) => {
            // In a real app: await client.delete(`/notifications/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
                return old?.filter(n => n.id !== id) || [];
            });
        },
    });

    return {
        notifications,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification
    };
}

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { AchievementType } from '@/components/AchievementBadge';
import client from '@/api/client';

export interface Achievement {
    id: string;
    type: AchievementType;
    title: string;
    description: string;
    icon_name: string;
    color: string;
    unlocked_at?: string;
}

export function useAchievements() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['achievements', user?.id],
        queryFn: async () => {
            if (!user) return [];

            try {
                // TODO: Implement /api/achievements endpoint
                // Mock data for now
                return [
                    {
                        id: '1',
                        type: 'streak_7',
                        title: 'Week Warrior',
                        description: 'Attended for 7 consecutive days',
                        icon_name: 'flame',
                        color: 'text-orange-500',
                        unlocked_at: new Date().toISOString()
                    },
                    {
                        id: '2',
                        type: 'early_bird',
                        title: 'Early Bird',
                        description: 'Checked in before 8 AM',
                        icon_name: 'sun',
                        color: 'text-yellow-500',
                        unlocked_at: null
                    }
                ] as Achievement[];
            } catch (error) {
                console.error("Error fetching achievements", error);
                return [];
            }
        },
        enabled: !!user,
    });
}

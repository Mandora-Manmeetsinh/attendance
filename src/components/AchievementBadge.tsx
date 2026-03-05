import { Award, Star, Zap, Target, Crown, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import '@/styles/Components.css';

export type AchievementType =
    | 'perfect_week'
    | 'early_bird'
    | 'consistent'
    | 'streak_master'
    | 'never_late'
    | 'dedication';

interface AchievementBadgeProps {
    type: AchievementType;
    unlocked: boolean;
    date?: string;
}

const achievements: Record<AchievementType, {
    icon: typeof Award;
    title: string;
    description: string;
    color: string;
}> = {
    perfect_week: {
        icon: Star,
        title: 'Perfect Week',
        description: 'Attended all 5 days without being late',
        color: 'text-yellow-500',
    },
    early_bird: {
        icon: Zap,
        title: 'Early Bird',
        description: 'Checked in 30 minutes early for 5 days',
        color: 'text-orange-500',
    },
    consistent: {
        icon: Target,
        title: 'Consistency King',
        description: 'Maintained a 7-day streak',
        color: 'text-blue-500',
    },
    streak_master: {
        icon: Crown,
        title: 'Streak Master',
        description: 'Achieved a 30-day streak',
        color: 'text-purple-500',
    },
    never_late: {
        icon: Award,
        title: 'Punctuality Pro',
        description: 'Never late for an entire month',
        color: 'text-green-500',
    },
    dedication: {
        icon: Heart,
        title: 'Dedicated',
        description: 'Perfect attendance for 90 days',
        color: 'text-pink-500',
    },
};

export function AchievementBadge({ type, unlocked, date }: AchievementBadgeProps) {
    const achievement = achievements[type];
    const Icon = achievement.icon;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="achievement-badge-container">
                    <div className={`achievement-hex ${unlocked ? 'unlocked' : 'locked'}`}>
                        <Icon className={`w-8 h-8 ${unlocked ? achievement.color : 'text-muted-foreground'}`} />
                    </div>
                    {unlocked && (
                        <div className="achievement-star-marker">
                            <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                    <p className="font-semibold text-sm">{achievement.title}</p>
                    <p className="text-[11px] text-muted-foreground">{achievement.description}</p>
                    {unlocked && date && (
                        <p className="text-[11px] text-primary font-bold mt-2">Unlocked: {date}</p>
                    )}
                    {!unlocked && (
                        <div className="mt-2">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">Locked</Badge>
                        </div>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

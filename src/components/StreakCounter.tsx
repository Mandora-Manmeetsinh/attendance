import { Flame, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import '@/styles/Components.css';

interface StreakCounterProps {
    streak: number;
    bestStreak?: number;
}

export function StreakCounter({ streak, bestStreak = 0 }: StreakCounterProps) {
    const getStreakColor = () => {
        if (streak >= 30) return 'text-orange-500';
        if (streak >= 14) return 'text-amber-500';
        if (streak >= 7) return 'text-yellow-500';
        return 'text-primary';
    };

    const getStreakMessage = () => {
        if (streak >= 30) return 'Legendary Performance!';
        if (streak >= 14) return 'Outstanding Consistency!';
        if (streak >= 7) return 'Excellent Progress!';
        if (streak >= 3) return 'Great Consistency!';
        return 'Ready to Start?';
    };

    return (
        <Card className="streak-card">
            <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="streak-flame-container">
                            <Flame className={`w-10 h-10 ${getStreakColor()}`} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase">Day Streak</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`streak-number ${getStreakColor()}`}>{streak}</span>
                                <span className="text-sm text-muted-foreground font-medium">Days</span>
                            </div>
                            <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-tight">{getStreakMessage()}</p>
                        </div>
                    </div>
                    {bestStreak > 0 && (
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5 text-muted-foreground mb-1">
                                <Trophy className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Best</span>
                            </div>
                            <p className="text-xl font-bold text-foreground">{bestStreak}</p>
                        </div>
                    )}
                </div>
                {streak > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">Maintain your daily momentum!</span>
                            <span className="font-bold text-primary">{30 - streak} Days to Gold</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

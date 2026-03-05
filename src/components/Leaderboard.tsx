import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Crown, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import client from '@/api/client';
import '@/styles/Components.css';

interface LeaderboardEntry {
    id: string;
    full_name: string;
    avatar_url?: string;
    current_streak: number;
    total_attendance: number;
}

export function Leaderboard() {
    const { data: leaders = [], isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: async () => {
            try {
                const { data } = await client.get('/attendance/leaderboard');
                return data as LeaderboardEntry[];
            } catch (error) {
                console.error("Error fetching leaderboard", error);
                return [];
            }
        },
    });

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0:
                return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
            case 1:
                return <Medal className="w-5 h-5 text-gray-400 fill-gray-400" />;
            case 2:
                return <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />;
            default:
                return <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>;
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    };

    return (
        <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="w-5 h-5 text-primary" />
                    Top Performers
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">Fetching rankings...</div>
                    ) : leaders.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No activity recorded yet</div>
                    ) : (
                        leaders.map((leader, index) => (
                            <div key={leader.id} className="leaderboard-row">
                                <div className="rank-display">
                                    {getRankIcon(index)}
                                </div>

                                <Avatar className="w-9 h-9 leaderboard-avatar shadow-sm">
                                    <AvatarImage src={leader.avatar_url} />
                                    <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                                        {getInitials(leader.full_name)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{leader.full_name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Flame className="w-3 h-3 text-orange-500" />
                                        <span className="text-[10px] text-muted-foreground font-medium">{leader.current_streak} Day Streak</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="font-bold text-sm text-primary">{leader.total_attendance}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Days</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

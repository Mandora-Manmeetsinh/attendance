import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Crown, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import client from '@/api/client';

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
                // TODO: Implement /api/leaderboard endpoint
                // Mock data for now
                return [
                    {
                        id: '1',
                        full_name: 'John Doe',
                        current_streak: 10,
                        total_attendance: 50
                    },
                    {
                        id: '2',
                        full_name: 'Jane Smith',
                        current_streak: 8,
                        total_attendance: 45
                    },
                    {
                        id: '3',
                        full_name: 'Bob Johnson',
                        current_streak: 5,
                        total_attendance: 40
                    }
                ] as LeaderboardEntry[];
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
                return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    };

    return (
        <Card className="shadow-soft border-border/50 overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="w-5 h-5 text-primary" />
                    Top Performers
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                    {isLoading ? (
                        <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : leaders.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No data available</div>
                    ) : (
                        leaders.map((leader, index) => (
                            <div
                                key={leader.id}
                                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center justify-center w-8">
                                    {getRankIcon(index)}
                                </div>

                                <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                                    <AvatarImage src={leader.avatar_url} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                        {getInitials(leader.full_name)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{leader.full_name}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-orange-500" />
                                        {leader.current_streak} day streak
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="font-bold text-primary">{leader.total_attendance}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

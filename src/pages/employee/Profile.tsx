import { useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useAchievements } from '@/hooks/useAchievements';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { AchievementBadge } from '@/components/AchievementBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Mail,
    Briefcase,
    Calendar,
    Camera,
    Loader2,
    Trophy,
    Flame,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
    const { user, profile } = useAuth();
    const { data: achievements, isLoading: loadingAchievements } = useAchievements();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        toast.info("Avatar upload is currently disabled during migration.");
        // TODO: Implement file upload with new backend
    };

    const stats = [
        {
            label: 'Current Streak',
            value: `${profile?.current_streak || 0} Days`,
            icon: Flame,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
        },
        {
            label: 'Total Attendance',
            value: `${profile?.total_attendance || 0} Days`,
            icon: Calendar,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Best Streak',
            value: `${profile?.best_streak || 0} Days`,
            icon: Trophy,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
        },
        {
            label: 'On Time Rate',
            value: '98%', // Mock for now
            icon: Clock,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
        },
    ];

    return (
        <Layout>
            <div className="relative z-0">
                <AnimatedBackground />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-fade-in">
                <Card className="shadow-soft border-border/50 overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10" />
                    <CardContent className="relative pt-0 pb-8 px-8">
                        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-12">
                            <div className="relative group">
                                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                                    <AvatarImage src={(profile as any)?.avatar_url} className="object-cover" />
                                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-indigo-600 text-white">
                                        {getInitials(profile?.full_name || '')}
                                    </AvatarFallback>
                                </Avatar>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="absolute bottom-0 right-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                />
                            </div>

                            <div className="flex-1 space-y-2 mb-2">
                                <div>
                                    <h1 className="text-3xl font-bold text-foreground">{profile?.full_name}</h1>
                                    <p className="text-muted-foreground flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> {profile?.email}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="capitalize">
                                        <Briefcase className="w-3 h-3 mr-1" />
                                        {profile?.role}
                                    </Badge>
                                    <Badge variant="outline" className="text-success border-success/30 bg-success/5">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Active Status
                                    </Badge>
                                </div>
                            </div>

                            <div className="hidden md:block text-right mb-2">
                                <p className="text-sm text-muted-foreground">Member since</p>
                                <p className="font-medium">January 2026</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-8">
                        <Card className="shadow-soft border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Performance Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {stats.map((stat, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.bg}`}>
                                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                                        </div>
                                        <span className="font-bold text-lg">{stat.value}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="shadow-soft border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Personal Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                                    <p className="font-medium">{profile?.full_name}</p>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Email Address</Label>
                                    <p className="font-medium">{profile?.email}</p>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Role</Label>
                                    <p className="font-medium capitalize">{profile?.role}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2 space-y-8">
                        <Card className="shadow-soft border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-primary" />
                                    Achievements
                                </CardTitle>
                                <CardDescription>Badges you've unlocked on your journey</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingAchievements ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                        {achievements?.map((achievement) => (
                                            <div key={achievement.id} className="flex flex-col items-center gap-2">
                                                <AchievementBadge
                                                    type={achievement.type}
                                                    unlocked={!!achievement.unlocked_at}
                                                    date={achievement.unlocked_at ? format(new Date(achievement.unlocked_at), 'MMM d, yyyy') : undefined}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Tabs defaultValue="activity">
                            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                                <TabsTrigger
                                    value="activity"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                                >
                                    Recent Activity
                                </TabsTrigger>
                                <TabsTrigger
                                    value="preferences"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                                >
                                    Preferences
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="activity" className="pt-4">
                                <Card className="border-none shadow-none bg-transparent">
                                    <CardContent className="p-0">
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p>Activity feed coming soon...</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="preferences" className="pt-4">
                                <Card className="border-none shadow-none bg-transparent">
                                    <CardContent className="p-0">
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p>Preferences settings coming soon...</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

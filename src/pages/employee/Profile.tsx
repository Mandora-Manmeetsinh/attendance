import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementBadge } from '@/components/AchievementBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import client from '@/api/client';
import '@/styles/Profile.css';

export default function Profile() {
    const { user, profile } = useAuth();
    const { data: achievements, isLoading: loadingAchievements } = useAchievements();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activities, setActivities] = useState<any[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(false);

    useEffect(() => {
        const fetchActivity = async () => {
            setLoadingActivity(true);
            try {
                const { data } = await client.get('/auth/profile/activity');
                setActivities(data);
            } catch (error) {
                console.error("Failed to load activity", error);
            } finally {
                setLoadingActivity(false);
            }
        };
        if (user) fetchActivity();
    }, [user]);

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        toast.info("Avatar upload is currently disabled during migration.");
    };

    const stats = [
        {
            label: 'Current Streak',
            value: `${profile?.current_streak || 0} Days`,
            icon: Flame,
            color: 'text-orange-500',
        },
        {
            label: 'Total Attendance',
            value: `${profile?.total_attendance || 0} Days`,
            icon: Calendar,
            color: 'text-blue-500',
        },
        {
            label: 'Best Streak',
            value: `${profile?.best_streak || 0} Days`,
            icon: Trophy,
            color: 'text-yellow-500',
        },
        {
            label: 'On Time Rate',
            value: `${profile?.total_attendance ? Math.round(((profile.total_attendance - (profile.late_count || 0)) / profile.total_attendance) * 100) : 100}%`,
            icon: Clock,
            color: 'text-green-500',
        },
    ];

    return (
        <Layout>
            <div className="profile-container">
                <div className="profile-header-card">
                    <div className="profile-banner" />
                    <div className="profile-avatar-wrapper">
                        <div className="relative group">
                            <Avatar className="profile-avatar">
                                <AvatarImage src={(profile as any)?.avatar_url} className="object-cover" />
                                <AvatarFallback>
                                    {getInitials(profile?.full_name || '')}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                title="Change Avatar"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                        </div>

                        <div className="profile-info">
                            <h1 className="profile-name">{profile?.full_name}</h1>
                            <div className="profile-role-badge">
                                <Badge variant="secondary" className="gap-1.5 font-medium px-3 py-1">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    {profile?.role?.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-success border-success/30 bg-success/5 px-3 py-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    Active
                                </Badge>
                            </div>
                            <p className="text-muted-foreground flex items-center gap-2 mt-2">
                                <Mail className="w-4 h-4" /> {profile?.email}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline">Edit Profile</Button>
                        </div>
                    </div>
                </div>

                <div className="profile-stats-grid">
                    {stats.map((stat, index) => (
                        <Card key={index} className="stat-item border-none shadow-sm">
                            <div className={`p-3 rounded-xl bg-muted/50 ${stat.color} mb-3`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <p className="stat-value">{stat.value}</p>
                            <p className="stat-label">{stat.label}</p>
                        </Card>
                    ))}
                </div>

                <div className="profile-content-grid">
                    <div className="space-y-8">
                        <Card className="section-card">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
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
                                    <div className="achievement-grid">
                                        {achievements?.map((achievement) => (
                                            <div key={achievement.id} className="achievement-item">
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
                            <TabsList className="grid w-full grid-cols-2 mb-6 shadow-sm">
                                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                            </TabsList>
                            <TabsContent value="activity">
                                <Card className="section-card">
                                    <CardContent className="pt-6 px-0">
                                        {loadingActivity ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : activities.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <p>No recent activity found.</p>
                                            </div>
                                        ) : (
                                            <div className="activity-list px-6">
                                                {activities.map((activity) => (
                                                    <div key={activity._id} className="activity-item">
                                                        <div className={`activity-icon ${activity.check_out ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                                            <Clock className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-sm">
                                                                {activity.check_out ? 'Shift Completed' : 'Checked In'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {format(new Date(activity.date), 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium text-sm">
                                                                {activity.check_out
                                                                    ? format(new Date(activity.check_out), 'h:mm a')
                                                                    : format(new Date(activity.check_in), 'h:mm a')
                                                                }
                                                            </p>
                                                            <Badge variant="outline" className="text-xs capitalize">
                                                                {activity.status.replace('_', ' ')}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="preferences">
                                <Card className="section-card">
                                    <CardContent className="p-12 text-center text-muted-foreground">
                                        <p>Preferences settings coming soon...</p>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
                            <CardHeader>
                                <CardTitle className="text-lg">Account Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">User ID</Label>
                                    <p className="font-mono text-xs overflow-hidden truncate">{profile?._id}</p>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Joined On</Label>
                                    <p className="font-medium">Jan 10, 2026</p>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Department</Label>
                                    <p className="font-medium">Operations</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Help & Support</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Having trouble with check-ins or need to update your details?
                                </p>
                                <Button className="w-full h-11">Contact HR Manager</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
    return <p className={`text-xs font-semibold uppercase tracking-wider ${className}`}>{children}</p>;
}

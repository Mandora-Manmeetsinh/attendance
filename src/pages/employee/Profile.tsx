import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementBadge } from '@/components/AchievementBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    CheckCircle2,
    Shield,
    Settings,
    Save
} from 'lucide-react';
import { format } from 'date-fns';
import client from '@/api/client';
import { StatusBadge } from '@/components/StatusBadge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import '@/styles/Profile.css';

export default function Profile() {
    const { user, profile } = useAuth();
    const { data: achievements, isLoading: loadingAchievements } = useAchievements();
    const [uploading, setUploading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        phone_number: profile?.phone_number || '',
        avatar_url: profile?.avatar_url || ''
    });

    useEffect(() => {
        if (profile) {
            setEditForm({
                full_name: profile.full_name || '',
                email: profile.email || '',
                phone_number: profile.phone_number || '',
                avatar_url: profile.avatar_url || ''
            });
        }
    }, [profile]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activities, setActivities] = useState<{ _id: string; date: string; check_in: string; check_out?: string; status: string }[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const fetchActivity = async () => {
            setLoadingActivity(true);
            try {
                const { data } = await client.get('/auth/profile/activity');
                setActivities(data);
            } catch (error) {
                console.error('Failed to load activity', error);
            } finally {
                setLoadingActivity(false);
            }
        };
        if (user) fetchActivity();
    }, [user]);

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    };

    const getAvatarSrc = (url: string | undefined) => {
        if (!url) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`;
        if (url.startsWith('https://') || url.startsWith('http://')) return url;
        
        // Correctly derive server URL from VITE_API_URL or current origin
        const apiURL = import.meta.env.VITE_API_URL || '/api';
        const serverURL = apiURL.includes('://') 
            ? apiURL.replace('/api', '') 
            : window.location.origin;
            
        return `${serverURL}${url}`;
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        setUploading(true);
        try {
            await client.post('/auth/upload-avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Avatar updated!');
            window.location.reload();
        } catch (error) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const handleRandomAvatar = async () => {
        const seed = Math.random().toString(36).substring(7);
        const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
        try {
            await client.put('/auth/profile', { avatar_url: url });
            toast.success('Random avatar applied!');
            window.location.reload();
        } catch {
            toast.error('Failed to update avatar');
        }
    };

    const handleUpdateProfile = async () => {
        setUpdating(true);
        try {
            await client.put('/auth/profile', editForm);
            toast.success('Profile updated');
            window.location.reload();
        } catch (error) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        try {
            await client.post('/auth/change-password', { currentPassword, newPassword });
            toast.success('Password changed successfully');
            (e.target as HTMLFormElement).reset();
        } catch (error) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to change password');
        }
    };

    const stats = [
        { label: 'Current Streak', value: `${profile?.current_streak || 0} Days`, icon: Flame, color: 'text-orange-500' },
        { label: 'Total Attendance', value: `${profile?.total_attendance || 0} Days`, icon: Calendar, color: 'text-blue-500' },
        { label: 'Best Streak', value: `${profile?.best_streak || 0} Days`, icon: Trophy, color: 'text-yellow-500' },
        {
            label: 'On Time Rate',
            value: `${profile?.total_attendance ? Math.round(((profile.total_attendance - (profile.late_count || 0)) / profile.total_attendance) * 100) : 100}%`,
            icon: Clock,
            color: 'text-green-500',
        },
    ];

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
                
                {/* Header Profile Section */}
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="h-32 bg-primary/5 relative border-b border-border">
                        <div className="absolute top-4 right-4">
                            <Badge className="bg-success/10 text-success hover:bg-success/20 border-none px-3 font-semibold uppercase tracking-wider text-[10px]">
                                {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'User'}
                            </Badge>
                        </div>
                    </div>

                    <div className="px-6 pb-6 relative flex flex-col md:flex-row items-center md:items-end gap-6">
                        <div className="relative -mt-16 group">
                            <div className="w-32 h-32 rounded-xl border-4 border-background bg-card shadow-sm relative overflow-hidden">
                                <Avatar className="w-full h-full rounded-lg">
                                    {uploading ? (
                                        <div className="flex items-center justify-center w-full h-full bg-muted">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    ) : (
                                        <>
                                            <AvatarImage src={getAvatarSrc(profile?.avatar_url)} className="object-cover" />
                                            <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">
                                                {getInitials(profile?.full_name || '')}
                                            </AvatarFallback>
                                        </>
                                    )}
                                </Avatar>
                            </div>
                            <div className="absolute -bottom-2 -right-2 flex gap-1">
                                <button
                                    onClick={handleRandomAvatar}
                                    className="p-2 bg-card text-foreground rounded-lg shadow-sm border border-border hover:bg-muted transition-colors"
                                    title="Random Avatar"
                                >
                                    <Flame className="w-4 h-4 text-orange-500" />
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-primary text-primary-foreground rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
                                    title="Upload Photo"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </div>

                        <div className="flex-1 text-center md:text-left mb-2 md:mb-0">
                            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">{profile?.full_name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2 items-center">
                                <Badge variant="secondary" className="gap-1.5 font-medium px-2 py-0.5 text-xs rounded-md">
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                    {profile?.email}
                                </Badge>
                                <Badge variant="secondary" className="gap-1.5 font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md text-primary">
                                    <Briefcase className="w-3 h-3" />
                                    {profile?.role}
                                </Badge>
                                <div className="hidden md:block h-3 w-px bg-border mx-1" />
                                <p className="text-xs font-mono text-muted-foreground">ID: {profile?._id.slice(-8).toUpperCase()}</p>
                            </div>
                        </div>

                        <div className="w-full md:w-auto mb-2 md:mb-0">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full md:w-auto h-10 px-4 rounded-lg bg-card border-border hover:bg-muted text-foreground font-medium gap-2 shadow-sm">
                                        <Settings className="w-4 h-4" />
                                        Edit Profile
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] rounded-xl p-0 overflow-hidden shadow-lg border-border">
                                    <div className="p-6 space-y-6">
                                        <div className="space-y-1">
                                            <h2 className="text-xl font-bold text-foreground tracking-tight">Profile Settings</h2>
                                            <p className="text-muted-foreground text-sm">Update your name, phone number, or avatar.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-foreground">Full Name</Label>
                                                <Input
                                                    value={editForm.full_name}
                                                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                                                    className="h-10 rounded-md focus-visible:ring-1 focus-visible:ring-primary"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-foreground">Phone Number</Label>
                                                <Input
                                                    value={editForm.phone_number}
                                                    onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                                                    className="h-10 rounded-md focus-visible:ring-1 focus-visible:ring-primary"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                                                <Input
                                                    value={editForm.email}
                                                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                                    className="h-10 rounded-md focus-visible:ring-1 focus-visible:ring-primary"
                                                    type="email"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-foreground">Avatar URL</Label>
                                                <Input
                                                    value={editForm.avatar_url}
                                                    onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                                                    className="h-10 rounded-md focus-visible:ring-1 focus-visible:ring-primary"
                                                    placeholder="https://..."
                                                />
                                                <p className="text-[10px] text-muted-foreground">Leave blank to use a generated avatar.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="flex-1 h-10 rounded-lg">Cancel</Button>
                                            </DialogTrigger>
                                            <Button
                                                onClick={handleUpdateProfile}
                                                className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                                disabled={updating}
                                            >
                                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                        <div key={index} className="bg-card border border-border p-5 rounded-xl shadow-sm text-center">
                            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-muted/50 flex items-center justify-center border border-border">
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <p className="text-lg font-bold text-foreground leading-tight">{stat.value}</p>
                            <p className="text-xs font-medium text-muted-foreground mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column (Activities/Settings) */}
                    <div className="md:col-span-8 space-y-6">
                        
                        {/* Achievements Card */}
                        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-primary" />
                                        Achievements
                                    </h2>
                                    <p className="text-muted-foreground text-sm mt-0.5">Milestones you've unlocked</p>
                                </div>
                                <Badge variant="secondary" className="rounded-md">
                                    {achievements?.filter(a => a.unlocked_at).length || 0} Unlocked
                                </Badge>
                            </div>

                            {loadingAchievements ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {achievements?.map((achievement) => (
                                        <div key={achievement.id} className="flex flex-col items-center p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 transition-colors">
                                            <AchievementBadge
                                                type={achievement.type}
                                                unlocked={!!achievement.unlocked_at}
                                                date={achievement.unlocked_at ? format(new Date(achievement.unlocked_at), 'MMM d, yyyy') : undefined}
                                            />
                                            <p className={`mt-2 text-[10px] font-bold uppercase tracking-wider text-center ${achievement.unlocked_at ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                                                {achievement.type.replace('_', ' ')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Activity / Settings Toggler */}
                        <div>
                            <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg border border-border w-fit">
                                <button
                                    className={`px-4 py-1.5 rounded-md font-semibold text-xs sm:text-sm transition-all ${!showSettings ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setShowSettings(false)}
                                >
                                    Activity Logs
                                </button>
                                <button
                                    className={`px-4 py-1.5 rounded-md font-semibold text-xs sm:text-sm transition-all ${showSettings ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setShowSettings(true)}
                                >
                                    Security
                                </button>
                            </div>

                            {!showSettings ? (
                                <div className="bg-card rounded-xl border border-border p-0 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-border bg-muted/10">
                                        <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
                                    </div>
                                    <div className="p-5">
                                        {loadingActivity ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                            </div>
                                        ) : activities.length === 0 ? (
                                            <div className="text-center py-10">
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 border border-border">
                                                    <Clock className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                                <p className="font-semibold text-foreground text-sm">No recent activity</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {activities.map((activity) => (
                                                    <div key={activity._id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${activity.check_out ? 'bg-blue-500/10' : 'bg-success/10'}`}>
                                                            <div className={`w-2 h-2 rounded-full ${activity.check_out ? 'bg-blue-500' : 'bg-success'}`} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-foreground">
                                                                {activity.check_out ? 'Checked Out' : 'Checked In'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground font-medium">
                                                                {format(new Date(activity.date), 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono text-sm font-semibold text-foreground">
                                                                {activity.check_out
                                                                    ? format(new Date(activity.check_out), 'hh:mm a')
                                                                    : format(new Date(activity.check_in), 'hh:mm a')
                                                                }
                                                            </p>
                                                            <div className="mt-1">
                                                                <StatusBadge status={activity.status} size="sm" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button variant="ghost" className="w-full text-xs font-semibold text-muted-foreground h-9 mt-2">
                                                    Load More
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-foreground tracking-tight mb-5 flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-primary" /> Change Password
                                    </h3>
                                    <form onSubmit={handlePasswordChange} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-foreground">Current Password</Label>
                                                <Input type="password" name="currentPassword" required className="h-10 rounded-md" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-foreground">New Password</Label>
                                                <Input type="password" name="newPassword" required className="h-10 rounded-md" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-foreground">Confirm New Password</Label>
                                            <Input type="password" name="confirmPassword" required className="h-10 rounded-md" />
                                        </div>
                                        <div className="pt-2">
                                            <Button type="submit" className="w-full md:w-auto px-6 h-10 bg-primary text-primary-foreground font-semibold rounded-lg shadow-sm">
                                                Update Password
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column (Info Cards) */}
                    <div className="md:col-span-4 space-y-6">
                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <h3 className="text-base font-bold text-foreground tracking-tight mb-5 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" /> Employment Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Employee ID</p>
                                    <p className="font-mono text-xs text-foreground bg-muted p-2 rounded-md border border-border break-all">{profile?._id}</p>
                                </div>
                                <div className="h-px bg-border" />
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Joined</p>
                                    <p className="text-sm font-semibold text-foreground">January 10, 2026</p>
                                </div>
                                <div className="h-px bg-border" />
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Department</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <p className="text-sm font-semibold text-foreground">Operations</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <h3 className="text-base font-bold text-foreground tracking-tight mb-3">HR Support</h3>
                            <p className="text-sm text-muted-foreground mb-5">
                                Need to update your details or having issues? Reach out to HR.
                            </p>
                            <Button variant="outline" className="w-full h-10 rounded-lg font-semibold text-xs border-border">
                                Contact HR
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { LiveClock } from '@/components/LiveClock';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import client from '@/api/client';
import {
  MapPin,
  LogIn,
  LogOut,
  Loader2,
  AlertCircle,
  Navigation,
  Calendar,
  Timer,
  Fingerprint,
  Clock,
  Pause,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { StreakCounter } from '@/components/StreakCounter';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import '@/styles/CheckInOut.css';

interface TodayAttendance {
  _id: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  distance_at_check_in: number | null;
  worked_minutes?: number;
  is_late?: boolean;
  is_early_checkout?: boolean;
  final_status?: string;
  is_on_break?: boolean;
  break_minutes?: number;
  break_start?: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
}

interface ShiftConfig {
  role: string;
  batch: string | null;
  shift_start: string;
  shift_end: string;
  check_in_window_start: string;
  check_in_window_end: string;
  min_minutes: number;
  description: string;
  formatted: {
    shift_start: string;
    shift_end: string;
    check_in_window: string;
    min_hours: string;
  };
  status: {
    canCheckIn: boolean;
    canCheckOut: boolean;
    isBeforeCheckIn: boolean;
    isAfterCheckIn: boolean;
    currentTime: string;
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function CheckInOut() {
  const { profile } = useAuth();
  const { getCurrentPosition, loading: geoLoading, error: geoError } = useGeolocation();
  const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
  const [wfhCount, setWfhCount] = useState(0);
  const [wfhLimit, setWfhLimit] = useState(2);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office');
  const [attendanceAction, setAttendanceAction] = useState<'check_in' | 'check_out' | null>(null);

  const streak = profile?.current_streak || 0;

  const fetchShiftConfig = useCallback(async () => {
    try {
      const { data } = await client.get('/shifts/my-shift');
      setShiftConfig(data);
    } catch (error) {
      console.error('Failed to fetch shift config:', error);
    } finally {
      setShiftLoading(false);
    }
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    if (!profile) return;
    try {
      const { data } = await client.get('/attendance/today');
      // API returns { record, wfh_count, wfh_limit } but older versions returned the record directly
      const record = data?.record !== undefined ? data.record : (data?._id ? data : null);
      setTodayRecord(record);
      setWfhCount(data.wfh_count || 0);
      setWfhLimit(data.wfh_limit || 2);
    } catch (error) {
      console.error('Failed to fetch today\'s attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      fetchTodayAttendance();
      fetchShiftConfig();
    }
  }, [profile, fetchTodayAttendance, fetchShiftConfig]);

  const handleAttendance = async (action: 'check_in' | 'check_out') => {
    setActionLoading(true);
    try {
      let position;

      try {
        position = await getCurrentPosition();

        console.log("📍 LOCATION:", position.latitude, position.longitude);

        // 🚨 IMPORTANT FIX
        if (!position.latitude || !position.longitude) {
          throw new Error("Location not available. Please enable GPS.");
        }

      } catch (err) {
        console.error("❌ GEO ERROR:", err);

        toast.error("Please enable location (GPS) and allow permission.");

        setActionLoading(false);
        return;
      }

      const endpoint = action === 'check_in' ? '/attendance/check-in' : '/attendance/check-out';
      const { data } = await client.post(endpoint, {
        latitude: position.latitude,
        longitude: position.longitude,
        work_mode: workMode,
      });

      if (data?.success) {
        toast.success(data.message);
        fetchTodayAttendance();
      }
    } catch (error) {
      const err = error as ApiError;
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to process attendance';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      const { data } = await client.post('/attendance/start-break');
      if (data?.success) {
        toast.success(data.message);
        fetchTodayAttendance();
      }
    } catch (error) {
      const err = error as ApiError;
      toast.error(err.response?.data?.message || 'Failed to start break');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeBreak = async () => {
    setActionLoading(true);
    try {
      const { data } = await client.post('/attendance/resume-break');
      if (data?.success) {
        toast.success(data.message);
        fetchTodayAttendance();
      }
    } catch (error) {
      const err = error as ApiError;
      toast.error(err.response?.data?.message || 'Failed to resume from break');
    } finally {
      setActionLoading(false);
    }
  };

  const canCheckIn = !todayRecord?.check_in;
  const canCheckOut = todayRecord?.check_in && !todayRecord?.check_out;
  const isComplete = todayRecord?.check_in && todayRecord?.check_out;

  const getWorkDuration = () => {
    if (!todayRecord?.check_in) return null;
    const startTime = new Date(todayRecord.check_in);
    let endTime = todayRecord.check_out ? new Date(todayRecord.check_out) : new Date();

    // Total break minutes already stored + current break if active
    const breakTotal = todayRecord.break_minutes || 0;

    if (todayRecord.is_on_break && todayRecord.break_start) {
      const breakStart = new Date(todayRecord.break_start);
      // While on break, work timer ends at break start
      endTime = breakStart;
    }

    const diffMins = differenceInMinutes(endTime, startTime) - breakTotal;

    return {
      hours: Math.floor(diffMins / 60),
      mins: diffMins % 60,
    };
  };

  const getBreakTime = () => {
    if (!todayRecord?.check_in) return 0;
    let total = todayRecord.break_minutes || 0;
    if (todayRecord.is_on_break && todayRecord.break_start) {
      const start = new Date(todayRecord.break_start);
      total += differenceInMinutes(new Date(), start);
    }
    return total;
  };

  const getShiftProgress = () => {
    if (!todayRecord?.check_in || !profile) return 0;
    const [endH, endM] = (profile.shift_end || '18:00:00').split(':').map(Number);
    const [startH, startM] = (profile.shift_start || '09:00:00').split(':').map(Number);
    const totalMinutes = (endH - startH) * 60 + (endM - startM);
    const duration = getWorkDuration();
    if (!duration) return 0;
    return Math.min(100, Math.round(((duration.hours * 60 + duration.mins) / totalMinutes) * 100));
  };

  const workDuration = getWorkDuration();
  const shiftProgress = getShiftProgress();

  const limits = (profile)?.monthly_limits || { leave: 2, late: 3, wfh: 2 };
  const stats = (profile)?.month_stats || { leave: 0, late: 0, wfh: 0 };

  const getAvatarSrc = (url: string | undefined) => {
    if (!url) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email || 'user'}`;
    if (url.startsWith('https://') || url.startsWith('http://')) return url;

    // Correctly derive server URL from VITE_API_URL or current origin
    const apiURL = import.meta.env.VITE_API_URL || '/api';
    const serverURL = apiURL.includes('://')
      ? apiURL.replace('/api', '')
      : window.location.origin;

    return `${serverURL}${url}`;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={getAvatarSrc((profile)?.avatar_url)} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {(profile?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-0.5">
                {getGreeting()}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'User'} {profile?.full_name?.split(' ')[0]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Current Time</p>
              <div className="text-2xl font-bold text-foreground font-mono">
                <LiveClock showSeconds />
              </div>
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center text-primary border border-primary/20">
              <Timer className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Action Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-card border-border shadow-sm p-4 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">WFH This Month</p>
                  <Badge variant={stats.wfh >= limits.wfh ? "destructive" : "secondary"} className="h-5 px-1.5 text-[10px]">
                    {Math.max(0, limits.wfh - stats.wfh)} left
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">{stats.wfh}/{limits.wfh}</h3>
                  <button 
                    disabled={stats.wfh >= limits.wfh || !canCheckIn}
                    onClick={() => setWorkMode(prev => prev === 'office' ? 'wfh' : 'office')}
                    className={`p-1.5 rounded-md transition-colors ${workMode === 'wfh' ? 'bg-primary/20 text-primary' : (canCheckIn ? 'bg-muted hover:bg-muted/80 text-muted-foreground' : 'bg-muted opacity-50 text-muted-foreground')}`}
                    title={workMode === 'wfh' ? 'Set to Office' : 'Set to WFH'}
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                </div>
                <Progress value={(stats.wfh / limits.wfh) * 100} className="h-1.5 mt-3" />
              </Card>

              <Card className="bg-card border-border shadow-sm p-4 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Late This Month</p>
                  <Badge variant={stats.late >= limits.late ? "destructive" : "secondary"} className="h-5 px-1.5 text-[10px]">
                    {Math.max(0, limits.late - stats.late)} left
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">{stats.late}/{limits.late}</h3>
                  <div className="p-1.5 rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <Progress value={(stats.late / limits.late) * 100} className="h-1.5 mt-3 indicator-orange" />
              </Card>

              <Card className="bg-card border-border shadow-sm p-4 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Leaves This Month</p>
                  <Badge variant={stats.leave >= limits.leave ? "destructive" : "secondary"} className="h-5 px-1.5 text-[10px]">
                    {Math.max(0, limits.leave - stats.leave)} left
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">{stats.leave}/{limits.leave}</h3>
                  <div className="p-1.5 rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <Progress value={(stats.leave / limits.leave) * 100} className="h-1.5 mt-3 indicator-purple" />
              </Card>
            </div>

            {/* Attendance Action Card */}
            <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col items-center justify-center relative min-h-[320px] bg-muted/10">
                {geoError && (
                  <div className="absolute top-4 left-4 right-4 flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-medium">{geoError}</p>
                  </div>
                )}

                <div className="text-center mb-10 w-full max-w-sm mx-auto flex items-center justify-between">
                   <div>
                      <h2 className="text-xl font-bold text-foreground text-left">
                        {isComplete ? 'Shift Complete' : canCheckOut ? 'Currently Working' : 'Ready to begin?'}
                      </h2>
                      <p className="text-muted-foreground text-sm text-left">
                        {isComplete ? 'Great job today.' : 'Please log your attendance.'}
                      </p>
                   </div>
                   {todayRecord && (
                     <StatusBadge status={todayRecord.is_on_break ? 'on_break' : todayRecord.status} size="sm" />
                   )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-md">
                  <Button
                    className={`flex-1 h-32 w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border shadow-sm
                      ${canCheckIn 
                          ? 'bg-primary hover:bg-primary/95 text-primary-foreground border-transparent' 
                          : 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-70'}
                    `}
                    disabled={!canCheckIn || actionLoading || geoLoading}
                    onClick={() => setAttendanceAction('check_in')}
                    variant={canCheckIn ? 'default' : 'outline'}
                  >
                    {actionLoading && !todayRecord?.check_in ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <LogIn className="w-8 h-8" />
                    )}
                    <span className="font-semibold text-lg">Check In</span>
                  </Button>

                  <Button
                    className={`flex-1 h-32 w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border shadow-sm
                      ${canCheckOut && !todayRecord?.is_on_break
                          ? 'bg-foreground hover:bg-foreground/90 text-background border-transparent' 
                          : 'bg-card hover:bg-muted text-muted-foreground border-border opacity-70'}
                    `}
                    disabled={!canCheckOut || todayRecord?.is_on_break || actionLoading || geoLoading}
                    onClick={() => setAttendanceAction('check_out')}
                    variant="outline"
                  >
                    {actionLoading && canCheckOut ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <LogOut className="w-8 h-8" />
                    )}
                    <span className="font-semibold text-lg">Check Out</span>
                  </Button>
                </div>

                {canCheckOut && (
                  <div className="mt-6 w-full max-w-md">
                    <Button
                      variant="outline"
                      className={`w-full h-12 rounded-lg font-medium shadow-sm gap-2 ${todayRecord?.is_on_break ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                      disabled={actionLoading}
                      onClick={todayRecord?.is_on_break ? handleResumeBreak : handleStartBreak}
                    >
                      <Pause className="w-4 h-4" />
                      {todayRecord?.is_on_break ? 'Resume Work' : 'Take a Break'}
                    </Button>
                  </div>
                )}
                
                {todayRecord?.check_in && !todayRecord.check_out && (
                  <div className="mt-8 w-full">
                     <div className={`p-4 rounded-xl border ${todayRecord.is_on_break ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'} w-full flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${todayRecord.is_on_break ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              <Timer className={`w-4 h-4 ${todayRecord.is_on_break ? 'animate-spin-slow' : ''}`} />
                           </div>
                           <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break Time Used</p>
                              <div className="flex items-baseline gap-1">
                                <span className={`text-lg font-bold ${getBreakTime() > 45 ? 'text-destructive' : 'text-foreground'}`}>{getBreakTime()}</span>
                                <span className="text-xs text-muted-foreground">/ 45 mins</span>
                              </div>
                           </div>
                        </div>
                        {getBreakTime() > 45 && (
                          <Badge variant="destructive">Exceeded</Badge>
                        )}
                     </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="bg-card border-border shadow-sm p-5 rounded-xl">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                  <Fingerprint className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Today's Times</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                    <span className="text-sm font-semibold text-muted-foreground">Check In</span>
                    <span className="text-base font-mono font-bold text-foreground">
                      {todayRecord?.check_in ? format(new Date(todayRecord.check_in), 'hh:mm a') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                    <span className="text-sm font-semibold text-muted-foreground">Check Out</span>
                    <span className="text-base font-mono font-bold text-foreground">
                      {todayRecord?.check_out ? format(new Date(todayRecord.check_out), 'hh:mm a') : '—'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="bg-card border-border shadow-sm p-5 rounded-xl">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Work Duration</h3>
                </div>
                {workDuration ? (
                  <div className="space-y-6">
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold text-foreground">
                        {workDuration.hours}<span className="text-lg text-muted-foreground mx-1">h</span> {workDuration.mins}<span className="text-lg text-muted-foreground ml-1">m</span>
                      </p>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">{shiftProgress}%</p>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">of shift</p>
                      </div>
                    </div>
                    <Progress value={shiftProgress} className="h-2.5" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                    <Timer className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-sm font-medium">Not checked in yet</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
          
          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            <StreakCounter streak={streak} bestStreak={profile?.best_streak || streak} />
            
            <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 bg-muted/30 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Today's Shift
                </h3>
              </div>
              <div className="p-5">
                {shiftLoading ? (
                  <div className="flex justify-center p-4">
                     <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : shiftConfig ? (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Shift Hours</p>
                      <p className="font-bold text-lg text-foreground">{shiftConfig.formatted.shift_start} — {shiftConfig.formatted.shift_end}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Role / Batch</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="px-2.5 py-0.5 rounded-md font-semibold text-xs text-primary bg-primary/10 hover:bg-primary/20">
                          {profile?.role?.toUpperCase()}
                        </Badge>
                        {profile?.batch && (
                          <Badge variant="outline" className="px-2.5 py-0.5 rounded-md font-semibold text-xs">
                            {profile.batch}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No shift assigned.</p>
                )}
                <div className="mt-6 pt-4 border-t border-border">
                  <Button variant="outline" className="w-full h-10 rounded-lg font-medium text-sm gap-2" asChild>
                    <a href="/employee/history">
                      View History <Clock className="w-4 h-4 opacity-50" />
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!attendanceAction} onOpenChange={(open) => !open && setAttendanceAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{attendanceAction === 'check_in' ? 'Check In' : 'Check Out'}</DialogTitle>
            <DialogDescription>
              Are you working from home or from the office for this session?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant={workMode === 'office' ? 'default' : 'outline'}
              onClick={() => setWorkMode('office')}
              className={workMode === 'office' ? 'ring-2 ring-primary ring-offset-2' : ''}
            >
              🏢 Office
            </Button>
            <Button
              variant={workMode === 'wfh' ? 'default' : 'outline'}
              onClick={() => setWorkMode('wfh')}
              disabled={workMode !== 'wfh' && stats.wfh >= limits.wfh && attendanceAction === 'check_in'}
              className={workMode === 'wfh' ? 'ring-2 ring-primary ring-offset-2' : ''}
            >
              🏠 Work From Home
              {stats.wfh >= limits.wfh && attendanceAction === 'check_in' && (
                <span className="block text-[10px] mt-1 opacity-70">(Limit reached)</span>
              )}
            </Button>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setAttendanceAction(null)}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={actionLoading || geoLoading}
              onClick={() => {
                if (attendanceAction) {
                  handleAttendance(attendanceAction);
                  setAttendanceAction(null);
                }
              }}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm {attendanceAction === 'check_in' ? 'Check In' : 'Check Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

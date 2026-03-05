import { useState, useEffect } from 'react';
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
  CheckCircle2,
  Navigation,
  Calendar,
  Timer,
  Fingerprint,
  Clock,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { StreakCounter } from '@/components/StreakCounter';
import { Badge } from '@/components/ui/badge';
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

export default function CheckInOut() {
  const { profile } = useAuth();
  const { getCurrentPosition, loading: geoLoading, error: geoError } = useGeolocation();
  const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office');

  const streak = profile?.current_streak || 0;

  const fetchShiftConfig = async () => {
    try {
      const { data } = await client.get('/shifts/my-shift');
      setShiftConfig(data);
    } catch (error) {
      console.error('Error fetching shift config:', error);
    } finally {
      setShiftLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    if (!profile) return;
    try {
      const { data } = await client.get('/attendance/today');
      setTodayRecord(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchTodayAttendance();
      fetchShiftConfig();
    }
  }, [profile]);

  const handleAttendance = async (action: 'check_in' | 'check_out') => {
    setActionLoading(true);
    try {
      let position = { latitude: 0, longitude: 0 };
      try {
        position = await getCurrentPosition();
      } catch (err) {
        if (workMode === 'office') throw err;
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
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to process attendance';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const canCheckIn = !todayRecord?.check_in;
  const canCheckOut = todayRecord?.check_in && !todayRecord?.check_out;
  const isComplete = todayRecord?.check_in && todayRecord?.check_out;

  const getWorkDuration = () => {
    if (!todayRecord?.check_in) return null;
    const endTime = todayRecord.check_out ? new Date(todayRecord.check_out) : new Date();
    const startTime = new Date(todayRecord.check_in);
    const hours = differenceInHours(endTime, startTime);
    const mins = differenceInMinutes(endTime, startTime) % 60;
    return { hours, mins };
  };

  const getShiftProgress = () => {
    if (!todayRecord?.check_in || !profile) return 0;
    const [endH, endM] = (profile.shift_end || '18:00:00').split(':').map(Number);
    const [startH, startM] = (profile.shift_start || '09:00:00').split(':').map(Number);
    const totalMinutes = (endH - startH) * 60 + (endM - startM);
    const checkIn = new Date(todayRecord.check_in);
    const now = todayRecord.check_out ? new Date(todayRecord.check_out) : new Date();
    const worked = differenceInMinutes(now, checkIn);
    return Math.min(100, Math.round((worked / totalMinutes) * 100));
  };

  const workDuration = getWorkDuration();
  const shiftProgress = getShiftProgress();

  return (
    <Layout>
      <div className="check-in-container">
        <div className="check-in-header">
          <div className="header-user-info">
            <p className="greeting-text">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
            </p>
            <h1 className="user-full-name">{profile?.full_name}</h1>
            <p className="current-date">
              <Calendar className="w-5 h-5" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          <div className="header-actions">
            {profile?.wfh_enabled && (
              <Card className={`work-mode-card ${workMode === 'wfh' ? 'active' : ''}`}
                onClick={() => setWorkMode(prev => prev === 'office' ? 'wfh' : 'office')}>
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Mode</p>
                  <p className="text-lg font-bold">{workMode === 'wfh' ? 'Remote 🏠' : 'Office 🏢'}</p>
                </CardContent>
              </Card>
            )}

            <Card className="time-card">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Current Time</p>
                  <div className="live-clock-text">
                    <LiveClock showSeconds />
                  </div>
                </div>
                <Timer className="w-6 h-6 text-primary" />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="check-in-main-grid">
          <div className="action-column">
            <Card className={`main-action-card ${isComplete ? 'complete' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Navigation className="w-6 h-6 text-primary" />
                      {isComplete ? 'Attendance Recorded' : canCheckOut ? 'Active Shift' : 'Begin Workday'}
                    </CardTitle>
                    <CardDescription>
                      {isComplete ? 'You are all set for today!' : 'Please check in from the registered office location.'}
                    </CardDescription>
                  </div>
                  {todayRecord && <StatusBadge status={todayRecord.status} />}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {geoError && (
                  <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{geoError}</p>
                  </div>
                )}

                <div className="action-buttons-grid">
                  <Button
                    size="lg"
                    className="check-in-button"
                    disabled={!canCheckIn || actionLoading || geoLoading}
                    onClick={() => handleAttendance('check_in')}
                  >
                    {actionLoading && !todayRecord?.check_in ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <LogIn className="w-6 h-6" />
                    )}
                    <div className="text-center">
                      <p className="text-lg font-bold">Check In</p>
                      <p className="text-xs opacity-80">Start tracking time</p>
                    </div>
                  </Button>

                  <Button
                    size="lg"
                    className="check-out-button"
                    disabled={!canCheckOut || actionLoading || geoLoading}
                    onClick={() => handleAttendance('check_out')}
                    variant="outline"
                  >
                    {actionLoading && canCheckOut ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <LogOut className="w-6 h-6 text-primary" />
                    )}
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">Check Out</p>
                      <p className="text-xs text-muted-foreground">Complete shift</p>
                    </div>
                  </Button>
                </div>

                {isComplete && (
                  <div className="success-callout">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                    <div>
                      <p className="font-bold text-foreground">You've checked out!</p>
                      <p className="text-sm text-muted-foreground">Rest well and see you tomorrow.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="activity-summary-grid">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" /> Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Check-in</span>
                    <span className="font-bold font-mono">
                      {todayRecord?.check_in ? format(new Date(todayRecord.check_in), 'hh:mm a') : '--:--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Check-out</span>
                    <span className="font-bold font-mono">
                      {todayRecord?.check_out ? format(new Date(todayRecord.check_out), 'hh:mm a') : '--:--'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Work Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workDuration ? (
                    <div className="progress-section">
                      <div className="progress-header">
                        <p className="duration-display">
                          {workDuration.hours}<span className="duration-suffix">hr</span> {workDuration.mins}<span className="duration-suffix">min</span>
                        </p>
                        <p className="text-lg font-bold text-primary">{shiftProgress}%</p>
                      </div>
                      <Progress value={shiftProgress} className="h-2" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">Start shift to track duration</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="sidebar-column">
            <StreakCounter streak={streak} bestStreak={profile?.best_streak || streak} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-primary">
                  <Clock className="w-4 h-4" /> Shift Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {shiftLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : shiftConfig ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Shift Times</p>
                      <p className="font-bold text-lg">{shiftConfig.formatted.shift_start} — {shiftConfig.formatted.shift_end}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Role/Batch</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize">{profile?.role}</Badge>
                        {profile?.batch && <Badge variant="outline">{profile.batch}</Badge>}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No shift assigned yet.</p>
                )}
                <Separator />
                <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                  <a href="/employee/history">
                    Full History <Clock className="w-4 h-4 ml-auto" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Separator() {
  return <div className="h-px bg-border w-full my-4" />;
}

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { LiveClock } from '@/components/LiveClock';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { 
  MapPin, 
  Clock, 
  LogIn, 
  LogOut, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Navigation,
  Calendar,
  Timer,
  Fingerprint
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface TodayAttendance {
  id: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  distance_at_check_in: number | null;
}

export default function CheckInOut() {
  const { profile, session } = useAuth();
  const { getCurrentPosition, loading: geoLoading, error: geoError } = useGeolocation();
  const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTodayAttendance = async () => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, check_in, check_out, status, distance_at_check_in')
      .eq('profile_id', profile.id)
      .eq('date', today)
      .maybeSingle();

    if (!error && data) {
      setTodayRecord(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile) {
      fetchTodayAttendance();
    }
  }, [profile]);

  const handleAttendance = async (action: 'check_in' | 'check_out') => {
    setActionLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const position = await getCurrentPosition();
      
      const { data, error } = await supabase.functions.invoke('process-attendance', {
        body: {
          action,
          latitude: position.latitude,
          longitude: position.longitude,
        },
      });

      if (error) {
        let errorMessage = 'Failed to process attendance';
        let distance: number | undefined;
        
        try {
          const errorBody = await error.context?.json?.();
          if (errorBody?.error) {
            errorMessage = errorBody.error;
            distance = errorBody.distance;
          }
        } catch {
          errorMessage = error.message || errorMessage;
        }
        
        toast.error(errorMessage, {
          description: distance ? `You are ${distance}m from the office` : undefined,
        });
        return;
      }

      if (data?.error) {
        toast.error(data.error, {
          description: data.distance ? `You are ${data.distance}m from the office` : undefined,
        });
      } else if (data?.success) {
        toast.success(data.message, {
          description: action === 'check_in' ? 'Have a productive day!' : 'See you tomorrow!',
        });
        fetchTodayAttendance();
      }
    } catch (error: any) {
      console.error('Attendance error:', error);
      toast.error(error.message || 'Failed to process attendance');
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Live Clock */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary mb-1">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
            </p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {profile?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Card className="shadow-soft border-border/50 p-4">
            <LiveClock showSeconds />
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Shift Info Card */}
          <Card className="shadow-soft border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Shift Schedule
              </CardTitle>
              <CardDescription>Your assigned working hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {format(new Date(`2000-01-01 ${profile?.shift_start || '09:00:00'}`), 'hh:mm a')}
                  </p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {format(new Date(`2000-01-01 ${profile?.shift_end || '18:00:00'}`), 'hh:mm a')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Status Card */}
          <Card className="shadow-soft border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-primary" />
                  Today's Status
                </CardTitle>
                {todayRecord && <StatusBadge status={todayRecord.status} />}
              </div>
              <CardDescription>Your attendance for today</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : todayRecord ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-success/5 border border-success/10">
                      <p className="text-xs font-medium text-success uppercase tracking-wide">Check In</p>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {todayRecord.check_in 
                          ? format(new Date(todayRecord.check_in), 'hh:mm a')
                          : '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-xs font-medium text-primary uppercase tracking-wide">Check Out</p>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {todayRecord.check_out 
                          ? format(new Date(todayRecord.check_out), 'hh:mm a')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {workDuration && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Work Duration</span>
                        <span className="font-semibold">{workDuration.hours}h {workDuration.mins}m</span>
                      </div>
                      <Progress value={shiftProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1 text-right">{shiftProgress}% of shift</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Not checked in yet</p>
                  <p className="text-sm text-muted-foreground">Start your day by checking in below</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Card */}
        <Card className={`shadow-medium border-2 transition-all duration-300 ${
          isComplete ? 'border-success/30 bg-success/5' : 
          canCheckOut ? 'border-primary/30 bg-primary/5' : 
          'border-border/50'
        }`}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Mark Attendance
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Ensure you're within the office geofence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {geoError && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Location Access Required</p>
                  <p className="text-sm text-destructive/80 mt-1">{geoError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                className="h-auto py-8 flex-col gap-3 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1"
                disabled={!canCheckIn || actionLoading || geoLoading}
                onClick={() => handleAttendance('check_in')}
              >
                {actionLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                    <LogIn className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <span className="text-lg font-semibold block">Check In</span>
                  <span className="text-xs opacity-80">Start your workday</span>
                </div>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-auto py-8 flex-col gap-3 rounded-xl border-2 transition-all duration-300 hover:-translate-y-1"
                disabled={!canCheckOut || actionLoading || geoLoading}
                onClick={() => handleAttendance('check_out')}
              >
                {actionLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <LogOut className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <span className="text-lg font-semibold block">Check Out</span>
                  <span className="text-xs text-muted-foreground">End your workday</span>
                </div>
              </Button>
            </div>

            {isComplete && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
                <div>
                  <p className="font-semibold text-success">Attendance Complete!</p>
                  <p className="text-sm text-success/80">You've completed your attendance for today. Great work!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

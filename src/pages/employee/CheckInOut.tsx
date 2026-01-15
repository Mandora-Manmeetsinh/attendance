import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Clock, LogIn, LogOut, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
      const position = await getCurrentPosition();
      
      const { data, error } = await supabase.functions.invoke('process-attendance', {
        body: {
          action,
          latitude: position.latitude,
          longitude: position.longitude,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to process attendance');
      }

      if (data.error) {
        toast.error(data.error, {
          description: data.distance ? `You are ${data.distance}m from the office` : undefined,
        });
      } else {
        toast.success(data.message);
        fetchTodayAttendance();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process attendance');
    } finally {
      setActionLoading(false);
    }
  };

  const canCheckIn = !todayRecord?.check_in;
  const canCheckOut = todayRecord?.check_in && !todayRecord?.check_out;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Shift Info */}
        <Card className="shadow-soft border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Your Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start</p>
                <p className="font-semibold">{profile?.shift_start || '09:00:00'}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-sm text-muted-foreground">End</p>
                <p className="font-semibold">{profile?.shift_end || '18:00:00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Status */}
        <Card className="shadow-soft border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Attendance</CardTitle>
            <CardDescription>Your attendance status for today</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : todayRecord ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={todayRecord.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Check In</span>
                  <span className="font-medium">
                    {todayRecord.check_in 
                      ? format(new Date(todayRecord.check_in), 'hh:mm a')
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Check Out</span>
                  <span className="font-medium">
                    {todayRecord.check_out 
                      ? format(new Date(todayRecord.check_out), 'hh:mm a')
                      : '—'}
                  </span>
                </div>
                {todayRecord.distance_at_check_in && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Distance at Check-in</span>
                    <span className="font-medium">{todayRecord.distance_at_check_in}m</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>You haven't checked in yet today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="shadow-soft border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Mark Attendance
            </CardTitle>
            <CardDescription>
              Make sure you're within the office premises
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {geoError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{geoError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                className="h-auto py-6 flex-col gap-2"
                disabled={!canCheckIn || actionLoading || geoLoading}
                onClick={() => handleAttendance('check_in')}
              >
                {actionLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <LogIn className="w-6 h-6" />
                )}
                <span>Check In</span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-auto py-6 flex-col gap-2"
                disabled={!canCheckOut || actionLoading || geoLoading}
                onClick={() => handleAttendance('check_out')}
              >
                {actionLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <LogOut className="w-6 h-6" />
                )}
                <span>Check Out</span>
              </Button>
            </div>

            {todayRecord?.check_in && todayRecord?.check_out && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <p>You've completed your attendance for today!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

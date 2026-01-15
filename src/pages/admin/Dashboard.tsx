import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  TrendingUp,
  Calendar,
  ArrowRight,
  UserCheck,
  UserX
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface WeeklyData {
  day: string;
  present: number;
  late: number;
  absent: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceRate, setAttendanceRate] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      
      const [employeesRes, attendanceRes, weeklyRes] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'employee'),
        supabase.from('attendance_records').select('*, profiles(full_name, email)').eq('date', today).order('check_in', { ascending: false }),
        supabase.from('attendance_records').select('date, status').gte('date', format(weekStart, 'yyyy-MM-dd')).lte('date', format(weekEnd, 'yyyy-MM-dd')),
      ]);

      const total = employeesRes.data?.length || 0;
      const records = attendanceRes.data || [];
      const weekly = weeklyRes.data || [];
      
      const presentCount = records.filter(r => r.status === 'present').length;
      const lateCount = records.filter(r => r.status === 'late').length;
      const checkedIn = records.filter(r => r.check_in).length;
      
      setStats({
        total,
        present: presentCount,
        late: lateCount,
        absent: total - checkedIn,
      });
      
      // Calculate attendance rate
      const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
      setAttendanceRate(rate);
      
      setRecentRecords(records.slice(0, 6));

      // Process weekly data
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weeklyStats = days.map((day, index) => {
        const date = format(new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        const dayRecords = weekly.filter(r => r.date === date);
        return {
          day,
          present: dayRecords.filter(r => r.status === 'present').length,
          late: dayRecords.filter(r => r.status === 'late').length,
          absent: Math.max(0, total - dayRecords.length),
        };
      });
      setWeeklyData(weeklyStats);

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Today's Attendance Rate</p>
              <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
            </div>
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value={stats.total}
            icon={<Users className="w-6 h-6" />}
            variant="primary"
            description="Active team members"
          />
          <StatCard
            title="Present Today"
            value={stats.present}
            icon={<UserCheck className="w-6 h-6" />}
            variant="success"
            trend={{ value: 5, label: 'vs yesterday' }}
          />
          <StatCard
            title="Late Arrivals"
            value={stats.late}
            icon={<Clock className="w-6 h-6" />}
            variant="warning"
            description="After shift start"
          />
          <StatCard
            title="Absent Today"
            value={stats.absent}
            icon={<UserX className="w-6 h-6" />}
            variant="destructive"
            description="Not checked in"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Weekly Chart */}
          <Card className="lg:col-span-2 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Weekly Attendance Trend
              </CardTitle>
              <CardDescription>Employee attendance over the current week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area type="monotone" dataKey="present" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                    <Area type="monotone" dataKey="late" stroke="hsl(var(--warning))" fillOpacity={1} fill="url(#colorLate)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Today's Activity</CardTitle>
                <CardDescription>Recent check-ins</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/attendance" className="flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentRecords.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No check-ins yet today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRecords.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {r.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.check_in ? format(new Date(r.check_in), 'hh:mm a') : 'Not checked in'}
                        </p>
                      </div>
                      <StatusBadge status={r.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

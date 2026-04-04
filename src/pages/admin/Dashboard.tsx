import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import client from '@/api/client';
import {
  Users,
  Clock,
  Loader2,
  Calendar,
  ArrowRight,
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  Award,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import '@/styles/Dashboard.css';

interface WeeklyData {
  day: string;
  present: number;
  late: number;
  absent: number;
}

interface RecentRecord {
  id: string | number;
  user?: {
    full_name?: string;
  };
  check_in?: string | null;
  status: 'present' | 'late' | 'absent' | string;
}

interface TopPerformer {
  id: string | number;
  name: string;
  streak: number;
  score: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceRate, setAttendanceRate] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, weeklyRes, topRes, activityRes] = await Promise.all([
          client.get('/admin/dashboard/stats'),
          client.get('/admin/dashboard/weekly'),
          client.get('/admin/dashboard/top-performers'),
          client.get('/admin/dashboard/activity'),
        ]);

        setStats(statsRes.data);
        setWeeklyData(weeklyRes.data);
        setTopPerformers(topRes.data);
        setRecentRecords(activityRes.data);

        const { present, late, total } = statsRes.data;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
        setAttendanceRate(Math.min(100, rate));
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4 font-medium">Initializing Dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/60">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              Admin Overview
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today is {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          
          <Card className="bg-primary/5 border-primary/10 shadow-none px-6 py-3 flex items-center gap-6">
             <div className="text-right">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-0.5">Average Attendance</p>
                <p className="text-2xl font-black text-primary font-mono">{attendanceRate}%</p>
             </div>
             <Badge className={`h-8 px-3 rounded-lg font-bold shadow-sm ${attendanceRate > 80 ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}`}>
               {attendanceRate > 80 ? 'Optimal' : 'Needs Review'}
             </Badge>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Workforce"
            value={stats.total}
            icon={<Users className="w-5 h-5" />}
            variant="primary"
            description="Active accounts"
          />
          <StatCard
            title="Present"
            value={stats.present}
            icon={<UserCheck className="w-5 h-5" />}
            variant="success"
            description="Successfully checked in"
          />
          <StatCard
            title="Late Arrivals"
            value={stats.late}
            icon={<Clock className="w-5 h-5" />}
            variant="warning"
            description="After shift threshold"
          />
          <StatCard
            title="Absent"
            value={stats.absent}
            icon={<UserX className="w-5 h-5" />}
            variant="destructive"
            description="No logs recorded"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-8 bg-card border-border shadow-sm rounded-2xl overflow-hidden flex flex-col hover:border-primary/20 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Weekly Engagement</CardTitle>
                <CardDescription className="text-sm">Attendance metrics over the last 7 days</CardDescription>
              </div>
              <Activity className="w-5 h-5 text-muted-foreground opacity-50" />
            </CardHeader>
            <CardContent className="flex-1 pb-8">
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={15}
                      fontFamily="Inter"
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                      fontFamily="Inter"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                      }}
                      itemStyle={{ fontSize: '13px', fontWeight: 'bold', padding: '2px 0' }}
                      cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      name="Present"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorPresent)"
                      strokeWidth={3}
                      animationDuration={1500}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      name="Late"
                      stroke="hsl(var(--warning))"
                      fillOpacity={1}
                      fill="url(#colorLate)"
                      strokeWidth={3}
                      animationDuration={1800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-4 space-y-8">
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden flex flex-col hover:border-primary/20 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between py-5 border-b border-border/40 bg-muted/5">
                <div>
                  <CardTitle className="text-lg font-bold">Activity Feed</CardTitle>
                  <CardDescription className="text-xs">Real-time attendance logs</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-success uppercase tracking-widest">Live</span>
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[420px] overflow-y-auto">
                {recentRecords.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center">
                    <Activity className="w-10 h-10 opacity-20 mb-3" />
                    No synchronization logs found
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {recentRecords.map((r) => (
                      <div key={r.id} className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-all cursor-default group">
                        <Avatar className="w-10 h-10 border border-border shadow-sm group-hover:border-primary/30 transition-all">
                          <AvatarFallback className="text-sm bg-primary/5 text-primary font-bold">
                            {r.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">{r.user?.full_name}</p>
                          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5 opacity-60" />
                            {r.check_in ? format(new Date(r.check_in), 'hh:mm a') : 'Pending'}
                          </p>
                        </div>
                        <StatusBadge status={r.status} size="sm" className="shrink-0 font-bold" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 border-t border-border/40 bg-muted/5">
                <Button variant="ghost" size="sm" className="w-full text-xs font-bold h-10 group" asChild>
                  <Link to="/admin/attendance" className="flex items-center justify-center gap-2">
                    Access Detailed Logs <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden hover:border-primary/20 transition-colors">
              <CardHeader className="py-5 border-b border-border/40 bg-muted/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Top Performers</CardTitle>
                    <CardDescription className="text-xs">Based on streak and punctuality</CardDescription>
                  </div>
                  <Award className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {topPerformers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center">
                    <Users className="w-10 h-10 opacity-20 mb-3" />
                    No performance data
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {topPerformers.map((user, i) => (
                      <div key={user.id} className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-all group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm
                          ${i === 0 ? 'bg-amber-100 text-amber-700 border border-amber-300' : 
                            i === 1 ? 'bg-slate-100 text-slate-700 border border-slate-300' : 
                            i === 2 ? 'bg-orange-100 text-orange-800 border border-orange-300' : 
                            'bg-muted text-muted-foreground border border-border'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center text-sm mb-2.5">
                            <span className="font-bold truncate pr-2 text-foreground group-hover:text-primary transition-colors">{user.name}</span>
                            <Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary bg-primary/5 uppercase tracking-wider h-6">
                              {user.streak}d Streak
                            </Badge>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden w-full border border-border/20">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${i === 0 ? 'bg-primary' : 'bg-primary/70'}`}
                              style={{ width: `${user.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

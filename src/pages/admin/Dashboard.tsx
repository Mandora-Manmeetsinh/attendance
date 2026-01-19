import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import client from '@/api/client';
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
  UserX,
  Trophy,
  MoreHorizontal,
  Activity
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
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
  ResponsiveContainer,
} from 'recharts';
import { AnimatedBackground } from '@/components/AnimatedBackground';

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
      try {
        // In a real app, you would have dedicated dashboard endpoints
        // For now, we'll simulate this by fetching raw data or using mock data
        // TODO: Implement /api/admin/dashboard/stats endpoint

        // Mocking data for now to get the UI working without Supabase
        const mockStats = {
          total: 12,
          present: 8,
          late: 2,
          absent: 2
        };
        setStats(mockStats);
        setAttendanceRate(Math.round(((mockStats.present + mockStats.late) / mockStats.total) * 100));

        // Mock recent records
        setRecentRecords([
          { id: '1', user: { full_name: 'John Doe' }, check_in: new Date().toISOString(), status: 'present' },
          { id: '2', user: { full_name: 'Jane Smith' }, check_in: new Date().toISOString(), status: 'late' },
        ]);

        // Mock weekly data
        setWeeklyData([
          { day: 'Mon', present: 10, late: 1, absent: 1 },
          { day: 'Tue', present: 9, late: 2, absent: 1 },
          { day: 'Wed', present: 11, late: 0, absent: 1 },
          { day: 'Thu', present: 8, late: 3, absent: 1 },
          { day: 'Fri', present: 10, late: 1, absent: 1 },
        ]);

      } catch (error) {
        console.error("Error fetching dashboard data", error);
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
            <p className="text-muted-foreground mt-4">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative z-0">
        <AnimatedBackground />
      </div>

      <div className="space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-slide-up">
          <div>
            <p className="text-sm font-medium text-primary mb-1">Welcome back</p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1 text-lg">
              <Calendar className="w-5 h-5 text-accent" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-muted-foreground">Today's Attendance Rate</p>
              <p className="text-3xl font-bold text-primary">{attendanceRate}%</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-glow border border-primary/10">
              <Activity className="w-8 h-8 text-primary animate-pulse-soft" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-scale-in">
          <StatCard
            title="Total Employees"
            value={stats.total}
            icon={<Users className="w-6 h-6" />}
            variant="primary"
            description="Active team members"
            className="shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
          />
          <StatCard
            title="Present Today"
            value={stats.present}
            icon={<UserCheck className="w-6 h-6" />}
            variant="success"
            trend={{ value: 5, label: 'vs yesterday' }}
            className="shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
          />
          <StatCard
            title="Late Arrivals"
            value={stats.late}
            icon={<Clock className="w-6 h-6" />}
            variant="warning"
            description="After shift start"
            className="shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
          />
          <StatCard
            title="Absent Today"
            value={stats.absent}
            icon={<UserX className="w-6 h-6" />}
            variant="destructive"
            description="Not checked in"
            className="shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Weekly Chart */}
          <Card className="lg:col-span-2 shadow-soft border-border/50 overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Weekly Attendance Trend
                  </CardTitle>
                  <CardDescription>Employee attendance over the current week</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  View Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      name="Present"
                      stroke="hsl(var(--success))"
                      fillOpacity={1}
                      fill="url(#colorPresent)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      name="Late"
                      stroke="hsl(var(--warning))"
                      fillOpacity={1}
                      fill="url(#colorLate)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity & Leaderboard */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {/* Recent Activity */}
            <Card className="shadow-soft border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    Live Activity
                  </CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
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
                  <div className="space-y-4">
                    {recentRecords.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 group">
                        <Avatar className="w-10 h-10 border-2 border-background shadow-sm transition-transform group-hover:scale-105">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                            {r.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground/90">{r.user?.full_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {r.check_in ? format(new Date(r.check_in), 'hh:mm a') : 'Not checked in'}
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span className="capitalize">{r.status.replace('_', ' ')}</span>
                          </p>
                        </div>
                        <StatusBadge status={r.status} size="sm" />
                      </div>
                    ))}
                    <Button variant="outline" className="w-full mt-2" asChild>
                      <Link to="/admin/attendance" className="flex items-center gap-2">
                        View All Activity <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mini Leaderboard (Mock) */}
            <Card className="shadow-soft border-border/50 bg-gradient-to-br from-card to-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-warning" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${i === 1 ? 'bg-yellow-100 text-yellow-700' :
                          i === 2 ? 'bg-gray-100 text-gray-700' :
                            'bg-orange-100 text-orange-700'}
                      `}>
                        {i}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${100 - (i * 10)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {100 - (i * 2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

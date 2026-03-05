import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { format } from 'date-fns';
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
import '@/styles/Dashboard.css';

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
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceRate, setAttendanceRate] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await client.get('/admin/dashboard/stats');
        setStats(statsRes.data);

        const totalPresent = statsRes.data.present + statsRes.data.late;
        const totalEmployees = statsRes.data.total;
        setAttendanceRate(totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0);

        const weeklyRes = await client.get('/admin/dashboard/weekly');
        setWeeklyData(weeklyRes.data);

        const topRes = await client.get('/admin/dashboard/top-performers');
        setTopPerformers(topRes.data);

        const activityRes = await client.get('/admin/dashboard/activity');
        setRecentRecords(activityRes.data);

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
      <div className="dashboard-container space-y-8">
        <div className="dashboard-header">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Overview</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
              <p className="text-2xl font-bold text-foreground">{attendanceRate}%</p>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Total Employees"
            value={stats.total}
            icon={<Users className="w-4 h-4 text-muted-foreground" />}
            variant="default"
            description="Active members"
            className="chart-card"
          />
          <StatCard
            title="Present Today"
            value={stats.present}
            icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
            variant="default"
            trend={{ value: 5, label: 'vs yesterday' }}
            className="chart-card"
          />
          <StatCard
            title="Late Arrivals"
            value={stats.late}
            icon={<Clock className="w-4 h-4 text-amber-600" />}
            variant="default"
            description="After shift start"
            className="chart-card"
          />
          <StatCard
            title="Absent Today"
            value={stats.absent}
            icon={<UserX className="w-4 h-4 text-rose-600" />}
            variant="default"
            description="Not checked in"
            className="chart-card"
          />
        </div>

        <div className="charts-grid">
          <Card className="lg:col-span-2 chart-card">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Weekly Trends</CardTitle>
              <CardDescription>Attendance overview for this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
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
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      name="Present"
                      stroke="var(--primary)"
                      fillOpacity={1}
                      fill="url(#colorPresent)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      name="Late"
                      stroke="var(--warning)"
                      fillOpacity={0.2}
                      fill="var(--warning)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="chart-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Live Feed</CardTitle>
              </CardHeader>
              <CardContent>
                {recentRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No activity yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentRecords.map((r) => (
                      <div key={r.id} className="employee-row">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {r.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.user?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.check_in ? format(new Date(r.check_in), 'hh:mm a') : 'Not checked in'}
                          </p>
                        </div>
                        <StatusBadge status={r.status} size="sm" />
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-primary" asChild>
                      <Link to="/admin/attendance" className="flex items-center gap-2">
                        View All <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="leaderboard-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No data available
                    </div>
                  ) : (
                    topPerformers.map((user, i) => (
                      <div key={user.id} className="employee-row">
                        <div className={`rank-badge rank-${i < 3 ? i + 1 : 'other'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-muted-foreground">{user.streak}d Streak</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${user.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

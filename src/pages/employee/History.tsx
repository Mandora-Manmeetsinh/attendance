import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { useAuth } from '@/hooks/useAuth';
import client from '@/api/client';
import {
  Calendar,
  Loader2,
  CheckCircle2,
  Clock,
  LogOut as LogOutIcon,
  MapPin,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';
import { AnimatedBackground } from '@/components/AnimatedBackground';

interface AttendanceRecord {
  _id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  distance_at_check_in: number | null;
}

export default function History() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile) return;

      setLoading(true);
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      try {
        const { data } = await client.get(`/attendance/history?startDate=${startDate}&endDate=${endDate}`);
        if (data) {
          setRecords(data);
        }
      } catch (error) {
        console.error("Error fetching history", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [profile, currentDate]);

  const stats = {
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    earlyExit: records.filter(r => r.status === 'early_exit').length,
    total: records.length,
  };

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0;

  return (
    <Layout>
      <div className="relative z-0">
        <AnimatedBackground />
      </div>

      <div className="space-y-8 relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My History</h1>
            <p className="text-muted-foreground mt-1 text-lg">Track your attendance journey</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 rounded-xl border-2 hover:bg-accent/5 hover:text-accent hover:border-accent/50 transition-all">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl border-2">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-scale-in">
          <StatCard
            title="Present Days"
            value={stats.present}
            icon={<CheckCircle2 className="w-6 h-6" />}
            variant="success"
            description="On-time arrivals"
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
            title="Early Exits"
            value={stats.earlyExit}
            icon={<LogOutIcon className="w-6 h-6" />}
            variant="warning"
            description="Before shift end"
            className="shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
          />
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="primary"
            description="Overall performance"
            className="shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar View */}
          <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <AttendanceCalendar
              records={records}
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
            />
          </div>

          {/* Records Table */}
          <Card className="lg:col-span-2 shadow-soft border-border/50 overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Detailed Records
              </CardTitle>
              <CardDescription>
                Showing records for {format(currentDate, 'MMMM yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground">No records found</p>
                  <p className="text-muted-foreground mt-1">No attendance activity for this month</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Check In</TableHead>
                        <TableHead className="font-semibold">Check Out</TableHead>
                        <TableHead className="font-semibold">Distance</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="font-medium">{format(parseISO(record.date), 'MMM d, yyyy')}</div>
                            <div className="text-xs text-muted-foreground">{format(parseISO(record.date), 'EEEE')}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-success" />
                              </div>
                              <span className="font-medium font-mono text-sm">
                                {record.check_in ? format(new Date(record.check_in), 'hh:mm a') : '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-medium font-mono text-sm">
                                {record.check_out ? format(new Date(record.check_out), 'hh:mm a') : '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.distance_at_check_in ? (
                              <div className="flex items-center gap-1.5 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{record.distance_at_check_in}m</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={record.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

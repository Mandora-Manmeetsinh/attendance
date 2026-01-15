import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  LogOut as LogOutIcon, 
  XCircle,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AttendanceRecord {
  id: string;
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
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile) return;

      setLoading(true);
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, date, check_in, check_out, status, distance_at_check_in')
        .eq('profile_id', profile.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (!error && data) {
        setRecords(data);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [profile, selectedMonth]);

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Attendance History</h1>
            <p className="text-muted-foreground mt-1">Track your attendance records over time</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
              <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Present Days"
            value={stats.present}
            icon={<CheckCircle2 className="w-6 h-6" />}
            variant="success"
            description="On-time arrivals"
          />
          <StatCard
            title="Late Arrivals"
            value={stats.late}
            icon={<Clock className="w-6 h-6" />}
            variant="warning"
            description="After shift start"
          />
          <StatCard
            title="Early Exits"
            value={stats.earlyExit}
            icon={<LogOutIcon className="w-6 h-6" />}
            variant="warning"
            description="Before shift end"
          />
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="primary"
            description="Overall performance"
          />
        </div>

        {/* Records Table */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Attendance Records
            </CardTitle>
            <CardDescription>
              {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')} • {records.length} records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No records found</p>
                <p className="text-muted-foreground mt-1">No attendance records for this month</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Check In</TableHead>
                      <TableHead className="font-semibold">Check Out</TableHead>
                      <TableHead className="font-semibold">Distance</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium">{format(new Date(record.date), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(record.date), 'EEEE')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-success" />
                            <span className="font-medium">
                              {record.check_in ? format(new Date(record.check_in), 'hh:mm a') : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="font-medium">
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
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Loader2 } from 'lucide-react';
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
    absent: records.filter(r => r.status === 'absent').length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Attendance History</h1>
            <p className="text-muted-foreground mt-1">View your attendance records</p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-soft border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{stats.present}</div>
              <p className="text-sm text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{stats.late}</div>
              <p className="text-sm text-muted-foreground">Late</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{stats.earlyExit}</div>
              <p className="text-sm text-muted-foreground">Early Exit</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
              <p className="text-sm text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="shadow-soft border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Attendance Records
            </CardTitle>
            <CardDescription>
              {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No attendance records for this month</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), 'EEE, MMM d')}
                      </TableCell>
                      <TableCell>
                        {record.check_in
                          ? format(new Date(record.check_in), 'hh:mm a')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {record.check_out
                          ? format(new Date(record.check_out), 'hh:mm a')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {record.distance_at_check_in
                          ? `${record.distance_at_check_in}m`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

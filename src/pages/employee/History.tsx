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
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
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
import '@/styles/History.css';

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
        if (data) setRecords(data);
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
      <div className="history-container">
        <div className="history-header">
          <div>
            <h1 className="history-title">Attendance History</h1>
            <p className="history-subtitle">Keep track of your work records and performance</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Present"
            value={stats.present}
            icon={<CheckCircle2 className="w-6 h-6" />}
            variant="success"
            className="shadow-sm"
          />
          <StatCard
            title="Late"
            value={stats.late}
            icon={<Clock className="w-6 h-6" />}
            variant="warning"
            className="shadow-sm"
          />
          <StatCard
            title="Early Exit"
            value={stats.earlyExit}
            icon={<LogOutIcon className="w-6 h-6" />}
            variant="warning"
            className="shadow-sm"
          />
          <StatCard
            title="Attendance"
            value={`${attendanceRate}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="primary"
            className="shadow-sm"
          />
        </div>

        <div className="history-main-content">
          <div className="calendar-section">
            <AttendanceCalendar
              records={records}
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
            />
          </div>

          <Card className="table-section shadow-sm border-none">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Monthly Records
              </CardTitle>
              <CardDescription>
                Details for {format(currentDate, 'MMMM yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted" />
                </div>
              ) : (
                <div className="records-table-wrapper">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No records found for this month
                          </TableCell>
                        </TableRow>
                      ) : (
                        records.map((record) => (
                          <TableRow key={record._id} className="record-row text-sm">
                            <TableCell>
                              <p className="font-bold">{format(parseISO(record.date), 'MMM d')}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{format(parseISO(record.date), 'EEEE')}</p>
                            </TableCell>
                            <TableCell>
                              <div className="time-display">
                                <span className="time-value">
                                  {record.check_in ? format(new Date(record.check_in), 'hh:mm a') : '--:--'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="time-display">
                                <span className="time-value">
                                  {record.check_out ? format(new Date(record.check_out), 'hh:mm a') : '--:--'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={record.status} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
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
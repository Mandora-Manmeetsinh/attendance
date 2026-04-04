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
  Search,
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
import { Badge } from '@/components/ui/badge';
import '@/styles/History.css';

import { AttendanceRecord } from '@/types/attendance';

export default function History() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredRecords = records.filter(record => {
    const matchesSearch = format(parseISO(record.date), 'MMM d EEEE').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">My History</h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2 py-0.5 rounded-md text-xs font-semibold">
                Attendance
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">Detailed record of your work history and attendance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="h-10 px-4 rounded-lg bg-card border-border hover:bg-muted text-foreground font-medium text-sm gap-2 shadow-sm">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 pl-10 pr-8 rounded-lg bg-card border border-border text-foreground text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="early_exit">Early Exit</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-56 h-10 pl-10 pr-4 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Sessions"
            value={stats.total}
            icon={<Calendar className="w-4 h-4" />}
            className="rounded-xl border border-border bg-card shadow-sm p-4"
          />
          <StatCard
            title="On Time"
            value={stats.present}
            icon={<CheckCircle2 className="w-4 h-4 text-success" />}
            className="rounded-xl border border-border bg-card shadow-sm p-4"
          />
          <StatCard
            title="Late Entries"
            value={stats.late}
            icon={<Clock className="w-4 h-4 text-warning" />}
            className="rounded-xl border border-border bg-card shadow-sm p-4"
          />
          <StatCard
            title="Efficiency Rate"
            value={`${attendanceRate}%`}
            icon={<TrendingUp className="w-4 h-4 text-primary" />}
            className="rounded-xl border border-border bg-card shadow-sm p-4"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 lg:sticky lg:top-6 h-fit">
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Calendar</h3>
                <Badge variant="secondary" className="rounded-md font-medium">{format(currentDate, 'MMM yyyy')}</Badge>
              </div>
              <AttendanceCalendar
                records={records}
                currentDate={currentDate}
                onMonthChange={setCurrentDate}
              />
              <div className="p-3 rounded-lg bg-muted/50 border border-border mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Legend</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-xs text-foreground font-medium">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <span className="text-xs text-foreground font-medium">Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-xs text-foreground font-medium">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-xs text-foreground font-medium">Streak</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/10">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Attendance Records</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-md">{filteredRecords.length} records</Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="py-24 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border">
                      <Calendar className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">No records found</p>
                      <p className="text-muted-foreground text-sm">Try adjusting your filters or search query.</p>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b border-border">
                        <TableHead className="h-10 px-5 text-muted-foreground font-semibold text-xs">Timeline</TableHead>
                        <TableHead className="h-10 px-5 text-muted-foreground font-semibold text-xs">Arrival</TableHead>
                        <TableHead className="h-10 px-5 text-muted-foreground font-semibold text-xs">Departure</TableHead>
                        <TableHead className="h-10 px-5 text-muted-foreground font-semibold text-xs text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record._id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <TableCell className="px-5 py-4">
                            <p className="text-sm font-semibold text-foreground">{format(parseISO(record.date), 'MMM d')}</p>
                            <p className="text-xs text-muted-foreground">{format(parseISO(record.date), 'EEEE')}</p>
                          </TableCell>
                          <TableCell className="px-5">
                            {record.check_in ? (
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                {format(new Date(record.check_in), 'hh:mm a')}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                --:--
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-5">
                            {record.check_out ? (
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-destructive/80" />
                                {format(new Date(record.check_out), 'hh:mm a')}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                --:--
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 text-right">
                            <StatusBadge status={record.status} size="sm" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

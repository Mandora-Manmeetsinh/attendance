import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import client from '@/api/client';
import {
  Download,
  Loader2,
  Calendar,
  Filter,
  FileSpreadsheet,
  Clock,
  MapPin,
  Search,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnimatedBackground } from '@/components/AnimatedBackground';

export default function AdminAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // TODO: Implement /api/admin/attendance endpoint
      // Mocking data for now
      const mockRecords = [
        {
          _id: '1',
          date: new Date().toISOString(),
          user: { full_name: 'John Doe', email: 'john@example.com' },
          check_in: new Date().toISOString(),
          check_out: null,
          distance_at_check_in: 50,
          status: 'present'
        },
        {
          _id: '2',
          date: new Date().toISOString(),
          user: { full_name: 'Jane Smith', email: 'jane@example.com' },
          check_in: new Date().toISOString(),
          check_out: new Date().toISOString(),
          distance_at_check_in: 120,
          status: 'late'
        }
      ];
      setRecords(mockRecords);
    } catch (error) {
      console.error("Error fetching attendance records", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [startDate, endDate]);

  const handleExport = async () => {
    setExporting(true);
    try {
      // TODO: Implement export endpoint
      toast.info('Export functionality coming soon!');
    } catch (error) {
      toast.error('Export failed', { description: 'Please try again later.' });
    } finally {
      setExporting(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = !searchTerm ||
      r.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const stats = {
    total: filteredRecords.length,
    present: filteredRecords.filter(r => r.status === 'present').length,
    late: filteredRecords.filter(r => r.status === 'late').length,
    absent: filteredRecords.filter(r => r.status === 'absent').length,
  };

  return (
    <Layout>
      <div className="relative z-0">
        <AnimatedBackground />
      </div>

      <div className="space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Attendance Records</h1>
            <p className="text-muted-foreground mt-1 text-lg">View, filter, and export attendance data</p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="gap-2 shadow-glow-accent hover:scale-105 transition-transform"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export to CSV
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-scale-in">
          <Card className="shadow-soft border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present</p>
                <p className="text-2xl font-bold mt-1 text-success">{stats.present}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Late</p>
                <p className="text-2xl font-bold mt-1 text-warning">{stats.late}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{stats.absent}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-soft border-border/50 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="early_exit">Early Exit</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="shadow-soft border-border/50 overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Records List
            </CardTitle>
            <CardDescription>
              Showing {filteredRecords.length} records from {format(new Date(startDate), 'MMM d')} to {format(new Date(endDate), 'MMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground">No records found</p>
                <p className="text-muted-foreground mt-1">Try adjusting your filters to see more results</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold">Check In</TableHead>
                      <TableHead className="font-semibold">Check Out</TableHead>
                      <TableHead className="font-semibold">Distance</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((r) => (
                      <TableRow key={r._id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-medium">{format(new Date(r.date), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(r.date), 'EEEE')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-border">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-xs font-bold">
                                {getInitials(r.user?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-foreground">{r.user?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-success" />
                            <span className="font-medium font-mono text-sm">
                              {r.check_in ? format(new Date(r.check_in), 'hh:mm a') : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="font-medium font-mono text-sm">
                              {r.check_out ? format(new Date(r.check_out), 'hh:mm a') : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.distance_at_check_in ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>{r.distance_at_check_in}m</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
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

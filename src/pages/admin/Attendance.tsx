import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  CheckCircle2,
  XCircle,
  Pause,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  User,
  MoreVertical,
  Briefcase,
  History,
  CalendarDays,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import '@/styles/Attendance.css';

interface AdminAttendanceRecord {
  _id: string;
  date: string;
  status: string;
  break_minutes?: number;
  worked_minutes?: number;
  work_mode?: string;
  is_policy_violation?: boolean;
  user?: {
    _id?: string;
    full_name?: string;
    email?: string;
    role?: string;
    batch?: string;
  };
}

export default function AdminAttendance() {
  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/admin/attendance', {
        params: {
          startDate,
          endDate,
          shift: shiftFilter
        }
      });
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching attendance records", error);
      toast.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, shiftFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await client.get('/admin/attendance/export', {
        params: {
          startDate,
          endDate,
          shift: shiftFilter
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Attendance report exported successfully');
    } catch (error) {
      console.error("Export error:", error);
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
    late: filteredRecords.filter(r => r.status === 'late' || r.status === 'halfday').length,
    absent: filteredRecords.filter(r => r.status === 'absent').length,
    violations: filteredRecords.filter(r => r.is_policy_violation).length,
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-border/60">
           <div className="space-y-1">
             <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
               <History className="w-8 h-8 text-primary" />
               Attendance Logs
             </h1>
             <p className="text-muted-foreground flex items-center gap-2 font-medium">
               <CalendarDays className="w-4 h-4" />
               Period: {format(new Date(startDate), 'MMMM dd')} — {format(new Date(endDate), 'MMMM dd, yyyy')}
             </p>
           </div>
           
           <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <Button
                variant="outline"
                className="flex-1 lg:flex-none h-12 rounded-xl border-border bg-card hover:bg-muted/30 font-bold gap-2 shadow-sm"
                onClick={() => {
                   setStartDate(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
                   setEndDate(format(new Date(), 'yyyy-MM-dd'));
                   setSearchTerm('');
                   setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting || filteredRecords.length === 0}
                className="flex-1 lg:flex-none h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-200 gap-2 transition-all active:scale-95"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Export .XLSX
              </Button>
           </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
           <Card className="rounded-2xl border-border/50 shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Logs</span>
                    <span className="text-2xl font-black text-foreground">{stats.total}</span>
                 </div>
              </CardContent>
           </Card>
           <Card className="rounded-2xl border-success/20 shadow-sm bg-success/5 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-success/70">On-Time</span>
                    <span className="text-2xl font-black text-success">{stats.present}</span>
                 </div>
              </CardContent>
           </Card>
           <Card className="rounded-2xl border-warning/20 shadow-sm bg-warning/5 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-warning/70">Late Comers</span>
                    <span className="text-2xl font-black text-warning">{stats.late}</span>
                 </div>
              </CardContent>
           </Card>
           <Card className="rounded-2xl border-destructive/20 shadow-sm bg-destructive/5 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-destructive/70">Casualties</span>
                    <span className="text-2xl font-black text-destructive">{stats.absent}</span>
                 </div>
              </CardContent>
           </Card>
           <Card className="hidden lg:block rounded-2xl border-indigo-200 shadow-sm bg-indigo-50/50 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Violations</span>
                    <span className="text-2xl font-black text-indigo-600">{stats.violations}</span>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Filter Toolbar */}
        <Card className="rounded-[2rem] border-border/60 shadow-none bg-muted/20 overflow-hidden">
           <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-center gap-4">
                 <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Search member identity..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 bg-card border-border/40 rounded-xl shadow-sm focus-visible:ring-primary/20"
                    />
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-card border border-border/40 p-1 rounded-xl shadow-sm">
                       <Input
                         type="date"
                         value={startDate}
                         onChange={(e) => setStartDate(e.target.value)}
                         className="h-9 w-32 border-none shadow-none focus-visible:ring-0 text-xs font-bold"
                       />
                       <span className="text-muted-foreground font-black text-[10px]">TO</span>
                       <Input
                         type="date"
                         value={endDate}
                         onChange={(e) => setEndDate(e.target.value)}
                         className="h-9 w-32 border-none shadow-none focus-visible:ring-0 text-xs font-bold"
                       />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                       <SelectTrigger className="h-12 w-[140px] rounded-xl bg-card border-border/40 shadow-sm font-bold text-xs uppercase tracking-wider">
                          <SelectValue placeholder="STATUS" />
                       </SelectTrigger>
                       <SelectContent className="rounded-xl">
                          <SelectItem value="all">ALL STATUS</SelectItem>
                          <SelectItem value="present">PRESENT</SelectItem>
                          <SelectItem value="late">LATE</SelectItem>
                          <SelectItem value="early_exit">EARLY EXIT</SelectItem>
                          <SelectItem value="absent">ABSENT</SelectItem>
                       </SelectContent>
                    </Select>
                    
                    <Select value={shiftFilter} onValueChange={setShiftFilter}>
                       <SelectTrigger className="h-12 w-[140px] rounded-xl bg-card border-border/40 shadow-sm font-bold text-xs uppercase tracking-wider">
                          <SelectValue placeholder="ROLE/SHIFT" />
                       </SelectTrigger>
                       <SelectContent className="rounded-xl">
                          <SelectItem value="all">ALL ROLES</SelectItem>
                          <SelectItem value="employee">FULL-TIME</SelectItem>
                          <SelectItem value="intern_batch1">BATCH 1 (AM)</SelectItem>
                          <SelectItem value="intern_batch2">BATCH 2 (PM)</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </div>
           </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="rounded-[2.5rem] border-border/60 shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
           <Table>
              <TableHeader>
                 <TableRow className="h-16 hover:bg-transparent bg-muted/30 border-b-2 border-border/40">
                    <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Log Timeline</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Team Member</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Work Profile</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Breaks</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Net Hours</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {loading ? (
                    <TableRow>
                       <TableCell colSpan={7} className="h-96">
                          <div className="flex flex-col items-center justify-center space-y-4">
                             <div className="w-12 h-12 rounded-full border-4 border-indigo-600/10 border-t-indigo-600 animate-spin" />
                             <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hydrating Logs...</p>
                          </div>
                       </TableCell>
                    </TableRow>
                 ) : filteredRecords.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={7} className="h-96">
                          <div className="flex flex-col items-center justify-center text-center p-8">
                             <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                                <Search className="w-10 h-10 text-muted-foreground/40" />
                             </div>
                             <h3 className="text-xl font-black text-slate-800">No logs found</h3>
                             <p className="text-sm text-muted-foreground max-w-xs mt-2">Adjust your period or filters to discover recorded entry data.</p>
                          </div>
                       </TableCell>
                    </TableRow>
                 ) : (
                    filteredRecords.map((r) => (
                       <TableRow key={r._id} className="h-24 hover:bg-indigo-50/20 group transition-colors border-b border-border/40">
                          <TableCell className="pl-8">
                             <div className="space-y-1">
                                <p className="font-black text-slate-800 tracking-tight">{format(new Date(r.date), 'MMM dd, yyyy')}</p>
                                <div className="flex items-center gap-1.5 opacity-60">
                                   <Clock className="w-3 h-3" />
                                   <p className="text-[10px] font-bold uppercase tracking-wider">{format(new Date(r.date), 'EEEE')}</p>
                                </div>
                             </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex items-center gap-4">
                                <Avatar className="w-11 h-11 border-2 border-white shadow-md rounded-xl group-hover:scale-110 transition-transform bg-primary/5">
                                   <AvatarFallback className="text-sm font-black text-primary">
                                      {getInitials(r.user?.full_name || '')}
                                   </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                   <p className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm">{r.user?.full_name}</p>
                                   <p className="text-xs font-medium text-muted-foreground truncate">{r.user?.email}</p>
                                </div>
                             </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                   <Badge variant="outline" className="font-black uppercase text-[9px] px-2 py-0 border-none bg-muted shadow-sm">{r.user?.role}</Badge>
                                   {r.user?.batch && <span className="text-[10px] font-black text-muted-foreground opacity-70">[{r.user.batch.replace('batch', 'B')}]</span>}
                                </div>
                                {r.work_mode === 'wfh' && (
                                   <div className="flex items-center gap-1 text-indigo-500">
                                      <MapPin className="w-3 h-3" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">REMOTE SESSION</span>
                                   </div>
                                )}
                             </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100 shadow-sm">
                                   <Pause className="w-3.5 h-3.5 text-orange-500" />
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-sm font-black text-slate-800">{r.break_minutes || 0}<span className="text-[10px] opacity-40 ml-0.5">m</span></p>
                                   <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">Total Break</p>
                                </div>
                             </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
                                   <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-sm font-black text-slate-800">
                                      {Math.floor((r.worked_minutes || 0) / 60)}h {(r.worked_minutes || 0) % 60}m
                                   </p>
                                   <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">Active Production</p>
                                </div>
                             </div>
                          </TableCell>
                          <TableCell className="text-center">
                             <div className="inline-flex flex-col items-center gap-1.5">
                                <StatusBadge status={r.status} className="shadow-sm border-none font-black text-[10px] uppercase px-4" />
                                {r.is_policy_violation && (
                                   <div className="flex items-center gap-1 text-destructive animate-pulse">
                                      <AlertCircle className="w-3 h-3" />
                                      <span className="text-[8px] font-black uppercase tracking-widest">Compliance Alert</span>
                                   </div>
                                )}
                             </div>
                          </TableCell>
                          <TableCell className="pr-8">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full group-hover:bg-white group-hover:shadow-md transition-all">
                                      <MoreVertical className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                                   </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-border">
                                   <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Log Intelligence</DropdownMenuLabel>
                                   <DropdownMenuSeparator />
                                   <DropdownMenuItem className="rounded-xl h-11 px-3 gap-3 font-bold cursor-pointer">
                                      <User className="w-4 h-4 text-indigo-500" /> View Employee
                                   </DropdownMenuItem>
                                   <DropdownMenuItem className="rounded-xl h-11 px-3 gap-3 font-bold cursor-pointer">
                                      <Calendar className="w-4 h-4 text-indigo-500" /> Day Summary
                                   </DropdownMenuItem>
                                   <DropdownMenuSeparator />
                                   <DropdownMenuItem className="rounded-xl h-11 px-3 gap-3 font-bold cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5">
                                      <AlertCircle className="w-4 h-4" /> Flag Incident
                                   </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                          </TableCell>
                       </TableRow>
                    ))
                 )}
              </TableBody>
           </Table>
        </Card>
      </div>
    </Layout>
  );
}

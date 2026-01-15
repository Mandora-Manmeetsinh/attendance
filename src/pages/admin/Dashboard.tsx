import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [employeesRes, attendanceRes] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'employee'),
        supabase.from('attendance_records').select('*, profiles(full_name, email)').eq('date', today),
      ]);

      const total = employeesRes.data?.length || 0;
      const records = attendanceRes.data || [];
      
      setStats({
        total,
        present: records.filter(r => r.status === 'present').length,
        late: records.filter(r => r.status === 'late').length,
        absent: total - records.filter(r => r.check_in).length,
      });
      setRecentRecords(records.slice(0, 5));
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <Layout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-soft"><CardContent className="pt-6"><Users className="w-8 h-8 text-primary mb-2" /><div className="text-2xl font-bold">{stats.total}</div><p className="text-sm text-muted-foreground">Total Employees</p></CardContent></Card>
          <Card className="shadow-soft"><CardContent className="pt-6"><CheckCircle className="w-8 h-8 text-success mb-2" /><div className="text-2xl font-bold">{stats.present}</div><p className="text-sm text-muted-foreground">Present Today</p></CardContent></Card>
          <Card className="shadow-soft"><CardContent className="pt-6"><Clock className="w-8 h-8 text-warning mb-2" /><div className="text-2xl font-bold">{stats.late}</div><p className="text-sm text-muted-foreground">Late Today</p></CardContent></Card>
          <Card className="shadow-soft"><CardContent className="pt-6"><AlertCircle className="w-8 h-8 text-destructive mb-2" /><div className="text-2xl font-bold">{stats.absent}</div><p className="text-sm text-muted-foreground">Absent Today</p></CardContent></Card>
        </div>

        <Card className="shadow-soft">
          <CardHeader><CardTitle>Today's Activity</CardTitle><CardDescription>Recent check-ins</CardDescription></CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No check-ins yet today</p>
            ) : (
              <div className="space-y-3">
                {recentRecords.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div><p className="font-medium">{r.profiles?.full_name}</p><p className="text-sm text-muted-foreground">{r.check_in ? format(new Date(r.check_in), 'hh:mm a') : 'Not checked in'}</p></div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

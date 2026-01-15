import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Download, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function AdminAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from('attendance_records').select('*, profiles(full_name, email)').gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [startDate, endDate]);

  const handleExport = async () => {
    const { data, error } = await supabase.functions.invoke('export-attendance', { body: {} });
    if (error) { toast.error('Export failed'); return; }
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'attendance.csv'; a.click();
    toast.success('Exported!');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Attendance Records</h1>
          <Button onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
        </div>
        <div className="flex gap-4">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Records</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Employee</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{format(new Date(r.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{r.profiles?.full_name}</TableCell>
                      <TableCell>{r.check_in ? format(new Date(r.check_in), 'hh:mm a') : '—'}</TableCell>
                      <TableCell>{r.check_out ? format(new Date(r.check_out), 'hh:mm a') : '—'}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
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

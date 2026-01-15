import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminEmployees() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Card className="shadow-soft">
          <CardHeader><CardTitle>Employee Management</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Employees are automatically added when they sign up. View them from the Cloud tab.</p></CardContent>
        </Card>
      </div>
    </Layout>
  );
}

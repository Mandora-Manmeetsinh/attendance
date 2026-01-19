import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import client from '@/api/client';
import {
  Users,
  Search,
  Mail,
  Clock,
  Loader2,
  UserCircle,
  Shield,
  Calendar,
  LayoutGrid,
  List,
  Filter,
  MoreVertical,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Employee {
  _id: string;
  full_name: string;
  email: string;
  role: string;
  shift_start: string;
  shift_end: string;
  createdAt: string;
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // TODO: Implement /api/admin/employees endpoint
        // For now, mocking data or using a placeholder
        const mockEmployees: Employee[] = [
          {
            _id: '1',
            full_name: 'John Doe',
            email: 'john@example.com',
            role: 'employee',
            shift_start: '09:00:00',
            shift_end: '18:00:00',
            createdAt: new Date().toISOString()
          },
          {
            _id: '2',
            full_name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'admin',
            shift_start: '09:00:00',
            shift_end: '18:00:00',
            createdAt: new Date().toISOString()
          }
        ];
        setEmployees(mockEmployees);
      } catch (error) {
        console.error("Error fetching employees", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-1 text-lg">Manage your workforce and roles</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="gap-2 shadow-glow-accent hover:scale-105 transition-transform">
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search employees by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base bg-card/50 backdrop-blur-sm border-border/50 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 h-12 border-border/50 bg-card/50">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <div className="bg-card/50 border border-border/50 rounded-lg p-1 flex items-center h-12">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-9 w-9 p-0"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-9 w-9 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 min-h-[50vh]">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-border/50 backdrop-blur-sm animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
              <UserCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">No employees found</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {searchTerm ? 'Try adjusting your search terms to find what you looking for.' : 'Get started by adding your first employee to the system.'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-scale-in">
                {filteredEmployees.map((emp) => (
                  <Card key={emp._id} className="group hover:shadow-medium transition-all duration-300 border-border/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-background shadow-sm group-hover:scale-110 transition-transform duration-300">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-bold">
                            {getInitials(emp.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base font-bold">{emp.full_name}</CardTitle>
                          <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'} className="mt-1 text-xs">
                            {emp.role}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{emp.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(new Date(`2000-01-01 ${emp.shift_start}`), 'h:mm a')} - {format(new Date(`2000-01-01 ${emp.shift_end}`), 'h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Joined {format(new Date(emp.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <Button variant="outline" className="flex-1 h-9 text-xs">View History</Button>
                        <Button variant="secondary" className="flex-1 h-9 text-xs">Edit</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-soft border-border/50 overflow-hidden animate-slide-up">
                <div className="rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold pl-6">Employee</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold">Shift</TableHead>
                        <TableHead className="font-semibold">Joined</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp) => (
                        <TableRow key={emp._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9 border border-border">
                                <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-xs font-bold">
                                  {getInitials(emp.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-foreground">{emp.full_name}</p>
                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'} className="gap-1 font-medium">
                              <Shield className="w-3 h-3" />
                              {emp.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {format(new Date(`2000-01-01 ${emp.shift_start}`), 'h:mm a')} - {format(new Date(`2000-01-01 ${emp.shift_end}`), 'h:mm a')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(emp.createdAt), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

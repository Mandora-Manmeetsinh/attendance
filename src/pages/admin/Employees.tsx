import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  MoreHorizontal,
  UserPlus,
  Copy,
  Check,
  Key,
  AlertTriangle,
  Phone,
  Hash,
  ArrowRight,
  UserMinus,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import '@/styles/Employees.css';

interface Employee {
  _id: string;
  full_name: string;
  email: string;
  role: string;
  phone_number: string;
  batch?: string | null;
  shift_start: string;
  shift_end: string;
  createdAt: string;
  must_change_password?: boolean;
  studentId?: string;
  wfh_enabled?: boolean;
  avatar_url?: string;
  monthly_limits?: {
    leave: number;
    late: number;
    wfh: number;
  };
}

interface CreateUserResponse {
  success: boolean;
  message: string;
  user: Employee;
  temporary_password: string;
  instructions: string;
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'employee' | 'intern'>('employee');
  const [newUserBatch, setNewUserBatch] = useState<'batch1' | 'batch2'>('batch1');
  const [newUserWfhEnabled, setNewUserWfhEnabled] = useState(false);
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserStudentId, setNewUserStudentId] = useState('');

  const [createdUser, setCreatedUser] = useState<CreateUserResponse | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const fetchEmployees = async () => {
    try {
      const { data } = await client.get('/admin/employees');
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setCreating(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const data = {
        full_name: formData.get('full_name'),
        phone_number: formData.get('phone_number'),
        studentId: formData.get('studentId'),
        role: formData.get('role'),
        batch: formData.get('batch'),
        wfh_enabled: formData.get('wfh_enabled') === 'on',
        monthly_limits: {
          leave: Number(formData.get('limit_leave')),
          late: Number(formData.get('limit_late')),
          wfh: Number(formData.get('limit_wfh')),
        }
      };

      await client.put(`/admin/users/${editingEmployee._id}`, data);
      toast.success('User updated successfully');
      setEditDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const { data } = await client.post('/admin/users', {
        full_name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        batch: newUserRole === 'intern' ? newUserBatch : null,
        wfh_enabled: newUserWfhEnabled,
        phone_number: newUserPhone,
        studentId: newUserStudentId,
      });

      setCreatedUser(data);
      fetchEmployees();
      toast.success('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setCreatedUser(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('employee');
    setNewUserBatch('batch1');
    setNewUserPhone('');
    setNewUserStudentId('');
    setPasswordCopied(false);
  };

  const copyPassword = async () => {
    if (createdUser?.temporary_password) {
      await navigator.clipboard.writeText(createdUser.temporary_password);
      setPasswordCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const { data } = await client.post(`/admin/users/${userId}/reset-password`);
      toast.success('Password reset successfully', {
        description: `New temporary password: ${data.temporary_password}`,
        duration: 10000,
      });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await client.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      fetchEmployees();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handlePromoteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to promote ${userName} to a full-time Employee?`)) return;
    
    try {
      await client.put(`/admin/users/${userId}`, { role: 'employee' });
      toast.success(`${userName} has been promoted to Employee!`);
      fetchEmployees();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to promote user');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border/60">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Team Directory
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Manage workforce roles, permissions, and attendance policies.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Dialog open={createDialogOpen} onOpenChange={(open) => open ? setCreateDialogOpen(true) : handleCloseDialog()}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 gap-2 transition-all active:scale-95">
                  <UserPlus className="w-4 h-4" />
                  Add New Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden shadow-2xl border-border">
                {!createdUser ? (
                  <div className="p-0">
                    <DialogHeader className="p-6 bg-muted/30 border-b border-border/40">
                      <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <UserPlus className="w-6 h-6 text-primary" />
                        Create Workspace Account
                      </DialogTitle>
                      <DialogDescription className="text-sm font-medium">
                        Enter details to onboard a new team member.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateUser} className="p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                          <Input
                            id="full_name"
                            placeholder="John Doe"
                            className="h-11 rounded-lg border-border focus-visible:ring-primary shadow-sm"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="studentId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internal ID</Label>
                          <Input
                            id="studentId"
                            placeholder="e.g. 2024-001"
                            className="h-11 rounded-lg border-border focus-visible:ring-primary shadow-sm"
                            value={newUserStudentId}
                            onChange={(e) => setNewUserStudentId(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                        <div className="relative">
                           <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                           <Input
                             id="email"
                             type="email"
                             placeholder="john@company.com"
                             className="h-11 pl-10 rounded-lg border-border focus-visible:ring-primary shadow-sm"
                             value={newUserEmail}
                             onChange={(e) => setNewUserEmail(e.target.value)}
                             required
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work Role</Label>
                          <Select value={newUserRole} onValueChange={(v: 'employee' | 'intern') => setNewUserRole(v)}>
                            <SelectTrigger className="h-11 rounded-lg shadow-sm border-border">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="intern">Intern</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newUserRole === 'intern' ? (
                          <div className="space-y-2 animate-in slide-in-from-top-2">
                            <Label htmlFor="batch" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shift Batch</Label>
                            <Select value={newUserBatch} onValueChange={(v: 'batch1' | 'batch2') => setNewUserBatch(v)}>
                              <SelectTrigger className="h-11 rounded-lg shadow-sm border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="batch1">Batch 1 (AM)</SelectItem>
                                <SelectItem value="batch2">Batch 2 (PM)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2 opacity-50 pointer-events-none">
                             <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group</Label>
                             <div className="h-11 rounded-lg border border-dashed flex items-center px-4 text-xs font-medium italic">Standard Shift</div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start space-x-3 border p-4 rounded-xl bg-muted/20 border-dashed">
                        <input
                          type="checkbox"
                          id="wfh"
                          className="h-5 w-5 mt-0.5 rounded-md border-border text-primary focus:ring-primary shadow-sm"
                          checked={newUserWfhEnabled}
                          onChange={(e) => setNewUserWfhEnabled(e.target.checked)}
                        />
                        <div className="grid gap-1">
                          <label htmlFor="wfh" className="text-sm font-bold cursor-pointer">Enable Remote Check-in</label>
                          <p className="text-xs text-muted-foreground font-medium">Allows work-from-home sessions without radius check.</p>
                        </div>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={handleCloseDialog} className="font-bold">Cancel</Button>
                        <Button type="submit" disabled={creating} className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/10 transition-all active:scale-95">
                          {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </div>
                ) : (
                  <div className="p-0">
                    <DialogHeader className="p-8 bg-success/5 border-b border-success/10 text-center">
                      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-success/20">
                         <Check className="w-8 h-8 text-success" />
                      </div>
                      <DialogTitle className="text-2xl font-black text-success tracking-tight">Success!</DialogTitle>
                      <DialogDescription className="text-sm font-semibold uppercase tracking-widest opacity-70">Employee account is live</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                      <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-border/20">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity</span>
                          <span className="font-bold text-sm">{createdUser.user.full_name}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border/20">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</span>
                          <Badge variant="outline" className="font-black uppercase text-[10px] bg-white">{createdUser.user.role}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Official ID</span>
                          <code className="text-xs font-mono font-bold bg-primary/5 text-primary px-2 py-1 rounded">{createdUser.user.studentId}</code>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block text-center">Security Credentials</Label>
                        <div className="flex items-center gap-3 p-1 pl-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
                          <code className="flex-1 font-mono text-xl text-white tracking-[0.3em] font-black truncate py-4">
                            {createdUser.temporary_password}
                          </code>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-14 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 transition-all active:scale-90"
                            onClick={copyPassword}
                          >
                            {passwordCopied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
                          </Button>
                        </div>
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
                          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                          <p className="text-xs font-semibold text-warning/90 leading-relaxed">
                            Inform the user that this password is temporary and <strong>must be changed</strong> upon their first sign-in for security compliance.
                          </p>
                        </div>
                      </div>

                      <Button onClick={handleCloseDialog} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold tracking-tight shadow-xl">
                        Return to Directory
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 text-base rounded-2xl border-border shadow-sm focus-visible:ring-primary/20 bg-card hover:bg-muted/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-14 px-6 rounded-2xl border-border bg-card hover:bg-muted/30 font-bold gap-2">
              <Filter className="w-4 h-4" />
              Advanced
            </Button>
            <div className="bg-muted/40 p-1.5 rounded-2xl border border-border flex items-center h-14 shadow-inner">
               <button
                 onClick={() => setViewMode('grid')}
                 className={`h-11 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm ${viewMode === 'grid' ? 'bg-card text-foreground shadow-md border border-border' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'}`}
               >
                 <LayoutGrid className="w-4 h-4" />
                 Grid
               </button>
               <button
                 onClick={() => setViewMode('list')}
                 className={`h-11 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm ${viewMode === 'list' ? 'bg-card text-foreground shadow-md border border-border' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'}`}
               >
                 <List className="w-4 h-4" />
                 List
               </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="relative">
               <div className="w-20 h-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
               <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary/40" />
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-xs">Synchronizing Directory</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-32 rounded-[2.5rem] bg-muted/20 border-2 border-dashed border-border/60">
            <div className="w-24 h-24 rounded-full bg-card shadow-sm border border-border flex items-center justify-center mx-auto mb-8">
               <UserCircle className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">No Results Found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto font-medium">
              We couldn't find any team members matching "<strong>{searchTerm}</strong>". Try a different name, email, or employee ID.
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')} className="mt-8 rounded-xl font-bold h-11 px-8 hover:bg-background">
              Clear Search
            </Button>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEmployees.map((emp) => (
                  <Card key={emp._id} className="group relative rounded-[2rem] border-border/60 overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-500 hover:-translate-y-2">
                    <div className="absolute top-0 right-0 p-4 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-md border border-border/50 shadow-sm opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                            <MoreHorizontal className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-border">
                          <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Account Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setEditingEmployee(emp); setEditDialogOpen(true); }} className="rounded-xl px-3 py-3 gap-3 font-bold cursor-pointer">
                            <UserCircle className="w-4 h-4 text-primary" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(emp._id)} className="rounded-xl px-3 py-3 gap-3 font-bold cursor-pointer">
                            <Key className="w-4 h-4 text-warning" /> Reset Password
                          </DropdownMenuItem>
                          {emp.role === 'intern' && (
                            <DropdownMenuItem onClick={() => handlePromoteUser(emp._id, emp.full_name)} className="rounded-xl px-3 py-3 gap-3 font-bold cursor-pointer text-success focus:text-success">
                              <Shield className="w-4 h-4" /> Promote to Staff
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(emp._id, emp.full_name)}
                            disabled={emp.role === 'admin'}
                            className="rounded-xl px-3 py-3 gap-3 font-bold cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5"
                          >
                            <UserMinus className="w-4 h-4" /> Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="h-28 bg-gradient-to-br from-primary/5 via-primary/5 to-accent/10 border-b border-border/40" />
                    
                    <CardContent className="p-8 pt-0 relative">
                       <div className="flex flex-col items-center text-center">
                          <div className="relative -mt-14 mb-6">
                             <Avatar className="w-28 h-28 rounded-[2rem] border-4 border-card shadow-2xl shadow-primary/10">
                               <AvatarFallback className="text-3xl font-black bg-primary/5 text-primary">
                                 {getInitials(emp.full_name)}
                               </AvatarFallback>
                             </Avatar>
                             <div className="absolute -bottom-1 -right-1">
                               <div className={`w-8 h-8 rounded-full border-4 border-card flex items-center justify-center text-white
                                 ${emp.must_change_password ? 'bg-warning' : 'bg-success'}`}>
                                  {emp.must_change_password ? <Clock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                               </div>
                             </div>
                          </div>
                          
                          <h3 className="text-xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors">{emp.full_name}</h3>
                          <p className="text-sm font-medium text-muted-foreground mb-4">{emp.email}</p>
                          
                          <div className="flex flex-wrap justify-center gap-2 mb-8">
                             <Badge className={`px-3 py-0.5 rounded-lg font-black uppercase text-[10px] tracking-widest border-none shadow-sm
                               ${emp.role === 'admin' ? 'bg-indigo-600 text-white' : 
                                 emp.role === 'employee' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                               {emp.role}
                             </Badge>
                             {emp.batch && (
                               <Badge variant="secondary" className="px-3 py-0.5 rounded-lg font-black uppercase text-[10px] tracking-widest bg-muted border-none">
                                  {emp.batch}
                               </Badge>
                             )}
                          </div>
                          
                          <div className="grid grid-cols-1 w-full gap-3 text-left">
                             <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center border border-border shadow-sm shrink-0">
                                   <Hash className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Employee ID</p>
                                   <p className="text-sm font-bold font-mono">{emp.studentId || 'NOT-ASSIGNED'}</p>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center border border-border shadow-sm shrink-0">
                                   <Clock className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Shift</p>
                                   <p className="text-sm font-bold">
                                      {format(new Date(`2000-01-01 ${emp.shift_start}`), 'h:mm a')} — {format(new Date(`2000-01-01 ${emp.shift_end}`), 'h:mm a')}
                                   </p>
                                </div>
                             </div>

                             <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center border border-border shadow-sm shrink-0">
                                   <Phone className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contact</p>
                                   <p className="text-sm font-bold">{emp.phone_number || 'N/A'}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </CardContent>
                    
                    <CardFooter className="p-0 border-t border-border/40">
                       <Button variant="ghost" className="w-full h-14 rounded-none font-bold text-primary gap-2 hover:bg-primary/5 transition-all group/btn" asChild>
                          <Link to={`/admin/attendance?search=${emp.full_name}`}>
                             View Activity History <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                          </Link>
                       </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="rounded-[2rem] border-border/60 shadow-none overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b-2 border-border/60 h-16">
                      <TableHead className="pl-8 text-xs font-black uppercase tracking-widest">Team Member</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-widest">Employee ID</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-widest">Designation</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-widest">Schedule</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-widest">Onboarded</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => (
                      <TableRow key={emp._id} className="group hover:bg-muted/20 border-b border-border/40 h-20 transition-all">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-11 h-11 border-2 border-border/40 group-hover:border-primary/40 transition-colors shadow-sm rounded-xl">
                              <AvatarFallback className="text-sm font-black bg-primary/5 text-primary">
                                {getInitials(emp.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground group-hover:text-primary transition-colors cursor-default">{emp.full_name}</p>
                              <p className="text-xs font-medium text-muted-foreground truncate">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono font-bold bg-muted px-2 py-1 rounded-md border border-border/50">{emp.studentId || 'N/A'}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                             <Badge className={`px-2 py-0 border-none shadow-sm font-black uppercase text-[9px] tracking-wider
                               ${emp.role === 'admin' ? 'bg-indigo-600 text-white' : 
                                 emp.role === 'employee' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                               {emp.role}
                             </Badge>
                             {emp.batch && (
                               <Badge variant="outline" className="font-black uppercase text-[9px] tracking-wider px-2 py-0 bg-muted border-none shadow-sm">
                                  {emp.batch}
                               </Badge>
                             )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 opacity-60" />
                            <span>
                               {format(new Date(`2000-01-01 ${emp.shift_start}`), 'h:mm a')} — {format(new Date(`2000-01-01 ${emp.shift_end}`), 'h:mm a')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {emp.must_change_password ? (
                            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5 font-bold text-[10px]">
                              PENDING LOGIN
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-success border-success/30 bg-success/5 font-bold text-[10px]">
                              ACTIVE
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-muted-foreground">
                            {format(new Date(emp.createdAt), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="pr-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-border">
                              <DropdownMenuItem onClick={() => { setEditingEmployee(emp); setEditDialogOpen(true); }} className="rounded-xl px-3 py-3 gap-3 font-bold">
                                <UserCircle className="w-4 h-4 text-primary" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(emp._id)} className="rounded-xl px-3 py-3 gap-3 font-bold">
                                <Key className="w-4 h-4 text-warning" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(emp._id, emp.full_name)}
                                disabled={emp.role === 'admin'}
                                className="rounded-xl px-3 py-3 gap-3 font-bold text-destructive"
                              >
                                <UserMinus className="w-4 h-4" /> Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-0 overflow-hidden border-border shadow-2xl">
          <DialogHeader className="p-8 bg-muted/20 border-b border-border/40">
            <div className="flex items-center gap-4">
               <Avatar className="w-14 h-14 rounded-2xl border-2 border-card shadow-lg">
                  <AvatarFallback className="text-xl font-black bg-primary/5 text-primary">
                    {getInitials(editingEmployee?.full_name || '')}
                  </AvatarFallback>
               </Avatar>
               <div>
                  <DialogTitle className="text-2xl font-black text-foreground tracking-tight">Modify Account</DialogTitle>
                  <DialogDescription className="text-sm font-bold uppercase tracking-widest text-muted-foreground opacity-70">Employee config portal</DialogDescription>
               </div>
            </div>
          </DialogHeader>
          
          {editingEmployee && (
            <form onSubmit={handleEditUser} className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Display Name</Label>
                  <Input name="full_name" defaultValue={editingEmployee.full_name} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Official ID</Label>
                  <Input name="studentId" defaultValue={editingEmployee.studentId} required className="h-12 rounded-xl" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Work Email</Label>
                  <Input value={editingEmployee.email} readOnly disabled className="h-12 rounded-xl bg-muted/50 cursor-not-allowed border-dashed" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
                  <Input name="phone_number" defaultValue={editingEmployee.phone_number} className="h-12 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Designation</Label>
                  <Select name="role" defaultValue={editingEmployee.role}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Batch Group</Label>
                  <Select name="batch" defaultValue={editingEmployee.batch || 'batch1'}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="batch1">Batch 1 (Morning)</SelectItem>
                      <SelectItem value="batch2">Batch 2 (Evening)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-6 bg-muted/20 rounded-2xl space-y-6 border border-border/40">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Usage Policy Thresholds
                   </h3>
                   <div className="text-[9px] font-bold text-muted-foreground italic">Monthly Allocations</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 text-center">
                    <Label className="text-[10px] font-bold text-muted-foreground">Paid Leaves</Label>
                    <Input name="limit_leave" type="number" defaultValue={editingEmployee.monthly_limits?.leave || 2} className="h-12 rounded-xl text-center font-bold" />
                  </div>
                  <div className="space-y-2 text-center">
                    <Label className="text-[10px] font-bold text-muted-foreground">Grace Lates</Label>
                    <Input name="limit_late" type="number" defaultValue={editingEmployee.monthly_limits?.late || 3} className="h-12 rounded-xl text-center font-bold" />
                  </div>
                  <div className="space-y-2 text-center">
                    <Label className="text-[10px] font-bold text-muted-foreground">WFH Quota</Label>
                    <Input name="limit_wfh" type="number" defaultValue={editingEmployee.monthly_limits?.wfh || 2} className="h-12 rounded-xl text-center font-bold" />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 border-2 p-5 rounded-2xl bg-primary/5 border-primary/10 border-dashed hover:bg-primary/10 transition-colors cursor-pointer group">
                <input
                  type="checkbox"
                  id="edit_wfh_enabled_2"
                  name="wfh_enabled"
                  className="h-6 w-6 rounded-lg border-primary/30 text-primary shadow-sm"
                  defaultChecked={editingEmployee.wfh_enabled}
                />
                <label htmlFor="edit_wfh_enabled_2" className="flex-1 text-sm font-black text-primary/80 group-hover:text-primary transition-colors cursor-pointer">
                  Authorise Work From Home Permissions
                </label>
              </div>

              <DialogFooter className="pt-2 px-0">
                <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="font-bold h-12 px-6">Discard</Button>
                <Button type="submit" disabled={creating} className="h-12 px-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-xl shadow-primary/10 transition-all active:scale-95">
                   {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Commit Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

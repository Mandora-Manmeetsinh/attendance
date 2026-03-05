import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  MoreVertical,
  UserPlus,
  Copy,
  Check,
  Key,
  AlertTriangle
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
  telegram_link?: string;
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
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  return (
    <Layout>
      <div className="employees-container">
        <div className="employees-header">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-1 text-lg">Manage your workforce and roles</p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={createDialogOpen} onOpenChange={(open) => open ? setCreateDialogOpen(true) : handleCloseDialog()}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                {!createdUser ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Create New User
                      </DialogTitle>
                      <DialogDescription>
                        Add a new employee or intern. A temporary password will be generated.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          placeholder="John Doe"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number (WhatsApp/SMS)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91 9876543210"
                          value={newUserPhone}
                          onChange={(e) => setNewUserPhone(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID / Registration ID *</Label>
                        <Input
                          id="studentId"
                          placeholder="e.g. 1001"
                          value={newUserStudentId}
                          onChange={(e) => setNewUserStudentId(e.target.value)}
                          required
                        />
                        <p className="text-[10px] text-muted-foreground">Used to link user with Telegram Bot automatically.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role *</Label>
                        <Select value={newUserRole} onValueChange={(v: 'employee' | 'intern') => setNewUserRole(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Employee (Full-time)
                              </div>
                            </SelectItem>
                            <SelectItem value="intern">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Intern (Part-time)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newUserRole === 'intern' && (
                        <div className="space-y-2">
                          <Label htmlFor="batch">Batch *</Label>
                          <Select value={newUserBatch} onValueChange={(v: 'batch1' | 'batch2') => setNewUserBatch(v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select batch" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="batch1">
                                <div className="flex flex-col">
                                  <span>Batch 1</span>
                                  <span className="text-xs text-muted-foreground">10:30 AM - 1:30 PM</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="batch2">
                                <div className="flex flex-col">
                                  <span>Batch 2</span>
                                  <span className="text-xs text-muted-foreground">3:00 PM - 6:00 PM</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/20">
                        <input
                          type="checkbox"
                          id="wfh"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={newUserWfhEnabled}
                          onChange={(e) => setNewUserWfhEnabled(e.target.checked)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="wfh"
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            Enable Work From Home
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Allow this user to check in from remote locations.
                          </p>
                        </div>
                      </div>

                      <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creating} className="gap-2">
                          {creating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              Create User
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-success">
                        <Check className="w-5 h-5" />
                        User Created Successfully!
                      </DialogTitle>
                      <DialogDescription>
                        Share these credentials with the user. They will be required to change their password on first login.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="font-medium">{createdUser.user.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">{createdUser.user.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-medium">{createdUser.user.phone_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Role:</span>
                          <Badge variant="secondary">{createdUser.user.role}</Badge>
                        </div>
                        {createdUser.user.batch && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Batch:</span>
                            <Badge variant="outline">{createdUser.user.batch}</Badge>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Student ID:</span>
                          <span className="font-medium">{createdUser.user.studentId}</span>
                        </div>
                      </div>

                      {createdUser.user.telegram_link && (
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <Users className="w-4 h-4" />
                            Telegram Registration Link
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              readOnly
                              value={createdUser.user.telegram_link}
                              className="flex-1 bg-background text-xs truncate"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={async () => {
                                await navigator.clipboard.writeText(createdUser.user.telegram_link!);
                                toast.success('Link copied!');
                              }}
                              className="shrink-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Send this link to the user. They only need to click it and press "Start".</p>
                        </div>
                      )}

                      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
                        <div className="flex items-center gap-2 text-warning font-medium">
                          <Key className="w-4 h-4" />
                          Temporary Password
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-3 rounded bg-background font-mono text-lg tracking-widest">
                            {createdUser.temporary_password}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={copyPassword}
                            className="shrink-0"
                          >
                            {passwordCopied ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>This password will only be shown once. The user must change it on first login.</span>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button onClick={handleCloseDialog} className="w-full">
                        Done
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="employees-filter-bar">
          <div className="search-input-wrapper">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search employees by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 h-12">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <div className="border rounded-lg p-1 flex items-center h-12 bg-card">
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

        {loading ? (
          <div className="flex items-center justify-center py-20 min-h-[50vh]">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-20 border rounded-3xl bg-muted/10">
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
              <div className="employees-grid">
                {filteredEmployees.map((emp) => (
                  <Card key={emp._id} className="employee-card relative group p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="employee-avatar-large">
                        <AvatarFallback>
                          {getInitials(emp.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{emp.full_name}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                            {emp.role}
                          </Badge>
                          {emp.batch && (
                            <Badge variant="outline" className="text-xs">
                              {emp.batch}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="card-dropdown">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleResetPassword(emp._id)}>
                              <Key className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteUser(emp._id, emp.full_name)}
                              disabled={emp.role === 'admin'}
                            >
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserCircle className="w-4 h-4" />
                        <span>ID: {emp.studentId || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        <span>{emp.phone_number || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(`2000-01-01 ${emp.shift_start}`), 'h:mm a')} - {format(new Date(`2000-01-01 ${emp.shift_end}`), 'h:mm a')}
                        </span>
                      </div>
                      {emp.telegram_link && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 text-xs h-8 border-primary/20 hover:border-primary/50"
                            onClick={async () => {
                              await navigator.clipboard.writeText(emp.telegram_link!);
                              toast.success('Telegram link copied!');
                            }}
                          >
                            <Users className="w-3.5 h-3.5" />
                            Copy Telegram Link
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {format(new Date(emp.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      {emp.must_change_password && (
                        <div className="pt-2">
                          <Badge variant="outline" className="text-warning border-warning/50 bg-warning/5 w-full justify-center">
                            Pending First Login
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="records-card">
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="pl-6">Employee</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp) => (
                        <TableRow key={emp._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9 border border-border">
                                <AvatarFallback className="avatar-initials">
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
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{emp.studentId || 'N/A'}</code>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'} className="gap-1 font-medium">
                                <Shield className="w-3 h-3" />
                                {emp.role}
                              </Badge>
                              {emp.batch && (
                                <Badge variant="outline" className="text-xs">
                                  {emp.batch}
                                </Badge>
                              )}
                            </div>
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
                            {emp.must_change_password ? (
                              <Badge variant="outline" className="text-warning border-warning/50 bg-warning/5">
                                Pending Login
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-success border-success/50 bg-success/5">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(emp.createdAt), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleResetPassword(emp._id)}>
                                  <Key className="w-4 h-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                {emp.telegram_link && (
                                  <DropdownMenuItem onClick={async () => {
                                    await navigator.clipboard.writeText(emp.telegram_link!);
                                    toast.success('Telegram link copied!');
                                  }}>
                                    <Users className="w-4 h-4 mr-2" />
                                    Copy Telegram Link
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>View Profile</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteUser(emp._id, emp.full_name)}
                                  disabled={emp.role === 'admin'}
                                >
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

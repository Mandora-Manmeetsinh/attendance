import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  Clock,
  LayoutDashboard,
  History,
  Menu,
  X,
  Bell,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & analytics' },
    { href: '/admin/employees', label: 'Employees', icon: Users, description: 'Manage team members' },
    { href: '/admin/attendance', label: 'Attendance', icon: Calendar, description: 'View & export records' },
    { href: '/admin/settings', label: 'Settings', icon: Settings, description: 'System configuration' },
  ];

  const employeeLinks = [
    { href: '/employee', label: 'Check In/Out', icon: Clock, description: 'Mark your attendance' },
    { href: '/employee/history', label: 'My History', icon: History, description: 'View past records' },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out lg:relative',
          sidebarOpen ? 'w-72' : 'w-0 lg:w-20'
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          'flex items-center gap-3 p-5 border-b border-sidebar-border',
          !sidebarOpen && 'lg:justify-center lg:px-2'
        )}>
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-sidebar-foreground tracking-tight">GeoAttend</h1>
              <p className="text-xs text-sidebar-foreground/50 font-medium">Enterprise Attendance</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className={cn('mb-3', sidebarOpen ? 'px-3' : 'px-1')}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {sidebarOpen ? 'Navigation' : ''}
            </span>
          </div>
          <ul className="space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                      sidebarOpen ? 'px-4 py-3' : 'px-3 py-3 justify-center',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/25'
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                    title={!sidebarOpen ? link.label : undefined}
                  >
                    <link.icon className={cn('w-5 h-5 shrink-0', isActive && 'drop-shadow-sm')} />
                    {sidebarOpen && (
                      <div className="flex-1 overflow-hidden">
                        <span className="block truncate">{link.label}</span>
                        <span className={cn(
                          'text-xs truncate block',
                          isActive ? 'text-sidebar-primary-foreground/70' : 'text-sidebar-foreground/40'
                        )}>
                          {link.description}
                        </span>
                      </div>
                    )}
                    {sidebarOpen && isActive && (
                      <ChevronRight className="w-4 h-4 opacity-70" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className={cn(
          'p-3 border-t border-sidebar-border',
          !sidebarOpen && 'lg:px-2'
        )}>
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50',
            !sidebarOpen && 'lg:justify-center lg:p-2'
          )}>
            <Avatar className="w-10 h-10 border-2 border-sidebar-primary/30">
              <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-sm font-semibold">
                {getInitials(profile?.full_name || '')}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/50 capitalize font-medium">
                  {profile?.role || 'Employee'}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            className={cn(
              'w-full mt-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl',
              sidebarOpen ? 'justify-start px-4' : 'justify-center px-2'
            )}
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="ml-3">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <div>
                <h2 className="font-semibold text-foreground">
                  {links.find(l => l.href === location.pathname)?.label || 'Dashboard'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {links.find(l => l.href === location.pathname)?.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-xl relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-xl gap-2 px-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-xs font-semibold">
                        {getInitials(profile?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline font-medium">{profile?.full_name?.split(' ')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 gradient-mesh min-h-full">{children}</div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

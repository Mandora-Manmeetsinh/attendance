import { ReactNode } from 'react';
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
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/employees', label: 'Employees', icon: Users },
    { href: '/admin/attendance', label: 'Attendance', icon: Calendar },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const employeeLinks = [
    { href: '/employee', label: 'Check In/Out', icon: Clock },
    { href: '/employee/history', label: 'My Attendance', icon: Calendar },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground">GeoAttend</h1>
              <p className="text-xs text-sidebar-foreground/60">Attendance System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-medium text-sidebar-foreground">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {profile?.role || 'Employee'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

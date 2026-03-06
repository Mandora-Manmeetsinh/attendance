import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  LogOut,
  Menu,
  X,
  Settings,
  UserCircle,
  History,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import '@/styles/Layout.css';
import logo from '@/assets/logo.png';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/employees', label: 'Employees', icon: Users },
    { href: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const employeeLinks = [
    { href: '/employee', label: 'Check In/Out', icon: MapPin },
    { href: '/employee/history', label: 'My History', icon: History },
    { href: '/employee/profile', label: 'Profile', icon: UserCircle },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <div className="layout-container">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <img src={logo} alt="Exotic Infotech" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <ThemeToggle />
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <img src={logo} alt="Exotic Infotech" className="h-10 w-auto" />
          </div>

          <nav className="sidebar-nav">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className={`nav-icon ${isActive ? 'active' : ''}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                {user?.email?.substring(0, 2).toUpperCase()}
              </div>
              <div className="user-info">
                <p className="user-email">{user?.email}</p>
                <p className="user-role">{isAdmin ? 'Administrator' : 'Employee'}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 nav-link"
              onClick={handleSignOut}
            >
              <LogOut className="nav-icon" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="main-wrapper">
        {/* Desktop Header */}
        <header className="desktop-header">
          <h2 className="font-semibold text-lg text-foreground">
            {links.find(l => l.href === location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="content-container">
          <div className="content-inner">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

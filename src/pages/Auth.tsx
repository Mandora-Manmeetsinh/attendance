import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, Mail, Lock, ArrowRight, Shield, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import '@/styles/Auth.css';
import logo from '@/assets/logo.png';
import client from '@/api/client';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Full name is required'),
});

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const { signIn, signUp, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data } = await client.get('/auth/admin-exists');
        setAdminExists(data.exists);
        if (!data.exists) {
          setIsRegistering(true);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      if (user.must_change_password) {
        navigate('/change-password');
      } else if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/employee');
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegistering) {
      const validation = registerSchema.safeParse({
        email: loginEmail,
        password: loginPassword,
        full_name: fullName
      });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    } else {
      const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        await signUp(loginEmail, loginPassword, fullName);
      } else {
        await signIn(loginEmail, loginPassword);
      }
    } catch (error) {
      // Handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Restoring session...</p>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        <div className="auth-branding">
          <div className="logo-section animate-float">
            <img src={logo} alt="Exotic Infotech" className="h-16 w-auto" />
          </div>

          <div className="space-y-8 mt-12 bg-muted/20 p-10 rounded-[3rem] border border-border backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>

            <div className="relative space-y-6">
              <h2 className="hero-title">
                Precision Attendance <br />
                <span className="text-primary">Reliability.</span>
              </h2>
              <p className="hero-subtitle">
                The modern standard for secure, verified workforce management. Professional tracking with real-time analytics.
              </p>

              <div className="feature-highlights">
                <div className="feature-item">
                  <Shield className="w-8 h-8 text-primary" />
                  <p className="font-black uppercase tracking-widest text-[10px] text-muted-foreground mt-2">Security</p>
                  <p className="font-bold">Enterprise Grade</p>
                </div>
                <div className="feature-item">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                  <p className="font-black uppercase tracking-widest text-[10px] text-muted-foreground mt-2">Accuracy</p>
                  <p className="font-bold">Verified Logs</p>
                </div>
              </div>
            </div>
          </div>

          
        </div>

        <div className="flex items-center justify-center relative">
          <div className="w-full max-w-md">
            <div className="text-center mb-10 lg:hidden">
              <img src={logo} alt="Exotic Infotech" className="h-12 w-auto mx-auto mb-4" />
            </div>

            <Card className="auth-form-card">
              <CardHeader className="auth-form-header">
                <CardTitle>{isRegistering ? 'Admin Registration' : 'Sign In'}</CardTitle>
                <CardDescription>
                  {isRegistering
                    ? 'Create the first administrator account to set up your system'
                    : 'Enter your credentials to access your account'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-6">
                  {isRegistering && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-[10px] uppercase font-bold tracking-widest ml-1">Full Name</Label>
                      <div className="auth-input-group">
                        <ArrowRight className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-[-45deg]" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Admin User"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-14 pl-12 bg-muted/50 border-border rounded-2xl focus:ring-primary/20"
                          required
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] uppercase font-bold tracking-widest ml-1">Email Address</Label>
                    <div className="auth-input-group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="h-14 pl-12 bg-muted/50 border-border rounded-2xl focus:ring-primary/20"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[10px] uppercase font-bold tracking-widest ml-1">Password</Label>
                    <div className="auth-input-group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-14 pl-12 bg-muted/50 border-border rounded-2xl focus:ring-primary/20"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {!isRegistering && (
                      <div className="flex justify-end mt-1">
                        <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                          Forgot Password?
                        </Link>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="auth-submit-btn" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                      {isRegistering ? 'Create Admin Account' : 'Continue'} <ArrowRight className="w-4 h-4 ml-1" />
                    </>}
                  </Button>
                </form>

                {adminExists && (
                  <div className="auth-footer-text">
                    <p>Secured by Enterprise Infrastructure</p>
                    <p className="mt-1">Contact your manager if you've lost access.</p>
                  </div>
                )}

                {!adminExists && (
                  <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs font-medium text-center text-primary">
                      SYSTEM SETUP MODE: No administrator found. Please create the first account.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

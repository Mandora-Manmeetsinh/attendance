import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, Mail, Lock, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import '@/styles/Auth.css';
import logo from '@/assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const { signIn, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
    } catch (error: any) {
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
          <div className="logo-section">
            <img src={logo} alt="Exotic Infotech" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-bold">Exotic Infotech</h1>
              <p className="text-sm text-muted-foreground">Attendance Management System</p>
            </div>
          </div>

          <div className="space-y-6 mt-12">
            <h2 className="hero-title">
              Attendance tracking <br />
              <span className="text-primary">simplified.</span>
            </h2>
            <p className="hero-subtitle">
              A professional solution for managing employee presence with GPS verification and real-time reporting.
            </p>

            <div className="feature-highlights">
              <div className="feature-item">
                <Shield className="w-6 h-6" />
                <p className="font-bold text-sm">Secure</p>
                <p className="text-xs text-muted-foreground">Enterprise-grade security</p>
              </div>
              <div className="feature-item">
                <CheckCircle2 className="w-6 h-6" />
                <p className="font-bold text-sm">Accurate</p>
                <p className="text-xs text-muted-foreground">Verified GPS location</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full">
            <div className="text-center mb-8 lg:hidden">
              <img src={logo} alt="Exotic Infotech" className="h-10 w-auto" />
              <h1 className="text-2xl font-bold">Attendance System</h1>
            </div>

            <Card className="auth-form-card">
              <CardHeader className="auth-form-header">
                <CardTitle className="text-2xl">Sign In</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="auth-input-group">
                      <Mail className="auth-input-icon w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="auth-input-group">
                      <Lock className="auth-input-icon w-4 h-4" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="auth-submit-btn" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </form>

                <div className="auth-footer-text">
                  <p>Contact your manager if you've lost access.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, Lock, ArrowRight, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { Progress } from '@/components/ui/progress';
import '@/styles/Auth.css';

export default function ChangePassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return 0;
        if (password.length < 6) return 25;
        if (password.length < 8) return 50;
        if (password.length < 12) return 75;
        return 100;
    };

    const passwordStrength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword === confirmPassword && newPassword.length >= 6;

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await client.post('/auth/change-password', { newPassword });
            if (data.success) {
                toast.success('Password updated!');
                setTimeout(() => {
                    window.location.href = user?.role === 'admin' ? '/admin' : '/employee';
                }, 1000);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        signOut();
        navigate('/auth');
    };

    return (
        <div className="auth-page-wrapper">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-white mb-4">
                        <MapPin className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold">GeoAttend</h1>
                    <p className="text-sm text-muted-foreground mt-1">First-time Setup</p>
                </div>

                <Card className="auth-form-card">
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <KeyRound className="w-5 h-5 text-primary" />
                            <CardTitle className="text-2xl">New Password</CardTitle>
                        </div>
                        <CardDescription>
                            Security policy requires a password update on your first login.
                        </CardDescription>

                        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <div className="flex items-start gap-2 text-xs">
                                <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <p className="text-muted-foreground">
                                    Choose a strong password that only you know. Admin cannot access this password once set.
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <div className="auth-input-group">
                                    <Lock className="auth-input-icon w-4 h-4" />
                                    <Input
                                        id="new-password"
                                        type="password"
                                        placeholder="Min. 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                                {newPassword && (
                                    <div className="space-y-1">
                                        <Progress value={passwordStrength} className="h-1.5" />
                                        <p className="text-[10px] text-muted-foreground">
                                            Strength: {passwordStrength < 50 ? 'Weak' : passwordStrength < 100 ? 'Good' : 'Strong'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <div className="auth-input-group">
                                    <Lock className="auth-input-icon w-4 h-4" />
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                                {confirmPassword && (
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                        {passwordsMatch ? (
                                            <><CheckCircle2 className="w-3 h-3 text-success" /> <span className="text-success">Match</span></>
                                        ) : (
                                            <><AlertCircle className="w-3 h-3 text-destructive" /> <span className="text-destructive">Mismatch</span></>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Button type="submit" className="auth-submit-btn" disabled={isLoading || !passwordsMatch}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set Password'}
                                {!isLoading && <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </form>

                        <div className="auth-footer-text pt-4">
                            <button onClick={handleLogout} className="hover:text-primary transition-colors">
                                Sign out instead
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import client from '@/api/client';
import {
  MapPin,
  Loader2,
  Navigation,
  Save,
  Settings,
  Bell,
  Globe,
  UserCircle,
  Shield,
  Calendar,
  Mail,
  Phone,
  Trash2,
  Plus,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import '@/styles/Settings.css';

interface Office {
  _id?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  grace_period_mins: number;
  name?: string;
}

function NotificationSettingsPanel() {
  const [settings, setSettings] = useState({
    lateAlerts: true,
    earlyExitAlerts: true,
    dailySummary: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await client.get('/admin/settings/notifications');
        if (data) setSettings({ ...settings, ...data });
      } catch (error) {
        console.error("Failed to load notification settings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await client.post('/admin/settings/notifications', newSettings);
      toast.success("Preference saved");
    } catch (error) {
      toast.error("Failed to save preference");
      setSettings(settings);
    }
  };

  if (loading) return (
     <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
     </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
        <div className="space-y-0.5">
          <Label className="text-sm font-bold tracking-tight">Late Arrival Alerts</Label>
          <p className="text-xs font-semibold text-muted-foreground opacity-70 italic">Notify admin instantly when an employee logs in late.</p>
        </div>
        <Switch
          checked={settings.lateAlerts}
          onCheckedChange={(checked) => updateSetting('lateAlerts', checked)}
          className="data-[state=checked]:bg-indigo-600"
        />
      </div>
      <Separator className="opacity-50" />
      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
        <div className="space-y-0.5">
          <Label className="text-sm font-bold tracking-tight">Early Exit Alerts</Label>
          <p className="text-xs font-semibold text-muted-foreground opacity-70 italic">Get notified if someone logs out before shift end.</p>
        </div>
        <Switch
          checked={settings.earlyExitAlerts}
          onCheckedChange={(checked) => updateSetting('earlyExitAlerts', checked)}
          className="data-[state=checked]:bg-indigo-600"
        />
      </div>
      <Separator className="opacity-50" />
      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
        <div className="space-y-0.5">
          <Label className="text-sm font-bold tracking-tight">Intelligence Summaries</Label>
          <p className="text-xs font-semibold text-muted-foreground opacity-70 italic">Receive a consolidated daily attendance report via email.</p>
        </div>
        <Switch
          checked={settings.dailySummary}
          onCheckedChange={(checked) => updateSetting('dailySummary', checked)}
          className="data-[state=checked]:bg-indigo-600"
        />
      </div>
    </div>
  );
}

function ProfileSettingsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await client.put('/auth/profile', formData);
      toast.success('Admin profile updated');
      window.location.reload(); // Refresh to update context
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Sync failed: ' + (err.response?.data?.message || (error instanceof Error ? error.message : 'Unknown error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="space-y-2">
           <Label htmlFor="full_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Legal Identity</Label>
           <Input id="full_name" value={formData.full_name} onChange={handleChange} className="h-12 rounded-xl border-border/40" />
         </div>
         <div className="space-y-2">
           <Label htmlFor="phone_number" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Contact Secure</Label>
           <Input id="phone_number" value={formData.phone_number} onChange={handleChange} className="h-12 rounded-xl border-border/40" />
         </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Management Alias (Verified Email)</Label>
        <Input id="email" type="email" value={formData.email} onChange={handleChange} className="h-12 rounded-xl border-border/40" />
      </div>
      
      <Button onClick={handleSave} disabled={loading} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-black text-white font-black shadow-xl shadow-indigo-100 gap-2 transition-all active:scale-95">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Synchronize Profile
      </Button>
    </div>
  );
}

function SecuritySettingsPanel() {
  const [loading, setLoading] = useState(false);
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10">
        <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-6">
          <Shield className="w-4 h-4" /> Security Protocol Update
        </h4>
        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider opacity-60">Current Key</Label>
              <Input type="password" name="currentPassword" required className="h-12 rounded-xl" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider opacity-60">New Access Key</Label>
              <Input type="password" name="newPassword" required className="h-12 rounded-xl" placeholder="••••••••" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider opacity-60">Confirm Key Selection</Label>
            <Input type="password" name="confirmPassword" required className="h-12 rounded-xl" placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-slate-900 border-0 font-bold tracking-tight text-white hover:bg-black">
             {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
             Commit Security Update
          </Button>
        </form>
      </div>
    </div>
  );
}

interface Holiday {
  _id: string;
  date: string;
  name: string;
}

function HolidaySettingsPanel() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchHolidays = async () => {
    try {
      const { data } = await client.get('/admin/holidays');
      setHolidays(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async () => {
    if (!date || !name) {
      return toast.error("Missing holiday parameters.");
    }
    setAdding(true);
    try {
      await client.post('/admin/holidays', { date, name });
      toast.success("Calendar updated!");
      fetchHolidays();
      setDate('');
      setName('');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to index holiday.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Erase this holiday from records?")) return;
    try {
      await client.delete(`/admin/holidays/${id}`);
      toast.success("Entry purged.");
      fetchHolidays();
    } catch (error) {
      toast.error("Process aborted.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 space-y-6">
        <div className="p-6 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 space-y-5">
           <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Calendar Event
           </h4>
           <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider opacity-60">Occurrence Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider opacity-60">Event Title</Label>
                <Input placeholder="e.g. Independence Day" value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <Button onClick={handleAddHoliday} disabled={adding} className="w-full h-11 rounded-xl bg-slate-900 border-0 font-bold tracking-tight">
                {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Seal to Calendar
              </Button>
           </div>
        </div>
      </div>

      <div className="lg:col-span-7 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Upcoming Observed Holidays</h4>
        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary/30" /></div>
          ) : holidays.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center opacity-40">
               <Calendar className="w-10 h-10 mb-3" />
               <p className="text-xs font-bold font-mono">CALENDAR_IDLE_STATE</p>
            </div>
          ) : (
            holidays.map(h => (
              <div key={h._id} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center">
                     <span className="text-[8px] font-black uppercase text-indigo-400">{format(new Date(h.date), 'MMM')}</span>
                     <span className="text-sm font-black text-indigo-700 leading-none">{format(new Date(h.date), 'dd')}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 tracking-tight">{h.name}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-wider">Observed Leave</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-all" onClick={() => handleDeleteHoliday(h._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [office, setOffice] = useState<Office>({
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
    grace_period_mins: 15,
    name: 'Main Office',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const fetchOffice = async () => {
      try {
        const { data } = await client.get('/office');
        if (data) {
          setOffice(data);
        }
      } catch (error) {
        console.error("Error fetching office settings", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOffice();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await client.post('/office', office);
      setOffice(data);
      toast.success('Core configuration synced!');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Sync error: ' + (err.response?.data?.message || (error instanceof Error ? error.message : 'Unknown error')));
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Hardware geolocator disabled.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOffice({
          ...office,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGettingLocation(false);
        toast.success('G-Coordinates locked!');
      },
      (error) => {
        setGettingLocation(false);
        toast.error('G-Link failure: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-600/10 border-t-indigo-600 animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Configuring Environment</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-border/60">
           <div className="space-y-1">
             <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3 uppercase">
               <Settings className="w-8 h-8 text-primary" />
               Admin Control Center
             </h1>
             <p className="text-muted-foreground flex items-center gap-2 font-bold text-sm tracking-tight">
               <Shield className="w-4 h-4 opacity-50" />
               Secure Configuration & System Runtime Parameters
             </p>
           </div>
           
           <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-black text-white font-black shadow-xl shadow-indigo-100 gap-2 transition-all active:scale-95 w-full lg:w-auto">
             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
             Deploy System Changes
           </Button>
        </div>

        <Tabs defaultValue="general" className="w-full space-y-8">
          <div className="p-1 rounded-[1.5rem] bg-muted/40 border border-border/40 shadow-inner inline-flex w-full lg:w-auto">
             <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-1">
                <TabsTrigger value="general" className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md border-none transition-all">
                   General
                </TabsTrigger>
                <TabsTrigger value="profile" className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md border-none transition-all">
                   Admin Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md border-none transition-all">
                   Security
                </TabsTrigger>
                <TabsTrigger value="holidays" className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md border-none transition-all">
                   Holidays
                </TabsTrigger>
                <TabsTrigger value="location" className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md border-none transition-all">
                   Geofence
                </TabsTrigger>
                <TabsTrigger value="notifications" className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md border-none transition-all">
                   Alerts
                </TabsTrigger>
             </TabsList>
          </div>

          <TabsContent value="general" className="m-0 space-y-6">
            <Card className="rounded-[2.5rem] border-border/60 shadow-none bg-card overflow-hidden">
               <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                        <Globe className="w-6 h-6" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Organization Blueprint</CardTitle>
                        <CardDescription className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-60">Global Identity & Thresholds</CardDescription>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 block mb-6">Identity Registry</Label>
                        <div className="space-y-2 group">
                          <div className="flex items-center justify-between mb-1">
                             <Label className="font-black text-sm tracking-tight">Canonical Office Name</Label>
                             <Badge variant="outline" className="text-[9px] font-black opacity-50 uppercase">Public</Badge>
                          </div>
                          <Input
                            id="office-name"
                            value={office.name}
                            onChange={(e) => setOffice({ ...office, name: e.target.value })}
                            className="h-14 rounded-2xl border-border/60 bg-muted/20 group-focus-within:bg-white transition-all shadow-sm"
                            placeholder="e.g. Exotic Infotech Headquarters"
                          />
                        </div>
                     </div>
                     
                     <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 block mb-6">Time Compliance Policy</Label>
                        <div className="space-y-2 group">
                          <div className="flex items-center justify-between mb-1">
                             <Label className="font-black text-sm tracking-tight">Grace Window Duration</Label>
                             <div className="flex items-center gap-1.5 text-warning">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black tracking-tighter">THRESHOLD_SET</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="relative flex-1">
                                <Input
                                  id="grace-period"
                                  type="number"
                                  value={office.grace_period_mins}
                                  onChange={(e) => setOffice({ ...office, grace_period_mins: parseInt(e.target.value) || 0 })}
                                  className="h-14 rounded-2xl border-border/60 bg-muted/20 pl-14 text-lg font-black group-focus-within:bg-white transition-all shadow-sm"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black opacity-30 text-xs">MIN</div>
                             </div>
                          </div>
                          <p className="text-[11px] font-semibold text-muted-foreground/70 leading-relaxed italic pr-4">
                             System allows entry and marks as 'On-Time' within this duration past the shift start.
                          </p>
                        </div>
                     </div>
                  </div>
               </CardContent>
               <CardFooter className="bg-muted/10 p-8 border-t border-border/40">
                  <div className="flex items-center gap-3 text-muted-foreground">
                     <Info className="w-4 h-4 text-indigo-500" />
                     <p className="text-xs font-bold font-mono tracking-tight lowercase">env_node: production_v1.0.4 // auto_sync: enabled</p>
                  </div>
               </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="m-0 space-y-6">
            <Card className="rounded-[2.5rem] border-border/60 shadow-none bg-card overflow-hidden">
               <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                        <UserCircle className="w-6 h-6" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Management Passport</CardTitle>
                        <CardDescription className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-60">Admin Security & Identity Profile</CardDescription>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-10">
                  <ProfileSettingsPanel />
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="m-0 space-y-6">
            <Card className="rounded-[2.5rem] border-border/60 shadow-none bg-card overflow-hidden">
               <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                        <Lock className="w-6 h-6" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Security Access</CardTitle>
                        <CardDescription className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-60">Update Admin Credentials & Access Keys</CardDescription>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-10">
                  <SecuritySettingsPanel />
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="holidays" className="m-0 space-y-6">
            <Card className="rounded-[2.5rem] border-border/60 shadow-none bg-card overflow-hidden">
               <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                        <Calendar className="w-6 h-6" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Holiday Intelligence</CardTitle>
                        <CardDescription className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-60">System-wide Observed Non-Working Days</CardDescription>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-10">
                  <HolidaySettingsPanel />
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="m-0 space-y-6">
            <Card className="rounded-[2.5rem] border-border/60 shadow-none bg-card overflow-hidden">
               <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                        <MapPin className="w-6 h-6" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Precision Geofence</CardTitle>
                        <CardDescription className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-60">Radius Compliance & Coordinates Setup</CardDescription>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                     <div className="md:col-span-7 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-wider opacity-60">Latitude Coordinates</Label>
                              <Input
                                type="number"
                                step="any"
                                value={office.latitude}
                                onChange={(e) => setOffice({ ...office, latitude: parseFloat(e.target.value) || 0 })}
                                className="h-12 rounded-xl font-bold border-border/40"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-wider opacity-60">Longitude Coordinates</Label>
                              <Input
                                type="number"
                                step="any"
                                value={office.longitude}
                                onChange={(e) => setOffice({ ...office, longitude: parseFloat(e.target.value) || 0 })}
                                className="h-12 rounded-xl font-bold border-border/40"
                              />
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                              <Label className="text-[10px] font-black uppercase tracking-wider opacity-60">Verification Radius (Meters)</Label>
                              <Badge className="bg-primary shadow-lg shadow-indigo-100 rounded-lg h-5 font-black text-[10px] px-2">{office.radius_meters}m</Badge>
                           </div>
                           <Input
                             type="number"
                             value={office.radius_meters}
                             onChange={(e) => setOffice({ ...office, radius_meters: parseInt(e.target.value) || 100 })}
                             className="h-14 rounded-2xl font-black text-xl border-border focus-visible:ring-primary/20 shadow-sm"
                           />
                           <div className="flex items-start gap-2 p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800">
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                              <p className="text-[10px] font-bold leading-relaxed lowercase tracking-tight italic">
                                 CAUTION: Excessive radius may compromise attendance integrity. 50m-150m recommended for reliable tracking.
                              </p>
                           </div>
                        </div>
                     </div>

                     <div className="md:col-span-5">
                        <div className="h-full rounded-3xl border border-border/60 bg-muted/20 relative overflow-hidden flex flex-col items-center justify-center text-center p-8">
                           <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
                              <div className="w-full h-full bg-[radial-gradient(circle,var(--primary)_1px,transparent_1px)] bg-[size:20px_20px]" />
                           </div>
                           
                           <div className="relative mb-6">
                              <div className="w-24 h-24 rounded-full bg-white shadow-2xl flex items-center justify-center border border-border/40 relative z-10">
                                 <Navigation className="w-10 h-10 text-primary animate-pulse" />
                              </div>
                              <div className="absolute -top-4 -left-4 w-32 h-32 rounded-full border-4 border-dashed border-primary/20 animate-spin-slow" />
                           </div>

                           <h4 className="text-lg font-black tracking-tight text-slate-800 mb-2">Satellite Sync</h4>
                           <p className="text-xs font-bold text-muted-foreground max-w-[220px] mb-8 lowercase tracking-tight leading-relaxed italic">
                              Lock current GPS metadata to system geofence registry.
                           </p>
                           
                           <Button 
                             onClick={useCurrentLocation} 
                             disabled={gettingLocation} 
                             className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black shadow-xl shadow-slate-200 transition-all active:scale-95"
                           >
                             {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
                             Auto-Detect Location
                           </Button>
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="m-0 space-y-6">
            <Card className="rounded-[2.5rem] border-border/60 shadow-none bg-card overflow-hidden">
               <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                        <Bell className="w-6 h-6" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Alert Intelligence</CardTitle>
                        <CardDescription className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-60">System Notifications & Compliance Triggers</CardDescription>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-10">
                  <div className="max-w-2xl mx-auto py-4">
                     <NotificationSettingsPanel />
                  </div>
               </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

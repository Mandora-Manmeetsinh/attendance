import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Office {
  _id?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  grace_period_mins: number;
  name?: string;
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
        // Don't show error toast on initial load if no office exists yet
      } finally {
        setLoading(false);
      }
    }
    fetchOffice();
  }, []);

  const handleSave = async () => {
    setSaving(true);

    const officeData = {
      latitude: office.latitude,
      longitude: office.longitude,
      radius_meters: office.radius_meters,
      grace_period_mins: office.grace_period_mins,
      name: office.name || 'Main Office',
    };

    try {
      const { data } = await client.post('/office', officeData);
      setOffice(data);
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error('Failed to save settings: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
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
        toast.success('Location updated! Click Save to apply.');
      },
      (error) => {
        setGettingLocation(false);
        toast.error('Failed to get location: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative z-0">
        <AnimatedBackground />
      </div>

      <div className="space-y-8 relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">System Settings</h1>
            <p className="text-muted-foreground mt-1 text-lg">Configure your workspace and preferences</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-glow-accent hover:scale-105 transition-transform">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="general" className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 animate-scale-in">
            <Card className="shadow-soft border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  General Configuration
                </CardTitle>
                <CardDescription>Basic settings for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="office-name">Office Name</Label>
                    <Input
                      id="office-name"
                      value={office.name}
                      onChange={(e) => setOffice({ ...office, name: e.target.value })}
                      placeholder="e.g. Main HQ"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="grace-period">Grace Period (minutes)</Label>
                    <div className="flex gap-4">
                      <Input
                        id="grace-period"
                        type="number"
                        value={office.grace_period_mins}
                        onChange={(e) => setOffice({ ...office, grace_period_mins: parseInt(e.target.value) || 0 })}
                        className="max-w-[150px]"
                      />
                      <p className="text-sm text-muted-foreground self-center">
                        Time allowed after shift start before marking as late.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="space-y-6 animate-scale-in">
            <Card className="shadow-soft border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Geofencing Configuration
                </CardTitle>
                <CardDescription>Set up your office location and attendance radius</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={office.latitude}
                        onChange={(e) => setOffice({ ...office, latitude: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={office.longitude}
                        onChange={(e) => setOffice({ ...office, longitude: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Radius (meters)</Label>
                      <Input
                        type="number"
                        value={office.radius_meters}
                        onChange={(e) => setOffice({ ...office, radius_meters: parseInt(e.target.value) || 100 })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Employees must be within this distance to check in.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 justify-center items-center p-6 bg-muted/30 rounded-xl border border-dashed border-border">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-soft">
                      <Globe className="w-10 h-10 text-primary" />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="font-medium">Current Location</h4>
                      <p className="text-sm text-muted-foreground max-w-[200px]">
                        {office.latitude.toFixed(6)}, {office.longitude.toFixed(6)}
                      </p>
                    </div>
                    <Button variant="outline" onClick={useCurrentLocation} disabled={gettingLocation} className="w-full max-w-xs">
                      {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
                      Use My Current Location
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 animate-scale-in">
            <Card className="shadow-soft border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Manage system alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Late Arrival Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notify admin when an employee is late</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Early Exit Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notify admin when an employee leaves early</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Daily Summary</Label>
                      <p className="text-sm text-muted-foreground">Receive a daily attendance report via email</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
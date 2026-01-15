import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [office, setOffice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    supabase.from('offices').select('*').limit(1).single().then(({ data }) => {
      if (data) setOffice(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('offices').update({
      latitude: office.latitude,
      longitude: office.longitude,
      radius_meters: office.radius_meters,
      grace_period_mins: office.grace_period_mins,
    }).eq('id', office.id);
    setSaving(false);
    if (error) toast.error('Failed to save'); else toast.success('Settings saved!');
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
      { enableHighAccuracy: true }
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Office Settings</h1>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Office Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Latitude</Label><Input type="number" step="any" value={office?.latitude || 0} onChange={(e) => setOffice({...office, latitude: parseFloat(e.target.value)})} /></div>
              <div><Label>Longitude</Label><Input type="number" step="any" value={office?.longitude || 0} onChange={(e) => setOffice({...office, longitude: parseFloat(e.target.value)})} /></div>
            </div>
            <Button variant="outline" onClick={useCurrentLocation} disabled={gettingLocation} className="w-full">
              {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
              Use Current Location as Office
            </Button>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Radius (meters)</Label><Input type="number" value={office?.radius_meters || 100} onChange={(e) => setOffice({...office, radius_meters: parseInt(e.target.value)})} /></div>
              <div><Label>Grace Period (mins)</Label><Input type="number" value={office?.grace_period_mins || 15} onChange={(e) => setOffice({...office, grace_period_mins: parseInt(e.target.value)})} /></div>
            </div>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

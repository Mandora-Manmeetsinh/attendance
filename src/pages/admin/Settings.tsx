import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';

interface Office {
  id?: string;
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    supabase.from('offices').select('*').limit(1).single().then(({ data, error }) => {
      if (data) {
        setOffice(data);
      }
      // If no office exists or error, keep defaults
      setLoading(false);
    });
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

    let error;
    
    if (office.id) {
      // Update existing office
      const result = await supabase.from('offices').update(officeData).eq('id', office.id);
      error = result.error;
    } else {
      // Insert new office
      const result = await supabase.from('offices').insert(officeData).select().single();
      error = result.error;
      if (result.data) {
        setOffice(result.data);
      }
    }
    
    setSaving(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Settings saved!');
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

  if (loading) return <Layout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Office Settings</h1>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Office Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Latitude</Label><Input type="number" step="any" value={office.latitude} onChange={(e) => setOffice({...office, latitude: parseFloat(e.target.value) || 0})} /></div>
              <div><Label>Longitude</Label><Input type="number" step="any" value={office.longitude} onChange={(e) => setOffice({...office, longitude: parseFloat(e.target.value) || 0})} /></div>
            </div>
            <Button variant="outline" onClick={useCurrentLocation} disabled={gettingLocation} className="w-full">
              {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
              Use Current Location as Office
            </Button>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Radius (meters)</Label><Input type="number" value={office.radius_meters} onChange={(e) => setOffice({...office, radius_meters: parseInt(e.target.value) || 100})} /></div>
              <div><Label>Grace Period (mins)</Label><Input type="number" value={office.grace_period_mins} onChange={(e) => setOffice({...office, grace_period_mins: parseInt(e.target.value) || 15})} /></div>
            </div>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
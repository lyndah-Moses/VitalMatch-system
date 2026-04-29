import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { AlertCircle, MapPin } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function HospitalMap() {
  const [hospital, setHospital] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Assume /hospitals/me returns hospital profile with lat/lng
        // And /hospitals/me/donors-map returns list of donors with lat/lng, bloodType, distance
        const [hospData, donorsData] = await Promise.all([
          fetchApi("/auth/me").catch(() => null), // or however we get hospital profile
          fetchApi("/hospitals/me/donors-map").catch(() => [])
        ]);
        
        // Mock hospital coords if not available via API
        setHospital(hospData?.hospital || { latitude: -1.2921, longitude: 36.8219, name: "Your Hospital" });
        setDonors(donorsData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) return <div>Loading live map...</div>;

  const center: [number, number] = hospital ? [hospital.latitude, hospital.longitude] : [-1.2921, 36.8219];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Donor Map</h1>
        <p className="text-muted-foreground mt-1">Visualize available donors in your vicinity.</p>
      </div>

      {!hospital && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Location not set</AlertTitle>
          <AlertDescription>
            Please update your hospital profile with GPS coordinates to see nearby donors accurately.
          </AlertDescription>
        </Alert>
      )}

      <Card className="flex-1 min-h-[500px] overflow-hidden relative">
        <CardContent className="p-0 h-full w-full">
          <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {hospital && (
              <Marker position={[hospital.latitude, hospital.longitude]}>
                <Popup>
                  <strong>{hospital.name}</strong><br />
                  Your Location
                </Popup>
              </Marker>
            )}

            {hospital && (
              <Circle center={[hospital.latitude, hospital.longitude]} radius={5000} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }} />
            )}

            {donors.map(donor => (
              <Marker key={donor.id} position={[donor.latitude, donor.longitude]}>
                <Popup>
                  <div className="text-center">
                    <div className="font-bold text-lg text-primary">{donor.bloodType}</div>
                    <div className="text-sm">{donor.distanceKm ? `${donor.distanceKm.toFixed(1)} km away` : 'Nearby'}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md z-[400] border border-border">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Legend
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Your Hospital</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500"></div>
                <span>5km Radius</span>
              </div>
              <div className="flex items-center gap-2">
                <img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" className="h-4" alt="donor" />
                <span>Eligible Donor</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

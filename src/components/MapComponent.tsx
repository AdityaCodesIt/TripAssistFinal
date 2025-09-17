import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TouristSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  cost: string;
  description?: string;
}

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  touristSpots?: TouristSpot[];
  userLocation?: [number, number] | null;
  className?: string;
}

// Component to update map view when center changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const MapComponent = ({ 
  center = [20.5937, 78.9629], // Default to India center
  zoom = 6,
  touristSpots = [],
  userLocation,
  className = "h-96 w-full"
}: MapComponentProps) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  return (
    <div className={className}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="h-full w-full rounded-lg"
      >
        <ChangeView center={mapCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div className="text-center">
                <strong>Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Tourist spots markers */}
        {touristSpots.map((spot) => (
          <Marker
            key={spot.id}
            position={[spot.latitude, spot.longitude]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-lg">{spot.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{spot.category}</p>
                <p className="text-sm mb-2">{spot.description}</p>
                <p className="text-sm font-medium">Cost: {spot.cost}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
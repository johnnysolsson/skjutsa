import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { MapPin, Navigation, Locate } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface RouteMapProps {
  onDistanceCalculated: (distanceKm: number) => void;
  onStartLocationFound?: (locationName: string) => void;
  onDurationCalculated?: (durationMinutes: number) => void;
}

interface Location {
  lat: number;
  lon: number;
  display_name: string;
}

// Component to update map view when bounds change
const MapUpdater: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

const RouteMap: React.FC<RouteMapProps> = ({ onDistanceCalculated, onStartLocationFound, onDurationCalculated }) => {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  // Prevents duplicate route calculations for the same start/end combination
  const lastSearchRef = useRef<string>('');

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          
          if (data) {
            const location: Location = {
              lat: latitude,
              lon: longitude,
              display_name: data.display_name
            };
            
            setStartLocation(location);
            
            // Try to get a friendly name (city/town/village)
            const address = data.address;
            const cityName = address?.city || address?.town || address?.village || address?.municipality || data.display_name.split(',')[0];
            
            setStartQuery(cityName);
            if (onStartLocationFound) {
                onStartLocationFound(cityName);
            }
          }
        } catch (error) {
          console.error("Error getting current location:", error);
        }
      }, (error) => {
        console.log("Geolocation permission denied or error:", error);
      });
    }
  }, [onStartLocationFound]);

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          
          if (data) {
            const location: Location = {
              lat: latitude,
              lon: longitude,
              display_name: data.display_name
            };
            
            setStartLocation(location);
            
            const address = data.address;
            const cityName = address?.city || address?.town || address?.village || address?.municipality || data.display_name.split(',')[0];
            
            setStartQuery(cityName);
            if (onStartLocationFound) {
                onStartLocationFound(cityName);
            }
          }
        } catch (error) {
          console.error("Error getting current location:", error);
        }
      }, (error) => {
        console.log("Geolocation permission denied or error:", error);
      });
    }
  };

  /**
   * Search for location using OpenStreetMap Nominatim API
   * @param query - Location search query (e.g., city name)
   * @returns Location object with coordinates and display name, or null if not found
   */
  const searchLocation = async (query: string): Promise<Location | null> => {
    if (!query) return null;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          display_name: data[0].display_name
        };
      }
    } catch (error) {
      console.error("Error searching location:", error);
    }
    return null;
  };

  /**
   * Calculate route between start and end locations
   * Fetches route data from OSRM API and updates map with polyline and bounds
   */
  const handleCalculateRoute = useCallback(async () => {
    if (!startQuery || !endQuery) return;
    setIsSearching(true);

    const start = await searchLocation(startQuery);
    const end = await searchLocation(endQuery);

    setStartLocation(start);
    setEndLocation(end);

    if (start) {
      // Extract city name (first part of display_name)
      const cityName = start.display_name.split(',')[0].trim();
      onStartLocationFound?.(cityName);
    }

    if (start && end) {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distanceKm = route.distance / 1000;
          const durationMinutes = Math.round(route.duration / 60);
          onDistanceCalculated(Math.round(distanceKm));
          onDurationCalculated?.(durationMinutes);

          // Extract coordinates for Polyline (GeoJSON is [lon, lat], Leaflet needs [lat, lon])
          const coords = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
          setRoutePositions(coords);

          // Set bounds to fit the route
          const group = new L.LatLngBounds([start.lat, start.lon], [end.lat, end.lon]);
          coords.forEach((c: [number, number]) => group.extend(c));
          setBounds(group);
        }
      } catch (error) {
        console.error("Error calculating route:", error);
      }
    }
    setIsSearching(false);
  }, [startQuery, endQuery, onStartLocationFound, onDistanceCalculated, onDurationCalculated]);

  // Auto-calculate route when inputs change (debounced to avoid excessive API calls)
  useEffect(() => {
    const searchKey = `${startQuery}|${endQuery}`;
    
    if (startQuery && endQuery && !isSearching && lastSearchRef.current !== searchKey) {
      const timeoutId = setTimeout(() => {
        lastSearchRef.current = searchKey;
        handleCalculateRoute();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [endQuery, startQuery, handleCalculateRoute, isSearching]);

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-1">Start</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              value={startQuery}
              onChange={(e) => setStartQuery(e.target.value)}
              placeholder="T.ex. Stockholm"
              className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button 
              onClick={handleUseCurrentLocation}
              className="absolute right-3 top-3 text-gray-400 hover:text-cyan-400 transition-colors"
              title="Använd min position"
            >
              <Locate className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-1">Destination</label>
          <div className="relative">
            <Navigation className="absolute left-3 top-3 w-4 h-4 text-purple-400" />
            <input
              type="text"
              value={endQuery}
              onChange={(e) => setEndQuery(e.target.value)}
              placeholder="T.ex. Göteborg"
              className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      <div className="h-64 w-full rounded-xl overflow-hidden border border-white/10 shadow-inner relative z-0">
        <MapContainer
          center={[62.0, 15.0]} // Center of Sweden approx
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {startLocation && (
            <Marker position={[startLocation.lat, startLocation.lon]}>
              <Popup>Start: {startLocation.display_name}</Popup>
            </Marker>
          )}
          
          {endLocation && (
            <Marker position={[endLocation.lat, endLocation.lon]}>
              <Popup>Mål: {endLocation.display_name}</Popup>
            </Marker>
          )}

          {routePositions.length > 0 && (
            <Polyline positions={routePositions} color="#22d3ee" weight={4} opacity={0.8} />
          )}

          <MapUpdater bounds={bounds} />
        </MapContainer>
      </div>
    </div>
  );
};

export { RouteMap };

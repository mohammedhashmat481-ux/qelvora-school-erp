/**
 * LocationMap — Interactive Google Maps component with real-time location.
 * Falls back to Leaflet / OpenStreetMap if the Google Maps API Key is not set.
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// Fix the default Leaflet marker icon issue with bundlers (Vite/Webpack)
if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  GOOGLE MAPS SCRIPT LOADER & CACHE
// ─────────────────────────────────────────────────────────────────────────────

let googleMapsLoadingPromise = null;
const loadGoogleMaps = (apiKey) => {
  if (googleMapsLoadingPromise) return googleMapsLoadingPromise;
  googleMapsLoadingPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }
    // Expose global callback to satisfy loading=async requirements
    window.__googleMapsCallback = () => {
      resolve(window.google.maps);
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&loading=async&callback=__googleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.addEventListener('error', (err) => {
      googleMapsLoadingPromise = null; // allow retry
      reject(err);
    });
    document.head.appendChild(script);
  });
  return googleMapsLoadingPromise;
};

// ─────────────────────────────────────────────────────────────────────────────
//  GOOGLE MAPS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const GoogleMapComponent = ({
  position,
  registeredLocation = null,
  showAccuracy = true,
  followUser = true,
  height = 400,
  apiKey,
  className = '',
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const registeredMarkerRef = useRef(null);
  const registeredCircleRef = useRef(null);
  
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(followUser);

  // Load API Script
  useEffect(() => {
    loadGoogleMaps(apiKey)
      .then(() => setGoogleMapsLoaded(true))
      .catch((err) => {
        console.error('Failed to load Google Maps JS API:', err);
        setLoadError(true);
      });
  }, [apiKey]);

  // Initialize Map
  useEffect(() => {
    if (!googleMapsLoaded || !containerRef.current || mapRef.current) return;

    const maps = window.google.maps;
    const defaultCenter = position
      ? { lat: position.latitude, lng: position.longitude }
      : { lat: 20.5937, lng: 78.9629 }; // India Center

    const mapInstance = new maps.Map(containerRef.current, {
      center: defaultCenter,
      zoom: position ? 16 : 5,
      disableDefaultUI: true, // Disable standard buttons for custom floating styles
      styles: [
        {
          featureType: 'administrative',
          elementType: 'geometry',
          stylers: [{ visibility: 'on' }],
        },
      ],
    });

    mapRef.current = mapInstance;

    // Define custom HTML marker overlay constructor
    class GoogleHTMLMarker extends maps.OverlayView {
      constructor(latlng, html, mapInstance) {
        super();
        this.latlng = latlng;
        this.html = html;
        this.setMap(mapInstance);
      }
      onAdd() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.transform = 'translate(-50%, -50%)';
        this.div.style.zIndex = '1000';
        this.div.innerHTML = this.html;
        const panes = this.getPanes();
        panes.overlayImage.appendChild(this.div);
      }
      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(this.latlng);
        if (point && this.div) {
          this.div.style.left = point.x + 'px';
          this.div.style.top = point.y + 'px';
        }
      }
      onRemove() {
        if (this.div) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }
      setPosition(latlng) {
        this.latlng = latlng;
        this.draw();
      }
    }

    window.GoogleHTMLMarker = GoogleHTMLMarker;

    return () => {
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsLoaded]);

  // Update user position & accuracy circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position || !googleMapsLoaded || !window.GoogleHTMLMarker) return;

    const maps = window.google.maps;
    const latlng = new maps.LatLng(position.latitude, position.longitude);

    // Create or update User marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(latlng);
    } else {
      const htmlContent = `
        <div style="position:relative;width:20px;height:20px;">
          <div style="
            position:absolute;inset:0;
            background:#3b82f6;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 0 8px rgba(59,130,246,0.6);
            z-index:2;
          "></div>
          <div style="
            position:absolute;inset:-8px;
            background:rgba(59,130,246,0.2);
            border-radius:50%;
            animation:locationPulse 2s ease-out infinite;
            z-index:1;
          "></div>
        </div>
      `;
      userMarkerRef.current = new window.GoogleHTMLMarker(latlng, htmlContent, map);
    }

    // Accuracy Circle
    if (showAccuracy && position.accuracy) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setCenter(latlng);
        accuracyCircleRef.current.setRadius(position.accuracy);
      } else {
        accuracyCircleRef.current = new maps.Circle({
          strokeColor: '#3b82f6',
          strokeOpacity: 0.6,
          strokeWeight: 1,
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          map: map,
          center: latlng,
          radius: position.accuracy,
        });
      }
    }

    if (isFollowing) {
      map.panTo(latlng);
      if (map.getZoom() < 14) {
        map.setZoom(16);
      }
    }
  }, [position, googleMapsLoaded, isFollowing, showAccuracy]);

  // Update registered location marker & 1km range circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !googleMapsLoaded || !window.GoogleHTMLMarker) return;

    if (registeredMarkerRef.current) {
      registeredMarkerRef.current.setMap(null);
      registeredMarkerRef.current = null;
    }
    if (registeredCircleRef.current) {
      registeredCircleRef.current.setMap(null);
      registeredCircleRef.current = null;
    }

    if (!registeredLocation) return;

    const maps = window.google.maps;
    const latlng = new maps.LatLng(registeredLocation.latitude, registeredLocation.longitude);

    // Registered Marker
    const htmlContent = `
      <div style="position:relative;width:20px;height:20px;">
        <div style="
          position:absolute;inset:0;
          background:#22c55e;
          border:3px solid #fff;
          border-radius:50%;
          box-shadow:0 0 8px rgba(34,197,94,0.6);
          z-index:2;
        "></div>
      </div>
    `;
    registeredMarkerRef.current = new window.GoogleHTMLMarker(latlng, htmlContent, map);

    // 1km radius range circle (1000m)
    registeredCircleRef.current = new maps.Circle({
      strokeColor: '#22c55e',
      strokeOpacity: 0.7,
      strokeWeight: 2,
      fillColor: '#22c55e',
      fillOpacity: 0.08,
      map: map,
      center: latlng,
      radius: 1000,
    });
  }, [registeredLocation, googleMapsLoaded]);

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.setZoom(mapRef.current.getZoom() + 1);
  };
  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.setZoom(mapRef.current.getZoom() - 1);
  };
  const handleRecenter = () => {
    if (position && mapRef.current) {
      const maps = window.google.maps;
      mapRef.current.panTo(new maps.LatLng(position.latitude, position.longitude));
      mapRef.current.setZoom(16);
    }
    setIsFollowing(!isFollowing);
  };

  if (loadError) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-2xl border border-red-200">
        ⚠️ Failed to load Google Maps. Checking local fallback...
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-lg ${className}`} style={{ height }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Recenter / follow toggle */}
      <button
        onClick={handleRecenter}
        className={`absolute bottom-4 right-4 z-[1000] p-3 rounded-full shadow-lg transition-all ${
          isFollowing ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title={isFollowing ? 'Stop following' : 'Follow my location'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
        <button onClick={handleZoomIn} className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center text-gray-700 hover:bg-gray-50 text-lg font-bold">+</button>
        <button onClick={handleZoomOut} className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center text-gray-700 hover:bg-gray-50 text-lg font-bold">−</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  LEAFLET COMPONENT (FALLBACK)
// ─────────────────────────────────────────────────────────────────────────────

const LeafletMapComponent = ({
  position,
  registeredLocation = null,
  showAccuracy = true,
  followUser = true,
  height = 400,
  className = '',
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const registeredMarkerRef = useRef(null);
  const registeredCircleRef = useRef(null);
  const [isFollowing, setIsFollowing] = useState(followUser);

  // Custom pulsing Leaflet icons
  const createUserIcon = () =>
    L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="
            position:absolute;inset:0;
            background:#3b82f6;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 0 8px rgba(59,130,246,0.6);
            z-index:2;
          "></div>
          <div style="
            position:absolute;inset:-8px;
            background:rgba(59,130,246,0.2);
            border-radius:50%;
            animation:locationPulse 2s ease-out infinite;
            z-index:1;
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

  const createRegisteredIcon = () =>
    L.divIcon({
      className: 'registered-location-marker',
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="
            position:absolute;inset:0;
            background:#22c55e;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 0 8px rgba(34,197,94,0.6);
            z-index:2;
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter = position
      ? [position.latitude, position.longitude]
      : [20.5937, 78.9629];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: position ? 16 : 5,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const latlng = [position.latitude, position.longitude];

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latlng);
    } else {
      userMarkerRef.current = L.marker(latlng, { icon: createUserIcon() })
        .addTo(map)
        .bindPopup(
          `<div style="font-size:13px;">
            <p style="font-weight:600;color:#3b82f6;margin-bottom:4px;">📍 Your Location</p>
            <p>Lat: ${position.latitude.toFixed(6)}</p>
            <p>Lng: ${position.longitude.toFixed(6)}</p>
          </div>`
        );
    }

    if (showAccuracy && position.accuracy) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(latlng);
        accuracyCircleRef.current.setRadius(position.accuracy);
      } else {
        accuracyCircleRef.current = L.circle(latlng, {
          radius: position.accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      }
    }

    if (isFollowing) {
      const targetZoom = map.getZoom() < 14 ? 16 : map.getZoom();
      map.setView(latlng, targetZoom, { animate: true, duration: 0.5 });
    }
  }, [position, isFollowing, showAccuracy]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (registeredMarkerRef.current) {
      map.removeLayer(registeredMarkerRef.current);
      registeredMarkerRef.current = null;
    }
    if (registeredCircleRef.current) {
      map.removeLayer(registeredCircleRef.current);
      registeredCircleRef.current = null;
    }

    if (!registeredLocation) return;

    const latlng = [registeredLocation.latitude, registeredLocation.longitude];

    registeredMarkerRef.current = L.marker(latlng, { icon: createRegisteredIcon() })
      .addTo(map)
      .bindPopup(
        `<div style="font-size:13px;">
          <p style="font-weight:600;color:#22c55e;margin-bottom:4px;">🏠 Registered Location</p>
          <p>Lat: ${registeredLocation.latitude.toFixed(6)}</p>
          <p>Lng: ${registeredLocation.longitude.toFixed(6)}</p>
        </div>`
      );

    registeredCircleRef.current = L.circle(latlng, {
      radius: 1000,
      color: '#22c55e',
      fillColor: '#22c55e',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '6 4',
    }).addTo(map);
  }, [registeredLocation]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    if (position && mapRef.current) {
      mapRef.current.setView([position.latitude, position.longitude], 16, {
        animate: true,
        duration: 0.5,
      });
    }
    setIsFollowing(!isFollowing);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-lg ${className}`} style={{ height }}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

      {/* Recenter / follow toggle */}
      <button
        onClick={handleRecenter}
        className={`absolute bottom-4 right-4 z-[1000] p-3 rounded-full shadow-lg transition-all ${
          isFollowing ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title={isFollowing ? 'Stop following' : 'Follow my location'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
        <button onClick={handleZoomIn} className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center text-gray-700 hover:bg-gray-50 text-lg font-bold">+</button>
        <button onClick={handleZoomOut} className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center text-gray-700 hover:bg-gray-50 text-lg font-bold">−</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN MAP ROUTER
// ─────────────────────────────────────────────────────────────────────────────

const LocationMap = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasGoogleKey = apiKey && apiKey !== 'your_google_maps_api_key_here';

  if (hasGoogleKey) {
    return <GoogleMapComponent {...props} apiKey={apiKey} />;
  }

  return <LeafletMapComponent {...props} />;
};

export default LocationMap;

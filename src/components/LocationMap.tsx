/**
 * LocationMap Component
 * 
 * Embeds Google Maps for displaying order/job locations.
 * Supports:
 * - Address geocoding
 * - Marker with info popup
 * - Navigation link to Google Maps
 * - Static map fallback
 * 
 * Requires VITE_GOOGLE_MAPS_API_KEY environment variable.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, ExternalLink, AlertCircle, Loader } from 'lucide-react';

interface LocationMapProps {
    address: string;
    city?: string;
    postalCode?: string;
    title?: string;
    height?: string;
    showNavigationButton?: boolean;
    className?: string;
}

declare global {
    interface Window {
        google: any;
        initGoogleMaps: () => void;
    }
}

// Get API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Cached geocode results
const geocodeCache: Record<string, { lat: number; lng: number }> = {};

export function LocationMap({
    address,
    city,
    postalCode,
    title,
    height = '200px',
    showNavigationButton = true,
    className = ''
}: LocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const mapInstanceRef = useRef<any>(null);

    // Full address string
    const fullAddress = [address, postalCode, city].filter(Boolean).join(', ');

    // Load Google Maps script
    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            setError('Google Maps API-nyckel saknas');
            setLoading(false);
            return;
        }

        if (window.google?.maps) {
            geocodeAndRender();
            return;
        }

        // Check if script is already loading
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            window.initGoogleMaps = () => geocodeAndRender();
            return;
        }

        // Load script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;

        window.initGoogleMaps = () => geocodeAndRender();

        script.onerror = () => {
            setError('Kunde inte ladda Google Maps');
            setLoading(false);
        };

        document.head.appendChild(script);

        return () => {
            (window as any).initGoogleMaps = undefined;
        };
    }, [fullAddress]);

    const geocodeAndRender = useCallback(async () => {
        if (!fullAddress) {
            setError('Ingen adress angiven');
            setLoading(false);
            return;
        }

        // Check cache
        if (geocodeCache[fullAddress]) {
            setCoordinates(geocodeCache[fullAddress]);
            setLoading(false);
            return;
        }

        try {
            const geocoder = new window.google.maps.Geocoder();

            const result = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
                geocoder.geocode({ address: fullAddress }, (results: any[], status: string) => {
                    if (status === 'OK' && results[0]) {
                        const location = results[0].geometry.location;
                        resolve({ lat: location.lat(), lng: location.lng() });
                    } else {
                        reject(new Error('Adressen kunde inte hittas'));
                    }
                });
            });

            geocodeCache[fullAddress] = result;
            setCoordinates(result);
            setLoading(false);
        } catch (err) {
            setError('Adressen kunde inte hittas');
            setLoading(false);
        }
    }, [fullAddress]);

    // Render map when coordinates are available
    useEffect(() => {
        if (!coordinates || !mapRef.current || !window.google?.maps) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: coordinates,
            zoom: 15,
            disableDefaultUI: true,
            zoomControl: true,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        const marker = new window.google.maps.Marker({
            position: coordinates,
            map,
            title: title || address,
            animation: window.google.maps.Animation.DROP
        });

        // Info window
        const infoWindow = new window.google.maps.InfoWindow({
            content: `
        <div style="padding: 8px; max-width: 200px;">
          <p style="margin: 0; font-weight: 600; font-size: 14px;">${title || 'Plats'}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #666;">${fullAddress}</p>
        </div>
      `
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                // Cleanup if needed
            }
        };
    }, [coordinates, title, fullAddress]);

    // Open in Google Maps
    const handleOpenInMaps = () => {
        const query = encodeURIComponent(fullAddress);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    // Get directions
    const handleGetDirections = () => {
        const destination = encodeURIComponent(fullAddress);
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
    };

    // Loading state
    if (loading) {
        return (
            <div
                className={`bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center ${className}`}
                style={{ height }}
            >
                <div className="text-center">
                    <Loader className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
                    <p className="text-xs text-zinc-500 mt-2">Laddar karta...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div
                className={`bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center ${className}`}
                style={{ height }}
            >
                <div className="text-center px-4">
                    <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{error}</p>
                    {fullAddress && (
                        <button
                            onClick={handleOpenInMaps}
                            className="mt-2 text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1 mx-auto"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Öppna i Google Maps
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`relative rounded-lg overflow-hidden ${className}`}>
            {/* Map Container */}
            <div ref={mapRef} style={{ height }} className="w-full" />

            {/* Address Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-3 py-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MapPin className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{fullAddress}</p>
                    </div>

                    {showNavigationButton && (
                        <button
                            onClick={handleGetDirections}
                            className="flex items-center gap-1 px-2 py-1 bg-cyan-500 text-white text-xs font-medium rounded-lg hover:bg-cyan-600 transition-colors flex-shrink-0"
                        >
                            <Navigation className="w-3 h-3" />
                            Vägbeskrivning
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Static map image fallback (no API key needed for display)
 */
export function StaticLocationMap({
    address,
    city,
    postalCode,
    height = '200px',
    className = ''
}: Omit<LocationMapProps, 'title' | 'showNavigationButton'>) {
    const fullAddress = [address, postalCode, city].filter(Boolean).join(', ');

    // Open in Google Maps
    const handleClick = () => {
        const query = encodeURIComponent(fullAddress);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <button
            onClick={handleClick}
            className={`relative w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 hover:opacity-90 transition-opacity ${className}`}
            style={{ height }}
        >
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <MapPin className="w-8 h-8 text-cyan-500 mx-auto" />
                    <p className="text-xs text-zinc-500 mt-2 px-4 truncate max-w-full">{fullAddress}</p>
                    <p className="text-xs text-cyan-600 mt-1">Klicka för att öppna i Maps</p>
                </div>
            </div>
        </button>
    );
}

export default LocationMap;

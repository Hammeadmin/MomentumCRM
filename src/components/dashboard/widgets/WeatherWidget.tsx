import React, { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, MapPin } from 'lucide-react';
import { useDashboardPreferences } from '../../../hooks/useDashboardPreferences';

interface WeatherData {
    temperature: number;
    windspeed: number;
    weathercode: number;
    humidity?: number; // Not always available in basic current_weather, checking API
}

// WMO Weather interpretation codes (WW)
const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-8 h-8 text-yellow-500" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-8 h-8 text-gray-400" />;
    if (code >= 45 && code <= 48) return <Cloud className="w-8 h-8 text-gray-500" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="w-8 h-8 text-blue-200" />;
    if (code >= 80 && code <= 82) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (code >= 95 && code <= 99) return <CloudLightning className="w-8 h-8 text-purple-500" />;
    return <Sun className="w-8 h-8 text-yellow-500" />;
};

const getWeatherLabel = (code: number) => {
    if (code === 0) return 'Klart';
    if (code >= 1 && code <= 3) return 'Molnigt';
    if (code >= 45 && code <= 48) return 'Dimma';
    if (code >= 51 && code <= 67) return 'Regn';
    if (code >= 71 && code <= 77) return 'Snö';
    if (code >= 80 && code <= 82) return 'Skurar';
    if (code >= 95 && code <= 99) return 'Åska';
    return 'Klart';
};

export default function WeatherWidget() {
    const { settings } = useDashboardPreferences();
    const [data, setData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const lat = settings?.weather_lat || 59.3293;
    const lon = settings?.weather_lon || 18.0686;
    const city = settings?.weather_city || 'Stockholm';

    useEffect(() => {
        async function fetchWeather() {
            try {
                setLoading(true);
                // Using Open-Meteo free API
                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
                );
                const json = await res.json();
                if (json.current_weather) {
                    setData(json.current_weather);
                } else {
                    setError(true);
                }
            } catch (e) {
                console.error('Weather fetch error:', e);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchWeather();

        // Refresh every 30 mins
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, [lat, lon]);

    if (loading) return <div className="h-full min-h-[160px] bg-white dark:bg-gray-800 rounded-2xl animate-pulse" />;
    if (error || !data) return null;

    return (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-900 dark:to-blue-950 p-6 rounded-2xl shadow-sm text-white h-full relative overflow-hidden group">
            {/* Background decoration */}
            <Cloud className="absolute -top-4 -right-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform duration-700" />

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center space-x-2 text-blue-100 text-sm font-medium mb-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{city}</span>
                        </div>
                        <div className="text-3xl font-bold tracking-tight">
                            {Math.round(data.temperature)}°
                        </div>
                    </div>
                    <div>
                        {getWeatherIcon(data.weathercode)}
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-lg font-medium text-white mb-2">
                        {getWeatherLabel(data.weathercode)}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-blue-100">
                        <div className="flex items-center">
                            <Wind className="w-3.5 h-3.5 mr-1" />
                            {data.windspeed} m/s
                        </div>
                        {/* Note: Basic current_weather doesn't give humidity, would need 'hourly' param, keeping simple for now */}
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { Cloud, MapPin, Thermometer, Wind } from 'lucide-react';

interface WeatherData {
    city: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    icon: React.ComponentType<{ className?: string }>;
}

export default function WeatherWidget() {
    const [weather] = useState<WeatherData>({
        city: 'Stockholm',
        temperature: 8,
        condition: 'Molnigt',
        humidity: 72,
        windSpeed: 12,
        icon: Cloud
    });

    const Icon = weather.icon;

    return (
        <div className="hidden md:block bg-card-background-light dark:bg-card-background-dark border border-card-border-light dark:border-card-border-dark rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                        {weather.city}
                    </span>
                </div>
                <Icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Thermometer className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {weather.temperature}°C
                    </span>
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-xs text-right">
                    <div className="flex items-center justify-end mb-1">
                        <Wind className="w-3 h-3 mr-1.5" />
                        {weather.windSpeed} m/s
                    </div>
                    <div>Luftfuktighet: {weather.humidity}%</div>
                </div>
            </div>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { Clock, Globe } from 'lucide-react';
import { useDashboardPreferences } from '../../../hooks/useDashboardPreferences';

export default function WorldClockWidget() {
    const { settings } = useDashboardPreferences();
    const [time, setTime] = useState(new Date());

    // Default to local if none set
    const timezones = settings?.clock_timezones && settings.clock_timezones.length > 0
        ? settings.clock_timezones
        : [Intl.DateTimeFormat().resolvedOptions().timeZone];

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date, tz: string) => {
        try {
            return new Intl.DateTimeFormat('sv-SE', {
                hour: '2-digit',
                minute: '2-digit',
                second: undefined, // Optional: add seconds
                timeZone: tz
            }).format(date);
        } catch (e) {
            return '--:--';
        }
    };

    const getCityName = (tz: string) => {
        const parts = tz.split('/');
        return parts[parts.length - 1].replace('_', ' ');
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-4 text-xs font-semibold uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Världsklocka</span>
            </div>

            <div className="space-y-4">
                {timezones.map((tz) => (
                    <div key={tz} className="flex justify-between items-end border-b border-gray-100 dark:border-gray-700 last:border-0 pb-2 last:pb-0">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5 flex items-center">
                                <Globe className="w-3 h-3 mr-1 opacity-50" />
                                {getCityName(tz)}
                            </p>
                        </div>
                        <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white leading-none">
                            {formatTime(time, tz)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

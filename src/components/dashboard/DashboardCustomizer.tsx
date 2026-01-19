import React, { useState } from 'react';
import { X, RotateCcw, LayoutDashboard, Target, Cloud, Clock, Plus, Trash2 } from 'lucide-react';
import { useDashboardPreferences } from '../../hooks/useDashboardPreferences';
import { ALL_WIDGETS, DashboardWidgetId } from '../../types/dashboard';

interface DashboardCustomizerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DashboardCustomizer({ isOpen, onClose }: DashboardCustomizerProps) {
    const { settings, updateSettings, toggleWidget, role } = useDashboardPreferences();
    const [newTimezone, setNewTimezone] = useState('');
    const [weatherCityTemp, setWeatherCityTemp] = useState('');

    // Initial load of temp state
    React.useEffect(() => {
        if (settings?.weather_city) setWeatherCityTemp(settings.weather_city);
    }, [settings?.weather_city]);

    if (!isOpen || !settings) return null;

    const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) updateSettings({ sales_goal_target: val });
    };

    const handleReset = () => {
        if (confirm('Återställ till standardvy?')) {
            window.location.reload();
        }
    };

    const handleWeatherCitySubmit = async () => {
        if (!weatherCityTemp) return;
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${weatherCityTemp}&count=1&language=bg&format=json`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const place = data.results[0];
                updateSettings({
                    weather_city: place.name,
                    weather_lat: place.latitude,
                    weather_lon: place.longitude
                });
            }
        } catch (e) {
            console.error("Geocoding failed", e);
        }
    };

    const addTimezone = () => {
        if (newTimezone && !settings.clock_timezones?.includes(newTimezone)) {
            // Validate timezone?
            try {
                Intl.DateTimeFormat(undefined, { timeZone: newTimezone });
                const current = settings.clock_timezones || [];
                updateSettings({ clock_timezones: [...current, newTimezone] });
                setNewTimezone('');
            } catch (e) {
                alert("Ogiltig tidszon. Använd formatet 'Region/Stad', t.ex 'Europe/London'.");
            }
        }
    };

    const removeTimezone = (tz: string) => {
        const current = settings.clock_timezones || [];
        updateSettings({ clock_timezones: current.filter(t => t !== tz) });
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />
            <div className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                            <LayoutDashboard className="w-5 h-5 mr-2 text-primary-600" />
                            Anpassa Vy
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Sales Goal */}
                        {(role === 'admin' || role === 'sales') && (
                            <section>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center">
                                    <Target className="w-4 h-4 mr-2" /> Månadsmål
                                </h3>
                                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        Säljmål (SEK)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.sales_goal_target}
                                        onChange={handleGoalChange}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </section>
                        )}

                        {/* Weather Settings */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center">
                                <Cloud className="w-4 h-4 mr-2" /> Väder & Plats
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl space-y-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Stad (Auto-sökning)
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        value={weatherCityTemp}
                                        onChange={(e) => setWeatherCityTemp(e.target.value)}
                                        onBlur={handleWeatherCitySubmit}
                                        placeholder="T.ex. Stockholm"
                                        className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Clock Settings */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center">
                                <Clock className="w-4 h-4 mr-2" /> Tidszoner
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl space-y-3">
                                <div className="flex space-x-2">
                                    <input
                                        value={newTimezone}
                                        onChange={(e) => setNewTimezone(e.target.value)}
                                        placeholder="Region/Stad"
                                        className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
                                    />
                                    <button onClick={addTimezone} className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {settings.clock_timezones?.map(tz => (
                                        <div key={tz} className="flex justify-between items-center text-sm bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-600">
                                            <span>{tz}</span>
                                            <button onClick={() => removeTimezone(tz)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Widgets Toggle */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                                Widgets
                            </h3>
                            <div className="space-y-3">
                                {ALL_WIDGETS.map((widget) => {
                                    if (widget.roles && role && !widget.roles.includes(role)) return null;

                                    const isVisible = settings.visible_widgets.includes(widget.id);

                                    return (
                                        <label key={widget.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{widget.label}</span>
                                            <div className={`relative w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full transition-colors duration-200 focus-within:ring-2 focus-within:ring-primary-500 ${isVisible ? 'bg-primary-600 dark:bg-primary-500' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={isVisible}
                                                    onChange={() => toggleWidget(widget.id)}
                                                />
                                                <span
                                                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 mt-1 ml-1 ${isVisible ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <button
                            onClick={handleReset}
                            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Återställ till standard
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

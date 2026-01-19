import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Navigation,
  Package,
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getWorkerWeeklyOrders,
  getActiveTimeLog,
  startTimeTracking,
  stopTimeTracking,
  getCurrentLocation,
  getMockWeatherData,
  type TimeLogWithRelations
} from '../lib/timeLogs';
import { formatTime } from '../lib/database';

import { useToast } from '../hooks/useToast';

function WorkerSchedule() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekStart());
  const [weeklyOrders, setWeeklyOrders] = useState<any[]>([]);
  const [activeTimeLog, setActiveTimeLog] = useState<TimeLogWithRelations | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week'); // Add this line
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Add this line
  const getMonthGrid = () => {
    const date = new Date(currentMonth);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday is 0

    const grid = [];
    // Add blank days for the previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }
    // Add days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push(new Date(year, month, i));
    }
    return grid;
  };

  function getCurrentWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (user) {
      loadScheduleData();
    }
  }, [user, currentWeek]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) return;

      const activeLogResult = await getActiveTimeLog(user.id);
      if (activeLogResult.error) throw new Error(activeLogResult.error.message);
      setActiveTimeLog(activeLogResult.data);

      if (viewMode === 'week') {
        const ordersResult = await getWorkerWeeklyOrders(user.id, currentWeek);
        if (ordersResult.error) throw new Error(ordersResult.error.message);
        setWeeklyOrders(ordersResult.data || []);
      } else {
        const ordersResult = await getWorkerMonthlyOrders(user.id, currentMonth);
        if (ordersResult.error) throw new Error(ordersResult.error.message);
        setWeeklyOrders(ordersResult.data || []); // We reuse the same state for all events
      }
    } catch (err: any) {
      console.error('Error loading schedule data:', err);
      setError('Ett oväntat fel inträffade vid laddning av schema.');
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      const current = new Date(currentWeek);
      const newDate = new Date(current);
      newDate.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
      setCurrentWeek(newDate.toISOString().split('T')[0]);
    } else {
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
      setCurrentMonth(newMonth);
    }
  };

  const navigateToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setCurrentWeek(getCurrentWeekStart());
    setCurrentMonth(new Date());
  };

  const handleStartTracking = async (orderId: string, workType?: string) => {
    try {
      const location = await getCurrentLocation();
      const weatherData = await getMockWeatherData(location?.lat, location?.lng);

      const result = await startTimeTracking(
        orderId,
        user!.id,
        workType,
        location,
        `${weatherData.temperature}°C, ${weatherData.condition}`
      );

      if (result.error) {
        showError('Kunde inte starta tidtagning', result.error.message);
        return;
      }

      setActiveTimeLog(result.data as TimeLogWithRelations);
      success('Tidtagning startad!');
    } catch (err) {
      console.error('Error starting time tracking:', err);
      showError('Ett fel inträffade vid start av tidtagning');
    }
  };

  const handleStopTracking = async () => {
    if (!activeTimeLog) return;

    try {
      const result = await stopTimeTracking(activeTimeLog.id);

      if (result.error) {
        showError('Kunde inte stoppa tidtagning', result.error.message);
        return;
      }

      setActiveTimeLog(null);
      success('Tidtagning stoppad!');
    } catch (err) {
      console.error('Error stopping time tracking:', err);
      showError('Ett fel inträffade vid stopp av tidtagning');
    }
  };

  const getWeekDays = () => {
    const start = new Date(currentWeek);
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return weeklyOrders.filter(event =>
      event.start_time && event.start_time.split('T')[0] === dateStr
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getWeekDateRange = () => {
    const start = new Date(currentWeek);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return `${start.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const isCurrentWeek = () => {
    return currentWeek === getCurrentWeekStart();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Laddar schema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-7 h-7 mr-3 text-blue-600" />
              Mitt Schema
            </h1>
            <p className="text-gray-600 mt-1">
              {viewMode === 'week'
                ? `Vecka ${getWeekDateRange()}`
                : currentMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="p-1 bg-gray-100 rounded-lg flex">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            >
              Vecka
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            >
              Månad
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigateToToday()}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Idag
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Active Time Tracking Banner */}
      {activeTimeLog && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Play className="w-5 h-5 mr-2" />
              <div>
                <p className="font-medium">Tidtagning pågår</p>
                <p className="text-green-100 text-sm">{activeTimeLog.order?.title}</p>
              </div>
            </div>
            <button
              onClick={handleStopTracking}
              className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center"
            >
              <Square className="w-4 h-4 mr-2" />
              Stoppa
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Calendar View */}
      {viewMode === 'week' ? (
        // --- WEEKLY VIEW ---
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Veckovy</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {getWeekDays().map((day) => {
                const dayEvents = getEventsForDay(day);
                const isSelectedDay = day.toISOString().split('T')[0] === selectedDate;
                const isTodayDay = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`border rounded-lg p-3 min-h-[120px] cursor-pointer transition-all ${isSelectedDay ? 'border-blue-500 bg-blue-50' :
                        isTodayDay ? 'border-green-500 bg-green-50' :
                          'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setSelectedDate(day.toISOString().split('T')[0])}
                  >
                    <div className="text-center mb-3">
                      <div className={`text-sm font-medium ${isTodayDay ? 'text-green-700' : isSelectedDay ? 'text-blue-700' : 'text-gray-700'}`}>
                        {day.toLocaleDateString('sv-SE', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-bold ${isTodayDay ? 'text-green-900' : isSelectedDay ? 'text-blue-900' : 'text-gray-900'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dayEvents.map((event) => {
                        const isPast = event.end_time && new Date(event.end_time) < new Date();
                        const isCurrent = event.start_time && event.end_time && new Date(event.start_time) <= new Date() && new Date() <= new Date(event.end_time);
                        return (
                          <div
                            key={event.id}
                            className={`p-2 rounded text-xs ${isCurrent ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                isPast ? 'bg-gray-100 text-gray-600' :
                                  'bg-white border border-gray-200'
                              }`}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="text-xs opacity-75">{formatTime(event.start_time)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // --- MONTHLY VIEW ---
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="grid grid-cols-7 text-center font-semibold text-gray-600 border-b">
            {['Mån', 'Tis', 'Ons', 'Tors', 'Fre', 'Lör', 'Sön'].map(day => (
              <div key={day} className="py-3 border-r last:border-r-0">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-flow-row-dense">
            {getMonthGrid().map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="border-t border-r border-gray-200"></div>;
              const dayEvents = getEventsForDay(day);
              const isTodayDay = isToday(day);
              const isSelectedDay = day.toISOString().split('T')[0] === selectedDate;
              return (
                <div
                  key={day.toISOString()}
                  className={`relative p-2 h-36 border-t border-r border-gray-200 cursor-pointer overflow-y-auto transition-colors ${isTodayDay ? 'bg-green-50' : ''
                    } ${isSelectedDay ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedDate(day.toISOString().split('T')[0])}
                >
                  <span className={`text-sm font-semibold ${isTodayDay ? 'text-green-700' : 'text-gray-800'}`}>{day.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map(event => ( // Show max 3 events
                      <div key={event.id} className="bg-blue-100 text-blue-800 text-xs p-1 rounded truncate" title={event.title}>
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">+ {dayEvents.length - 3} mer</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Day Details */}
      {selectedDate && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {new Date(selectedDate).toLocaleDateString('sv-SE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </h2>
          </div>

          <div className="p-6">
            {getEventsForDay(new Date(selectedDate)).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Inga uppdrag denna dag</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getEventsForDay(new Date(selectedDate)).map((event) => {
                  const isPast = event.end_time && new Date(event.end_time) < new Date();
                  const isCurrent = event.start_time && event.end_time &&
                    new Date(event.start_time) <= new Date() && new Date() <= new Date(event.end_time);
                  const isActiveTracking = activeTimeLog?.order_id === event.related_order_id;

                  return (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                            {isCurrent && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                Pågår nu
                              </span>
                            )}
                            {isPast && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                            {isActiveTracking && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                Tidtagning aktiv
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="space-y-2">
                              <p className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                {formatTime(event.start_time)} - {formatTime(event.end_time)}
                              </p>
                              <p className="flex items-center">
                                <User className="w-4 h-4 mr-2" />
                                {event.related_order?.customer?.name}
                              </p>
                              {event.related_order?.customer?.phone_number && (
                                <p className="flex items-center">
                                  <Phone className="w-4 h-4 mr-2" />
                                  {event.related_order.customer.phone_number}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              {event.related_order?.customer?.address && (
                                <p className="flex items-start">
                                  <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                                  <span>
                                    {event.related_order.customer.address}
                                    {event.related_order.customer.city &&
                                      `, ${event.related_order.customer.city}`
                                    }
                                  </span>
                                </p>
                              )}
                              {event.description && (
                                <p className="flex items-start">
                                  <Package className="w-4 h-4 mr-2 mt-0.5" />
                                  <span>{event.description}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          {!isPast && (
                            <>
                              {isActiveTracking ? (
                                <button
                                  onClick={handleStopTracking}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center"
                                >
                                  <Square className="w-4 h-4 mr-2" />
                                  Stoppa
                                </button>
                              ) : !activeTimeLog ? (
                                <button
                                  onClick={() => handleStartTracking(event.related_order_id, event.title)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Starta tidtagning
                                </button>
                              ) : (
                                <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm text-center">
                                  Annan tidtagning pågår
                                </div>
                              )}
                            </>
                          )}

                          {event.related_order?.customer?.phone_number && (
                            <a
                              href={`tel:${event.related_order.customer.phone_number}`}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Ring kund
                            </a>
                          )}

                          {event.related_order?.customer?.address && (
                            <a
                              href={`https://maps.google.com/maps?q=${encodeURIComponent(event.related_order.customer.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
                            >
                              <Navigation className="w-4 h-4 mr-2" />
                              Öppna karta
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerSchedule;
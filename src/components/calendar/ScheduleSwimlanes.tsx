/**
 * ScheduleSwimlanes Component
 * 
 * AddHub-style horizontal swimlane view showing workers as rows
 * and days as columns, with event cards positioned by time.
 */

import { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    MapPin,
    Clock,
    CheckCircle,
    AlertCircle,
    Plus
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarEvent, UserProfile, EventType, EVENT_TYPE_LABELS } from '../../types/database';

interface ScheduleSwimlanesProps {
    events: CalendarEvent[];
    workers: UserProfile[];
    onEventClick?: (event: CalendarEvent) => void;
    onCreateEvent?: (workerId: string, date: Date) => void;
}

// Event card colors based on type/status
const EVENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    meeting: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-cyan-400', text: 'text-cyan-700 dark:text-cyan-300' },
    task: { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400', text: 'text-amber-700 dark:text-amber-300' },
    reminder: { bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', text: 'text-purple-700 dark:text-purple-300' },
    order: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
    default: { bg: 'bg-zinc-100 dark:bg-zinc-800', border: 'border-zinc-300', text: 'text-zinc-700 dark:text-zinc-300' }
};

export function ScheduleSwimlanes({
    events,
    workers,
    onEventClick,
    onCreateEvent
}: ScheduleSwimlanesProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Get week dates
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [weekStart]);

    // Group events by worker and day
    const eventsByWorkerAndDay = useMemo(() => {
        const grouped: Record<string, Record<string, CalendarEvent[]>> = {};

        workers.forEach(worker => {
            grouped[worker.id] = {};
            weekDays.forEach(day => {
                grouped[worker.id][format(day, 'yyyy-MM-dd')] = [];
            });
        });

        events.forEach(event => {
            if (!event.assigned_to_user_id || !event.start_time) return;

            const eventDate = new Date(event.start_time);
            const dateKey = format(eventDate, 'yyyy-MM-dd');
            const workerId = event.assigned_to_user_id;

            if (grouped[workerId]?.[dateKey]) {
                grouped[workerId][dateKey].push(event);
            }
        });

        return grouped;
    }, [events, workers, weekDays]);

    const navigateWeek = (direction: 'prev' | 'next') => {
        setCurrentDate(d => direction === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const getEventColor = (event: CalendarEvent) => {
        return EVENT_COLORS[event.type] || EVENT_COLORS.default;
    };

    const formatEventTime = (event: CalendarEvent) => {
        if (!event.start_time) return '';
        const start = new Date(event.start_time);
        const end = event.end_time ? new Date(event.end_time) : null;

        if (end) {
            return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
        }
        return format(start, 'HH:mm');
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header with Week Navigation */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigateWeek('prev')}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => navigateWeek('next')}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white ml-2">
                        {format(weekStart, 'd MMM', { locale: sv })} - {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: sv })}
                    </span>
                </div>

                <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm font-medium text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
                >
                    Idag
                </button>
            </div>

            {/* Swimlane Grid */}
            <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                    {/* Day Headers */}
                    <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
                            Medarbetare
                        </div>
                        {weekDays.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                                <div
                                    key={i}
                                    className={`px-2 py-2 text-center border-l border-zinc-200 dark:border-zinc-700 ${isToday ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''
                                        }`}
                                >
                                    <p className={`text-xs font-medium ${isToday ? 'text-cyan-600' : 'text-zinc-500'}`}>
                                        {format(day, 'EEE', { locale: sv })}
                                    </p>
                                    <p className={`text-sm font-semibold ${isToday ? 'text-cyan-600' : 'text-zinc-900 dark:text-white'}`}>
                                        {format(day, 'd')}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Worker Rows */}
                    {workers.length === 0 ? (
                        <div className="px-4 py-12 text-center text-zinc-500">
                            Inga medarbetare att visa
                        </div>
                    ) : (
                        workers.map(worker => (
                            <div
                                key={worker.id}
                                className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                            >
                                {/* Worker Info */}
                                <div className="px-4 py-3 flex items-center gap-3 border-r border-zinc-200 dark:border-zinc-700">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                        {worker.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                            {worker.full_name}
                                        </p>
                                        {worker.role && (
                                            <p className="text-xs text-zinc-500 truncate">
                                                {worker.role}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Day Cells */}
                                {weekDays.map((day, i) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const dayEvents = eventsByWorkerAndDay[worker.id]?.[dateKey] || [];
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <div
                                            key={i}
                                            className={`relative min-h-[80px] p-1 border-l border-zinc-100 dark:border-zinc-800 ${isToday ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''
                                                }`}
                                        >
                                            {/* Events */}
                                            <div className="space-y-1">
                                                {dayEvents.slice(0, 3).map(event => {
                                                    const colors = getEventColor(event);
                                                    return (
                                                        <button
                                                            key={event.id}
                                                            onClick={() => onEventClick?.(event)}
                                                            className={`w-full text-left p-1.5 rounded-md border-l-2 ${colors.bg} ${colors.border} ${colors.text} hover:opacity-80 transition-opacity`}
                                                        >
                                                            <p className="text-xs font-medium truncate">{event.title}</p>
                                                            {event.start_time && (
                                                                <p className="text-[10px] opacity-75 flex items-center gap-1">
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                    {formatEventTime(event)}
                                                                </p>
                                                            )}
                                                            {event.location && (
                                                                <p className="text-[10px] opacity-75 flex items-center gap-1 truncate">
                                                                    <MapPin className="w-2.5 h-2.5" />
                                                                    {event.location}
                                                                </p>
                                                            )}
                                                        </button>
                                                    );
                                                })}

                                                {dayEvents.length > 3 && (
                                                    <p className="text-[10px] text-zinc-500 text-center">
                                                        +{dayEvents.length - 3} fler
                                                    </p>
                                                )}
                                            </div>

                                            {/* Add Event Button (hover) */}
                                            {onCreateEvent && dayEvents.length === 0 && (
                                                <button
                                                    onClick={() => onCreateEvent(worker.id, day)}
                                                    className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
                                                        <Plus className="w-4 h-4 text-cyan-600" />
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-4">
                <span className="text-xs text-zinc-500">Typ:</span>
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => {
                    const colors = EVENT_COLORS[key] || EVENT_COLORS.default;
                    return (
                        <div key={key} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-sm ${colors.bg} ${colors.border} border-l-2`} />
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ScheduleSwimlanes;

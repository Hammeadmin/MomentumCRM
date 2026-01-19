import React, { useEffect, useState } from 'react';
import { Calendar, CheckSquare, Video, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getUpcomingEvents, getTopTasks } from '../../../lib/dashboard-widgets';
import { CalendarEvent, SalesTask } from '../../../types/database';

export default function MyDayWidget() {
    const { user } = useAuth();
    const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
    const [tasks, setTasks] = useState<SalesTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!user) return;
            try {
                const [eventData, taskData] = await Promise.all([
                    getUpcomingEvents(user.id),
                    getTopTasks(user.id)
                ]);
                setNextEvent(eventData);
                setTasks(taskData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user]);

    if (loading) {
        return <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row h-full">
            {/* Left: Next Meeting */}
            <div className="md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-800">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Nästa Möte
                </h3>

                {nextEvent ? (
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                                {nextEvent.title}
                            </h4>
                            <div className="flex items-center text-gray-600 dark:text-gray-300 mb-4">
                                <Clock className="w-4 h-4 mr-2" />
                                {new Date(nextEvent.start_time!).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                                {' - '}
                                {new Date(nextEvent.end_time!).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                                {nextEvent.description || "Ingen beskrivning"}
                            </p>
                        </div>

                        {nextEvent.meeting_link && (
                            <a
                                href={nextEvent.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                <Video className="w-4 h-4 mr-2" />
                                Anslut till möte
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <Calendar className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">Inga kommande möten</p>
                    </div>
                )}
            </div>

            {/* Right: Top Tasks */}
            <div className="md:w-1/2 p-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Att göra
                </h3>

                <div className="space-y-3">
                    {tasks.length > 0 ? (
                        tasks.map(task => (
                            <div key={task.id} className="group flex items-start p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-500 rounded-md group-hover:border-primary-500 transition-colors cursor-pointer" />
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {task.title}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {task.due_date ? `Förfaller ${new Date(task.due_date).toLocaleDateString('sv-SE')}` : 'Inget datum'}
                                    </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <CheckSquare className="w-12 h-12 mb-2 opacity-20" />
                            <p className="text-sm">Inga uppgifter</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

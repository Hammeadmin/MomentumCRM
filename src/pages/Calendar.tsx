/**
 * Calendar Page
 * 
 * Displays calendar with toggle between standard calendar and team swimlane views.
 * Includes region filtering via RegionTabs.
 */

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Users, Plus, RefreshCw } from 'lucide-react';
import CalendarView from '../components/CalendarView';
import ScheduleSwimlanes from '../components/calendar/ScheduleSwimlanes';
import RegionTabs from '../components/calendar/RegionTabs';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CalendarEvent, UserProfile } from '../types/database';

type ViewMode = 'calendar' | 'swimlanes';

function Calendar() {
  const { organisationId } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('calendarViewMode');
    return (saved as ViewMode) || 'calendar';
  });
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [workers, setWorkers] = useState<UserProfile[]>([]);

  // Save view preference
  useEffect(() => {
    localStorage.setItem('calendarViewMode', viewMode);
  }, [viewMode]);

  // Fetch data for swimlanes view
  useEffect(() => {
    if (viewMode === 'swimlanes' && organisationId) {
      fetchSwimlanesData();
    }
  }, [viewMode, organisationId]);

  const fetchSwimlanesData = async () => {
    if (!organisationId) return;
    try {
      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select(`
          *,
          assigned_to:user_profiles!calendar_events_assigned_to_user_id_fkey(id, full_name, role)
        `)
        .eq('organisation_id', organisationId)
        .order('start_time', { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch workers
      const { data: workersData, error: workersError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organisation_id', organisationId)
        .in('role', ['worker', 'admin', 'sales'])
        .eq('is_active', true)
        .order('full_name');

      if (workersError) throw workersError;

      setEvents(eventsData || []);
      setWorkers(workersData || []);
    } catch (err) {
      console.error('Error fetching swimlanes data:', err);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event.id);
    // Open event detail modal
  };

  const handleCreateEvent = (workerId: string, date: Date) => {
    console.log('Create event for worker:', workerId, 'on', date);
    // Open event creation modal
  };

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
  };

  // Filter events by region if selected (not 'all')
  const filteredEvents = selectedRegion && selectedRegion !== 'all'
    ? events.filter(e => e.location?.toLowerCase().includes(selectedRegion.toLowerCase()))
    : events;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Schema</h1>

        <div className="flex items-center gap-2">
          {/* Region Filter */}
          <RegionTabs
            selectedRegion={selectedRegion}
            onRegionChange={handleRegionChange}
          />

          {/* View Toggle */}
          <div className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 ml-4">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'calendar'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Kalender
            </button>
            <button
              onClick={() => setViewMode('swimlanes')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'swimlanes'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
            >
              <Users className="w-4 h-4" />
              Team
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={fetchSwimlanesData}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Uppdatera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ny händelse
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'calendar' ? (
        <CalendarView />
      ) : (
        <ScheduleSwimlanes
          events={filteredEvents}
          workers={workers}
          onEventClick={handleEventClick}
          onCreateEvent={handleCreateEvent}
        />
      )}
    </div>
  );
}

export default Calendar;
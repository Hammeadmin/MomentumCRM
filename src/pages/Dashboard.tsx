import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { Settings, RefreshCw, Layout, Check } from 'lucide-react';

import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import { useDashboardData } from '../hooks/useDashboardData';
import { PageSkeleton } from '../components/ui';
import EmptyState from '../components/EmptyState';
import DashboardCustomizer from '../components/dashboard/DashboardCustomizer';
import DraggableWidgetWrapper from '../components/dashboard/DraggableWidgetWrapper';
import { DashboardWidgetId } from '../types/dashboard';

// Lazy load widgets for performance
const SalesGoalWidget = lazy(() => import('../components/dashboard/widgets/SalesGoalWidget'));
const LeaderboardWidget = lazy(() => import('../components/dashboard/widgets/LeaderboardWidget'));
const MyDayWidget = lazy(() => import('../components/dashboard/widgets/MyDayWidget'));
const ScratchpadWidget = lazy(() => import('../components/dashboard/widgets/ScratchpadWidget'));
const CashFlowWidget = lazy(() => import('../components/dashboard/widgets/CashFlowWidget'));
const SmartBriefingWidget = lazy(() => import('../components/dashboard/widgets/SmartBriefingWidget'));
const WeatherWidget = lazy(() => import('../components/dashboard/widgets/WeatherWidget'));
const WorldClockWidget = lazy(() => import('../components/dashboard/widgets/WorldClockWidget'));
const KPIGrid = lazy(() => import('../components/dashboard/KPIGrid'));
const SalesChart = lazy(() => import('../components/dashboard/SalesChart'));
const ActivityFeed = lazy(() => import('../components/dashboard/ActivityFeed'));
const TaskDashboardWidget = lazy(() => import('../components/TaskDashboardWidget'));
const IntranetDashboard = lazy(() => import('../components/IntranetDashboard'));
const JobStatusWidget = lazy(() => import('../components/dashboard/widgets/JobStatusWidget'));
const TaskDetailModal = lazy(() => import('../components/TaskDetailModal'));
const QuoteActivityWidget = lazy(() => import('../components/dashboard/QuoteActivityWidget'));

// Helper for column spans
const getWidgetColSpan = (id: DashboardWidgetId): string => {
  switch (id) {
    case 'morning_briefing': return 'col-span-full';
    case 'kpis': return 'col-span-full';
    case 'sales_chart': return 'lg:col-span-2';
    case 'my_day': return 'lg:col-span-2';
    default: return 'lg:col-span-1';
  }
};

const WidgetSkeleton = ({ className }: { className?: string }) => (
  <div className={`bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse h-full min-h-[200px] ${className}`} />
);

export default function Dashboard() {
  const { settings, updateSettings, toggleWidget, loading: settingsLoading } = useDashboardPreferences();

  // Local state for layout order to allow immediate drag feedback
  const [widgets, setWidgets] = useState<DashboardWidgetId[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Sync widgets with settings
  useEffect(() => {
    if (settings?.visible_widgets) {
      // If layout_order exists and matches visible_widgets content, use it.
      // Otherwise fallback to visible_widgets (default sorted)
      const visible = new Set(settings.visible_widgets);
      const ordered = settings.layout_order?.filter(id => visible.has(id)) || [];
      const missing = settings.visible_widgets.filter(id => !ordered.includes(id));

      // Default order: Put top-priority widgets first
      const defaultPriority = ['morning_briefing', 'weather', 'world_clock'];
      const topWidgets = missing.filter(id => defaultPriority.includes(id));
      const otherWidgets = missing.filter(id => !defaultPriority.includes(id));

      setWidgets([...ordered, ...topWidgets, ...otherWidgets]);
    }
  }, [settings?.visible_widgets, settings?.layout_order]);

  // Optimized data fetching
  const {
    kpiData,
    salesData,
    leadStatusData,
    recentActivity,
    allTeamMembers,
    jobStatusData,
    loading: dataLoading,
    error,
    refresh
  } = useDashboardData({ enabledWidgets: widgets });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.indexOf(active.id as DashboardWidgetId);
        const newIndex = items.indexOf(over.id as DashboardWidgetId);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save to DB
        updateSettings({ layout_order: newOrder });
        return newOrder;
      });
    }
  };

  const renderWidget = (id: DashboardWidgetId) => {
    switch (id) {
      case 'morning_briefing': return <SmartBriefingWidget />;
      case 'weather': return <WeatherWidget />;
      case 'world_clock': return <WorldClockWidget />;
      case 'sales_goal': return <SalesGoalWidget currentSales={kpiData?.totalSales || 0} />;
      case 'leaderboard': return <LeaderboardWidget />;
      case 'my_day': return <MyDayWidget />;
      case 'scratchpad': return <ScratchpadWidget />;
      case 'cash_flow': return <CashFlowWidget />;
      case 'kpis': return <KPIGrid data={kpiData} />;
      case 'sales_chart': return <SalesChart salesData={salesData} leadStatusData={leadStatusData} />;
      case 'activity_feed': return <ActivityFeed activities={recentActivity} onActivityClick={() => { }} />;
      case 'tasks': return <TaskDashboardWidget onTaskClick={setSelectedTask} />;
      case 'intranet': return <IntranetDashboard />;
      case 'job_status': return <JobStatusWidget data={jobStatusData} />;
      case 'quote_activity': return <QuoteActivityWidget />;
      case 'lead_distribution': return null; // Included in SalesChart
      default: return null;
    }
  };

  if (settingsLoading) return <PageSkeleton type="dashboard" />;

  if (error && !dataLoading) {
    return (
      <EmptyState
        title="Kunde inte ladda dashboard"
        description="Ett fel uppstod vid hämtning av data."
        actionText="Försök igen"
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          Overview
          {editMode && <span className="ml-3 text-sm font-normal text-primary-600 bg-primary-50 px-2 py-1 rounded-full">Redigeringsläge</span>}
        </h1>

        <div className="flex items-center space-x-3">
          {/* Edit Mode Toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${editMode
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}
          >
            {editMode ? <Check className="w-4 h-4 mr-2" /> : <Layout className="w-4 h-4 mr-2" />}
            {editMode ? 'Klar' : 'Redigera Vy'}
          </button>

          <button
            onClick={refresh}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="Uppdatera data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all"
          >
            <Settings className="w-4 h-4 mr-2" />
            Anpassa
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-flow-dense gap-6">
            {widgets
              .filter((id) => renderWidget(id) !== null) // Filter out widgets that return null
              .map((id) => (
                <DraggableWidgetWrapper
                  key={id}
                  id={id}
                  editMode={editMode}
                  onRemove={(removedId) => toggleWidget(removedId as DashboardWidgetId)}
                  className={editMode ? 'lg:col-span-1' : getWidgetColSpan(id)}
                >
                  <Suspense fallback={<WidgetSkeleton />}>
                    {renderWidget(id)}
                  </Suspense>
                </DraggableWidgetWrapper>
              ))}
          </div>
        </SortableContext>
      </DndContext>

      <DashboardCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
      />

      <Suspense fallback={null}>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            members={allTeamMembers}
            onClose={() => setSelectedTask(null)}
            onUpdate={refresh}
          />
        )}
      </Suspense>
    </div>
  );
}
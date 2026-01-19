import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    DashboardSettings,
    DashboardWidgetId,
    DEFAULT_WIDGETS_ADMIN,
    DEFAULT_WIDGETS_SALES,
    DEFAULT_WIDGETS_WORKER
} from '../types/dashboard';

const DEBOUNCE_DELAY = 1000;

const DEFAULT_SETTINGS: DashboardSettings = {
    visible_widgets: [], // Set dynamically based on role
    sales_goal_target: 100000,
    scratchpad_content: '',
    layout_order: [],
    weather_city: 'Stockholm',
    weather_lat: 59.3293,
    weather_lon: 18.0686,
    clock_timezones: ['Europe/Stockholm', 'America/New_York']
};

export function useDashboardPreferences() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<DashboardSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Determine default widgets based on role
    const getDefaultWidgets = useCallback((role: string | undefined): DashboardWidgetId[] => {
        switch (role) {
            case 'admin':
                return DEFAULT_WIDGETS_ADMIN;
            case 'sales':
                return DEFAULT_WIDGETS_SALES;
            case 'worker':
                return DEFAULT_WIDGETS_WORKER;
            case 'finance':
                return ['cash_flow', 'kpis', 'job_status']; // Fallback for finance
            default:
                return DEFAULT_WIDGETS_WORKER;
        }
    }, []);

    // Fetch settings from DB
    useEffect(() => {
        if (authLoading) return;
        if (!user || !userProfile) {
            setLoading(false);
            return;
        }

        async function fetchSettings() {
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('dashboard_settings')
                    .eq('id', user!.id) // Non-null assertion safe due to check above
                    .single();

                if (error) throw error;

                if (data?.dashboard_settings) {
                    // Merge with default to ensure all fields exist (in case of schema updates)
                    setSettings({ ...DEFAULT_SETTINGS, ...data.dashboard_settings });
                } else {
                    // First time initialized, use defaults based on role
                    const roleDefaults = getDefaultWidgets(userProfile!.role);
                    const initialSettings: DashboardSettings = {
                        ...DEFAULT_SETTINGS,
                        visible_widgets: roleDefaults
                    };
                    setSettings(initialSettings);
                    // Don't auto-save defaults to DB immediately to avoid unnecessary writes, 
                    // wait for first user interaction. Or could save now. 
                    // Let's not save yet.
                }
            } catch (err) {
                console.error('Error fetching dashboard settings:', err);
                // Fallback
                setSettings({
                    ...DEFAULT_SETTINGS,
                    visible_widgets: getDefaultWidgets(userProfile!.role)
                });
            } finally {
                setLoading(false);
            }
        }

        fetchSettings();
    }, [user, userProfile, authLoading, getDefaultWidgets]);

    // Persist to DB with debounce
    const persistSettings = useCallback((newSettings: DashboardSettings) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            if (!user) return;
            try {
                const { error } = await supabase
                    .from('user_profiles')
                    .update({ dashboard_settings: newSettings })
                    .eq('id', user.id);

                if (error) throw error;
            } catch (err) {
                console.error('Error saving dashboard settings:', err);
            }
        }, DEBOUNCE_DELAY);
    }, [user]);

    // Updates specific fields
    const updateSettings = useCallback((updates: Partial<DashboardSettings>) => {
        setSettings((prev) => {
            if (!prev) return null;
            const newSettings = { ...prev, ...updates };
            persistSettings(newSettings);
            return newSettings;
        });
    }, [persistSettings]);

    const toggleWidget = useCallback((widgetId: DashboardWidgetId) => {
        setSettings((prev) => {
            if (!prev) return null;
            const isVisible = prev.visible_widgets.includes(widgetId);
            const newWidgets = isVisible
                ? prev.visible_widgets.filter((w) => w !== widgetId)
                : [...prev.visible_widgets, widgetId];

            const newSettings = { ...prev, visible_widgets: newWidgets };
            persistSettings(newSettings);
            return newSettings;
        });
    }, [persistSettings]);

    return {
        settings,
        loading,
        updateSettings,
        toggleWidget,
        role: userProfile?.role
    };
}

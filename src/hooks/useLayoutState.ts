/**
 * Layout State Management Hook
 * Extracted from Layout.tsx for separation of concerns
 */
import { useState, useEffect, useCallback } from 'react';
import useKeyboardShortcuts from './useKeyboardShortcuts';

export interface ModalState {
    search: boolean;
    notifications: boolean;
    guide: boolean;
    shortcuts: boolean;
    faq: boolean;
    chat: boolean;
}

export interface UseLayoutStateReturn {
    sidebar: {
        collapsed: boolean;
        toggle: () => void;
    };
    theme: {
        current: 'light' | 'dark';
        toggle: () => void;
    };
    modals: ModalState;
    actions: {
        openSearch: () => void;
        closeSearch: () => void;
        openNotifications: () => void;
        closeNotifications: () => void;
        toggleNotifications: () => void;
        openGuide: () => void;
        closeGuide: () => void;
        openShortcuts: () => void;
        closeShortcuts: () => void;
        openFAQ: () => void;
        closeFAQ: () => void;
        openChat: () => void;
        closeChat: () => void;
        toggleChat: () => void;
        closeAll: () => void;
    };
}

export function useLayoutState(): UseLayoutStateReturn {
    // Sidebar State
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Theme State
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Modal States
    const [showSearch, setShowSearch] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showFAQ, setShowFAQ] = useState(false);
    const [showChat, setShowChat] = useState(false);

    // Load saved sidebar state
    useEffect(() => {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState) {
            setSidebarCollapsed(JSON.parse(savedState));
        }
    }, []);

    // Save sidebar state
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // Load saved theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }, []);

    // Toggle theme
    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }, [theme]);

    // Toggle sidebar
    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed((prev: boolean) => !prev);
    }, []);

    // Close all modals
    const closeAll = useCallback(() => {
        setShowSearch(false);
        setShowNotifications(false);
        setShowGuide(false);
        setShowShortcuts(false);
        setShowFAQ(false);
        setShowChat(false);
    }, []);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onOpenSearch: () => setShowSearch(true),
        onOpenHelp: () => setShowShortcuts(true),
        onOpenGuide: () => setShowGuide(true),
        onEscape: closeAll
    });

    return {
        sidebar: {
            collapsed: sidebarCollapsed,
            toggle: toggleSidebar
        },
        theme: {
            current: theme,
            toggle: toggleTheme
        },
        modals: {
            search: showSearch,
            notifications: showNotifications,
            guide: showGuide,
            shortcuts: showShortcuts,
            faq: showFAQ,
            chat: showChat
        },
        actions: {
            openSearch: () => setShowSearch(true),
            closeSearch: () => setShowSearch(false),
            openNotifications: () => setShowNotifications(true),
            closeNotifications: () => setShowNotifications(false),
            toggleNotifications: () => setShowNotifications((prev: boolean) => !prev),
            openGuide: () => setShowGuide(true),
            closeGuide: () => setShowGuide(false),
            openShortcuts: () => setShowShortcuts(true),
            closeShortcuts: () => setShowShortcuts(false),
            openFAQ: () => setShowFAQ(true),
            closeFAQ: () => setShowFAQ(false),
            openChat: () => setShowChat(true),
            closeChat: () => setShowChat(false),
            toggleChat: () => setShowChat((prev: boolean) => !prev),
            closeAll
        }
    };
}

export default useLayoutState;

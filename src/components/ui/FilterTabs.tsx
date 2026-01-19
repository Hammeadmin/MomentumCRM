/**
 * FilterTabs Component
 * 
 * Reusable filter tabs for table views, matching AddHub's tabbed filter pattern.
 * Used above tables to filter by status (All | Active | Completed | etc.)
 */

import { useState } from 'react';

export interface FilterTab {
    key: string;
    label: string;
    count?: number;
    icon?: React.ReactNode;
}

interface FilterTabsProps {
    tabs: FilterTab[];
    activeTab: string;
    onTabChange: (tabKey: string) => void;
    variant?: 'pills' | 'underline' | 'buttons';
    size?: 'sm' | 'md';
    className?: string;
}

export function FilterTabs({
    tabs,
    activeTab,
    onTabChange,
    variant = 'pills',
    size = 'md',
    className = ''
}: FilterTabsProps) {
    const sizeClasses = {
        sm: 'text-xs px-2.5 py-1',
        md: 'text-sm px-3 py-1.5'
    };

    if (variant === 'underline') {
        return (
            <div className={`flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700 ${className}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={`${sizeClasses[size]} font-medium transition-colors relative pb-2 -mb-px ${activeTab === tab.key
                                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <span className="flex items-center gap-1.5">
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${activeTab === tab.key
                                        ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
        );
    }

    if (variant === 'buttons') {
        return (
            <div className={`inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 ${className}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={`${sizeClasses[size]} font-medium rounded-md transition-all ${activeTab === tab.key
                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <span className="flex items-center gap-1.5">
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`text-[10px] font-semibold ${activeTab === tab.key ? 'text-cyan-600' : 'text-zinc-400'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
        );
    }

    // Default: pills variant (AddHub style)
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`${sizeClasses[size]} font-medium rounded-lg transition-all ${activeTab === tab.key
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                >
                    <span className="flex items-center gap-1.5">
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${activeTab === tab.key
                                    ? 'bg-white/20 dark:bg-zinc-900/20'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </span>
                </button>
            ))}
        </div>
    );
}

/**
 * Hook for managing filter tab state with URL sync
 */
export function useFilterTabs(defaultTab: string, paramName: string = 'filter') {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        // Could add URL param sync here if needed
    };

    return { activeTab, setActiveTab: handleTabChange };
}

export default FilterTabs;

import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

type SkeletonType = 'dashboard' | 'table' | 'cards' | 'form' | 'detail' | 'list' | 'card' | 'kpi' | 'chart';

interface PageSkeletonProps {
    type?: SkeletonType;
    rows?: number;
    count?: number;
    columns?: number;
    className?: string;
}

// =============================================================================
// BASE SKELETON BOX (with dark mode support)
// =============================================================================

const SkeletonBox = ({ className = '' }: { className?: string }) => (
    <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`} />
);

// =============================================================================
// SPECIALIZED SKELETON COMPONENTS
// =============================================================================

/**
 * Skeleton for KPI cards (square shape with icon placeholder)
 */
export function SkeletonKPI() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mt-3"></div>
            </div>
            <div className="flex items-center justify-between mt-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
        </div>
    );
}

/**
 * Skeleton for charts (large rectangle with fake bar chart effect)
 */
export function SkeletonChart() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
            <div className="h-[350px] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-end justify-around p-4">
                {/* Fake bar chart effect */}
                <div className="w-8 bg-gray-300 dark:bg-gray-600 rounded-t" style={{ height: '60%' }}></div>
                <div className="w-8 bg-gray-300 dark:bg-gray-600 rounded-t" style={{ height: '80%' }}></div>
                <div className="w-8 bg-gray-300 dark:bg-gray-600 rounded-t" style={{ height: '45%' }}></div>
                <div className="w-8 bg-gray-300 dark:bg-gray-600 rounded-t" style={{ height: '70%' }}></div>
                <div className="w-8 bg-gray-300 dark:bg-gray-600 rounded-t" style={{ height: '55%' }}></div>
                <div className="w-8 bg-gray-300 dark:bg-gray-600 rounded-t" style={{ height: '90%' }}></div>
            </div>
        </div>
    );
}

/**
 * Skeleton for list items with avatars
 */
export function SkeletonList({ count = 4 }: { count?: number }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="px-6 py-4 animate-pulse" style={{ height: '60px' }}>
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Dashboard-specific skeleton layout matching actual component structure
 */
export function SkeletonDashboard() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
            </div>

            {/* KPI Grid - matches mobile carousel / desktop grid layout */}
            <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-4 gap-6 pb-2 md:pb-0">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="snap-center min-w-[85vw] md:min-w-0">
                        <SkeletonKPI />
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart (2 cols) */}
                <div className="lg:col-span-2">
                    <SkeletonChart />
                </div>

                {/* Activity Feed (1 col) */}
                <div className="lg:col-span-1">
                    <SkeletonList count={5} />
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN PAGESKELETON COMPONENT
// =============================================================================

function PageSkeleton({
    type = 'table',
    rows = 5,
    count = 1,
    columns = 4,
    className = ''
}: PageSkeletonProps) {

    // Dashboard type - full dashboard layout
    if (type === 'dashboard') {
        return (
            <div className={className}>
                <SkeletonDashboard />
            </div>
        );
    }

    // KPI type - single or multiple KPI cards
    if (type === 'kpi') {
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonKPI key={i} />
                ))}
            </div>
        );
    }

    // Chart type
    if (type === 'chart') {
        return (
            <div className={className}>
                <SkeletonChart />
            </div>
        );
    }

    // Cards type - grid of cards with dark mode
    if (type === 'cards') {
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <SkeletonBox className="h-5 w-32" />
                            <SkeletonBox className="h-6 w-16 rounded-full" />
                        </div>
                        <SkeletonBox className="h-4 w-full" />
                        <SkeletonBox className="h-4 w-3/4" />
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <SkeletonBox className="h-4 w-20" />
                            <SkeletonBox className="h-8 w-24 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Card type - single or multiple cards
    if (type === 'card') {
        return (
            <div className={`space-y-6 ${className}`}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Form type - with dark mode
    if (type === 'form') {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6 ${className}`}>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <SkeletonBox className="h-4 w-1/4" />
                        <SkeletonBox className="h-10 w-full rounded-lg" />
                    </div>
                ))}
                <div className="flex justify-end gap-3 pt-4">
                    <SkeletonBox className="h-10 w-24 rounded-lg" />
                    <SkeletonBox className="h-10 w-32 rounded-lg" />
                </div>
            </div>
        );
    }

    // Detail type - with dark mode
    if (type === 'detail') {
        return (
            <div className={`space-y-6 ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between animate-pulse">
                    <div className="space-y-2">
                        <SkeletonBox className="h-8 w-48" />
                        <SkeletonBox className="h-4 w-32" />
                    </div>
                    <div className="flex gap-3">
                        <SkeletonBox className="h-10 w-24 rounded-lg" />
                        <SkeletonBox className="h-10 w-24 rounded-lg" />
                    </div>
                </div>
                {/* Content cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex justify-between py-2 animate-pulse">
                                <SkeletonBox className="h-4 w-24" />
                                <SkeletonBox className="h-4 w-32" />
                            </div>
                        ))}
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4 animate-pulse">
                        <SkeletonBox className="h-5 w-24" />
                        <SkeletonBox className="h-24 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    // List type - with dark mode
    if (type === 'list') {
        return (
            <div className={className}>
                <SkeletonList count={rows} />
            </div>
        );
    }

    // Default: table type - with dark mode
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
            {/* Table header */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex gap-4 animate-pulse">
                {Array.from({ length: columns }).map((_, i) => (
                    <SkeletonBox key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Table rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="px-6 py-4 flex gap-4 animate-pulse">
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <SkeletonBox
                                key={colIndex}
                                className={`h-4 flex-1 ${colIndex === 0 ? 'max-w-[150px]' : ''}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export { PageSkeleton };
export default PageSkeleton;

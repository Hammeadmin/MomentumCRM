import React from 'react';

// --- Original Skeleton Components ---

interface SkeletonProps {
    /** Width of the skeleton, default is full width */
    width?: string;
    /** Height of the skeleton */
    height?: string;
    /** Whether to show as a rounded avatar/circle */
    rounded?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Skeleton loading placeholder with animated shimmer effect
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '1rem',
    rounded = false,
    className = ''
}) => {
    return (
        <div
            className={`bg-gray-200 animate-pulse ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
            style={{ width, height }}
            aria-hidden="true"
        />
    );
};

interface SkeletonCardProps {
    /** Number of text lines to show */
    lines?: number;
    /** Whether to show an avatar placeholder */
    showAvatar?: boolean;
    /** Whether to show an image placeholder */
    showImage?: boolean;
    /** Image height when showImage is true */
    imageHeight?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Skeleton card for loading states - mimics a typical card layout
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
    lines = 3,
    showAvatar = false,
    showImage = false,
    imageHeight = '200px',
    className = ''
}) => {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
            {showImage && (
                <div className="bg-gray-200 animate-pulse w-full" style={{ height: imageHeight }} />
            )}
            <div className="p-4 space-y-3">
                {showAvatar && (
                    <div className="flex items-center gap-3">
                        <Skeleton width="40px" height="40px" rounded />
                        <div className="flex-1 space-y-2">
                            <Skeleton height="14px" width="60%" />
                            <Skeleton height="12px" width="40%" />
                        </div>
                    </div>
                )}
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton
                        key={i}
                        height="12px"
                        width={i === lines - 1 ? '75%' : '100%'}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * Skeleton for KPI/stat cards
 */
export const SkeletonKPI: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                    <Skeleton height="12px" width="60%" />
                    <Skeleton height="28px" width="80%" />
                    <Skeleton height="10px" width="50%" />
                </div>
                <Skeleton width="40px" height="40px" rounded />
            </div>
        </div>
    );
};

/**
 * Skeleton for table rows
 */
export const SkeletonTableRow: React.FC<{ columns?: number; className?: string }> = ({
    columns = 5,
    className = ''
}) => {
    return (
        <tr className={`animate-pulse ${className}`}>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton height="14px" width={i === 0 ? '80%' : '60%'} />
                </td>
            ))}
        </tr>
    );
};

/**
 * Skeleton for list items
 */
export const SkeletonListItem: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`flex items-center gap-3 p-3 ${className}`}>
            <Skeleton width="32px" height="32px" rounded />
            <div className="flex-1 space-y-2">
                <Skeleton height="14px" width="70%" />
                <Skeleton height="10px" width="40%" />
            </div>
        </div>
    );
};


// --- New Kanban Specific Components ---

/**
 * A specialized skeleton loader component that mimics the structure of a KanbanCard.
 * (Header, Content, Footer with Badge/Avatar)
 */
export const KanbanSkeletonCard = () => {
    return (
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 animate-pulse h-[160px] flex flex-col">
            {/* Header: Title and Badge placeholder */}
            <div className="flex items-start justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-5 bg-gray-200 rounded-full w-16"></div>
            </div>

            {/* Content: Description lines */}
            <div className="space-y-2 mb-4 flex-1">
                <div className="h-3 bg-gray-100 rounded w-full"></div>
                <div className="h-3 bg-gray-100 rounded w-5/6"></div>
            </div>

            {/* Footer: Avatar and Price/Date */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
        </div>
    );
};

interface SkeletonColumnProps {
    count?: number;
}

/**
 * Renders a column of KanbanSkeletonCards
 */
export const SkeletonColumn = ({ count = 3 }: SkeletonColumnProps) => {
    return (
        <div className="flex flex-col gap-3">
            {Array.from({ length: count }).map((_, index) => (
                <KanbanSkeletonCard key={index} />
            ))}
        </div>
    );
};

export default SkeletonCard;

/**
 * VirtualTable Component
 * A reusable virtualized table for rendering large datasets efficiently
 * Uses @tanstack/react-virtual for row virtualization
 */

import { useRef, useMemo, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualTableColumn<T> {
    key: string;
    header: string;
    width?: string; // e.g., '200px', '25%', 'minmax(100px, 1fr)'
    render: (item: T, index: number) => ReactNode;
    headerClassName?: string;
    cellClassName?: string;
}

export interface VirtualTableProps<T> {
    data: T[];
    columns: VirtualTableColumn<T>[];
    rowHeight?: number;
    containerHeight?: number | string;
    onRowClick?: (item: T, index: number) => void;
    rowClassName?: (item: T, index: number) => string;
    emptyMessage?: string;
    stickyHeader?: boolean;
    className?: string;
    getRowKey: (item: T, index: number) => string;
}

/**
 * VirtualTable - Renders large lists efficiently using virtualization
 * Only renders visible rows + a small overscan buffer for smooth scrolling
 */
export function VirtualTable<T>({
    data,
    columns,
    rowHeight = 56,
    containerHeight = 600,
    onRowClick,
    rowClassName,
    emptyMessage = 'Inga resultat',
    stickyHeader = true,
    className = '',
    getRowKey,
}: VirtualTableProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    // Calculate grid column template from column widths
    const gridTemplateColumns = useMemo(() => {
        return columns.map(col => col.width || '1fr').join(' ');
    }, [columns]);

    const virtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 10, // Render 10 extra rows above/below viewport for smooth scrolling
    });

    const virtualRows = virtualizer.getVirtualItems();

    if (data.length === 0) {
        return (
            <div className={`flex items-center justify-center h-48 text-gray-500 dark:text-gray-400 ${className}`}>
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={`flex flex-col ${className}`}>
            {/* Header Row - Optionally Sticky */}
            <div
                className={`grid gap-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${stickyHeader ? 'sticky top-0 z-10' : ''
                    }`}
                style={{ gridTemplateColumns }}
            >
                {columns.map((col) => (
                    <div
                        key={col.key}
                        className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider ${col.headerClassName || ''
                            }`}
                    >
                        {col.header}
                    </div>
                ))}
            </div>

            {/* Virtualized Body */}
            <div
                ref={parentRef}
                className="overflow-auto"
                style={{ height: typeof containerHeight === 'number' ? `${containerHeight}px` : containerHeight }}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {virtualRows.map((virtualRow) => {
                        const item = data[virtualRow.index];
                        const rowKey = getRowKey(item, virtualRow.index);
                        const customRowClass = rowClassName ? rowClassName(item, virtualRow.index) : '';

                        return (
                            <div
                                key={rowKey}
                                className={`grid gap-0 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''
                                    } ${customRowClass}`}
                                style={{
                                    gridTemplateColumns,
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                onClick={() => onRowClick?.(item, virtualRow.index)}
                            >
                                {columns.map((col) => (
                                    <div
                                        key={`${rowKey}-${col.key}`}
                                        className={`px-4 py-3 flex items-center text-sm text-gray-900 dark:text-gray-100 ${col.cellClassName || ''
                                            }`}
                                    >
                                        {col.render(item, virtualRow.index)}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default VirtualTable;

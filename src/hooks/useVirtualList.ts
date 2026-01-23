/**
 * useVirtualList Hook
 * A flexible virtual list hook for rendering large datasets efficiently
 * Can be used with any list/table without requiring component replacement
 */

import { useRef, useCallback } from 'react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';

export interface UseVirtualListOptions {
    /** Total number of items in the list */
    count: number;
    /** Estimated height of each item in pixels */
    estimateSize?: number;
    /** Number of items to render outside the visible area */
    overscan?: number;
    /** Enable horizontal virtualization */
    horizontal?: boolean;
}

export interface UseVirtualListResult {
    /** Ref to attach to the scrollable container */
    parentRef: React.RefObject<HTMLDivElement>;
    /** Virtual items to render */
    virtualItems: VirtualItem[];
    /** Total height of all items (for the spacer element) */
    totalSize: number;
    /** Function to get item offset for positioning */
    getItemOffset: (index: number) => number;
    /** Check if list is scrolled */
    isScrolled: boolean;
    /** Scroll to a specific index */
    scrollToIndex: (index: number) => void;
    /** Measure an element after render */
    measureElement: (element: Element | null) => void;
}

/**
 * Hook for virtual list rendering
 * 
 * @example
 * ```tsx
 * const { parentRef, virtualItems, totalSize } = useVirtualList({ count: items.length });
 * 
 * return (
 *   <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
 *     <div style={{ height: totalSize, position: 'relative' }}>
 *       {virtualItems.map((virtualRow) => {
 *         const item = items[virtualRow.index];
 *         return (
 *           <div
 *             key={item.id}
 *             style={{
 *               position: 'absolute',
 *               top: virtualRow.start,
 *               height: virtualRow.size,
 *               width: '100%',
 *             }}
 *           >
 *             {item.name}
 *           </div>
 *         );
 *       })}
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useVirtualList({
    count,
    estimateSize = 48,
    overscan = 5,
    horizontal = false,
}: UseVirtualListOptions): UseVirtualListResult {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
        horizontal,
    });

    const virtualItems = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();

    const getItemOffset = useCallback((index: number) => {
        const item = virtualItems.find(v => v.index === index);
        return item?.start ?? 0;
    }, [virtualItems]);

    const scrollToIndex = useCallback((index: number) => {
        virtualizer.scrollToIndex(index, { align: 'start' });
    }, [virtualizer]);

    const isScrolled = (parentRef.current?.scrollTop ?? 0) > 0;

    return {
        parentRef,
        virtualItems,
        totalSize,
        getItemOffset,
        isScrolled,
        scrollToIndex,
        measureElement: virtualizer.measureElement,
    };
}

export default useVirtualList;

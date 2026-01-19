import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
    showItemCount?: boolean;
    showFirstLast?: boolean;
    maxVisiblePages?: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage = 20,
    onPageChange,
    showItemCount = true,
    showFirstLast = true,
    maxVisiblePages = 5,
    className = '',
    size = 'md'
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const sizeClasses = {
        sm: {
            button: 'px-2 py-1 text-xs',
            icon: 'w-3 h-3',
            text: 'text-xs'
        },
        md: {
            button: 'px-3 py-2 text-sm',
            icon: 'w-4 h-4',
            text: 'text-sm'
        },
        lg: {
            button: 'px-4 py-2.5 text-base',
            icon: 'w-5 h-5',
            text: 'text-base'
        }
    };

    const sizes = sizeClasses[size];

    // Calculate visible page numbers with smart ellipsis
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const halfVisible = Math.floor(maxVisiblePages / 2);

        let startPage = Math.max(1, currentPage - halfVisible);
        let endPage = Math.min(totalPages, currentPage + halfVisible);

        // Adjust if we're near the start or end
        if (currentPage <= halfVisible) {
            endPage = Math.min(totalPages, maxVisiblePages);
        } else if (currentPage > totalPages - halfVisible) {
            startPage = Math.max(1, totalPages - maxVisiblePages + 1);
        }

        // Add first page and ellipsis if needed
        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) pages.push('ellipsis');
        }

        // Add visible pages
        for (let i = startPage; i <= endPage; i++) {
            if (i !== 1 && i !== totalPages) {
                pages.push(i);
            } else if (i === 1 && startPage === 1) {
                pages.push(i);
            } else if (i === totalPages && endPage === totalPages) {
                pages.push(i);
            }
        }

        // Add last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pages.push('ellipsis');
            pages.push(totalPages);
        }

        return pages;
    };

    const pages = getPageNumbers();

    // Calculate item range
    const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

    const buttonBase = `inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed`;
    const buttonDefault = `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600`;
    const buttonActive = `bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/20`;

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
            {/* Item count */}
            {showItemCount && totalItems !== undefined && (
                <p className={`${sizes.text} text-gray-600 dark:text-gray-400`}>
                    Visar <span className="font-semibold text-gray-900 dark:text-white">{startItem}</span>
                    {' '}till{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">{endItem}</span>
                    {' '}av{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">{totalItems}</span> resultat
                </p>
            )}

            {/* Pagination controls */}
            <nav className="flex items-center gap-1" aria-label="Pagination">
                {/* First page */}
                {showFirstLast && (
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className={`${buttonBase} ${buttonDefault} ${sizes.button}`}
                        aria-label="Första sidan"
                    >
                        <ChevronsLeft className={sizes.icon} />
                    </button>
                )}

                {/* Previous page */}
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`${buttonBase} ${buttonDefault} ${sizes.button}`}
                    aria-label="Föregående sida"
                >
                    <ChevronLeft className={sizes.icon} />
                </button>

                {/* Page numbers */}
                <div className="hidden sm:flex items-center gap-1">
                    {pages.map((page, index) => {
                        if (page === 'ellipsis') {
                            return (
                                <span
                                    key={`ellipsis-${index}`}
                                    className={`${sizes.button} text-gray-400 dark:text-gray-500`}
                                >
                                    ...
                                </span>
                            );
                        }

                        const isActive = page === currentPage;
                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`${buttonBase} ${isActive ? buttonActive : buttonDefault} ${sizes.button} min-w-[2.5rem]`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile page indicator */}
                <span className={`sm:hidden ${sizes.text} text-gray-600 dark:text-gray-400 px-2`}>
                    <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span>
                    {' / '}
                    <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
                </span>

                {/* Next page */}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`${buttonBase} ${buttonDefault} ${sizes.button}`}
                    aria-label="Nästa sida"
                >
                    <ChevronRight className={sizes.icon} />
                </button>

                {/* Last page */}
                {showFirstLast && (
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`${buttonBase} ${buttonDefault} ${sizes.button}`}
                        aria-label="Sista sidan"
                    >
                        <ChevronsRight className={sizes.icon} />
                    </button>
                )}
            </nav>
        </div>
    );
}

export default Pagination;

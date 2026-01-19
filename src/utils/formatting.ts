/**
 * Formatting Utilities
 * Centralized formatting functions for currency, date, and other data types.
 * Swedish locale (sv-SE) is used throughout.
 */

// =============================================================================
// CURRENCY FORMATTING
// =============================================================================

/**
 * Format amount as Swedish Kronor (SEK)
 * Uses Swedish locale with proper currency formatting
 */
export const formatSEK = (amount: number): string => {
    return new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: 'SEK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format amount as SEK with decimals
 */
export const formatSEKWithDecimals = (amount: number): string => {
    return new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: 'SEK',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Format number with Swedish locale (thousands separator)
 */
export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('sv-SE').format(value);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals = 0): string => {
    return new Intl.NumberFormat('sv-SE', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100);
};

// =============================================================================
// DATE FORMATTING
// =============================================================================

/**
 * Format date in Swedish format (e.g., "22 december 2024")
 */
export const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(dateObj);
};

/**
 * Format date in short format (e.g., "22 dec 2024")
 */
export const formatDateShort = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(dateObj);
};

/**
 * Format date and time (e.g., "22 dec 2024 14:30")
 */
export const formatDateTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Stockholm',
    }).format(dateObj);
};

/**
 * Format time only (e.g., "14:30")
 */
export const formatTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Stockholm',
    }).format(dateObj);
};

/**
 * Format relative time in Swedish
 */
export const formatRelativeTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'just nu';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return `${Math.floor(diffInMinutes / 10080)}v`;
};

/**
 * Format ISO date string as YYYY-MM-DD
 */
export const formatISODate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
};

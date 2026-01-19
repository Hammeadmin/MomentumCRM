/**
 * Centralized Status Maps
 * Consolidates all status translations, colors, and activity helpers
 * Previously scattered across ActivityDetailModal, database.ts, and other components
 */

// =============================================================================
// STATUS LABELS - Swedish translations for all status types
// =============================================================================

export const StatusLabels: Record<string, string> = {
    // Lead statuses
    new: 'Ny',
    contacted: 'Kontaktad',
    qualified: 'Kvalificerad',
    won: 'Vunnen',
    lost: 'Förlorad',

    // Quote statuses
    draft: 'Utkast',
    sent: 'Skickad',
    accepted: 'Accepterad',
    declined: 'Avvisad',

    // Job statuses
    pending: 'Väntande',
    in_progress: 'Pågående',
    completed: 'Slutförd',
    invoiced: 'Fakturerad',

    // Invoice statuses
    paid: 'Betald',
    overdue: 'Förfallen',

    // Order statuses (Swedish values)
    öppen_order: 'Öppen Order',
    bokad_bekräftad: 'Bokad och Bekräftad',
    förfrågan: 'Förfrågan',
    offert_skapad: 'Offert Skapad',
    avbokad_kund: 'Avbokad av Kund',
    ej_slutfört: 'Ej Slutfört',
    redo_fakturera: 'Redo att Fakturera',
    fakturerad: 'Fakturerad',
};

/**
 * Get Swedish label for any status value
 */
export const getStatusLabel = (status: string): string => {
    return StatusLabels[status] || status;
};

// =============================================================================
// STATUS COLORS - Tailwind CSS classes for status badges
// =============================================================================

export type StatusColorCategory = 'success' | 'danger' | 'info' | 'warning' | 'neutral';

const StatusColorClasses: Record<StatusColorCategory, string> = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800',
};

const StatusToCategory: Record<string, StatusColorCategory> = {
    // Success statuses
    won: 'success',
    accepted: 'success',
    completed: 'success',
    paid: 'success',
    bokad_bekräftad: 'success',
    fakturerad: 'success',

    // Danger statuses
    lost: 'danger',
    declined: 'danger',
    overdue: 'danger',
    avbokad_kund: 'danger',

    // Info statuses
    in_progress: 'info',
    sent: 'info',
    öppen_order: 'info',
    contacted: 'info',

    // Warning statuses
    new: 'warning',
    pending: 'warning',
    draft: 'warning',
    förfrågan: 'warning',
    ej_slutfört: 'warning',

    // Neutral statuses
    qualified: 'neutral',
    invoiced: 'neutral',
    offert_skapad: 'neutral',
    redo_fakturera: 'neutral',
};

/**
 * Get Tailwind color classes for a status
 */
export const getStatusColorClass = (status: string): string => {
    const category = StatusToCategory[status] || 'neutral';
    return StatusColorClasses[category];
};

/**
 * Get just the category for a status (for custom styling)
 */
export const getStatusCategory = (status: string): StatusColorCategory => {
    return StatusToCategory[status] || 'neutral';
};

// =============================================================================
// ACTIVITY TYPE HELPERS
// =============================================================================

export const ActivityTypeLabels: Record<string, string> = {
    lead: 'Lead',
    quote: 'Offert',
    job: 'Jobb',
    invoice: 'Faktura',
    order: 'Order',
};

export const ActivityGradientColors: Record<string, string> = {
    lead: 'from-blue-500 to-blue-600',
    quote: 'from-purple-500 to-purple-600',
    job: 'from-orange-500 to-orange-600',
    invoice: 'from-green-500 to-green-600',
    order: 'from-indigo-500 to-indigo-600',
};

export const ActivityBgColors: Record<string, string> = {
    lead: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    quote: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    job: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    invoice: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    order: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
};

/**
 * Get Swedish label for activity type
 */
export const getActivityTypeLabel = (type: string): string => {
    return ActivityTypeLabels[type] || type;
};

/**
 * Get gradient color classes for activity type (for headers/cards)
 */
export const getActivityGradient = (type: string): string => {
    return ActivityGradientColors[type] || 'from-gray-500 to-gray-600';
};

/**
 * Get background color classes for activity type (for badges)
 */
export const getActivityBgColor = (type: string): string => {
    return ActivityBgColors[type] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
};

// =============================================================================
// ACTIVITY ROUTES
// =============================================================================

export const ActivityRoutes: Record<string, string> = {
    lead: '/leads',
    quote: '/offerter',
    job: '/jobb',
    invoice: '/fakturor',
    order: '/orderhantering',
};

/**
 * Get route path for activity type
 */
export const getActivityRoute = (type: string): string => {
    return ActivityRoutes[type] || '/';
};

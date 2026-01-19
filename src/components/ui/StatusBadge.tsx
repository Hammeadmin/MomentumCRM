/**
 * StatusBadge Component
 * 
 * AddHub-style status badges with consistent color scheme.
 * Used across Orders, Quotes, Invoices, and Leads.
 */

import React from 'react';

// AddHub-inspired color scheme
export const STATUS_COLORS = {
    // Order statuses
    lead: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Lead' },
    inquiry: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Förfrågan' },
    quote_sent: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Offert skickad' },
    booked: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Bokad' },
    in_progress: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', label: 'Pågående' },
    completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Klar' },
    invoiced: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', label: 'Fakturerad' },
    paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Betald' },
    cancelled: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', label: 'Avbruten' },

    // Quote statuses
    draft: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', label: 'Utkast' },
    sent: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Skickad' },
    opened: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Öppnad' },
    accepted: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Accepterad' },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Avvisad' },
    expired: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', label: 'Utgången' },

    // Invoice statuses
    pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Obetald' },
    overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Förfallen' },
    partially_paid: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Delvis betald' },

    // Generic
    active: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Aktiv' },
    inactive: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', label: 'Inaktiv' },
    new: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', label: 'Ny' },
    hot: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Het' },
} as const;

export type StatusType = keyof typeof STATUS_COLORS;

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    showDot?: boolean;
    customLabel?: string;
}

export function StatusBadge({
    status,
    size = 'md',
    className = '',
    showDot = false,
    customLabel
}: StatusBadgeProps) {
    // Normalize status to lowercase and replace spaces/hyphens with underscores
    const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, '_') as StatusType;
    const colors = STATUS_COLORS[normalizedStatus] || STATUS_COLORS.draft;

    const sizeClasses = {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-1',
        lg: 'text-sm px-3 py-1.5',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full ${colors.bg} ${colors.text} ${sizeClasses[size]} ${className}`}
        >
            {showDot && (
                <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
            )}
            {customLabel || colors.label}
        </span>
    );
}

// Hot lead indicator (opened 3+ times)
interface HotLeadBadgeProps {
    viewCount: number;
    className?: string;
}

export function HotLeadBadge({ viewCount, className = '' }: HotLeadBadgeProps) {
    if (viewCount < 3) return null;

    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse ${className}`}
            title={`Öppnad ${viewCount} gånger`}
        >
            🔥 {viewCount}x
        </span>
    );
}

// Priority indicator
interface PriorityBadgeProps {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    className?: string;
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
    const colors = {
        low: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500', label: 'Låg' },
        medium: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', label: 'Medium' },
        high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600', label: 'Hög' },
        urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600', label: 'Akut' },
    };

    const { bg, text, label } = colors[priority];

    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${bg} ${text} ${className}`}>
            {label}
        </span>
    );
}

export default StatusBadge;

import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
    children: React.ReactNode;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-700/20 dark:text-success-400 dark:border-success-700/30',
    warning: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-700/20 dark:text-warning-400 dark:border-warning-700/30',
    error: 'bg-error-50 text-error-700 border-error-200 dark:bg-error-700/20 dark:text-error-400 dark:border-error-700/30',
    info: 'bg-info-50 text-info-700 border-info-200 dark:bg-info-700/20 dark:text-info-400 dark:border-info-700/30',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
    primary: 'bg-primary-600 text-white border-primary-600 dark:bg-primary-500 dark:border-primary-500'
};

const dotColors: Record<BadgeVariant, string> = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-info-500',
    neutral: 'bg-gray-500',
    primary: 'bg-white'
};

const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
};

function Badge({
    variant = 'neutral',
    size = 'md',
    dot = false,
    children,
    className = ''
}: BadgeProps) {
    return (
        <span className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} mr-1.5`} />
            )}
            {children}
        </span>
    );
}

export default Badge;

import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

export type AnimationType = 'success' | 'error' | 'warning' | 'info';

interface SuccessAnimationProps {
    type?: AnimationType;
    title?: string;
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    show?: boolean;
    onComplete?: () => void;
    autoHide?: boolean;
    autoHideDelay?: number;
}

const typeConfig = {
    success: {
        Icon: Check,
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
        textColor: 'text-green-800 dark:text-green-200',
        rippleColor: 'bg-green-400/30',
    },
    error: {
        Icon: X,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        iconBg: 'bg-gradient-to-br from-red-400 to-rose-500',
        textColor: 'text-red-800 dark:text-red-200',
        rippleColor: 'bg-red-400/30',
    },
    warning: {
        Icon: AlertCircle,
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
        textColor: 'text-amber-800 dark:text-amber-200',
        rippleColor: 'bg-amber-400/30',
    },
    info: {
        Icon: Info,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
        textColor: 'text-blue-800 dark:text-blue-200',
        rippleColor: 'bg-blue-400/30',
    },
};

const sizeConfig = {
    sm: {
        container: 'p-4',
        iconWrapper: 'w-10 h-10',
        iconSize: 'w-5 h-5',
        title: 'text-sm',
        message: 'text-xs',
    },
    md: {
        container: 'p-6',
        iconWrapper: 'w-14 h-14',
        iconSize: 'w-7 h-7',
        title: 'text-base',
        message: 'text-sm',
    },
    lg: {
        container: 'p-8',
        iconWrapper: 'w-20 h-20',
        iconSize: 'w-10 h-10',
        title: 'text-lg',
        message: 'text-base',
    },
};

function SuccessAnimation({
    type = 'success',
    title,
    message,
    size = 'md',
    show = true,
    onComplete,
    autoHide = false,
    autoHideDelay = 3000,
}: SuccessAnimationProps) {
    const [isVisible, setIsVisible] = useState(show);
    const [showRipple, setShowRipple] = useState(true);

    const { Icon, bgColor, iconBg, textColor, rippleColor } = typeConfig[type];
    const { container, iconWrapper, iconSize, title: titleSize, message: messageSize } = sizeConfig[size];

    useEffect(() => {
        setIsVisible(show);
        if (show) {
            setShowRipple(true);
            // Reset ripple after animation
            const rippleTimer = setTimeout(() => setShowRipple(false), 800);
            return () => clearTimeout(rippleTimer);
        }
    }, [show]);

    useEffect(() => {
        if (isVisible && autoHide) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, autoHideDelay);
            return () => clearTimeout(timer);
        }
    }, [isVisible, autoHide, autoHideDelay, onComplete]);

    if (!isVisible) return null;

    return (
        <div className={`flex flex-col items-center justify-center ${container} ${bgColor} rounded-2xl`}>
            {/* Animated Icon Container */}
            <div className="relative">
                {/* Ripple Effect */}
                {showRipple && (
                    <div
                        className={`absolute inset-0 ${iconWrapper} rounded-full ${rippleColor} success-ripple`}
                    />
                )}

                {/* Icon Circle */}
                <div
                    className={`relative ${iconWrapper} rounded-full ${iconBg} flex items-center justify-center shadow-lg success-animation`}
                >
                    {type === 'success' ? (
                        <svg
                            className={`${iconSize} text-white`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                        >
                            <path
                                className="success-checkmark-path"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    ) : (
                        <Icon className={`${iconSize} text-white`} />
                    )}
                </div>
            </div>

            {/* Text Content */}
            {(title || message) && (
                <div className="mt-4 text-center">
                    {title && (
                        <h3 className={`font-semibold ${textColor} ${titleSize}`}>
                            {title}
                        </h3>
                    )}
                    {message && (
                        <p className={`mt-1 ${textColor} opacity-80 ${messageSize}`}>
                            {message}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// Standalone animated checkmark for inline use
export function AnimatedCheckmark({
    size = 24,
    className = ''
}: {
    size?: number;
    className?: string;
}) {
    return (
        <div
            className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 success-animation ${className}`}
            style={{ width: size, height: size }}
        >
            <svg
                className="text-white"
                style={{ width: size * 0.6, height: size * 0.6 }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
            >
                <path
                    className="success-checkmark-path"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                />
            </svg>
        </div>
    );
}

export default SuccessAnimation;

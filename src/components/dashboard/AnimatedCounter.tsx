import React, { useState, useEffect } from 'react';
import { AnimatedCounterProps } from '../../types/dashboard';

export default function AnimatedCounter({
    end,
    duration = 2000,
    prefix = '',
    suffix = '',
    formatter
}: AnimatedCounterProps) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentCount = Math.floor(easeOutQuart * end);

            setCount(currentCount);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [end, duration]);

    const displayValue = formatter ? formatter(count) : count;
    return <span>{prefix}{displayValue}{suffix}</span>;
}

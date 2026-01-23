import { useEffect, useState } from 'react';

interface AnimatedMomentumProps {
    className?: string;
    showArrow?: boolean;
    delay?: number;
}

export default function AnimatedMomentum({
    className = '',
    showArrow = true,
    delay = 0
}: AnimatedMomentumProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [arrowDrawn, setArrowDrawn] = useState(false);
    const letters = 'Momentum'.split('');
    const letterDelay = 70; // Staggered timing for weighted feel

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);
        return () => clearTimeout(timer);
    }, [delay]);

    // Trigger arrow floating after drawing completes
    useEffect(() => {
        if (isVisible && showArrow) {
            const arrowTimer = setTimeout(() => {
                setArrowDrawn(true);
            }, letters.length * letterDelay + 800); // After text + draw animation
            return () => clearTimeout(arrowTimer);
        }
    }, [isVisible, showArrow, letters.length]);

    return (
        <div className={`flex items-center ${className}`}>
            {/* Letter container with staggered fade-in-up */}
            <span className="inline-flex overflow-hidden">
                {letters.map((letter, index) => (
                    <span
                        key={index}
                        className={`inline-block ${isVisible ? 'animate-momentum-letter' : 'opacity-0 translate-y-6'}`}
                        style={{
                            animationDelay: isVisible ? `${index * letterDelay}ms` : undefined,
                            // Inherit text gradient properties
                            background: 'inherit',
                            backgroundClip: 'inherit',
                            WebkitBackgroundClip: 'inherit',
                            WebkitTextFillColor: 'inherit',
                            color: 'inherit',
                        }}
                    >
                        {letter}
                    </span>
                ))}
            </span>

            {/* SVG Trend Arrow with path drawing animation */}
            {showArrow && (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`ml-3 w-[0.7em] h-[0.7em] ${arrowDrawn ? 'animate-floating' : ''}`}
                    style={{
                        opacity: isVisible ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    {/* Trend arrow path - draws itself */}
                    <path
                        d="M22 7L13.5 15.5L8.5 10.5L2 17"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={isVisible ? 'svg-draw-path animate' : 'svg-draw-path'}
                        style={{
                            animationDelay: isVisible ? `${letters.length * letterDelay + 100}ms` : undefined,
                            strokeDasharray: 40,
                            strokeDashoffset: isVisible ? 0 : 40,
                            transition: `stroke-dashoffset 0.8s cubic-bezier(0.65, 0, 0.35, 1) ${letters.length * letterDelay + 100}ms`,
                        }}
                    />
                    {/* Arrow head */}
                    <path
                        d="M16 7H22V13"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            strokeDasharray: 15,
                            strokeDashoffset: isVisible ? 0 : 15,
                            transition: `stroke-dashoffset 0.5s cubic-bezier(0.65, 0, 0.35, 1) ${letters.length * letterDelay + 500}ms`,
                        }}
                    />
                </svg>
            )}
        </div>
    );
}

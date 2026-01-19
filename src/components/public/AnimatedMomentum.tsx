import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

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
    const letters = 'Momentum'.split('');
    const letterDelay = 60; // Faster stagger for fluid wave effect

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div className={`flex items-center ${className}`}>
            <span className="inline-flex overflow-hidden">
                {letters.map((letter, index) => (
                    <span
                        key={index}
                        className={`inline-block ${isVisible ? 'animate-momentum-letter' : 'opacity-0 translate-y-6'}`}
                        style={{
                            animationDelay: isVisible ? `${index * letterDelay}ms` : undefined,
                        }}
                    >
                        {letter}
                    </span>
                ))}
            </span>
            {showArrow && (
                <TrendingUp
                    className={`ml-3 w-[0.7em] h-[0.7em] ${isVisible ? 'animate-momentum-arrow' : 'opacity-0'}`}
                    style={{
                        animationDelay: isVisible ? `${letters.length * letterDelay + 100}ms` : undefined,
                    }}
                    strokeWidth={2.5}
                />
            )}
        </div>
    );
}

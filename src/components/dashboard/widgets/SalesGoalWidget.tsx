import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Award, Edit2, TrendingUp } from 'lucide-react';
import { formatSEK } from '../../../utils/formatting';
import { useDashboardPreferences } from '../../../hooks/useDashboardPreferences';

interface SalesGoalWidgetProps {
    currentSales: number;
}

export default function SalesGoalWidget({ currentSales }: SalesGoalWidgetProps) {
    const { settings, updateSettings } = useDashboardPreferences();
    const [isEditing, setIsEditing] = useState(false);
    const [tempTarget, setTempTarget] = useState('');

    const target = settings?.sales_goal_target || 100000;
    const progress = Math.min((currentSales / target) * 100, 100);
    const isCompleted = currentSales >= target;

    useEffect(() => {
        if (isCompleted && settings?.sales_goal_target && currentSales > 0) {
            // Trigger confetti only if we just hit it? 
            // Simplified: Trigger on mount if completed, or when progress updates.
            // To avoid spamming, we might check a "celebrated" flag, but for now simple trigger is fine.
            // Or just trigger when it BECOMES complete.
            // For this demo, let's trigger on mount if complete to "wow" the user.
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isCompleted]);

    const handleSave = () => {
        const val = parseInt(tempTarget.replace(/\D/g, ''), 10);
        if (!isNaN(val) && val > 0) {
            updateSettings({ sales_goal_target: val });
        }
        setIsEditing(false);
    };

    // SVG parameters
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
                    Månadsmål
                </h3>
                <button
                    onClick={() => {
                        setTempTarget(target.toString());
                        setIsEditing(!isEditing);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
            </div>

            {isEditing ? (
                <div className="flex items-center space-x-2 mb-4">
                    <input
                        type="number"
                        value={tempTarget}
                        onChange={(e) => setTempTarget(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        autoFocus
                    />
                    <button
                        onClick={handleSave}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        Spara
                    </button>
                </div>
            ) : null}

            <div className="flex flex-col items-center justify-center relative py-4">
                <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-gray-100 dark:text-gray-700"
                        />
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className={`text-primary-600 transition-all duration-1000 ease-out ${isCompleted ? 'text-green-500' : 'text-primary-600'
                                }`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {Math.round(progress)}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">av målet</span>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {formatSEK(currentSales)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Mål: {formatSEK(target)}
                    </p>
                </div>

                {isCompleted && (
                    <div className="absolute top-0 right-0 p-2 animate-bounce">
                        <Award className="w-8 h-8 text-yellow-500" />
                    </div>
                )}
            </div>
        </div>
    );
}

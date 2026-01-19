import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import content from '../../locales/publicContent';

const t = content.roiCalculator;

interface ROICalculatorModalProps {
    onClose: () => void;
}

export default function ROICalculatorModal({ onClose }: ROICalculatorModalProps) {
    const [employees, setEmployees] = useState(5);
    const [hoursPerWeek, setHoursPerWeek] = useState(8);
    const [hourlyCost, setHourlyCost] = useState(450);

    // Escape key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Calculate savings (60% efficiency gain assumption)
    const savingsMultiplier = 0.6;
    const weeklySavings = Math.round(employees * hoursPerWeek * savingsMultiplier * hourlyCost);
    const yearlySavings = weeklySavings * 52;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {t.headline}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Input: Employees */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t.inputs.employees}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={employees}
                            onChange={(e) => setEmployees(parseInt(e.target.value))}
                            className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                            <span>1</span>
                            <span className="font-semibold text-foreground">{employees}</span>
                            <span>50+</span>
                        </div>
                    </div>

                    {/* Input: Hours per week */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t.inputs.hoursPerWeek}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={hoursPerWeek}
                            onChange={(e) => setHoursPerWeek(parseInt(e.target.value))}
                            className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                            <span>1h</span>
                            <span className="font-semibold text-foreground">{hoursPerWeek}h</span>
                            <span>20h</span>
                        </div>
                    </div>

                    {/* Input: Hourly cost */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t.inputs.hourlyCost}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={hourlyCost}
                                onChange={(e) => setHourlyCost(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                SEK
                            </span>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="bg-primary/5 p-6 border-t border-border">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground">{t.results.weeklySavings}</p>
                            <p className="text-2xl font-bold text-foreground">
                                {weeklySavings.toLocaleString('sv-SE')} kr
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t.results.yearlySavings}</p>
                            <p className="text-2xl font-bold text-primary">
                                {yearlySavings.toLocaleString('sv-SE')} kr
                            </p>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                        {t.results.note}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border">
                    <button className="w-full py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors">
                        {t.cta}
                    </button>
                </div>
            </div>
        </div>
    );
}

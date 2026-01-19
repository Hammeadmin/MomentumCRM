import { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import content from '../../locales/publicContent';
import { sendDemoRequestEmail } from '../../lib/email';

const t = content.demoRequest;

interface DemoRequestModalProps {
    onClose: () => void;
}

export default function DemoRequestModal({ onClose }: DemoRequestModalProps) {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        website: '',
        employees: '',
        industry: '',
        currentSystem: '',
    });

    // Escape key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await sendDemoRequestEmail({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            website: formData.website || undefined,
            employees: formData.employees || undefined,
            industry: formData.industry || undefined,
            currentSystem: formData.currentSystem || undefined,
        });

        setLoading(false);

        if (result.success) {
            setSubmitted(true);
        } else {
            setError(result.error || 'Något gick fel. Försök igen.');
        }
    };

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-surface rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-border">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-success" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">
                        {t.confirmation.headline}
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                        {t.confirmation.description}
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-6 px-6 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                    >
                        Stäng
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-surface flex items-center justify-between px-6 py-4 border-b border-border z-10">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {t.headline}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {t.subheadline}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            {t.form.name} *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            {t.form.email} *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            {t.form.phone} *
                        </label>
                        <input
                            type="tel"
                            required
                            placeholder="+46 70 123 45 67"
                            value={formData.phone}
                            onChange={(e) => updateField('phone', e.target.value)}
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            {t.form.company} *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.company}
                            onChange={(e) => updateField('company', e.target.value)}
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>

                    {/* Grid: Employees + Industry */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                {t.form.employees}
                            </label>
                            <select
                                value={formData.employees}
                                onChange={(e) => updateField('employees', e.target.value)}
                                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                                <option value="">Välj...</option>
                                <option value="1-5">1-5</option>
                                <option value="6-20">6-20</option>
                                <option value="21-50">21-50</option>
                                <option value="51+">51+</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                {t.form.industry}
                            </label>
                            <select
                                value={formData.industry}
                                onChange={(e) => updateField('industry', e.target.value)}
                                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                                <option value="">Välj...</option>
                                {t.form.industryOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Current System */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            {t.form.currentSystem}
                        </label>
                        <select
                            value={formData.currentSystem}
                            onChange={(e) => updateField('currentSystem', e.target.value)}
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                            <option value="">Välj...</option>
                            {t.form.systemOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? 'Skickar...' : t.form.submit}
                    </button>

                    <p className="text-xs text-muted-foreground text-center">
                        Genom att skicka godkänner du vår{' '}
                        <a href="/integritetspolicy" className="underline hover:text-foreground">
                            integritetspolicy
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}

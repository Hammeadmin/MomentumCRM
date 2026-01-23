import { useState } from 'react';
import { Check, Mail, Phone, Clock, AlertCircle } from 'lucide-react';
import content from '../../locales/publicContent';
import { sendContactEmail } from '../../lib/email';

const t = content.contact;

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        employees: '',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await sendContactEmail({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
            company: formData.company || undefined,
            employees: formData.employees || undefined,
            message: formData.message,
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
            <div className="bg-slate-900 pt-24 min-h-screen">
                <div className="max-w-2xl mx-auto px-4 py-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 flex items-center justify-center mx-auto mb-6 ring-2 ring-emerald-500/30 ring-offset-4 ring-offset-slate-900 success-animation">
                        <Check className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white text-premium-heading">Tack för ditt meddelande</h1>
                    <p className="mt-3 text-slate-400">
                        Vi återkommer så snart vi kan.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 pt-24">
            {/* Header with gradient */}
            <section className="py-20 relative overflow-hidden">
                {/* Subtle background glow */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 60%)',
                        filter: 'blur(80px)',
                    }}
                />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
                    <h1 className="text-4xl lg:text-5xl font-bold text-gradient-premium text-premium-display">
                        Kontakt
                    </h1>
                    <p className="mt-6 text-xl text-slate-400">
                        Hör av dig så berättar vi mer
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="pb-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-5 gap-12">
                        {/* Form with premium dark styling */}
                        <div className="lg:col-span-3 card-premium-dark p-8">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Namn *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            className="w-full px-4 py-3 input-dark-premium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Företag
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.company}
                                            onChange={(e) => updateField('company', e.target.value)}
                                            className="w-full px-4 py-3 input-dark-premium"
                                        />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            E-post *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => updateField('email', e.target.value)}
                                            className="w-full px-4 py-3 input-dark-premium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Telefon
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => updateField('phone', e.target.value)}
                                            className="w-full px-4 py-3 input-dark-premium"
                                            placeholder="+46 70 123 45 67"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Antal anställda
                                    </label>
                                    <select
                                        value={formData.employees}
                                        onChange={(e) => updateField('employees', e.target.value)}
                                        className="w-full px-4 py-3 input-dark-premium"
                                    >
                                        <option value="">Välj...</option>
                                        {t.form.employeeOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Meddelande *
                                    </label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={(e) => updateField('message', e.target.value)}
                                        className="w-full px-4 py-3 input-dark-premium resize-none"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 btn-shine bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-white/10"
                                >
                                    {loading ? 'Skickar...' : 'Skicka meddelande'}
                                </button>
                            </form>
                        </div>

                        {/* Sidebar with refined styling */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="card-premium-dark p-6">
                                <h3 className="font-semibold text-white mb-5 text-premium-heading">
                                    Kontaktuppgifter
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-slate-400 group">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
                                            <Mail className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <a href={`mailto:${t.alternatives.email}`} className="hover:text-white transition-colors hover-underline-premium">
                                            {t.alternatives.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-400 group">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
                                            <Phone className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <a href={`tel:${t.alternatives.phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors hover-underline-premium">
                                            {t.alternatives.phone}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-400">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/20">
                                            <Clock className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <span>{t.alternatives.hours}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}


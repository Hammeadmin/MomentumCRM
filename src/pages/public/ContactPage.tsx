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
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Tack för ditt meddelande</h1>
                    <p className="mt-2 text-slate-400">
                        Vi återkommer så snart vi kan.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 pt-24">
            {/* Header */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white">
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
                        {/* Form */}
                        <div className="lg:col-span-3 bg-slate-800 rounded-2xl border border-slate-700 p-8">
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
                                            className="w-full px-4 py-3 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                            className="w-full px-4 py-3 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                            className="w-full px-4 py-3 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                            className="w-full px-4 py-3 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                        className="w-full px-4 py-3 border border-slate-600 rounded-lg bg-slate-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                        className="w-full px-4 py-3 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Skickar...' : 'Skicka meddelande'}
                                </button>
                            </form>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <h3 className="font-semibold text-white mb-4">
                                    Kontaktuppgifter
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Mail className="w-5 h-5 text-slate-500" />
                                        <a href={`mailto:${t.alternatives.email}`} className="hover:text-white transition-colors">
                                            {t.alternatives.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Phone className="w-5 h-5 text-slate-500" />
                                        <a href={`tel:${t.alternatives.phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors">
                                            {t.alternatives.phone}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Clock className="w-5 h-5 text-slate-500" />
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

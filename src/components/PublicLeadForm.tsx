import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getLeadFormPublicUrl } from '../lib/database';
import type { FormField } from '../lib/database';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface FormConfig {
    fields: FormField[];
    settings: {
        submitButtonText: string;
        successMessage: string;
        redirectUrl?: string;
        emailNotification: boolean;
        autoAssignUserId?: string;
        leadSource: string;
    };
}

interface FormData {
    id: string;
    name: string;
    description?: string | null;
    form_config: FormConfig;
    organisation?: { name: string; logo_url?: string | null } | null;
}

function PublicLeadForm() {
    const { formId } = useParams<{ formId: string }>();
    const [form, setForm] = useState<FormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!formId) { setNotFound(true); setLoading(false); return; }
        fetchForm(formId);
    }, [formId]);

    const fetchForm = async (id: string) => {
        const { data, error } = await supabase
            .from('lead_forms')
            .select('id, name, description, form_config, organisation:organisations(name, logo_url)')
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            setNotFound(true);
        } else {
            setForm(data as unknown as FormData);
            // Initialize field values
            const initial: Record<string, any> = {};
            (data.form_config as FormConfig)?.fields?.forEach((f: FormField) => {
                initial[f.label] = f.type === 'checkbox' ? [] : '';
            });
            setFieldValues(initial);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form || !formId) return;

        // Basic validation: check required fields
        for (const field of form.form_config.fields) {
            if (field.required) {
                const val = fieldValues[field.label];
                if (!val || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
                    setSubmitError(`Fältet "${field.label}" är obligatoriskt`);
                    return;
                }
            }
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch(getLeadFormPublicUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ form_id: formId, fields: fieldValues }),
            });
            const data = await res.json();

            if (data.success) {
                setSubmitted(true);
                if (form.form_config.settings.redirectUrl) {
                    setTimeout(() => {
                        window.location.href = form.form_config.settings.redirectUrl!;
                    }, 2000);
                }
            } else {
                setSubmitError(data.error || 'Något gick fel. Försök igen.');
            }
        } catch {
            setSubmitError('Kunde inte skicka formuläret. Kontrollera din internetanslutning.');
        }

        setSubmitting(false);
    };

    const updateField = (label: string, value: any) => {
        setFieldValues(prev => ({ ...prev, [label]: value }));
    };

    const handleCheckboxChange = (label: string, option: string, checked: boolean) => {
        setFieldValues(prev => {
            const current = Array.isArray(prev[label]) ? prev[label] : [];
            return { ...prev, [label]: checked ? [...current, option] : current.filter((o: string) => o !== option) };
        });
    };

    const renderField = (field: FormField) => {
        const inputCls = "w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow";
        const val = fieldValues[field.label] ?? '';

        switch (field.type) {
            case 'textarea':
                return <textarea rows={4} className={inputCls} placeholder={field.placeholder} value={val} onChange={e => updateField(field.label, e.target.value)} />;
            case 'select':
                return (
                    <select className={inputCls} value={val} onChange={e => updateField(field.label, e.target.value)}>
                        <option value="">Välj alternativ...</option>
                        {field.options?.map((o, i) => <option key={i} value={o}>{o}</option>)}
                    </select>
                );
            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {field.options?.map((o, i) => (
                            <label key={i} className="flex items-center cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    checked={Array.isArray(val) && val.includes(o)}
                                    onChange={e => handleCheckboxChange(field.label, o, e.target.checked)} />
                                <span className="ml-2.5 text-sm text-gray-700">{o}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'radio':
                return (
                    <div className="space-y-2">
                        {field.options?.map((o, i) => (
                            <label key={i} className="flex items-center cursor-pointer">
                                <input type="radio" name={`field-${field.id}`} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    checked={val === o}
                                    onChange={() => updateField(field.label, o)} />
                                <span className="ml-2.5 text-sm text-gray-700">{o}</span>
                            </label>
                        ))}
                    </div>
                );
            default: {
                const inputType = field.type === 'phone' ? 'tel' : field.type;
                return <input type={inputType} className={inputCls} placeholder={field.placeholder} value={val} onChange={e => updateField(field.label, e.target.value)} />;
            }
        }
    };

    // ── Loading ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // ── Not found ───────────────────────────────────────────────────────────────
    if (notFound || !form) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Formuläret finns inte</h2>
                    <p className="text-sm text-gray-500">Detta formulär är inte längre aktivt eller har tagits bort.</p>
                </div>
            </div>
        );
    }

    const org = form.organisation;
    const settings = form.form_config.settings;
    const fields = form.form_config.fields;

    // ── Success ─────────────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Tack!</h2>
                    <p className="text-gray-600">{settings.successMessage}</p>
                    {settings.redirectUrl && (
                        <p className="text-xs text-gray-400 mt-4">Du omdirigeras automatiskt...</p>
                    )}
                </div>
            </div>
        );
    }

    // ── Form ────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-10 max-w-lg w-full">
                {/* Organisation branding */}
                {org?.logo_url ? (
                    <img src={org.logo_url} alt={org.name} className="h-12 object-contain mb-6" />
                ) : org?.name ? (
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">{org.name}</p>
                ) : null}

                {/* Form header */}
                <h1 className="text-xl font-bold text-gray-900 mb-1">{form.name}</h1>
                {form.description && <p className="text-sm text-gray-500 mb-6">{form.description}</p>}
                {!form.description && <div className="mb-6" />}

                {/* Error */}
                {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700">{submitError}</p>
                    </div>
                )}

                {/* Fields */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {fields.map(field => (
                        <div key={field.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                            {renderField(field)}
                        </div>
                    ))}

                    <button type="submit" disabled={submitting}
                        className="w-full px-6 py-3 rounded-xl text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {settings.submitButtonText}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-[11px] text-gray-300 text-center mt-8">Powered by Momentum CRM</p>
            </div>
        </div>
    );
}

export default PublicLeadForm;

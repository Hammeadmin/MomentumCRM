import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Plus, X, Rss, Zap, Briefcase, Filter, User, Phone, Mail, MapPin, Edit, Trash2, Calendar,
    MessageSquare, DollarSign, ChevronDown, CheckSquare, Square, RefreshCw, AlertTriangle, Target, Loader2,
    TrendingUp, BarChart3, Clock, Users, ArrowRight, LayoutGrid, List, PhoneCall, Send, FormInput
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useLeads } from '../hooks/useLeads';
import { useTranslation } from '../locales/sv';
import { parseLead } from '../lib/schemas';

import {
    createLead, updateLead, deleteLead, getSalesTasks, updateSalesTask,
    fetchRSSArticles, getAILeadSuggestions, createLeadFromArticle, getLeadScoreColor,
    getLeadAnalytics, getLeadScoreLabel, getNextActionSuggestion,
    type LeadWithRelations, type SalesTask, type RSSArticle, type AILeadSuggestion,
    type LeadFilters
} from '../lib/leads';
import { formatDate, formatCurrency, getCustomers, getTeamMembers, createCustomer, getSavedLineItemById } from '../lib/database';
import { supabase } from '../lib/supabase';
import { createQuoteFromLead } from '../lib/quotes';
import { evaluate } from 'mathjs';
import type { LeadStatus, Customer, UserProfile, RichSavedLineItem } from '../types/database';

import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import ReminderModal from './ReminderModal';
import CreateQuoteModal from './CreateQuoteModal';
import { Button } from './ui';

// Lead Analytics interface (replaces `any`)
interface LeadAnalytics {
    totalLeads: number;
    conversionRate: number;
    averageDealSize: number;
    averageSalesCycle: number;
    sourcePerformance: Array<{ source: string; count: number; conversion: number }>;
    wonLeads: number;
}

// Quote preview state for smart quote creation
interface QuotePreviewData {
    productName: string;
    calculatedPrice: number;
    fieldDetails: Array<{ label: string; value: string | number }>;
    linkedProductId: string;
    lead: LeadWithRelations;
}

// Formula helper (same as ProductConfigurator.tsx)
const safeEvaluate = (formula: string, fieldValues: Record<string, number | string | boolean>): number => {
    if (!formula?.trim()) return 0;
    try {
        const scope: Record<string, number> = {};
        Object.entries(fieldValues).forEach(([k, v]) => {
            scope[k] = typeof v === 'number' ? v : 0;
        });
        const result = evaluate(formula, scope);
        if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) return 0;
        return Math.max(0, Math.round(result * 100) / 100);
    } catch {
        return 0;
    }
};

// Status configuration - matches actual DB enum values with SHARPER professional colors
const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string; headerColor: string }> = {
    new: { label: 'Ny', color: 'text-emerald-800', bgColor: 'bg-emerald-100', headerColor: 'bg-emerald-600' },
    contacted: { label: 'Kontaktad', color: 'text-amber-800', bgColor: 'bg-amber-100', headerColor: 'bg-amber-500' },
    qualified: { label: 'Kvalificerad', color: 'text-violet-800', bgColor: 'bg-violet-100', headerColor: 'bg-violet-600' },
    proposal: { label: 'Offert', color: 'text-indigo-800', bgColor: 'bg-indigo-100', headerColor: 'bg-indigo-600' },
    won: { label: 'Vunnen', color: 'text-teal-800', bgColor: 'bg-teal-100', headerColor: 'bg-teal-600' },
    lost: { label: 'Förlorad', color: 'text-rose-800', bgColor: 'bg-rose-100', headerColor: 'bg-rose-600' }
};

const PIPELINE_STAGES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

const LEAD_STATUS_BORDER_COLORS: Record<LeadStatus, string> = {
    new: '#16a34a',
    contacted: '#f59e0b',
    qualified: '#7c3aed',
    proposal: '#4f46e5',
    won: '#0d9488',
    lost: '#e11d48',
};

// ====== ANALYTICS COMPONENT ====== //
const AnalyticsHeader = ({ analytics, loading }: { analytics: LeadAnalytics | null; loading: boolean }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!analytics) return null;

    const stats = [
        { label: 'Totala Leads', value: analytics.totalLeads, icon: Target, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { label: 'Konvertering', value: `${analytics.conversionRate}%`, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' },
        { label: 'Snitt Affärsvärde', value: formatCurrency(analytics.averageDealSize), icon: DollarSign, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        { label: 'Säljcykel', value: `${analytics.averageSalesCycle} dagar`, icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50' }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ====== KANBAN ROW COMPONENT ====== //
const LeadKanbanRow = ({
    lead,
    statusColor,
    onDragStart,
    onClick,
    onCreateQuote,
}: {
    lead: LeadWithRelations;
    statusColor: string;
    onDragStart: (e: React.DragEvent) => void;
    onClick: () => void;
    onCreateQuote: () => void;
}) => (
    <div
        className="group flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
        style={{ borderLeft: `3px solid ${statusColor}` }}
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
    >
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{lead.title}</p>
            {lead.customer && (
                <p className="text-xs text-gray-500 truncate">{lead.customer.name}</p>
            )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {lead.estimated_value ? (
                <span className="text-xs font-semibold text-gray-700">
                    {formatCurrency(lead.estimated_value)}
                </span>
            ) : null}
            <button
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-blue-600 transition-all"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCreateQuote(); }}
                title="Skapa offert"
            >
                <Send className="w-3.5 h-3.5" />
            </button>
        </div>
    </div>
);

// ====== KANBAN VIEW COMPONENT ====== //
const LeadKanbanView = ({ leads, onSelectLead, onStatusChange, onCreateQuote, leadsTranslations }: {
    leads: LeadWithRelations[];
    onSelectLead: (lead: LeadWithRelations) => void;
    onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
    onCreateQuote: (lead: LeadWithRelations) => void;
    leadsTranslations: ReturnType<typeof useTranslation>['leads'];
}) => {
    const handleDragStart = (e: React.DragEvent, lead: LeadWithRelations) => {
        e.dataTransfer.setData('leadId', lead.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) {
            onStatusChange(leadId, status);
        }
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
            {PIPELINE_STAGES.map(status => {
                const config = LEAD_STATUS_CONFIG[status];
                const stageLeads = leads.filter(l => l.status === status);
                const totalValue = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

                return (
                    <div
                        key={status}
                        className="flex-shrink-0 w-64 bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        {/* Column Header with solid color bar */}
                        <div className={`${config.headerColor} px-4 py-3`}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-white font-semibold text-sm truncate">
                                    {config.label}
                                </span>
                                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {stageLeads.length}
                                </span>
                            </div>
                            <div className="text-white/80 text-xs font-medium mt-1">
                                {formatCurrency(totalValue)}
                            </div>
                        </div>

                        {/* Column Content */}
                        <div className="p-2 space-y-1.5">
                            {stageLeads.map(lead => (
                                <LeadKanbanRow
                                    key={lead.id}
                                    lead={lead}
                                    statusColor={LEAD_STATUS_BORDER_COLORS[status]}
                                    onDragStart={(e: React.DragEvent) => handleDragStart(e, lead)}
                                    onClick={() => onSelectLead(lead)}
                                    onCreateQuote={() => onCreateQuote(lead)}
                                />
                            ))}
                            {stageLeads.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    {leadsTranslations.KANBAN.DRAG_HERE}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ====== LEAD FORM MODAL ====== //
const LeadFormModal = ({ isOpen, onClose, onSave, leadToEdit, organisationId }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    leadToEdit?: LeadWithRelations | null;
    organisationId: string | null;
}) => {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const { leads: leadsText } = useTranslation();
    const [formData, setFormData] = useState({
        title: '', description: '', source: '', status: 'new' as LeadStatus,
        estimated_value: '', customer_id: '', assigned_to_user_id: ''
    });
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone_number: '' });

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setFormData({
                title: leadToEdit?.title || '',
                description: leadToEdit?.description || '',
                source: leadToEdit?.source || '',
                status: leadToEdit?.status || 'new',
                estimated_value: leadToEdit?.estimated_value?.toString() || '',
                customer_id: leadToEdit?.customer_id || '',
                assigned_to_user_id: leadToEdit?.assigned_to_user_id || user?.id || ''
            });

            const loadModalData = async () => {
                const [customersRes, membersRes] = await Promise.all([getCustomers(organisationId!), getTeamMembers(organisationId!)]);
                if (customersRes.data) setCustomers(customersRes.data);
                if (membersRes.data) setTeamMembers(membersRes.data);
            };
            loadModalData();
        }
    }, [isOpen, leadToEdit, user, organisationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return showError(leadsText.MESSAGES.ERROR_TITLE, leadsText.MESSAGES.MUST_LOGIN);

        setLoading(true);
        setErrors({});

        // If creating new customer, create it first
        let customerId = formData.customer_id;
        if (showNewCustomerForm && !customerId) {
            if (!newCustomer.name.trim()) {
                showError('Fel', 'Kundnamn är obligatoriskt');
                setLoading(false);
                return;
            }
            if (!newCustomer.email.trim()) {
                showError('Fel', 'E-postadress är obligatorisk för att kunna kontakta kunden');
                setLoading(false);
                return;
            }

            const { data: createdCustomer, error: customerError } = await createCustomer({
                organisation_id: organisationId!,
                name: newCustomer.name.trim(),
                email: newCustomer.email.trim(),
                phone_number: newCustomer.phone_number.trim() || null,
                customer_type: 'private',
            } as Omit<Customer, 'id' | 'created_at'>);

            if (customerError || !createdCustomer) {
                showError('Fel', `Kunde inte skapa kund: ${customerError?.message || 'Okänt fel'}`);
                setLoading(false);
                return;
            }

            customerId = createdCustomer.id;
            // Add to customers list for future reference
            setCustomers(prev => [...prev, createdCustomer]);
        }

        // Build payload for validation
        const dataPayload = {
            organisation_id: organisationId,
            title: formData.title,
            description: formData.description || null,
            source: formData.source || null,
            status: formData.status,
            estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
            customer_id: customerId || null,
            assigned_to_user_id: formData.assigned_to_user_id || null,
        };

        // Validate using Zod schema
        const validation = parseLead(dataPayload);
        if (!validation.success) {
            setErrors(validation.errors);
            setLoading(false);
            return;
        }

        const result = leadToEdit
            ? await updateLead(leadToEdit.id, dataPayload)
            : await createLead(dataPayload as Omit<LeadWithRelations, 'id' | 'created_at'>);

        if (result.error) {
            showError(leadsText.MESSAGES.ERROR_TITLE, leadsText.MESSAGES.ERROR_SAVE(result.error.message));
        } else {
            success(leadsText.MESSAGES.SUCCESS_TITLE, leadToEdit ? leadsText.MESSAGES.LEAD_UPDATED : leadsText.MESSAGES.LEAD_CREATED);
            onSave();
            onClose();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-800">{leadToEdit ? leadsText.FORM.EDIT_TITLE : leadsText.FORM.CREATE_TITLE}</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{leadsText.FORM.TITLE_LABEL} *</label>
                            <input type="text" value={formData.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 ${errors.title ? 'border-error-500' : 'border-gray-300'}`} placeholder={leadsText.FORM.TITLE_PLACEHOLDER} />
                            {errors.title && <p className="text-error-600 text-xs mt-1">{errors.title}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{leadsText.FORM.DESCRIPTION_LABEL}</label>
                            <textarea value={formData.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder={leadsText.FORM.DESCRIPTION_PLACEHOLDER} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{leadsText.FORM.SOURCE_LABEL}</label>
                                <input type="text" value={formData.source} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, source: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder={leadsText.FORM.SOURCE_PLACEHOLDER} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{leadsText.FORM.VALUE_LABEL}</label>
                                <input type="number" value={formData.estimated_value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, estimated_value: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="25000" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">{leadsText.FORM.CUSTOMER_LABEL}</label>

                                {/* Toggle between existing and new customer */}
                                <div className="flex items-center gap-4 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={!showNewCustomerForm}
                                            onChange={() => setShowNewCustomerForm(false)}
                                            className="text-primary-600"
                                        />
                                        <span className="text-sm text-gray-600">Välj befintlig kund</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={showNewCustomerForm}
                                            onChange={() => { setShowNewCustomerForm(true); setFormData({ ...formData, customer_id: '' }); }}
                                            className="text-primary-600"
                                        />
                                        <span className="text-sm text-gray-600">Skapa ny kund</span>
                                    </label>
                                </div>

                                {!showNewCustomerForm ? (
                                    <select value={formData.customer_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                                        <option value="">{leadsText.FORM.CUSTOMER_PLACEHOLDER}</option>
                                        {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                ) : (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Kundnamn *</label>
                                            <input
                                                type="text"
                                                value={newCustomer.name}
                                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                                placeholder="Företagsnamn eller personnamn"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">E-post *</label>
                                                <input
                                                    type="email"
                                                    value={newCustomer.email}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                                    placeholder="kund@foretag.se"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                                                <input
                                                    type="tel"
                                                    value={newCustomer.phone_number}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                                                    placeholder="070-123 45 67"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-700">Kunden skapas automatiskt när du sparar leaden.</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{leadsText.FORM.SALESPERSON_LABEL}</label>
                                <select value={formData.assigned_to_user_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, assigned_to_user_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                                    <option value="">{leadsText.FORM.SALESPERSON_PLACEHOLDER}</option>
                                    {teamMembers.filter((tm: UserProfile) => tm.role === 'sales' || tm.role === 'admin').map((tm: UserProfile) => <option key={tm.id} value={tm.id}>{tm.full_name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all">Avbryt</button>
                        <button type="submit" disabled={loading} className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (leadToEdit ? leadsText.FORM.SAVE_BUTTON : leadsText.FORM.CREATE_BUTTON)}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// ====== MAIN COMPONENT ====== //

const LeadManagement: React.FC = () => {
    const { user, organisationId } = useAuth();
    const location = useLocation();
    const { success, error: showError } = useToast();
    const { leads: leadsTranslations } = useTranslation();
    const [filters, setFilters] = useState<LeadFilters>({});

    // Use the useLeads hook for leads, customers, teamMembers
    const { leads, customers, teamMembers, isLoading: leadsLoading, refetch: refetchLeads } = useLeads(filters);

    const [salesTasks, setSalesTasks] = useState<SalesTask[]>([]);
    const [rssArticles, setRssArticles] = useState<RSSArticle[]>([]);
    const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [leadToEdit, setLeadToEdit] = useState<LeadWithRelations | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState({ tasks: true, rss: true, ai: false, analytics: true });
    const [aiSuggestions, setAiSuggestions] = useState<AILeadSuggestion[]>([]);
    const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

    // Reminder State
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [reminderEntity, setReminderEntity] = useState<{ id: string; title: string } | null>(null);

    // Quote Modal State
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [quoteLead, setQuoteLead] = useState<LeadWithRelations | null>(null);
    const [quotePreview, setQuotePreview] = useState<QuotePreviewData | null>(null);
    const [quotePreviewLoading, setQuotePreviewLoading] = useState(false);

    // Get unique sources for filter dropdown
    const uniqueSources = useMemo(() => {
        const sources = leads.map((l: LeadWithRelations) => l.source).filter(Boolean);
        return [...new Set(sources)];
    }, [leads]);

    // Get unique cities for filter dropdown (Part C)
    const uniqueCities = useMemo(() => {
        const cities = leads.map((l: LeadWithRelations) => (l as any).city).filter(Boolean) as string[];
        return [...new Set(cities)].sort();
    }, [leads]);

    useEffect(() => {
        if (!user) return;
        loadInitialData();

        const leadChannel = supabase.channel('public:leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
                // Part D: toast notification for new web leads
                if (payload.eventType === 'INSERT') {
                    const newLead = payload.new as any;
                    if (newLead.source === 'Webbformulär' || newLead.form_id) {
                        success('Ny webb-lead', `Ny webb-lead: ${newLead.title || 'Utan titel'}`);
                    }
                }
                refetchLeads();
            })
            .subscribe();

        const taskChannel = supabase.channel('public:sales_tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_tasks' }, () => loadTasks(user.id))
            .subscribe();

        return () => {
            supabase.removeChannel(leadChannel);
            supabase.removeChannel(taskChannel);
        };
    }, [user, refetchLeads]);

    useEffect(() => {
        if (selectedLead) loadAISuggestions(selectedLead.id);
        else setAiSuggestions([]);
    }, [selectedLead]);

    // Handle navigation state for creating lead from customer page
    useEffect(() => {
        const state = location.state as { createForCustomer?: { id: string; name: string } } | null;
        if (state?.createForCustomer) {
            // Open lead creation modal - customer will be pre-selected in the form
            setIsModalOpen(true);
            // Clear the navigation state so it doesn't re-trigger
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Update selected lead when leads change
    useEffect(() => {
        if (selectedLead) {
            const updatedSelected = leads.find((l: LeadWithRelations) => l.id === selectedLead.id);
            if (updatedSelected) setSelectedLead(updatedSelected);
        }
    }, [leads, selectedLead]);

    const loadInitialData = async () => {
        if (!user || !organisationId) return;
        loadTasks(user.id);
        loadRssFeed();
        loadAnalytics();
    };

    const loadAnalytics = async () => {
        if (!organisationId) return;
        setLoading(prev => ({ ...prev, analytics: true }));
        const { data, error } = await getLeadAnalytics(organisationId);
        if (!error && data) setAnalytics(data);
        setLoading(prev => ({ ...prev, analytics: false }));
    };

    const loadTasks = async (userId: string) => {
        setLoading(prev => ({ ...prev, tasks: true }));
        const { data, error } = await getSalesTasks(userId);
        if (error) showError(leadsTranslations.MESSAGES.ERROR_TITLE, leadsTranslations.MESSAGES.ERROR_TASKS);
        else setSalesTasks(data || []);
        setLoading(prev => ({ ...prev, tasks: false }));
    };

    const loadRssFeed = async () => {
        if (!organisationId) return;
        setLoading(prev => ({ ...prev, rss: true }));
        const { data, error } = await fetchRSSArticles(organisationId);
        if (error) showError(leadsTranslations.MESSAGES.ERROR_TITLE, leadsTranslations.MESSAGES.ERROR_RSS);
        else setRssArticles(data || []);
        setLoading(prev => ({ ...prev, rss: false }));
    };

    const loadAISuggestions = async (leadId: string) => {
        setLoading(prev => ({ ...prev, ai: true }));
        const { data, error } = await getAILeadSuggestions(leadId);
        if (error) showError(leadsTranslations.MESSAGES.ERROR_TITLE, leadsTranslations.MESSAGES.ERROR_AI);
        else setAiSuggestions(data || []);
        setLoading(prev => ({ ...prev, ai: false }));
    };

    const handleCreateLead = () => {
        setLeadToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditLead = (lead: LeadWithRelations) => {
        setLeadToEdit(lead);
        setIsModalOpen(true);
    };

    const handleDeleteLead = async () => {
        if (!selectedLead) return;
        const { error } = await deleteLead(selectedLead.id);
        if (error) {
            showError(leadsTranslations.MESSAGES.ERROR_TITLE, leadsTranslations.MESSAGES.ERROR_DELETE);
        } else {
            success(leadsTranslations.MESSAGES.SUCCESS_TITLE, leadsTranslations.MESSAGES.LEAD_DELETED);
            setSelectedLead(null);
            loadAnalytics();
        }
        setShowDeleteDialog(false);
    };

    const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
        const { data: updatedLead, error } = await updateLead(leadId, { status: newStatus });
        if (error) {
            showError(leadsTranslations.MESSAGES.ERROR_TITLE, leadsTranslations.MESSAGES.ERROR_STATUS);
            return;
        }

        refetchLeads();
        loadAnalytics();
    };

    // Create quote from a lead — smart preview if form_data + linked product exist
    const handleCreateQuote = async (lead: LeadWithRelations) => {
        if (!organisationId) return;

        const formData = (lead as any).form_data;
        const formId = (lead as any).form_id;

        // If lead has form_data and form_id, try to resolve the linked product
        if (formData && formId && Object.keys(formData).length > 0) {
            setQuotePreviewLoading(true);
            try {
                // Fetch the form to get linkedProductId from settings
                const { data: formRow } = await supabase
                    .from('lead_forms')
                    .select('form_config')
                    .eq('id', formId)
                    .single();

                const linkedProductId = formRow?.form_config?.settings?.linkedProductId;

                if (linkedProductId) {
                    const { data: product } = await getSavedLineItemById(linkedProductId);

                    if (product) {
                        const meta = product.metadata;
                        let calculatedPrice = product.unit_price;
                        const fieldDetails: Array<{ label: string; value: string | number }> = [];

                        if (meta?.pricing_formula && meta?.custom_fields) {
                            const scope: Record<string, number | string | boolean> = {};
                            for (const cf of meta.custom_fields) {
                                let val = formData[cf.key];
                                if (val === undefined) {
                                    const lowerKey = cf.key.toLowerCase();
                                    const match = Object.entries(formData).find(([k]) => k.toLowerCase() === lowerKey);
                                    val = match ? match[1] : undefined;
                                }
                                const numVal = val !== undefined ? (typeof val === 'number' ? val : Number(val) || 0) : 0;
                                scope[cf.key] = numVal;
                                fieldDetails.push({ label: cf.label || cf.key, value: val !== undefined ? val : 0 });
                            }

                            const formulaResult = safeEvaluate(meta.pricing_formula, scope);
                            const basePrice = meta.base_price ?? 0;
                            calculatedPrice = formulaResult + basePrice;
                            if (calculatedPrice === 0) calculatedPrice = product.unit_price;
                        } else {
                            // No formula — show product fields for context
                            if (meta?.custom_fields) {
                                for (const cf of meta.custom_fields) {
                                    const val = formData[cf.key] ?? formData[cf.key?.toLowerCase()];
                                    if (val !== undefined) fieldDetails.push({ label: cf.label || cf.key, value: val });
                                }
                            }
                        }

                        setQuotePreview({
                            productName: product.name,
                            calculatedPrice,
                            fieldDetails,
                            linkedProductId,
                            lead,
                        });
                        setQuotePreviewLoading(false);
                        return; // Show preview instead of opening modal
                    }
                }
            } catch (err) {
                console.error('Error resolving quote preview:', err);
            }
            setQuotePreviewLoading(false);
        }

        // Fallback: open quote creation modal (old behavior)
        setQuoteLead(lead);
        setIsQuoteModalOpen(true);
    };

    // Create quote with smart line item from preview
    const handleCreateSmartQuote = async () => {
        if (!quotePreview || !organisationId) return;
        setQuotePreviewLoading(true);
        try {
            const { data: quote, error } = await createQuoteFromLead(
                quotePreview.lead as any,
                organisationId,
                quotePreview.linkedProductId
            );
            if (error) {
                showError('Kunde inte skapa offert', error.message);
            } else {
                success('Offert skapad', `Offert skapad med ${quotePreview.productName} — ${quotePreview.calculatedPrice.toLocaleString('sv-SE')} kr`);
                refetchLeads();
                loadAnalytics();
            }
        } catch (err) {
            showError('Fel', 'Ett oväntat fel uppstod.');
        }
        setQuotePreview(null);
        setQuotePreviewLoading(false);
    };

    // Create empty quote from preview (old behavior)
    const handleCreateEmptyQuote = () => {
        if (!quotePreview) return;
        setQuoteLead(quotePreview.lead);
        setIsQuoteModalOpen(true);
        setQuotePreview(null);
    };

    const handleCreateFromArticle = async (article: RSSArticle) => {
        if (!user || !organisationId) return;
        const { error } = await createLeadFromArticle(article, organisationId, user.id);
        if (error) showError(leadsTranslations.MESSAGES.ERROR_TITLE, leadsTranslations.MESSAGES.ERROR_ARTICLE);
        else {
            success(leadsTranslations.MESSAGES.SUCCESS_TITLE, leadsTranslations.MESSAGES.ARTICLE_SUCCESS);
            loadAnalytics();
        }
    };

    const handleTaskToggle = async (task: SalesTask) => {
        const { error } = await updateSalesTask(task.id, { is_completed: !task.is_completed });
        if (error) showError(leadsTranslations.MESSAGES.ERROR_TITLE, leadsTranslations.MESSAGES.ERROR_TASK);
    };

    const handleOpenReminder = (lead: LeadWithRelations) => {
        setReminderEntity({
            id: lead.id,
            title: `Lead: ${lead.title}`
        });
        setIsReminderModalOpen(true);
    };

    const clearFilters = () => {
        setFilters({});
    };

    return (
        <>
            <LeadFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={() => { refetchLeads(); loadAnalytics(); }} leadToEdit={leadToEdit} organisationId={organisationId} />
            <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={handleDeleteLead} title={leadsTranslations.CONFIRM.DELETE_TITLE} message={leadsTranslations.CONFIRM.DELETE_MESSAGE(selectedLead?.title || '')} type="danger" />
            <CreateQuoteModal
                isOpen={isQuoteModalOpen}
                onClose={() => {
                    setIsQuoteModalOpen(false);
                    setQuoteLead(null);
                }}
                onQuoteCreated={() => {
                    refetchLeads();
                    loadAnalytics();
                    success('Offert skapad', 'Offerten har skapats framgångsrikt.');
                }}
                lead={quoteLead}
            />

            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-4 shadow-lg shadow-purple-500/20">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{leadsTranslations.TITLE}</h1>
                            <p className="text-sm text-gray-500">{leadsTranslations.SUBTITLE(leads.length, leads.filter((l: LeadWithRelations) => l.status === 'won').length)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title={leadsTranslations.ACTIONS.LIST_VIEW}
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title={leadsTranslations.ACTIONS.PIPELINE_VIEW}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} icon={<Filter className="w-4 h-4" />}>
                            {leadsTranslations.ACTIONS.FILTER} {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
                        </Button>
                        <Button variant="primary" size="md" onClick={handleCreateLead} icon={<Plus className="w-4 h-4" />}>
                            {leadsTranslations.ACTIONS.CREATE}
                        </Button>
                    </div>
                </div>

                {/* Analytics Header */}
                <AnalyticsHeader analytics={analytics} loading={loading.analytics} />

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 transition-all">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <input
                                type="text"
                                placeholder={leadsTranslations.FILTERS.SEARCH_PLACEHOLDER}
                                value={filters.search || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            />
                            <select
                                value={filters.status || 'all'}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, status: e.target.value === 'all' ? undefined : e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="all">{leadsTranslations.FILTERS.ALL_STATUSES}</option>
                                {PIPELINE_STAGES.map(status => (
                                    <option key={status} value={status}>{LEAD_STATUS_CONFIG[status].label}</option>
                                ))}
                            </select>
                            <select
                                value={filters.source || 'all'}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, source: e.target.value === 'all' ? undefined : e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="all">{leadsTranslations.FILTERS.ALL_SOURCES}</option>
                                {uniqueSources.map((source: string) => (
                                    <option key={source} value={source}>{source}</option>
                                ))}
                            </select>
                            <select
                                value={filters.assignedTo || 'all'}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, assignedTo: e.target.value === 'all' ? undefined : e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="all">{leadsTranslations.FILTERS.ALL_SALESPEOPLE}</option>
                                <option value="unassigned">{leadsTranslations.FILTERS.UNASSIGNED}</option>
                                {teamMembers.filter((tm: UserProfile) => tm.role === 'sales' || tm.role === 'admin').map((tm: UserProfile) => (
                                    <option key={tm.id} value={tm.id}>{tm.full_name}</option>
                                ))}
                            </select>
                            {/* Part C: City / Ort filter */}
                            <select
                                value={filters.city || 'all'}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, city: e.target.value === 'all' ? undefined : e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="all">Alla orter</option>
                                {uniqueCities.map((city: string) => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                            <button
                                onClick={clearFilters}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> {leadsTranslations.FILTERS.RESET}
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                {viewMode === 'kanban' ? (
                    <div className="flex gap-6">
                        {/* Kanban Columns */}
                        <div className={`transition-all duration-300 ${selectedLead ? 'flex-1' : 'w-full'}`}>
                            <LeadKanbanView
                                leads={leads}
                                onSelectLead={setSelectedLead}
                                onStatusChange={handleStatusChange}
                                onCreateQuote={handleCreateQuote}
                                leadsTranslations={leadsTranslations}
                            />
                        </div>

                        {/* Lead Detail Panel (Kanban Mode) */}
                        {selectedLead && (
                            <div className="w-96 flex-shrink-0 bg-white rounded-xl shadow-lg border border-gray-200 p-6 overflow-y-auto max-h-[calc(100vh-200px)] animate-in slide-in-from-right">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">
                                            {selectedLead.title}
                                            {selectedLead.source === 'Webbformulär' && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">Webb-lead</span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${LEAD_STATUS_CONFIG[selectedLead.status].bgColor} ${LEAD_STATUS_CONFIG[selectedLead.status].color}`}>
                                                {LEAD_STATUS_CONFIG[selectedLead.status].label}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getLeadScoreColor(selectedLead.lead_score || 0)}`}>
                                                {getLeadScoreLabel(selectedLead.lead_score || 0)}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLead(null)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Button variant="outline" size="sm" icon={<Edit className="w-4 h-4" />} onClick={() => selectedLead && handleEditLead(selectedLead)}>Redigera</Button>
                                    <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => selectedLead && handleCreateQuote(selectedLead)}>{quotePreviewLoading ? 'Laddar...' : 'Skapa offert'}</Button>
                                </div>

                                {/* Smart Quote Preview (Kanban) */}
                                {quotePreview && selectedLead && quotePreview.lead.id === selectedLead.id && (
                                    <div className="mb-4 border border-green-200 bg-green-50 rounded-xl p-4 animate-in fade-in">
                                        <h4 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" /> Offert förhandsgranskning
                                        </h4>
                                        <div className="text-sm space-y-1 mb-3">
                                            <div className="flex justify-between"><span className="text-gray-600">Tjänst:</span><span className="font-semibold text-gray-900">{quotePreview.productName}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-600">Beräknat pris:</span><span className="font-bold text-green-700">{quotePreview.calculatedPrice.toLocaleString('sv-SE')} kr</span></div>
                                        </div>
                                        {quotePreview.fieldDetails.length > 0 && (
                                            <div className="text-xs text-gray-600 mb-3">
                                                <span className="font-semibold">Baserat på: </span>
                                                {quotePreview.fieldDetails.map((f, i) => (
                                                    <span key={f.label}>{i > 0 ? ', ' : ''}{f.label}: {f.value}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <button onClick={handleCreateSmartQuote} disabled={quotePreviewLoading} className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50">Skapa offert med dessa uppgifter</button>
                                            <button onClick={handleCreateEmptyQuote} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors">Tom offert</button>
                                            <button onClick={() => setQuotePreview(null)} className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                )}

                                {/* Customer Info */}
                                {selectedLead.customer && (
                                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg">
                                        <div className="flex items-center"><User className="w-4 h-4 mr-2 text-gray-400" /> {selectedLead.customer.name}</div>
                                        <div className="flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-400" /> {selectedLead.customer.email || 'N/A'}</div>
                                        <div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-400" /> {selectedLead.customer.phone_number || 'N/A'}</div>
                                        <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-400" /> {selectedLead.customer.city || 'N/A'}</div>
                                    </div>
                                )}

                                {/* Details */}
                                <div className="space-y-3 text-sm">
                                    <div><strong className="font-semibold text-gray-600">Beskrivning:</strong><p className="text-gray-800 mt-1">{selectedLead.description || 'Ingen beskrivning.'}</p></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><strong className="font-semibold text-gray-600">Källa:</strong><p className="text-gray-800">{selectedLead.source || 'Okänd'}</p></div>
                                        <div><strong className="font-semibold text-gray-600">Värde:</strong><p className="text-gray-800">{selectedLead.estimated_value ? formatCurrency(selectedLead.estimated_value) : '-'}</p></div>
                                    </div>
                                </div>

                                {/* Next Action Suggestion */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                                    <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                        <ArrowRight className="w-4 h-4" />
                                        {getNextActionSuggestion(selectedLead)}
                                    </p>
                                </div>

                                {/* Part B: Formulärdata (Kanban detail) */}
                                {(() => {
                                    const fd = (selectedLead as any).form_data;
                                    if (!fd || typeof fd !== 'object' || Object.keys(fd).length === 0) return null;
                                    const entries = Object.entries(fd).filter(([k]) => !k.startsWith('_') && k !== 'form_id');
                                    if (entries.length === 0) return null;
                                    return (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                                                <FormInput className="w-4 h-4 text-indigo-500" /> Formulärdata
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2 text-sm bg-indigo-50 rounded-lg p-3">
                                                {entries.map(([key, value]) => (
                                                    <div key={key} className="flex justify-between">
                                                        <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                                        <span className="text-gray-900 font-medium text-right">{String(value ?? '')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Lead List */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 lg:col-span-1 xl:col-span-1 flex flex-col max-h-[600px]">
                            <h2 className="text-xl font-semibold mb-4 px-2">Förfrågningar ({leads.length})</h2>
                            {leadsLoading ? <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-600" /> : (
                                <div className="space-y-2 overflow-y-auto pr-2">
                                    {leads.map(lead => (
                                        <div key={lead.id} onClick={() => setSelectedLead(lead)} className={`p-3 border-l-4 rounded-r-lg cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-blue-50 border-blue-500 shadow-md' : 'border-transparent hover:bg-gray-50 hover:border-gray-300'}`}>
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-gray-800">{lead.title}</p>
                                                <span className={`text-xs font-bold flex items-center px-2 py-0.5 rounded-full ${getLeadScoreColor(lead.lead_score || 0)}`}>
                                                    <Zap className="w-3 h-3 mr-1" />{lead.lead_score || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded ${LEAD_STATUS_CONFIG[lead.status]?.bgColor} ${LEAD_STATUS_CONFIG[lead.status]?.color}`}>
                                                    {LEAD_STATUS_CONFIG[lead.status]?.label}
                                                </span>
                                                {lead.estimated_value && (
                                                    <span className="text-xs text-gray-500">{formatCurrency(lead.estimated_value)}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Lead Details */}
                        <div className="xl:col-span-2 lg:col-span-2 space-y-6 overflow-y-auto pr-2">
                            {selectedLead ? (
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">
                                                {selectedLead.title}
                                                {selectedLead.source === 'Webbformulär' && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">Webb-lead</span>
                                                )}
                                            </h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${LEAD_STATUS_CONFIG[selectedLead.status]?.bgColor} ${LEAD_STATUS_CONFIG[selectedLead.status]?.color}`}>
                                                    {LEAD_STATUS_CONFIG[selectedLead.status]?.label}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getLeadScoreColor(selectedLead.lead_score || 0)}`}>
                                                    {getLeadScoreLabel(selectedLead.lead_score || 0)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleEditLead(selectedLead)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"><Edit className="w-5 h-5" /></button>
                                            <button onClick={() => setShowDeleteDialog(true)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
                                            <button onClick={() => handleOpenReminder(selectedLead)} className="p-2 text-gray-500 hover:text-orange-600 rounded-full hover:bg-orange-50" title="Sätt påminnelse"><AlertTriangle className="w-5 h-5" /></button>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-2 mb-4">
                                        <Button variant="outline" size="sm" icon={<PhoneCall className="w-4 h-4" />}>Ring</Button>
                                        <Button variant="outline" size="sm" icon={<Mail className="w-4 h-4" />}>E-post</Button>
                                        <Button variant="outline" size="sm" icon={<Calendar className="w-4 h-4" />}>Boka möte</Button>
                                        <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => selectedLead && handleCreateQuote(selectedLead)}>{quotePreviewLoading ? 'Laddar...' : 'Skapa offert'}</Button>
                                    </div>

                                    {/* Smart Quote Preview (List view) */}
                                    {quotePreview && selectedLead && quotePreview.lead.id === selectedLead.id && (
                                        <div className="mb-4 border border-green-200 bg-green-50 rounded-xl p-5 animate-in fade-in">
                                            <h3 className="text-base font-bold text-green-800 mb-3 flex items-center gap-2">
                                                <DollarSign className="w-5 h-5" /> Offert förhandsgranskning
                                            </h3>
                                            <div className="text-sm space-y-2 mb-4">
                                                <div className="flex justify-between"><span className="text-gray-600">Tjänst:</span><span className="font-semibold text-gray-900">{quotePreview.productName}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-600">Beräknat pris:</span><span className="font-bold text-green-700 text-lg">{quotePreview.calculatedPrice.toLocaleString('sv-SE')} kr</span></div>
                                            </div>
                                            {quotePreview.fieldDetails.length > 0 && (
                                                <div className="text-sm text-gray-600 mb-4 bg-white/60 rounded-lg p-3">
                                                    <span className="font-semibold">Baserat på: </span>
                                                    {quotePreview.fieldDetails.map((f, i) => (
                                                        <span key={f.label}>{i > 0 ? ', ' : ''}{f.label}: {f.value}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex gap-3">
                                                <button onClick={handleCreateSmartQuote} disabled={quotePreviewLoading} className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50">Skapa offert med dessa uppgifter</button>
                                                <button onClick={handleCreateEmptyQuote} className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors">Skapa tom offert</button>
                                                <button onClick={() => setQuotePreview(null)} className="px-2 py-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Next Action Suggestion */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                        <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                            <ArrowRight className="w-4 h-4" />
                                            Rekommenderat: {getNextActionSuggestion(selectedLead)}
                                        </p>
                                    </div>

                                    {selectedLead.customer && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 mb-6 bg-gray-50 p-4 rounded-lg">
                                            <div className="flex items-center"><User className="w-4 h-4 mr-2 text-gray-400" /> {selectedLead.customer.name}</div>
                                            <div className="flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-400" /> {selectedLead.customer.email || 'N/A'}</div>
                                            <div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-400" /> {selectedLead.customer.phone_number || 'N/A'}</div>
                                            <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-400" /> {selectedLead.customer.city || 'N/A'}</div>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div><strong className="font-semibold text-gray-600">Beskrivning:</strong> <p className="text-gray-800 mt-1">{selectedLead.description || 'Ingen beskrivning.'}</p></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><strong className="font-semibold text-gray-600">Källa:</strong> <p className="text-gray-800 mt-1">{selectedLead.source || 'Okänd'}</p></div>
                                            <div><strong className="font-semibold text-gray-600">Uppskattat värde:</strong> <p className="text-gray-800 mt-1">{selectedLead.estimated_value ? formatCurrency(selectedLead.estimated_value) : 'Ej angivet'}</p></div>
                                        </div>
                                        <div><strong className="font-semibold text-gray-600">Senaste aktivitet:</strong> <p className="text-gray-800 mt-1">{formatDate(selectedLead.last_activity_at || selectedLead.created_at || '')}</p></div>
                                    </div>

                                    {/* Part B: Formulärdata (List-view detail) */}
                                    {(() => {
                                        const fd = (selectedLead as any).form_data;
                                        if (!fd || typeof fd !== 'object' || Object.keys(fd).length === 0) return null;
                                        const entries = Object.entries(fd).filter(([k]) => !k.startsWith('_') && k !== 'form_id');
                                        if (entries.length === 0) return null;
                                        return (
                                            <div className="mt-6 border-t pt-4">
                                                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-3">
                                                    <FormInput className="w-5 h-5 text-indigo-500" /> Formulärdata
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-indigo-50 rounded-lg p-4">
                                                    {entries.map(([key, value]) => (
                                                        <div key={key} className="flex justify-between gap-4">
                                                            <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                                            <span className="text-gray-900 font-medium text-right">{String(value ?? '')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div className="border-t pt-4 mt-6">
                                        <h3 className="text-lg font-semibold mb-2 flex items-center"><Zap className="w-5 h-5 mr-2 text-purple-500" />AI-Assistent: Nästa Steg</h3>
                                        {loading.ai ? <Loader2 className="w-5 h-5 mx-auto animate-spin text-purple-600" /> : (aiSuggestions.length > 0 ? aiSuggestions.map(suggestion => (
                                            <div key={suggestion.title} className="p-3 bg-purple-50 text-purple-800 rounded-lg text-sm mb-2 border border-purple-100">
                                                <p><strong>{suggestion.title}</strong> <span className="text-xs opacity-70">({suggestion.priority})</span></p>
                                                <p className="text-xs">{suggestion.reasoning}</p>
                                            </div>
                                        )) : <p className="text-sm text-gray-500">Inga specifika förslag just nu.</p>)}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center min-h-[400px]">
                                    <Briefcase className="w-16 h-16 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-700">Välj ett lead</h3>
                                    <p className="text-gray-500 mt-1">Välj ett lead från listan till vänster för att se detaljer och AI-förslag.</p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="hidden xl:block space-y-6 overflow-y-auto pr-2">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold mb-3 flex items-center"><Rss className="w-5 h-5 mr-2 text-orange-500" />Nya Affärsmöjligheter</h3>
                                {loading.rss ? <Loader2 className="w-5 h-5 mx-auto animate-spin text-orange-600" /> : (
                                    <div className="space-y-3">
                                        {rssArticles.slice(0, 5).map(item => (
                                            <div key={item.link} className="p-2 border-l-4 border-orange-200 hover:bg-orange-50 transition-colors">
                                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm hover:underline text-gray-800">{item.title}</a>
                                                <button onClick={() => handleCreateFromArticle(item)} className="text-xs text-primary-600 hover:underline mt-1 font-semibold block">Skapa lead av detta &rarr;</button>
                                            </div>
                                        ))}
                                        {rssArticles.length === 0 && <p className="text-sm text-gray-400">Inga artiklar tillgängliga.</p>}
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold mb-3 flex items-center"><CheckSquare className="w-5 h-5 mr-2 text-green-500" />Mina Uppgifter</h3>
                                {loading.tasks ? <Loader2 className="w-5 h-5 mx-auto animate-spin text-green-600" /> : (
                                    <div className="space-y-2">
                                        {salesTasks.filter(t => !t.is_completed).slice(0, 5).map(task => (
                                            <div key={task.id} className="flex items-center group">
                                                <button onClick={() => handleTaskToggle(task)} className="p-1">
                                                    <Square className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors" />
                                                </button>
                                                <label className="ml-2 text-sm text-gray-700">{task.title}</label>
                                            </div>
                                        ))}
                                        {salesTasks.filter(t => !t.is_completed).length === 0 && <p className="text-sm text-gray-400 p-2">Inga aktiva uppgifter. Bra jobbat!</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* Reminder Modal */}
            {
                reminderEntity && (
                    <ReminderModal
                        isOpen={isReminderModalOpen}
                        onClose={() => setIsReminderModalOpen(false)}
                        entityType="lead"
                        entityId={reminderEntity.id}
                        entityTitle={reminderEntity.title}
                    />
                )
            }
        </>
    );
};

export default LeadManagement;

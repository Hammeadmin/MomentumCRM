/**
 * PaymentsTable Component
 * 
 * Dedicated payments view showing invoices with payment-focused columns.
 * Based on AddHub screenshot 80.
 */

import { useState, useMemo } from 'react';
import {
    Search,
    ChevronUp,
    ChevronDown,
    MoreHorizontal,
    User,
    Calendar,
    Mail,
    AlertTriangle,
    CheckCircle,
    Clock,
    DollarSign,
    Send
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS } from '../types/database';
import { FilterTabs, useFilterTabs, StatusBadge } from './ui';
import type { FilterTab } from './ui/FilterTabs';

interface PaymentsTableProps {
    invoices: Invoice[];
    loading?: boolean;
    onInvoiceClick: (invoice: Invoice) => void;
    onSendCustomerReminder?: (invoiceId: string) => void;
    onSetInternalReminder?: (invoiceId: string) => void;
    onMarkPaid?: (invoiceId: string) => void;
}

type SortField = 'due_date' | 'amount' | 'customer' | 'status' | 'invoice_number';
type SortDirection = 'asc' | 'desc';

// Payment-focused filter categories
const PAYMENT_FILTER_MAP: Record<string, InvoiceStatus[]> = {
    all: [],
    pending: ['sent'],
    overdue: ['overdue'],
    paid: ['paid'],
    draft: ['draft']
};

export function PaymentsTable({
    invoices,
    loading,
    onInvoiceClick,
    onSendCustomerReminder,
    onSetInternalReminder,
    onMarkPaid
}: PaymentsTableProps) {
    const { activeTab, setActiveTab } = useFilterTabs('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('due_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Calculate counts for tabs
    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = { all: invoices.length };

        // Count by status
        counts.pending = invoices.filter(i => i.status === 'sent').length;
        counts.overdue = invoices.filter(i => i.status === 'overdue' ||
            (i.due_date && isPast(new Date(i.due_date)) && i.status === 'sent')).length;
        counts.paid = invoices.filter(i => i.status === 'paid').length;
        counts.draft = invoices.filter(i => i.status === 'draft').length;

        return counts;
    }, [invoices]);

    const filterTabs: FilterTab[] = [
        { key: 'all', label: 'Alla', count: tabCounts.all },
        { key: 'pending', label: 'Obetalda', count: tabCounts.pending },
        { key: 'overdue', label: 'Förfallna', count: tabCounts.overdue },
        { key: 'paid', label: 'Betalda', count: tabCounts.paid },
        { key: 'draft', label: 'Utkast', count: tabCounts.draft }
    ];

    // Calculate total amounts
    const totals = useMemo(() => {
        const pending = invoices
            .filter(i => i.status === 'sent' || i.status === 'overdue')
            .reduce((sum, i) => sum + (i.amount || 0), 0);
        const overdue = invoices
            .filter(i => i.status === 'overdue' || (i.due_date && isPast(new Date(i.due_date)) && i.status === 'sent'))
            .reduce((sum, i) => sum + (i.amount || 0), 0);
        return { pending, overdue };
    }, [invoices]);

    // Filter and sort
    const filteredInvoices = useMemo(() => {
        let result = [...invoices];

        // Apply status filter
        if (activeTab !== 'all') {
            if (activeTab === 'overdue') {
                result = result.filter(i =>
                    i.status === 'overdue' ||
                    (i.due_date && isPast(new Date(i.due_date)) && i.status === 'sent')
                );
            } else {
                const allowedStatuses = PAYMENT_FILTER_MAP[activeTab] || [];
                result = result.filter(i => allowedStatuses.includes(i.status));
            }
        }

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(i =>
                i.invoice_number?.toLowerCase().includes(query) ||
                i.customer?.name?.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let aVal: any, bVal: any;

            switch (sortField) {
                case 'invoice_number':
                    aVal = a.invoice_number || '';
                    bVal = b.invoice_number || '';
                    break;
                case 'amount':
                    aVal = a.amount || 0;
                    bVal = b.amount || 0;
                    break;
                case 'customer':
                    aVal = a.customer?.name?.toLowerCase() || '';
                    bVal = b.customer?.name?.toLowerCase() || '';
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                default:
                    aVal = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                    bVal = b.due_date ? new Date(b.due_date).getTime() : Infinity;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [invoices, activeTab, searchQuery, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />;
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('sv-SE', {
            style: 'currency',
            currency: 'SEK',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        return format(new Date(dateStr), 'd MMM yyyy', { locale: sv });
    };

    const getDaysOverdue = (dueDate: string | null | undefined) => {
        if (!dueDate) return null;
        const due = new Date(dueDate);
        if (!isPast(due)) return null;
        return differenceInDays(new Date(), due);
    };

    const getPaymentStatus = (invoice: Invoice): string => {
        if (invoice.status === 'paid') return 'paid';
        if (invoice.status === 'overdue') return 'overdue';
        if (invoice.due_date && isPast(new Date(invoice.due_date))) return 'overdue';
        if (invoice.status === 'sent') return 'pending';
        return 'draft';
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div>
                    <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500">Väntar på betalning</p>
                            <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatCurrency(totals.pending)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500">Förfallna</p>
                            <p className="text-xl font-bold text-red-600">{formatCurrency(totals.overdue)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <FilterTabs
                            tabs={filterTabs}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            variant="pills"
                            size="sm"
                        />

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Sök faktura..."
                                className="pl-9 pr-4 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500 w-64"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort('invoice_number')} className="flex items-center gap-1 hover:text-zinc-700">
                                        Faktura
                                        <SortIcon field="invoice_number" />
                                    </button>
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort('customer')} className="flex items-center gap-1 hover:text-zinc-700">
                                        Kund
                                        <SortIcon field="customer" />
                                    </button>
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-zinc-700">
                                        Belopp
                                        <SortIcon field="amount" />
                                    </button>
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort('due_date')} className="flex items-center gap-1 hover:text-zinc-700">
                                        Förfallodatum
                                        <SortIcon field="due_date" />
                                    </button>
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-zinc-700">
                                        Status
                                        <SortIcon field="status" />
                                    </button>
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    Påminnelser
                                </th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                                        {searchQuery ? 'Inga fakturor matchar sökningen' : 'Inga fakturor att visa'}
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => {
                                    const daysOverdue = getDaysOverdue(invoice.due_date);
                                    const paymentStatus = getPaymentStatus(invoice);

                                    return (
                                        <tr
                                            key={invoice.id}
                                            onClick={() => onInvoiceClick(invoice)}
                                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                        >
                                            {/* Invoice Number */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                        <DollarSign className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                            #{invoice.invoice_number}
                                                        </p>
                                                        {invoice.email_sent && (
                                                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                                <Mail className="w-3 h-3" /> Skickad
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Customer */}
                                            <td className="px-4 py-3">
                                                {invoice.customer ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                                            <User className="w-3 h-3 text-zinc-500" />
                                                        </div>
                                                        <span className="text-sm text-zinc-900 dark:text-white truncate max-w-[150px]">
                                                            {invoice.customer.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-400">-</span>
                                                )}
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                                                    {formatCurrency(invoice.amount)}
                                                </span>
                                            </td>

                                            {/* Due Date */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                    <span className={`text-sm ${daysOverdue ? 'text-red-600 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                                        {formatDate(invoice.due_date)}
                                                    </span>
                                                    {daysOverdue && daysOverdue > 0 && (
                                                        <span className="text-xs text-red-500 ml-1">
                                                            ({daysOverdue}d försenad)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <StatusBadge
                                                    status={paymentStatus}
                                                    customLabel={INVOICE_STATUS_LABELS[invoice.status]}
                                                    size="sm"
                                                />
                                            </td>

                                            {/* Reminders */}
                                            <td className="px-4 py-3">
                                                {paymentStatus === 'overdue' && onSendCustomerReminder ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onSendCustomerReminder) {
                                                                onSendCustomerReminder(invoice.id);
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Send className="w-3 h-3" />
                                                        Påminn
                                                    </button>
                                                ) : paymentStatus === 'paid' ? (
                                                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Betald
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-zinc-400">-</span>
                                                )}
                                            </td>

                                            {/* Actions Dropdown */}
                                            <td className="px-4 py-3 relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === invoice.id ? null : invoice.id);
                                                    }}
                                                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {openDropdownId === invoice.id && (
                                                    <div className="absolute right-4 top-full mt-1 z-50 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 min-w-[160px]">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onInvoiceClick(invoice);
                                                                setOpenDropdownId(null);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                            Visa faktura
                                                        </button>
                                                        {onSendCustomerReminder && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (paymentStatus !== 'paid') {
                                                                        onSendCustomerReminder(invoice.id);
                                                                    }
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                disabled={paymentStatus === 'paid'}
                                                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${paymentStatus === 'paid'
                                                                    ? 'text-zinc-400 cursor-not-allowed'
                                                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                                                    }`}
                                                            >
                                                                <Send className="w-4 h-4" />
                                                                Skicka påminnelse
                                                            </button>
                                                        )}
                                                        {onSetInternalReminder && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSetInternalReminder(invoice.id);
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                            >
                                                                <Clock className="w-4 h-4" />
                                                                Sätt intern påminnelse
                                                            </button>
                                                        )}
                                                        {onMarkPaid && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (paymentStatus !== 'paid') {
                                                                        onMarkPaid(invoice.id);
                                                                    }
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                disabled={paymentStatus === 'paid'}
                                                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${paymentStatus === 'paid'
                                                                    ? 'text-zinc-400 cursor-not-allowed'
                                                                    : 'text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                                                    }`}
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                                {paymentStatus === 'paid' ? 'Redan betald' : 'Markera betald'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <p className="text-xs text-zinc-500">
                        Visar {filteredInvoices.length} av {invoices.length} fakturor
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PaymentsTable;

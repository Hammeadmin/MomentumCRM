import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Download, RefreshCw } from 'lucide-react';
import PaymentsTable from '../components/PaymentsTable';
import PaymentDetailModal from '../components/PaymentDetailModal';
import ReminderModal from '../components/ReminderModal';
import SendCustomerReminderModal from '../components/SendCustomerReminderModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { Invoice } from '../types/database';

function Payments() {
    const { organisationId, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { success, error: showError, info } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false);
    const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);

    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isCustomerReminderOpen, setIsCustomerReminderOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceForReminder, setInvoiceForReminder] = useState<Invoice | null>(null);

    useEffect(() => {
        if (organisationId) {
            fetchInvoices();
        }
    }, [organisationId]);

    useEffect(() => {
        if (location.state?.openPaymentId && invoices.length > 0) {
            const invoiceToOpen = invoices.find(i => i.id === location.state.openPaymentId);
            if (invoiceToOpen) {
                setSelectedInvoiceForDetail(invoiceToOpen);
                setIsPaymentDetailOpen(true);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, invoices]);

    const fetchInvoices = async () => {
        if (!organisationId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customer:customers(id, name, email, phone_number, city),
                    assigned_user:user_profiles!invoices_assigned_user_id_fkey(id, full_name)
                `)
                .eq('organisation_id', organisationId)
                .order('due_date', { ascending: true });

            if (error) throw error;
            setInvoices(data || []);
        } catch (err) {
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvoiceClick = (invoice: Invoice) => {
        setSelectedInvoiceForDetail(invoice);
        setIsPaymentDetailOpen(true);
    };

    const handleInternalReminder = (invoiceId: string) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if (invoice) {
            setSelectedInvoice(invoice);
            setIsReminderModalOpen(true);
        }
    };

    const handleCustomerReminder = (invoiceId: string) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if (invoice) {
            setInvoiceForReminder(invoice);
            setIsCustomerReminderOpen(true);
        }
    };

    const handleMarkPaid = async (invoiceId: string) => {
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid', sent_by_user_id: user?.id })
                .eq('id', invoiceId);

            if (error) throw error;
            success('Faktura betald', 'Fakturan har markerats som betald.');
            fetchInvoices();
        } catch (err) {
            console.error('Error marking invoice as paid:', err);
            showError('Fel', 'Kunde inte uppdatera fakturan.');
        }
    };

    const handleSendAgain = async (invoiceId: string) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if (invoice) {
            navigate('/app/fakturor', { state: { openInvoiceId: invoiceId, openEmailModal: true } });
        }
    };

    const handleDuplicate = async (invoiceId: string) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if (!invoice || !organisationId) return;

        try {
            const { data: newNumber } = await supabase.rpc('generate_invoice_number', {
                org_id: organisationId
            });

            const { data, error } = await supabase
                .from('invoices')
                .insert({
                    organisation_id: organisationId,
                    customer_id: invoice.customer_id,
                    order_id: invoice.order_id,
                    invoice_number: newNumber || `INV-${Date.now()}`,
                    amount: invoice.amount,
                    net_amount: invoice.net_amount,
                    vat_amount: invoice.vat_amount,
                    vat_rate: invoice.vat_rate,
                    line_items: invoice.line_items,
                    status: 'draft',
                    notes: invoice.notes,
                    payment_terms: invoice.payment_terms,
                    job_type: invoice.job_type,
                    team_members_involved: invoice.team_members_involved,
                    work_summary: invoice.work_summary,
                    created_by_user_id: user?.id
                })
                .select()
                .single();

            if (error) throw error;

            await supabase.from('invoice_history').insert({
                organisation_id: organisationId,
                invoice_id: data.id,
                action_type: 'duplicated',
                performed_by_user_id: user?.id,
                details: { source_invoice_id: invoiceId, source_invoice_number: invoice.invoice_number }
            });

            success('Faktura duplicerad', `Ny faktura #${data.invoice_number} skapad.`);
            fetchInvoices();
        } catch (err) {
            console.error('Error duplicating invoice:', err);
            showError('Fel', 'Kunde inte duplicera fakturan.');
        }
    };

    const handleNavigateToInvoice = (invoiceId: string) => {
        navigate('/app/fakturor', { state: { openInvoiceId: invoiceId } });
    };

    const handleExport = () => {
        const csvContent = invoices.map(inv =>
            `${inv.invoice_number},${inv.customer?.name || ''},${inv.amount},${inv.status},${inv.due_date || ''}`
        ).join('\n');
        const header = 'Fakturanummer,Kund,Belopp,Status,Förfallodatum\n';
        const blob = new Blob([header + csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'betalningar.csv';
        a.click();
        URL.revokeObjectURL(url);
        success('Export klar', 'Betalningar har exporterats till CSV.');
    };

    return (
        <div className="space-y-4">
            <PaymentDetailModal
                isOpen={isPaymentDetailOpen}
                onClose={() => {
                    setIsPaymentDetailOpen(false);
                    setSelectedInvoiceForDetail(null);
                }}
                invoice={selectedInvoiceForDetail}
                onMarkPaid={handleMarkPaid}
                onSendReminder={handleCustomerReminder}
                onSendAgain={handleSendAgain}
                onDuplicate={handleDuplicate}
                onNavigateToInvoice={handleNavigateToInvoice}
                onRefresh={fetchInvoices}
            />

            {selectedInvoice && (
                <ReminderModal
                    isOpen={isReminderModalOpen}
                    onClose={() => {
                        setIsReminderModalOpen(false);
                        setSelectedInvoice(null);
                    }}
                    entityType="invoice"
                    entityId={selectedInvoice.id}
                    entityTitle={`Faktura ${selectedInvoice.invoice_number}`}
                    onSave={() => {
                        fetchInvoices();
                    }}
                />
            )}

            {invoiceForReminder && (
                <SendCustomerReminderModal
                    isOpen={isCustomerReminderOpen}
                    onClose={() => {
                        setIsCustomerReminderOpen(false);
                        setInvoiceForReminder(null);
                    }}
                    entityType="invoice"
                    entity={invoiceForReminder}
                    customerEmail={invoiceForReminder.customer?.email || undefined}
                    customerPhone={invoiceForReminder.customer?.phone_number || undefined}
                />
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Betalningar</h1>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchInvoices}
                        className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Uppdatera"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportera
                    </button>
                    <button
                        onClick={() => navigate('/app/fakturor')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Ny faktura
                    </button>
                </div>
            </div>

            <PaymentsTable
                invoices={invoices}
                loading={loading}
                onInvoiceClick={handleInvoiceClick}
                onSendCustomerReminder={handleCustomerReminder}
                onSetInternalReminder={handleInternalReminder}
                onMarkPaid={handleMarkPaid}
            />
        </div>
    );
}

export default Payments;

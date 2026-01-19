/**
 * Payments Page
 * 
 * Dedicated payment tracking view with invoice status and reminders.
 * Matches AddHub's payments section design.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, RefreshCw } from 'lucide-react';
import PaymentsTable from '../components/PaymentsTable';
import ReminderModal from '../components/ReminderModal';
import SendCustomerReminderModal from '../components/SendCustomerReminderModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { Invoice } from '../types/database';

function Payments() {
    const { organisationId } = useAuth();
    const navigate = useNavigate();
    const { success, error: showError, info } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    // Reminder modal state
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isCustomerReminderOpen, setIsCustomerReminderOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceForReminder, setInvoiceForReminder] = useState<Invoice | null>(null);

    useEffect(() => {
        if (organisationId) {
            fetchInvoices();
        }
    }, [organisationId]);

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
        // Navigate to full invoice management page
        navigate('/app/fakturor');
        // In the future this could open a detail modal or specific invoice page
        info('Visa faktura', `Öppnar faktura #${invoice.invoice_number}`);
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
                .update({ status: 'paid' })
                .eq('id', invoiceId);

            if (error) throw error;
            success('Faktura betald', 'Fakturan har markerats som betald.');
            fetchInvoices();
        } catch (err) {
            console.error('Error marking invoice as paid:', err);
            showError('Fel', 'Kunde inte uppdatera fakturan.');
        }
    };

    const handleExport = () => {
        // Export to CSV
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
            {/* Reminder Modal (Internal) */}
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

            {/* Customer Reminder Modal (SMS/Email) */}
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

            {/* Header */}
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

            {/* Payments Table */}
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

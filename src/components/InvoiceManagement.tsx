import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
  Receipt, Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2,
  CheckCircle, Send, AlertCircle, Package, CreditCard, User, Users2,
  Bell, Loader2, Copy, ExternalLink
} from 'lucide-react';
import { Button } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useInvoices } from '../hooks/useInvoices';
import { useInvoiceActions } from '../hooks/useInvoiceActions';
import { useTranslation } from '../locales/sv';
import {
  type InvoiceWithRelations, type InvoiceFilters,
} from '../lib/invoices';

import { canCreateCreditNote } from '../lib/creditNotes';
import {
  getOrderNotes, getAttachmentsForOrder, addAttachmentToOrder,
  deleteOrderNote, deleteOrderAttachment, type OrderAttachment,
} from '../lib/orders';
import { formatCurrency, formatDate } from '../lib/database';
import {
  INVOICE_STATUS_LABELS, getInvoiceStatusColor, JOB_TYPE_LABELS, getJobTypeColor,
} from '../types/database';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import ExportButton from './ExportButton';
import ReminderModal from './ReminderModal';
import CreditNoteModal from './CreditNoteModal';
import CreditNotesList from './CreditNotesList';
import PrintableInvoices from './invoices/PrintableInvoices';
import CreateEditInvoiceModal from './invoices/modals/CreateEditInvoiceModal';
import InvoiceDetailsModal from './invoices/modals/InvoiceDetailsModal';
import EmailInvoiceModal from './invoices/modals/EmailInvoiceModal';

function InvoiceManagement() {
  const { user, organisationId } = useAuth();
  const { success, error: showError } = useToast();
  const { invoices: t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [activeTab, setActiveTab] = useState<'invoices' | 'ready-to-invoice' | 'credit_notes'>('invoices');

  const {
    invoices, readyToInvoiceOrders, customers, teamMembers, teams,
    systemSettings, savedLineItems, templates, organisation,
    isLoading: loading, error: dataError, refetch: loadData,
  } = useInvoices(filters, activeTab);

  const error = dataError?.message || null;

  // Modal states
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState<InvoiceWithRelations | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceWithRelations | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Selection
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [invoicesToPrint, setInvoicesToPrint] = useState<InvoiceWithRelations[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Fortnox sync
  const [fortnoxSyncing, setFortnoxSyncing] = useState(false);

  // Reminder
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderEntity, setReminderEntity] = useState<{ id: string; title: string } | null>(null);

  // Order/invoice documents
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [orderAttachments, setOrderAttachments] = useState<OrderAttachment[]>([]);
  const [attachmentsToInclude, setAttachmentsToInclude] = useState<Record<string, boolean>>({});
  const [adminNewFiles, setAdminNewFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [invoiceOrderNotes, setInvoiceOrderNotes] = useState<any[]>([]);
  const [invoiceOrderAttachments, setInvoiceOrderAttachments] = useState<OrderAttachment[]>([]);

  // Form state (kept here so handlers and modals share it)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    invoice_number: '', customer_id: '', order_id: '', amount: '', due_date: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    include_rot: false, rot_personnummer: null as string | null,
    rot_organisationsnummer: null as string | null,
    rot_fastighetsbeteckning: null as string | null, rot_amount: 0,
  });
  const [workSummary, setWorkSummary] = useState('');
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [manualCustomerForm, setManualCustomerForm] = useState({
    name: '', customer_type: 'company' as 'company' | 'private',
    org_number: '', email: '', address: '', postal_code: '', city: '',
  });
  const [preInvoiceAssignmentType, setPreInvoiceAssignmentType] = useState<'individual' | 'team'>('individual');
  const [preInvoiceAssignedToUserId, setPreInvoiceAssignedToUserId] = useState<string | null>(null);
  const [preInvoiceAssignedToTeamId, setPreInvoiceAssignedToTeamId] = useState<string | null>(null);

  // Print
  const printComponentRef = useRef(null);
  const onAfterPrint = useCallback(() => { setInvoicesToPrint([]); setSelectedInvoices([]); }, []);
  const reactToPrintHandle = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Fakturor-${new Date().toISOString().split('T')[0]}`,
    onAfterPrint,
  });
  useEffect(() => { if (invoicesToPrint.length > 0) reactToPrintHandle(); }, [invoicesToPrint, reactToPrintHandle]);

  // Navigation state
  useEffect(() => {
    if (location.state?.openInvoiceId && invoices.length > 0) {
      const inv = invoices.find(i => i.id === location.state.openInvoiceId);
      if (inv) {
        setSelectedInvoice(inv);
        loadInvoiceDocuments(inv.order_id);
        setShowDetailsModal(true);
        if (location.state?.openEmailModal) setShowEmailModal(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, invoices]);

  // Order selection init
  useEffect(() => {
    if (selectedOrder && showUnifiedModal) {
      setWorkSummary(selectedOrder.job_description || selectedOrder.description || '');
      setPreInvoiceAssignmentType(selectedOrder.assignment_type || 'individual');
      setPreInvoiceAssignedToUserId(selectedOrder.assigned_to_user_id || null);
      setPreInvoiceAssignedToTeamId(selectedOrder.assigned_to_team_id || null);
    }
  }, [selectedOrder, showUnifiedModal]);

  // Document loaders
  const loadInvoiceDocuments = async (orderId: string | undefined) => {
    if (!orderId) { setInvoiceOrderNotes([]); setInvoiceOrderAttachments([]); return; }
    const [notesRes, attachmentsRes] = await Promise.all([getOrderNotes(orderId), getAttachmentsForOrder(orderId)]);
    setInvoiceOrderNotes((notesRes.data || []).filter((n: any) => n.include_in_invoice));
    setInvoiceOrderAttachments((attachmentsRes.data || []).filter((a: any) => a.include_in_invoice));
  };

  const loadOrderDocuments = async (orderId: string) => {
    if (!orderId) { setOrderNotes([]); setOrderAttachments([]); return; }
    const [notesRes, attachmentsRes] = await Promise.all([getOrderNotes(orderId), getAttachmentsForOrder(orderId)]);
    setOrderNotes(notesRes.data || []);
    setOrderAttachments(attachmentsRes.data || []);
    const init: Record<string, boolean> = {};
    (notesRes.data || []).forEach((n: any) => { init[`note_${n.id}`] = n.include_in_invoice; });
    (attachmentsRes.data || []).forEach((a: any) => { init[`attachment_${a.id}`] = a.include_in_invoice; });
    setAttachmentsToInclude(init);
  };

  // Helpers
  const toNumber = (v: unknown): number => typeof v === 'number' ? v : typeof v === 'string' ? (parseFloat(v) || 0) : 0;
  const calculateSubtotal = (items: any[]) => items.reduce((s, i) => s + toNumber(i.total), 0);
  const calculateVAT = (sub: number) => toNumber(sub) * 0.25;
  const calculateTotal = (items: any[]) => { const s = calculateSubtotal(items); return s + calculateVAT(s); };

  const addLineItem = () => setFormData((p: typeof formData) => ({ ...p, line_items: [...p.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }] }));
  const removeLineItem = (i: number) => { if (formData.line_items.length > 1) setFormData((p: typeof formData) => ({ ...p, line_items: p.line_items.filter((_: unknown, idx: number) => idx !== i) })); };
  const updateLineItem = (i: number, field: string, value: unknown) => setFormData((p: typeof formData) => {
    const items = p.line_items.map((item: typeof formData.line_items[0], idx: number) => { if (idx !== i) return item; const u = { ...item, [field]: value }; u.total = u.quantity * u.unit_price; return u; });
    return { ...p, line_items: items };
  });
  const handleAddSavedItem = (itemId: string) => {
    const item = savedLineItems.find(i => i.id === itemId); if (!item) return;
    const ni = { description: item.name, quantity: 1, unit_price: item.unit_price, total: item.unit_price };
    const last = formData.line_items[formData.line_items.length - 1];
    if (formData.line_items.length === 1 && !last.description && last.unit_price === 0) setFormData((p: typeof formData) => ({ ...p, line_items: [ni] }));
    else setFormData((p: typeof formData) => ({ ...p, line_items: [...p.line_items, ni] }));
  };
  const handleSaveLineItem = async (item: { description: string; unit_price: number }) => {
    const { createSavedLineItem } = await import('../lib/database');
    if (!item.description || item.unit_price <= 0) { showError('Fel', 'Beskrivning och pris krävs.'); return; }
    if (savedLineItems.some(s => s.name.toLowerCase() === item.description.toLowerCase())) { showError('Dublett', 'Redan sparad.'); return; }
    const r = await createSavedLineItem(organisationId!, { name: item.description, unit_price: item.unit_price });
    if (r.error) showError('Fel', r.error.message); else { success('Sparad!', t.MESSAGES.LINE_ITEM_SAVED(r.data?.name || '')); await loadData(); }
  };

  const resetForm = () => {
    setFormData({ invoice_number: '', customer_id: '', order_id: '', amount: '', due_date: '', line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }], include_rot: false, rot_personnummer: null, rot_organisationsnummer: null, rot_fastighetsbeteckning: null, rot_amount: 0 });
    setWorkSummary(''); setIsManualCustomer(false);
    setPreInvoiceAssignmentType('individual'); setPreInvoiceAssignedToUserId(null); setPreInvoiceAssignedToTeamId(null);
  };

  // Admin file handlers
  const handleAdminFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setAdminNewFiles(Array.from(e.target.files)); };
  const handleAdminUpload = async () => {
    if (!adminNewFiles.length || !user || !selectedOrder) return;
    setIsUploading(true);
    for (const f of adminNewFiles) await addAttachmentToOrder(selectedOrder.id, user.id, f);
    setIsUploading(false); setAdminNewFiles([]); loadOrderDocuments(selectedOrder.id);
    success(`${adminNewFiles.length} fil(er) uppladdade.`);
  };
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Ta bort anteckning?')) return;
    await deleteOrderNote(noteId); loadOrderDocuments(selectedOrder!.id); success('Anteckning borttagen.');
  };
  const handleDeleteAttachment = async (att: OrderAttachment) => {
    if (!confirm(`Ta bort "${att.file_name}"?`)) return;
    await deleteOrderAttachment(att); loadOrderDocuments(selectedOrder!.id); success('Fil borttagen.');
  };

  // ── Initialize useInvoiceActions hook ────────────────────────────────────────
  const invoiceActions = useInvoiceActions({
    organisationId: organisationId!,
    user,
    invoices,
    readyToInvoiceOrders,
    teamMembers,
    teams,
    systemSettings,
    selectedInvoice,
    setSelectedInvoice,
    selectedOrder,
    setSelectedOrder,
    editingInvoice,
    setEditingInvoice,
    setShowUnifiedModal,
    activeTab,
    setActiveTab,
    invoiceToDelete,
    setShowDeleteDialog,
    setInvoiceToDelete,
    selectedOrders,
    setSelectedOrders,
    setBulkProcessing,
    attachmentsToInclude,
    formData,
    workSummary,
    preInvoiceAssignmentType,
    preInvoiceAssignedToUserId,
    preInvoiceAssignedToTeamId,
    isManualCustomer,
    manualCustomerForm,
    calculateTotal,
    resetForm,
    loadData,
    formLoading,
    setFormLoading,
    showError: (title: string, message: string) => showError(title, message),
    showSuccess: (title: string, message: string) => success(title, message),
    t,
  });

  const {
    handleCreateInvoice,
    handleUpdateInvoice,
    handleSavePreInvoiceChangesAndCreateInvoice,
    handleBulkCreateInvoices,
    handleDeleteInvoice,
    handleMarkAsPaid,
    handleDuplicateInvoice,
    handleSaveAssignment,
    handleManualSigning,
  } = invoiceActions;

  // Component-local UI helpers
  const handleEditInvoiceClick = (invoice: InvoiceWithRelations) => {
    setEditingInvoice(invoice); loadOrderDocuments(invoice.order_id || ''); setSelectedOrder(invoice.order || null);
    setFormData({ customer_id: invoice.customer_id || '', order_id: invoice.order_id || '', due_date: invoice.due_date || '', invoice_number: invoice.invoice_number, amount: invoice.amount.toString(), line_items: invoice.invoice_line_items?.length ? invoice.invoice_line_items : [{ description: invoice.job_description || '', quantity: 1, unit_price: invoice.amount, total: invoice.amount }], include_rot: invoice.include_rot || false, rot_personnummer: invoice.rot_personnummer || null, rot_organisationsnummer: invoice.rot_organisationsnummer || null, rot_fastighetsbeteckning: invoice.rot_fastighetsbeteckning || null, rot_amount: invoice.rot_amount || 0 });
    setWorkSummary(invoice.job_description || ''); setPreInvoiceAssignmentType(invoice.assignment_type || 'individual'); setPreInvoiceAssignedToUserId(invoice.assigned_user_id || null); setPreInvoiceAssignedToTeamId(invoice.assigned_team_id || null);
    setShowUnifiedModal(true);
  };

  const toggleInvoiceSelection = (id: string) => setSelectedInvoices((p: string[]) => p.includes(id) ? p.filter((x: string) => x !== id) : [...p, id]);
  const selectAllInvoices = () => setSelectedInvoices(selectedInvoices.length === invoices.length ? [] : invoices.map(i => i.id));
  const toggleOrderSelection = (id: string) => setSelectedOrders((p: string[]) => p.includes(id) ? p.filter((x: string) => x !== id) : [...p, id]);
  const selectAllOrders = () => setSelectedOrders(selectedOrders.length === readyToInvoiceOrders.length ? [] : readyToInvoiceOrders.map(o => o.id));
  const handleDownloadSelectedInvoices = () => { const inv = invoices.filter(i => selectedInvoices.includes(i.id)); if (inv.length) setInvoicesToPrint(inv); else showError('Fel', 'Välj minst en faktura.'); };
  const handleOpenReminder = (invoice: InvoiceWithRelations) => { setReminderEntity({ id: invoice.id, title: `Faktura #${invoice.invoice_number} - ${invoice.customer?.name}` }); setIsReminderModalOpen(true); };
  const handleSendAgain = (invoice: InvoiceWithRelations) => { setSelectedInvoice(invoice); setShowEmailModal(true); };
  const handleNavigateToPayments = (invoice: InvoiceWithRelations) => navigate(invoice.status === 'paid' ? '/app/betalningar' : '/app/betalningar', { state: invoice.status === 'paid' ? { openPaymentId: invoice.id } : undefined });

  // Fortnox sync handlers — wrap hook functions with local UI state
  const handleSyncAllToFortnox = async () => {
    setFortnoxSyncing(true);
    try { await invoiceActions.handleSyncAllToFortnox(); }
    finally { setFortnoxSyncing(false); }
  };

  const handleSyncFromFortnox = async () => {
    setFortnoxSyncing(true);
    try { await invoiceActions.handleSyncFromFortnox(); }
    finally { setFortnoxSyncing(false); }
  };

  const handleSyncSingleToFortnox = async (invoiceId: string) => {
    setFortnoxSyncing(true);
    try { await invoiceActions.handleSyncSingleToFortnox(invoiceId); }
    finally { setFortnoxSyncing(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-4"><Receipt className="w-6 h-6 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Fakturor</h1><p className="text-sm text-gray-500">Laddar...</p></div>
      </div>
      <div className="bg-white shadow rounded-lg p-8 flex flex-col items-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" /><p className="text-sm text-gray-500">Laddar faktureringsinformation...</p></div>
    </div>
  );

  if (error) return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Fakturor</h1>
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center">
        <AlertCircle className="w-10 h-10 text-red-600 mr-4" />
        <div><h3 className="text-lg font-semibold text-red-900">Kunde inte ladda fakturor</h3><p className="text-red-700 mt-1">{error}</p></div>
        <button onClick={loadData} className="ml-auto px-4 py-2 bg-red-600 text-white rounded-md text-sm">Försök igen</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-4 shadow-lg shadow-emerald-500/20"><Receipt className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">Fakturor</h1><p className="text-sm text-gray-500">{invoices.length} fakturor • {readyToInvoiceOrders.length} ordrar redo</p></div>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={activeTab === 'invoices' ? invoices : readyToInvoiceOrders} filename={`fakturor-${new Date().toISOString().split('T')[0]}`} title="Exportera" />
          {activeTab === 'invoices' && (
            <Button variant="primary" size="md" onClick={() => { resetForm(); setEditingInvoice(null); setSelectedOrder(null); setShowUnifiedModal(true); }} icon={<Plus className="w-4 h-4" />}>Skapa Faktura</Button>
          )}
        </div>
      </div>

      {/* Fortnox Toolbar — only visible when Fortnox is connected */}
      {organisation?.fortnox_access_token && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mr-3">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Fortnox Synkronisering</h3>
                <p className="text-xs text-gray-500">Synka fakturor med din Fortnox bokföring</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncAllToFortnox}
                disabled={fortnoxSyncing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {fortnoxSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Synka alla till Fortnox
              </button>
              <button
                onClick={handleSyncFromFortnox}
                disabled={fortnoxSyncing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {fortnoxSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                Hämta från Fortnox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[{ id: 'invoices', label: 'Alla Fakturor', icon: Receipt }, { id: 'ready-to-invoice', label: 'Hantera Fakturor', icon: Package }, { id: 'credit_notes', label: 'Kreditfakturor', icon: CreditCard }].map((tab: { id: string; label: string; icon: React.ElementType }) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <Icon className="w-4 h-4 mr-2" />{tab.label}
                {tab.id === 'ready-to-invoice' && readyToInvoiceOrders.length > 0 && <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{readyToInvoiceOrders.length}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <>
          {selectedInvoices.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{selectedInvoices.length} fakturor valda</span>
                <button onClick={handleDownloadSelectedInvoices} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm"><Download className="w-4 h-4 mr-2" />Ladda ner {selectedInvoices.length} PDF</button>
              </div>
            </div>
          )}
          {showFilters && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Sök</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" value={filters.search || ''} onChange={e => setFilters((p: InvoiceFilters) => ({ ...p, search: e.target.value }))} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md" placeholder="Sök fakturor..." /></div></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={filters.status || 'all'} onChange={e => setFilters((p: InvoiceFilters) => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md"><option value="all">Alla statusar</option>{Object.entries(INVOICE_STATUS_LABELS).map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Kund</label><select value={filters.customer || 'all'} onChange={e => setFilters((p: InvoiceFilters) => ({ ...p, customer: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md"><option value="all">Alla kunder</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="flex items-end"><button onClick={() => setFilters({})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">Rensa filter</button></div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Fakturor</h3>
              <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm"><Filter className="w-4 h-4 mr-2" />Filter</button>
            </div>
            {invoices.length === 0 ? (
              <EmptyState type="general" title="Inga fakturor ännu" description="Skapa din första faktura eller generera fakturor från färdiga ordrar." actionText="Skapa Faktura" onAction={() => setShowUnifiedModal(true)} />
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead><tr>
                    <th className="px-4 py-3"><input type="checkbox" checked={selectedInvoices.length === invoices.length && invoices.length > 0} onChange={selectAllInvoices} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /></th>
                    <th>{t.TABLE.INVOICE_NUMBER}</th><th>{t.TABLE.CUSTOMER}</th><th>{t.TABLE.AMOUNT}</th><th>{t.TABLE.STATUS}</th><th>{t.TABLE.DUE_DATE}</th><th>{t.TABLE.CREATED}</th><th className="text-right">{t.TABLE.ACTIONS}</th>
                  </tr></thead>
                  <tbody>
                    {invoices.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedInvoice(invoice); loadInvoiceDocuments(invoice.order_id); setShowDetailsModal(true); }}>
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedInvoices.includes(invoice.id)} onChange={() => toggleInvoiceSelection(invoice.id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /></td>
                        <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>{invoice.email_sent && <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><Send className="w-3 h-3" /> Skickad</div>}{(invoice as any).fortnox_invoice_number && <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5" title={`Fortnox #${(invoice as any).fortnox_invoice_number}`}><CheckCircle className="w-3 h-3" /> Fortnox</div>}</td>
                        <td className="px-6 py-4"><div className="text-sm text-gray-900">{invoice.customer?.name || 'Okänd kund'}</div></td>
                        <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</p>{invoice.credited_amount && invoice.credited_amount > 0 && <p className="text-sm text-red-600">Krediterat: {formatCurrency(Math.abs(invoice.credited_amount))}</p>}{invoice.net_amount !== invoice.amount && <p className="text-sm font-medium text-gray-700">Netto: {formatCurrency(invoice.net_amount || invoice.amount)}</p>}</td>
                        <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}`}>{INVOICE_STATUS_LABELS[invoice.status]}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-900">{invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.created_at)}</td>
                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
                              <button onClick={() => { setSelectedInvoice(invoice); loadInvoiceDocuments(invoice.order_id); setShowDetailsModal(true); }} className="p-1.5 rounded-md text-gray-600 hover:text-blue-600 hover:bg-white" title="Visa"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => handleEditInvoiceClick(invoice)} className="p-1.5 rounded-md text-gray-600 hover:text-blue-600 hover:bg-white" title="Redigera"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleSendAgain(invoice)} className="p-1.5 rounded-md text-gray-600 hover:text-cyan-600 hover:bg-white" title="Skicka"><Send className="w-4 h-4" /></button>
                            </div>
                            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
                              <button onClick={() => handleDuplicateInvoice(invoice)} className="p-1.5 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-white" title="Duplicera"><Copy className="w-4 h-4" /></button>
                              <button onClick={() => handleOpenReminder(invoice)} className="p-1.5 rounded-md text-gray-600 hover:text-amber-600 hover:bg-white" title="Påminnelse"><Bell className="w-4 h-4" /></button>
                              {invoice.status === 'paid' && <button onClick={() => handleNavigateToPayments(invoice)} className="p-1.5 rounded-md text-gray-600 hover:text-emerald-600 hover:bg-white" title="Betalning"><ExternalLink className="w-4 h-4" /></button>}
                              {invoice.status !== 'paid' && <button onClick={() => handleMarkAsPaid(invoice.id)} className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-white" title="Markera betald"><CheckCircle className="w-4 h-4" /></button>}
                            </div>
                            <div className="flex items-center gap-0.5">
                              {canCreateCreditNote(invoice) && <button onClick={() => setShowCreditNoteModal(invoice)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600" title="Kreditera"><CreditCard className="w-4 h-4" /></button>}
                              <button onClick={() => { setInvoiceToDelete(invoice); setShowDeleteDialog(true); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600" title="Ta bort"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Ready to Invoice Tab */}
      {activeTab === 'ready-to-invoice' && (
        <div className="space-y-6">
          {readyToInvoiceOrders.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center"><input type="checkbox" checked={selectedOrders.length === readyToInvoiceOrders.length && readyToInvoiceOrders.length > 0} onChange={selectAllOrders} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><span className="ml-2 text-sm text-gray-700">Välj alla ({readyToInvoiceOrders.length})</span></label>
                  {selectedOrders.length > 0 && <span className="text-sm text-gray-600">{selectedOrders.length} valda</span>}
                </div>
                {selectedOrders.length > 0 && <button onClick={handleBulkCreateInvoices} disabled={bulkProcessing} className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm disabled:opacity-50">{bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}Skapa {selectedOrders.length} Fakturor</button>}
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b"><h3 className="text-lg font-semibold text-gray-900">Ordrar redo att fakturera <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{readyToInvoiceOrders.length}</span></h3><p className="text-sm text-gray-600 mt-1">Ordrar med status "Redo att fakturera"</p></div>
            {readyToInvoiceOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500"><Package className="w-12 h-12 mx-auto mb-3 text-gray-400" /><h3 className="text-lg font-medium text-gray-900 mb-2">Inga ordrar redo att fakturera</h3><p className="text-gray-600">Ordrar med status "Redo att fakturera" visas här.</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead><tr>
                    <th className="px-6 py-3 text-left"><input type="checkbox" checked={selectedOrders.length === readyToInvoiceOrders.length && readyToInvoiceOrders.length > 0} onChange={selectAllOrders} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Titel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kund</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Värde</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tilldelning</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum Slutfört</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Åtgärder</th>
                  </tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {readyToInvoiceOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4"><input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => toggleOrderSelection(order.id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /></td>
                        <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{order.title}</div>{order.job_type && <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getJobTypeColor(order.job_type)}`}>{JOB_TYPE_LABELS[order.job_type]}</span>}<div className="text-sm text-gray-500 max-w-xs truncate">{order.job_description || order.description || ''}</div></td>
                        <td className="px-6 py-4"><div className="text-sm text-gray-900">{order.customer?.name || 'Okänd kund'}</div>{order.customer?.email && <div className="text-sm text-gray-500">{order.customer.email}</div>}</td>
                        <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{order.value ? formatCurrency(order.value) : '-'}</div></td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {order.assignment_type === 'individual' && order.assigned_to ? <div className="flex items-center"><User className="w-4 h-4 mr-1 text-gray-400" />{order.assigned_to.full_name}</div>
                            : order.assignment_type === 'team' && order.assigned_team ? <div className="flex items-center"><Users2 className="w-4 h-4 mr-1 text-gray-400" />{order.assigned_team.name}</div>
                              : <span className="text-gray-500">Ej tilldelad</span>}
                        </td>
                        <td className="px-6 py-4"><div className="text-sm text-gray-900">{formatDate(order.created_at)}</div></td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => {
                            setSelectedOrder(order); loadOrderDocuments(order.id);
                            // Extracted quote array fix
                            const actualQuote = Array.isArray(order.quote) ? order.quote[0] : order.quote;
                            const lineItemsFromQuote = actualQuote?.quote_line_items?.length
                              ? actualQuote.quote_line_items.map((item: any) => ({
                                description: item.description || 'Artikel',
                                quantity: item.quantity || 1,
                                unit_price: item.unit_price || 0,
                                total: (item.quantity || 1) * (item.unit_price || 0),
                              }))
                              : [{ description: order.job_description || order.title || '', quantity: 1, unit_price: order.value || 0, total: order.value || 0 }];
                            setFormData({ customer_id: order.customer_id || '', order_id: order.id, due_date: new Date(Date.now() + (systemSettings?.default_payment_terms || 30) * 86400000).toISOString().split('T')[0], invoice_number: '', amount: '', line_items: lineItemsFromQuote, include_rot: order.include_rot || false, rot_personnummer: order.rot_personnummer || null, rot_organisationsnummer: order.rot_organisationsnummer || null, rot_fastighetsbeteckning: order.rot_fastighetsbeteckning || null, rot_amount: order.rot_amount || 0 });
                            setWorkSummary(order.job_description || order.description || ''); setPreInvoiceAssignmentType(order.assignment_type || 'individual'); setPreInvoiceAssignedToUserId(order.assigned_to_user_id || null); setPreInvoiceAssignedToTeamId(order.assigned_to_team_id || null);
                            setShowUnifiedModal(true);
                          }} className="text-blue-600 hover:text-blue-900" title="Granska och redigera"><Edit className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'credit_notes' && <CreditNotesList />}

      {/* Modals */}
      {showDetailsModal && selectedInvoice && (
        <InvoiceDetailsModal
          isOpen={showDetailsModal}
          invoice={selectedInvoice}
          onClose={() => { setShowDetailsModal(false); setSelectedInvoice(null); }}
          onEdit={(inv) => { setShowDetailsModal(false); handleEditInvoiceClick(inv); }}
          onSend={() => { setShowDetailsModal(false); setShowEmailModal(true); }}
          onManualSigning={handleManualSigning}
          onSaveAssignment={handleSaveAssignment}
          templates={templates}
          organisation={organisation}
          systemSettings={systemSettings}
          teamMembers={teamMembers}
          teams={teams}
          invoiceOrderNotes={invoiceOrderNotes}
          invoiceOrderAttachments={invoiceOrderAttachments}
          formLoading={formLoading}
          onSyncToFortnox={organisation?.fortnox_access_token ? handleSyncSingleToFortnox : undefined}
        />
      )}

      {showUnifiedModal && (
        <CreateEditInvoiceModal
          isOpen={showUnifiedModal}
          editingInvoice={editingInvoice}
          selectedOrder={selectedOrder}
          onClose={() => { setShowUnifiedModal(false); setEditingInvoice(null); setSelectedOrder(null); resetForm(); }}
          onSubmit={editingInvoice ? invoiceActions.handleUpdateInvoice : selectedOrder ? invoiceActions.handleSavePreInvoiceChangesAndCreateInvoice : invoiceActions.handleCreateInvoice}
          formLoading={formLoading}
          formData={formData}
          setFormData={setFormData}
          workSummary={workSummary}
          setWorkSummary={setWorkSummary}
          isManualCustomer={isManualCustomer}
          setIsManualCustomer={setIsManualCustomer}
          manualCustomerForm={manualCustomerForm}
          setManualCustomerForm={setManualCustomerForm}
          preInvoiceAssignmentType={preInvoiceAssignmentType}
          setPreInvoiceAssignmentType={setPreInvoiceAssignmentType}
          preInvoiceAssignedToUserId={preInvoiceAssignedToUserId}
          setPreInvoiceAssignedToUserId={setPreInvoiceAssignedToUserId}
          preInvoiceAssignedToTeamId={preInvoiceAssignedToTeamId}
          setPreInvoiceAssignedToTeamId={setPreInvoiceAssignedToTeamId}
          addLineItem={addLineItem}
          removeLineItem={removeLineItem}
          updateLineItem={updateLineItem}
          handleAddSavedItem={handleAddSavedItem}
          handleSaveLineItem={handleSaveLineItem}
          calculateTotal={calculateTotal}
          customers={customers.map(c => ({ id: c.id, name: c.name, email: c.email ?? undefined }))}
          teamMembers={teamMembers}
          teams={teams}
          savedLineItems={savedLineItems}
          orderNotes={orderNotes}
          orderAttachments={orderAttachments}
          attachmentsToInclude={attachmentsToInclude}
          setAttachmentsToInclude={setAttachmentsToInclude}
          adminNewFiles={adminNewFiles}
          isUploading={isUploading}
          handleAdminFileChange={handleAdminFileChange}
          handleAdminUpload={handleAdminUpload}
          handleDeleteNote={handleDeleteNote}
          handleDeleteAttachment={handleDeleteAttachment}
        />
      )}

      {showEmailModal && selectedInvoice && (
        <EmailInvoiceModal
          isOpen={showEmailModal}
          invoice={selectedInvoice}
          onClose={() => { setShowEmailModal(false); setSelectedInvoice(null); }}
          organisation={organisation}
          systemSettings={systemSettings}
          user={user}
          onEmailSent={() => { loadData(); success(t.MESSAGES.SUCCESS_TITLE, t.MESSAGES.EMAIL_SENT(selectedInvoice.customer?.email || '')); }}
        />
      )}

      {showCreditNoteModal && (
        <CreditNoteModal invoice={showCreditNoteModal} isOpen={!!showCreditNoteModal} onClose={() => setShowCreditNoteModal(null)} onCreditNoteCreated={() => { setShowCreditNoteModal(null); success('Kreditfaktura skapad!'); loadData(); }} />
      )}

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => { setShowDeleteDialog(false); setInvoiceToDelete(null); }} onConfirm={handleDeleteInvoice} title="Ta bort faktura" message={`Är du säker på att du vill ta bort fakturan "${invoiceToDelete?.invoice_number}"? Denna åtgärd kan inte ångras.`} confirmText="Ta bort" cancelText="Avbryt" type="danger" />

      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', height: '0', overflow: 'hidden', visibility: 'hidden' }}>
        <PrintableInvoices ref={printComponentRef} invoices={invoicesToPrint} organisation={organisation} systemSettings={systemSettings} />
      </div>

      {reminderEntity && (
        <ReminderModal isOpen={isReminderModalOpen} onClose={() => { setIsReminderModalOpen(false); setReminderEntity(null); }} entityType="invoice" entityId={reminderEntity.id} entityTitle={reminderEntity.title} onSave={() => { setIsReminderModalOpen(false); setReminderEntity(null); }} />
      )}
    </div>
  );
}

export default InvoiceManagement;
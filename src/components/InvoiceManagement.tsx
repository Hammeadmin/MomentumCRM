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
import { useTranslation } from '../locales/sv';
import {
  updateInvoice, deleteInvoice, markInvoiceAsPaid,
  type InvoiceWithRelations, type InvoiceFilters,
} from '../lib/invoices';
import { supabase } from '../lib/supabase';
import {
  syncInvoicesToFortnox,
  syncInvoicesFromFortnox,
} from '../lib/fortnox';

import { canCreateCreditNote } from '../lib/creditNotes';
import {
  getOrderNotes, getAttachmentsForOrder, addAttachmentToOrder,
  deleteOrderNote, deleteOrderAttachment, type OrderAttachment,
} from '../lib/orders';
import { formatCurrency, formatDate } from '../lib/database';
import {
  INVOICE_STATUS_LABELS, getInvoiceStatusColor, JOB_TYPE_LABELS, getJobTypeColor,
  type InvoiceStatus,
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

  // Invoice actions
  const handleCreateInvoice = async () => {
    if ((!isManualCustomer && !formData.customer_id) || (isManualCustomer && !manualCustomerForm.name)) { showError('Fel', 'Kund är obligatoriskt.'); return; }
    if (!formData.line_items[0]?.description) { showError('Fel', 'Minst en fakturarad krävs.'); return; }
    try {
      setFormLoading(true);
      let finalCustomerId = formData.customer_id;
      if (isManualCustomer) {
        const { checkDuplicateCustomer, searchCustomers, createCustomer } = await import('../lib/database');
        const dup = await checkDuplicateCustomer(organisationId, manualCustomerForm.email, manualCustomerForm.name);
        if (dup.isDuplicate) {
          const sr = await searchCustomers(organisationId, manualCustomerForm.name);
          const ex = sr.data?.find((c: any) => c.name.toLowerCase() === manualCustomerForm.name.toLowerCase() || (c.email && c.email.toLowerCase() === manualCustomerForm.email.toLowerCase()));
          if (ex) { finalCustomerId = ex.id; success('Info', `Använder befintlig kund "${ex.name}".`); }
          else { const nc = await createCustomer({ organisation_id: organisationId, ...manualCustomerForm }); if (nc.error || !nc.data) throw new Error('Kunde inte skapa kund.'); finalCustomerId = nc.data.id; }
        } else {
          const nc = await createCustomer({ organisation_id: organisationId, ...manualCustomerForm }); if (nc.error || !nc.data) throw new Error(nc.error?.message); finalCustomerId = nc.data.id;
        }
      }
      const { createInvoice } = await import('../lib/invoices');
      const num = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
      const r = await createInvoice({ organisation_id: organisationId, invoice_number: num, customer_id: finalCustomerId, amount: calculateTotal(formData.line_items), due_date: formData.due_date || null, order_id: formData.order_id || null, status: 'draft' as InvoiceStatus, assignment_type: preInvoiceAssignmentType, assigned_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null, assigned_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null, job_description: workSummary, include_rot: formData.include_rot, rot_personnummer: formData.rot_personnummer, rot_organisationsnummer: formData.rot_organisationsnummer, rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning, rot_amount: formData.rot_amount, ocr_number: num.replace(/\D/g, '') }, formData.line_items);
      if (r.error) { showError('Fel', r.error.message); return; }
      success('Framgång', 'Faktura skapad!'); setShowUnifiedModal(false); resetForm(); await loadData();
    } catch (e: any) { showError('Fel', e.message || 'Oväntat fel.'); } finally { setFormLoading(false); }
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    try {
      setFormLoading(true);
      const r = await updateInvoice(editingInvoice.id, { customer_id: formData.customer_id, order_id: formData.order_id || null, due_date: formData.due_date || null, job_description: workSummary, amount: calculateTotal(formData.line_items), assignment_type: preInvoiceAssignmentType, assigned_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null, assigned_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null, include_rot: formData.include_rot, rot_personnummer: formData.rot_personnummer, rot_organisationsnummer: formData.rot_organisationsnummer, rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning, rot_amount: formData.rot_amount }, formData.line_items);
      if (r.error) { showError('Fel', r.error.message); return; }
      success('Framgång', 'Faktura uppdaterad!'); setShowUnifiedModal(false); setEditingInvoice(null); resetForm(); await loadData();
    } catch { showError('Fel', 'Kunde inte uppdatera.'); } finally { setFormLoading(false); }
  };

  const handleSavePreInvoiceChangesAndCreateInvoice = async () => {
    if (!selectedOrder) return;
    try {
      setFormLoading(true);
      const { updateOrder: updateOrderInDb, updateNoteInvoiceFlag, updateAttachmentInvoiceFlag } = await import('../lib/orders');
      for (const key in attachmentsToInclude) { const [type, id] = key.split('_'); if (type === 'note') await updateNoteInvoiceFlag(id, attachmentsToInclude[key]); else if (type === 'attachment') await updateAttachmentInvoiceFlag(id, attachmentsToInclude[key]); }
      const asgn = { assignment_type: preInvoiceAssignmentType, assigned_to_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null, assigned_to_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null };
      const ur = await updateOrderInDb(selectedOrder.id, asgn); if (ur.error) { showError('Fel', ur.error.message); return; }
      const { createInvoice } = await import('../lib/invoices');
      const items = [{ description: selectedOrder.job_description || selectedOrder.title, quantity: 1, unit_price: selectedOrder.value || 0, total: selectedOrder.value || 0 }];
      const num = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
      const due = new Date(); due.setDate(due.getDate() + (systemSettings?.default_payment_terms || 30));
      const r = await createInvoice({ organisation_id: organisationId, invoice_number: num, customer_id: selectedOrder.customer_id, amount: calculateTotal(items), due_date: due.toISOString().split('T')[0], order_id: selectedOrder.id, status: 'draft' as InvoiceStatus, ocr_number: num.replace(/\D/g, ''), assignment_type: asgn.assignment_type, assigned_user_id: asgn.assigned_to_user_id, assigned_team_id: asgn.assigned_to_team_id, job_description: workSummary, include_rot: formData.include_rot, rot_personnummer: formData.rot_personnummer, rot_organisationsnummer: formData.rot_organisationsnummer, rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning, rot_amount: formData.rot_amount }, items);
      if (r.error) { showError('Fel', r.error.message); return; }
      success('Framgång', `Faktura ${num} skapad!`); setShowUnifiedModal(false); setSelectedOrder(null); setActiveTab('invoices'); await loadData();
    } catch { showError('Fel', 'Oväntat fel.'); } finally { setFormLoading(false); }
  };

  const handleBulkCreateInvoices = async () => {
    if (!selectedOrders.length) { showError('Fel', 'Välj minst en order.'); return; }
    if (!confirm(`Skapa ${selectedOrders.length} fakturor?`)) return;
    try {
      setBulkProcessing(true);
      const { createInvoice } = await import('../lib/invoices');
      let ok = 0, fail = 0;
      for (const oid of selectedOrders) {
        const order = readyToInvoiceOrders.find(o => o.id === oid); if (!order) continue;
        try {
          const items = [{ description: order.job_description || order.title, quantity: 1, unit_price: order.value || 0, total: order.value || 0 }];
          const num = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
          const due = new Date(); due.setDate(due.getDate() + (systemSettings?.default_payment_terms || 30));
          await createInvoice({ organisation_id: organisationId, invoice_number: num, customer_id: order.customer_id, amount: calculateTotal(items), due_date: due.toISOString().split('T')[0], order_id: order.id, status: 'draft' as InvoiceStatus, ocr_number: num.replace(/\D/g, ''), assignment_type: order.assignment_type, assigned_user_id: order.assigned_to_user_id, assigned_team_id: order.assigned_to_team_id, job_description: order.job_description || order.description }, items);
          ok++;
        } catch { fail++; }
      }
      if (ok > 0) success('Framgång', `${ok} fakturor skapade!`);
      if (fail > 0) showError('Varning', `${fail} fakturor misslyckades.`);
      setSelectedOrders([]); setActiveTab('invoices'); loadData();
    } catch { showError('Fel', 'Oväntat fel.'); } finally { setBulkProcessing(false); }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    const r = await deleteInvoice(invoiceToDelete.id);
    if (r.error) { showError('Fel', r.error.message); return; }
    success('Framgång', 'Faktura borttagen!'); setShowDeleteDialog(false); setInvoiceToDelete(null); loadData();
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm('Markera som betald?')) return;
    const r = await markInvoiceAsPaid(id);
    if (r.error) showError(t.MESSAGES.ERROR_TITLE, t.MESSAGES.ERROR_MARK_PAID(r.error.message));
    else if (r.data) { await loadData(); success(t.MESSAGES.SUCCESS_TITLE, t.MESSAGES.MARKED_PAID(r.data.invoice_number)); }
  };

  const handleDuplicateInvoice = async (invoice: InvoiceWithRelations) => {
    if (!organisationId) return;
    try {
      const { data: newNum } = await supabase.rpc('generate_invoice_number', { org_id: organisationId });
      const { data, error: e } = await supabase.from('invoices').insert({ organisation_id: organisationId, customer_id: invoice.customer_id, order_id: invoice.order_id, invoice_number: newNum || `INV-${Date.now()}`, amount: invoice.amount, net_amount: invoice.net_amount, vat_amount: invoice.vat_amount, line_items: invoice.line_items, status: 'draft', job_type: invoice.job_type, team_members_involved: invoice.team_members_involved, work_summary: invoice.work_summary, created_by_user_id: user?.id }).select().single();
      if (e) throw e;
      await supabase.from('invoice_history').insert({ organisation_id: organisationId, invoice_id: data.id, action_type: 'duplicated', performed_by_user_id: user?.id, details: { source_invoice_id: invoice.id } });
      success('Duplicerad', `Faktura #${data.invoice_number} skapad.`); await loadData();
    } catch { showError('Fel', 'Kunde inte duplicera.'); }
  };

  const handleSaveAssignment = async (assignmentType: 'individual' | 'team', userId: string | null, teamId: string | null) => {
    if (!selectedInvoice) return;
    try {
      setFormLoading(true);
      const updates = { assignment_type: assignmentType, assigned_user_id: assignmentType === 'individual' ? userId : null, assigned_team_id: assignmentType === 'team' ? teamId : null };
      const r = await updateInvoice(selectedInvoice.id, updates, selectedInvoice.line_items || []);
      if (r.error) { showError('Fel', r.error.message); return; }
      success('Framgång', 'Tilldelning uppdaterad.'); await loadData();
      setSelectedInvoice((prev: InvoiceWithRelations | null) => prev ? { ...prev, ...updates, assigned_user: teamMembers.find(m => m.id === userId), assigned_team: teams.find(t => t.id === teamId) } : null);
    } catch { showError('Fel', 'Kunde inte spara.'); } finally { setFormLoading(false); }
  };

  const handleManualSigning = async (invoiceId: string, file: File) => {
    try {
      const { uploadSignedDocument } = await import('../lib/storage');
      const { url, error: ue } = await uploadSignedDocument(file, 'invoices');
      if (ue || !url) { showError('Fel', ue?.message || 'Ingen URL.'); return; }
      const r = await updateInvoice(invoiceId, { signed_document_url: url, status: 'sent' }, selectedInvoice?.line_items || []);
      if (r.error) { showError('Fel', r.error.message); return; }
      await loadData(); setSelectedInvoice(prev => prev && prev.id === invoiceId ? { ...prev, signed_document_url: url, status: 'sent' } : prev);
      success('Framgång', t.MESSAGES.FILE_UPLOADED);
    } catch { showError('Fel', 'Oväntat fel.'); }
  };

  const handleEditInvoiceClick = (invoice: InvoiceWithRelations) => {
    setEditingInvoice(invoice); loadOrderDocuments(invoice.order_id); setSelectedOrder(invoice.order || null);
    setFormData({ customer_id: invoice.customer_id || '', order_id: invoice.order_id || '', due_date: invoice.due_date || '', invoice_number: invoice.invoice_number, amount: invoice.amount.toString(), line_items: invoice.invoice_line_items?.length ? invoice.invoice_line_items : [{ description: invoice.job_description || '', quantity: 1, unit_price: invoice.amount, total: invoice.amount }], include_rot: invoice.include_rot || false, rot_personnummer: invoice.rot_personnummer || null, rot_organisationsnummer: invoice.rot_organisationsnummer || null, rot_fastighetsbeteckning: invoice.rot_fastighetsbeteckning || null, rot_amount: invoice.rot_amount || 0 });
    setWorkSummary(invoice.job_description || ''); setPreInvoiceAssignmentType(invoice.assignment_type || 'individual'); setPreInvoiceAssignedToUserId(invoice.assigned_to_user_id || null); setPreInvoiceAssignedToTeamId(invoice.assigned_to_team_id || null);
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

  // Fortnox sync handlers
  const handleSyncAllToFortnox = async () => {
    if (!organisationId) return;
    setFortnoxSyncing(true);
    try {
      const result = await syncInvoicesToFortnox(organisationId);
      await supabase.from('activity_log').insert({ organisation_id: organisationId, user_id: user?.id, action: 'fortnox_sync_all_invoices', entity_type: 'invoice', details: { success: result.success, failed: result.failed, errors: result.errors } });
      if (result.failed > 0) showError('Synkfel', `${result.success} synkade, ${result.failed} misslyckades. ${result.errors.join(', ')}`);
      else success('Framgång', `${result.success} fakturor synkade till Fortnox`);
      await loadData();
    } catch { showError('Fel', 'Kunde inte synka till Fortnox'); }
    setFortnoxSyncing(false);
  };

  const handleSyncFromFortnox = async () => {
    if (!organisationId) return;
    setFortnoxSyncing(true);
    try {
      const result = await syncInvoicesFromFortnox(organisationId);
      await supabase.from('activity_log').insert({ organisation_id: organisationId, user_id: user?.id, action: 'fortnox_sync_from', entity_type: 'invoice', details: { success: result.success, failed: result.failed, errors: result.errors } });
      if (result.failed > 0) showError('Synkfel', `${result.success} uppdaterade, ${result.failed} misslyckades. ${result.errors.join(', ')}`);
      else success('Framgång', `${result.success} fakturor uppdaterade från Fortnox`);
      await loadData();
    } catch { showError('Fel', 'Kunde inte hämta från Fortnox'); }
    setFortnoxSyncing(false);
  };

  const handleSyncSingleToFortnox = async (invoiceId: string) => {
    if (!organisationId) return;
    setFortnoxSyncing(true);
    try {
      const result = await syncInvoicesToFortnox(organisationId, [invoiceId]);
      await supabase.from('activity_log').insert({ organisation_id: organisationId, user_id: user?.id, action: 'fortnox_sync_invoice', entity_type: 'invoice', entity_id: invoiceId, details: { success: result.success, failed: result.failed, errors: result.errors } });
      if (result.errors.length > 0) showError('Synkfel', result.errors.join(', '));
      else success('Framgång', 'Fakturan har synkats till Fortnox');
      await loadData();
    } catch { showError('Fel', 'Kunde inte synka fakturan till Fortnox'); }
    setFortnoxSyncing(false);
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
                            setFormData({ customer_id: order.customer_id || '', order_id: order.id, due_date: new Date(Date.now() + (systemSettings?.default_payment_terms || 30) * 86400000).toISOString().split('T')[0], invoice_number: '', amount: '', line_items: [{ description: order.job_description || order.title, quantity: 1, unit_price: order.value || 0, total: order.value || 0 }], include_rot: false, rot_personnummer: null, rot_organisationsnummer: null, rot_fastighetsbeteckning: null, rot_amount: 0 });
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
          onSubmit={editingInvoice ? handleUpdateInvoice : selectedOrder ? handleSavePreInvoiceChangesAndCreateInvoice : handleCreateInvoice}
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
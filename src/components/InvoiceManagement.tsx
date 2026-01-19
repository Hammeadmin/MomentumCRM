import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';

import InvoicePreview from './InvoicePreview';
import ROTInformation from '../components/ROTInformation';
import ROTFields from '../components/ROTFields';
import { useReactToPrint } from 'react-to-print';


import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  CheckSquare,
  Square,
  Paperclip,
  AlertCircle,
  Building,
  FileText,
  Package,
  Send,
  MessageSquare,
  X,
  Save,
  CreditCard,
  FileUp,
  User,
  Users2,
  Bell,
  Loader2
} from 'lucide-react';
import { Button } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useInvoices } from '../hooks/useInvoices';
import { useTranslation } from '../locales/sv';
import {
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsPaid,
  sendInvoiceEmail,
  updateTeamJobParticipation,
  generateInvoiceEmailTemplate,
  getTeamJobParticipation,
  type InvoiceWithRelations,
  type InvoiceFilters,
  type InvoiceEmail,
  type TeamJobParticipation
} from '../lib/invoices';
import { uploadSignedDocument } from '../lib/storage';
import { type QuoteTemplate } from '../lib/quoteTemplates';
import {
  canCreateCreditNote,
  getRemainingCreditableAmount,
  type CreditNote
} from '../lib/creditNotes';
import {
  updateOrder as updateOrderInDb, type OrderWithRelations, getOrderNotes,
  getAttachmentsForOrder,
  addAttachmentToOrder,
  updateNoteInvoiceFlag,
  deleteOrderNote,
  deleteOrderAttachment,
  getAttachmentPublicUrl,
  updateAttachmentInvoiceFlag,
  type OrderAttachment,
} from '../lib/orders';
import { formatCurrency, formatDate, createSavedLineItem, checkDuplicateCustomer, createCustomer, searchCustomers } from '../lib/database';
import { type TeamWithRelations } from '../lib/teams';
import {
  INVOICE_STATUS_LABELS,
  getInvoiceStatusColor,
  JOB_TYPE_LABELS,
  getJobTypeColor,
  Organisation,
  TEAM_ROLE_LABELS,
  getTeamRoleColor,
  TEAM_SPECIALTY_LABELS,
  type InvoiceStatus,
  type Customer,
  type UserProfile
} from '../types/database';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import ExportButton from './ExportButton';
import ReminderModal from './ReminderModal';
import { usePDF } from '@react-pdf/renderer';
import CreditNoteModal from './CreditNoteModal';
import InvoiceCreditHistory from './InvoiceCreditHistory';
import CreditNotesList from './CreditNotesList';



// Organisation ID now comes from AuthContext



// Line item interface for strict typing
interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

function InvoiceManagement() {
  const { user, organisationId } = useAuth();
  const { success, error: showError } = useToast();
  const { invoices: t } = useTranslation();

  // Filter states
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [activeTab, setActiveTab] = useState<'invoices' | 'ready-to-invoice' | 'credit_notes'>('invoices');

  // Use the React Query hook for data fetching
  const {
    invoices,
    readyToInvoiceOrders,
    creditNotes,
    customers,
    teamMembers,
    teams,
    systemSettings,
    savedLineItems,
    templates,
    organisation,
    isLoading: loading,
    error: dataError,
    refetch: loadData,
  } = useInvoices(filters, activeTab);

  // Convert error to string for display
  const error = dataError?.message || null;

  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [detailsAssignmentType, setDetailsAssignmentType] = useState<'individual' | 'team'>('individual');
  const [detailsAssignedToUserId, setDetailsAssignedToUserId] = useState<string | null>(null);
  const [detailsAssignedToTeamId, setDetailsAssignedToTeamId] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [orderAttachments, setOrderAttachments] = useState<OrderAttachment[]>([]);
  const [attachmentsToInclude, setAttachmentsToInclude] = useState<Record<string, boolean>>({});
  const [adminNewFiles, setAdminNewFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [invoicesToPrint, setInvoicesToPrint] = useState<InvoiceWithRelations[]>([]);



  // Modal states
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState<InvoiceWithRelations | null>(null);
  const [activeInvoiceTab, setActiveInvoiceTab] = useState<'info' | 'team' | 'docs' | 'lineItems'>('info');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceWithRelations | null>(null);
  const [workSummary, setWorkSummary] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [invoiceOrderNotes, setInvoiceOrderNotes] = useState<any[]>([]);
  const [invoiceOrderAttachments, setInvoiceOrderAttachments] = useState<OrderAttachment[]>([]);

  const [emailData, setEmailData] = useState({
    recipient_email: '',
    subject: '',
    email_body: '',
    template_type: 'standard' as 'standard' | 'team_presentation' | 'quality_assurance' | 'follow_up',
    send_copy_to_team_leader: false

  });



  // State for pre-invoice modal assignment changes

  const [preInvoiceAssignmentType, setPreInvoiceAssignmentType] = useState<'individual' | 'team'>('individual');

  const [preInvoiceAssignedToUserId, setPreInvoiceAssignedToUserId] = useState<string | null>(null);

  const [preInvoiceAssignedToTeamId, setPreInvoiceAssignedToTeamId] = useState<string | null>(null);

  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithRelations | null>(null);

  // Reminder State
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderEntity, setReminderEntity] = useState<{ id: string; title: string } | null>(null);

  // Manual Customer State
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [manualCustomerForm, setManualCustomerForm] = useState({
    name: '',
    customer_type: 'company' as 'company' | 'private',
    org_number: '',
    email: '',
    address: '',
    postal_code: '',
    city: ''
  });

  // Form states

  const [formData, setFormData] = useState({
    invoice_number: '',
    customer_id: '',
    order_id: '',
    amount: '', // This will be calculated from line items
    due_date: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    include_rot: false,
    rot_personnummer: null,
    rot_organisationsnummer: null,
    rot_fastighetsbeteckning: null,
    rot_amount: 0

  });
  const [formLoading, setFormLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  // Bulk actions
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  // Initialize email data when invoice is selected
  useEffect(() => {
    if (selectedInvoice && showEmailModal) {
      const template = generateInvoiceEmailTemplate(selectedInvoice, 'standard');
      setEmailData({
        recipient_email: selectedInvoice.customer?.email || '',
        subject: template.subject,
        email_body: template.body,
        template_type: 'standard',
        send_copy_to_team_leader: false
      });
    }
  }, [selectedInvoice, showEmailModal]);
  // Initialize work summary when order is selected
  useEffect(() => {
    if (selectedOrder && showUnifiedModal) {
      setWorkSummary(selectedOrder.job_description || selectedOrder.description || '');
      // Initialize assignment states when opening the pre-invoice modal
      setPreInvoiceAssignmentType(selectedOrder.assignment_type || 'individual');
      setPreInvoiceAssignedToUserId(selectedOrder.assigned_to_user_id || null);
      setPreInvoiceAssignedToTeamId(selectedOrder.assigned_to_team_id || null);
    }
  }, [selectedOrder, showUnifiedModal]);

  // Data is now fetched by useInvoices hook

  const loadInvoiceDocuments = async (orderId: string | undefined) => {
    if (!orderId) {
      setInvoiceOrderNotes([]);
      setInvoiceOrderAttachments([]);
      return;
    }
    const [notesRes, attachmentsRes] = await Promise.all([
      getOrderNotes(orderId),
      getAttachmentsForOrder(orderId),
    ]);

    const notes = notesRes.data || [];
    const attachments = attachmentsRes.data || [];

    // Only show items that were marked to be included in the invoice
    setInvoiceOrderNotes(notes.filter(n => n.include_in_invoice));
    setInvoiceOrderAttachments(attachments.filter(a => a.include_in_invoice));
  };

  const loadOrderDocuments = async (orderId: string) => {
    if (!orderId) {
      setOrderNotes([]);
      setOrderAttachments([]);
      return;
    }
    const [notesRes, attachmentsRes] = await Promise.all([
      getOrderNotes(orderId),
      getAttachmentsForOrder(orderId)
    ]);
    setOrderNotes(notesRes.data || []);
    setOrderAttachments(attachmentsRes.data || []);

    // Pre-fill the checkboxes based on what's already saved in the database
    const initialAttachmentsToInclude: Record<string, boolean> = {};
    (notesRes.data || []).forEach(note => {
      initialAttachmentsToInclude[`note_${note.id}`] = note.include_in_invoice;
    });
    (attachmentsRes.data || []).forEach(att => {
      initialAttachmentsToInclude[`attachment_${att.id}`] = att.include_in_invoice;
    });
    setAttachmentsToInclude(initialAttachmentsToInclude);
  };

  /* Manual Signing Handler */
  const handleManualSigning = async (invoiceId: string, file: File) => {
    try {
      // 1. Upload file
      const { url, error: uploadError } = await uploadSignedDocument(file, 'invoices');

      if (uploadError) {
        showError('Fel', 'Kunde inte ladda upp filen: ' + uploadError.message);
        return;
      }

      if (!url) {
        showError('Fel', 'Ingen URL returnerades från uppladdningen.');
        return;
      }

      // 2. Update invoice in DB
      const result = await updateInvoice(
        invoiceId,
        { signed_document_url: url, status: 'sent' },
        selectedInvoice?.line_items || [] // Use selectedInvoice's line items if available, or an empty array
      );

      if (result.error) {
        showError('Fel', 'Kunde inte uppdatera fakturan: ' + result.error.message);
        return;
      }

      // 3. Refetch data to update local state
      await loadData();

      // If the currently selected invoice is the one being updated, update it too
      setSelectedInvoice(prev => prev && prev.id === invoiceId ? { ...prev, signed_document_url: url, status: 'sent' } : prev);

      success('Framgång', t.MESSAGES.FILE_UPLOADED);
    } catch (err) {
      console.error('Error in manual signing:', err);
      showError('Fel', 'Ett oväntat fel inträffade.');
    }
  };

  const handleAdminFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAdminNewFiles(Array.from(event.target.files));
    }
  };

  const handleAdminUpload = async () => {
    if (adminNewFiles.length === 0 || !user || !selectedOrder) return;

    setIsUploading(true);
    for (const file of adminNewFiles) {
      await addAttachmentToOrder(selectedOrder.id, user.id, file);
    }
    setIsUploading(false);
    setAdminNewFiles([]);
    loadOrderDocuments(selectedOrder.id); // Refresh the list
    success(`${adminNewFiles.length} fil(er) uppladdade.`);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna anteckning?')) return;
    await deleteOrderNote(noteId);
    loadOrderDocuments(selectedOrder!.id);
    success('Anteckning borttagen.');
  };

  const handleDeleteAttachment = async (attachment: OrderAttachment) => {
    if (!confirm(`Är du säker på att du vill ta bort filen "${attachment.file_name}"?`)) return;
    await deleteOrderAttachment(attachment);
    loadOrderDocuments(selectedOrder!.id);
    success('Fil borttagen.');
  };

  const printComponentRef = useRef(null);
  const manualSigningInputRef = useRef<HTMLInputElement>(null);

  const onAfterPrint = useCallback(() => {
    // Clear the invoices to print after printing is done
    setInvoicesToPrint([]);
    setSelectedInvoices([]);
  }, []); // <-- Empty array means this function is stable

  // --- 2. Use the stable function in the hook ---
  const reactToPrintHandle = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Fakturor-${new Date().toISOString().split('T')[0]}`,
    onAfterPrint: onAfterPrint // <-- Use the stable function here

  });

  // This is what our new "Download" button will call
  const handleDownloadSelectedInvoices = () => {
    const invoicesToDownload = invoices.filter(inv =>
      selectedInvoices.includes(inv.id)
    );
    if (invoicesToDownload.length > 0) {
      setInvoicesToPrint(invoicesToDownload); // This will now trigger the useEffect
    } else {
      showError('Fel', 'Välj minst en faktura att ladda ner.');
    }
  };

  // --- 2. ADD this useEffect block right after your print handlers ---
  // This effect will run ONLY when 'invoicesToPrint' changes
  useEffect(() => {
    if (invoicesToPrint.length > 0) {
      // Because this runs *after* the render, 
      // printComponentRef.current is guaranteed to be set.
      reactToPrintHandle();
    }
  }, [invoicesToPrint, reactToPrintHandle]); // Dependencies


  const handleOpenReminder = (invoice: InvoiceWithRelations) => {
    setReminderEntity({
      id: invoice.id,
      title: `Faktura #${invoice.invoice_number} - ${invoice.customer?.name}`
    });
    setIsReminderModalOpen(true);
  };

  const handleCreateInvoice = async () => {



    // The form is now the more complex one, so we check the first line item

    // For manual customer, we validate the manual form instead of customer_id
    if ((!isManualCustomer && !formData.customer_id) || (isManualCustomer && !manualCustomerForm.name)) {
      showError('Fel', 'Kund (eller namn för manuell kund) är obligatoriskt.');
      return;
    }

    if (!formData.line_items[0]?.description) {
      showError('Fel', 'Minst en fakturarad med beskrivning är obligatoriskt.');
      return;
    }



    try {

      setFormLoading(true);

      let finalCustomerId = formData.customer_id;

      if (isManualCustomer) {
        try {
          // 1. Check for duplicates
          const duplicateCheck = await checkDuplicateCustomer(organisationId, manualCustomerForm.email, manualCustomerForm.name);

          if (duplicateCheck.isDuplicate) {
            // Try to find the existing customer to reuse
            const searchResult = await searchCustomers(organisationId, manualCustomerForm.name);
            const existing = searchResult.data?.find(c =>
              (c.name.toLowerCase() === manualCustomerForm.name.toLowerCase()) ||
              (c.email && manualCustomerForm.email && c.email.toLowerCase() === manualCustomerForm.email.toLowerCase())
            );

            if (existing) {
              finalCustomerId = existing.id;
              success('Info', `Hittade befintlig kund "${existing.name}". Använder denna.`);
            } else {
              // Should rarely happen if duplicate check passed, but fallback to create
              const newCustomer = await createCustomer({
                organisation_id: organisationId,
                ...manualCustomerForm
              });
              if (newCustomer.error || !newCustomer.data) throw new Error('Kunde inte skapa kund.');
              finalCustomerId = newCustomer.data.id;
            }
          } else {
            // Create new customer
            const newCustomer = await createCustomer({
              organisation_id: organisationId,
              ...manualCustomerForm
            });
            if (newCustomer.error || !newCustomer.data) throw new Error('Kunde inte skapa kund: ' + newCustomer.error?.message);
            finalCustomerId = newCustomer.data.id;
          }
        } catch (err: any) {
          setFormLoading(false);
          showError('Fel', err.message || 'Fel vid hantering av manuell kund.');
          return;
        }
      }

      // Generate a new invoice number if it's not an edit

      const invoiceNumber = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;

      const ocrNumber = invoiceNumber.replace(/\D/g, '');



      const invoiceData = {
        organisation_id: organisationId,
        invoice_number: invoiceNumber,
        customer_id: finalCustomerId,
        amount: calculateTotal(formData.line_items), // ***Calculate total from line items***
        due_date: formData.due_date || null,
        order_id: formData.order_id || null,
        status: 'draft' as InvoiceStatus,
        // Add assignment details from the form state
        assignment_type: preInvoiceAssignmentType,
        assigned_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null,
        assigned_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null,
        job_description: workSummary,
        include_rot: formData.include_rot,
        rot_personnummer: formData.rot_personnummer,
        rot_organisationsnummer: formData.rot_organisationsnummer,
        rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
        rot_amount: formData.rot_amount,
        ocr_number: ocrNumber
      };
      const result = await createInvoice(invoiceData, formData.line_items); // Pass line items to creation

      if (result.error) {

        showError('Fel', result.error.message);

        return;

      }

      success('Framgång', 'Faktura skapad framgångsrikt!');

      setShowUnifiedModal(false); // Close the correct modal

      resetForm();

      await loadData();

    } catch (err) {

      console.error('Error creating invoice:', err);

      showError('Fel', 'Ett oväntat fel inträffade vid skapande av faktura.');

    } finally {

      setFormLoading(false);

    }

  };



  const handleUpdateInvoice = async () => {

    if (!editingInvoice) return;



    try {
      // Save the include/exclude choices for notes and attachments
      for (const key in attachmentsToInclude) {
        const [type, id] = key.split('_');
        const shouldInclude = attachmentsToInclude[key];
        if (type === 'note') {
          await updateNoteInvoiceFlag(id, shouldInclude);
        } else if (type === 'attachment') {
          await updateAttachmentInvoiceFlag(id, shouldInclude);
        }
      }

      setFormLoading(true);

      const invoiceUpdates = {

        customer_id: formData.customer_id,

        order_id: formData.order_id || null,

        due_date: formData.due_date || null,

        job_description: workSummary,

        amount: calculateTotal(formData.line_items), // Recalculate the total

        assignment_type: preInvoiceAssignmentType,

        assigned_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null,

        assigned_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null,
        include_rot: formData.include_rot,
        rot_personnummer: formData.rot_personnummer,
        rot_organisationsnummer: formData.rot_organisationsnummer,
        rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
        rot_amount: formData.rot_amount

      };



      const result = await updateInvoice(editingInvoice.id, invoiceUpdates, formData.line_items);



      if (result.error) {

        showError('Fel', result.error.message);

        return;

      }



      success('Framgång', 'Faktura uppdaterad!');

      setShowUnifiedModal(false);

      setEditingInvoice(null);

      resetForm();

      await loadData();

    } catch (err) {

      console.error('Error updating invoice:', err);

      showError('Fel', 'Kunde inte uppdatera fakturan.');

    } finally {

      setFormLoading(false);

    }

  };



  const handleSaveAssignment = async () => {

    if (!selectedInvoice) return;



    const updates = {

      assignment_type: detailsAssignmentType,

      assigned_user_id: detailsAssignmentType === 'individual' ? detailsAssignedToUserId : null,

      assigned_team_id: detailsAssignmentType === 'team' ? detailsAssignedToTeamId : null,

    };



    try {

      setFormLoading(true);

      const result = await updateInvoice(selectedInvoice.id, updates, selectedInvoice.line_items || []);



      if (result.error) {

        showError('Fel', result.error.message);

        return;

      }



      success('Framgång', 'Tilldelning har uppdaterats.');

      setIsEditingAssignment(false);

      await loadData(); // Reload all data to get the latest changes

      // Manually update the selectedInvoice to reflect changes immediately in the modal

      setSelectedInvoice(prev => prev ? { ...prev, ...updates, assigned_user: teamMembers.find(m => m.id === detailsAssignedToUserId), assigned_team: teams.find(t => t.id === detailsAssignedToTeamId) } : null);



    } catch (err) {

      showError('Fel', 'Kunde inte spara ändringar.');

    } finally {

      setFormLoading(false);

    }

  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!confirm('Är du säker på att du vill markera denna faktura som betald?')) {
      return;
    }

    const result = await markInvoiceAsPaid(invoiceId);

    if (result.error) {
      showError(t.MESSAGES.ERROR_TITLE, t.MESSAGES.ERROR_MARK_PAID(result.error.message));
    } else if (result.data) {
      // Refetch data to update local state
      await loadData();
      success(t.MESSAGES.SUCCESS_TITLE, t.MESSAGES.MARKED_PAID(result.data.invoice_number));
    }
  };


  const handleCreateInvoiceFromOrder = async (
    order: OrderWithRelations,
    workSummary?: string,
    assignmentUpdates?: {
      assignment_type: 'individual' | 'team';
      assigned_to_user_id: string | null;
      assigned_to_team_id: string | null;
    },
    currentRotState?: { include_rot: boolean; rot_personnummer: any; rot_organisationsnummer: any; rot_fastighetsbeteckning: any; rot_amount: any; }
  ) => {
    if (!order.customer) {
      showError('Fel', 'Order saknar kundinformation.');
      return;
    }

    try {
      setFormLoading(true);

      // 1. Create line items directly from the order object
      const lineItemsFromOrder = [{
        description: order.job_description || order.title || 'Utförd tjänst enligt order',
        quantity: 1,
        unit_price: order.value || 0,
        total: order.value || 0
      }];

      const invoiceNumber = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;

      const ocrNumber = invoiceNumber.replace(/\D/g, '');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (systemSettings?.default_payment_terms || 30));

      const invoiceData = {
        organisation_id: organisationId,
        invoice_number: invoiceNumber,
        customer_id: order.customer_id!,
        // 2. Calculate the total from the newly created line items
        amount: calculateTotal(lineItemsFromOrder),
        due_date: dueDate.toISOString().split('T')[0],
        order_id: order.id,
        status: 'draft' as InvoiceStatus,
        ocr_number: ocrNumber,
        assignment_type: assignmentUpdates?.assignment_type || order.assignment_type,
        assigned_user_id: assignmentUpdates?.assigned_to_user_id || order.assigned_to_user_id,
        assigned_team_id: assignmentUpdates?.assigned_to_team_id || order.assigned_to_team_id,
        job_description: workSummary || order.job_description || order.description,
        include_rot: currentRotState ? currentRotState.include_rot : order.include_rot,
        rot_personnummer: currentRotState ? currentRotState.rot_personnummer : order.rot_personnummer,
        rot_organisationsnummer: currentRotState ? currentRotState.rot_organisationsnummer : order.rot_organisationsnummer,
        rot_fastighetsbeteckning: currentRotState ? currentRotState.rot_fastighetsbeteckning : order.rot_fastighetsbeteckning,
        rot_amount: currentRotState ? currentRotState.rot_amount : order.rot_amount
      };

      // 3. Pass the correct line items to the database
      const result = await createInvoice(invoiceData, lineItemsFromOrder);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', `Faktura ${invoiceNumber} skapad från order "${order.title}"!`);

      setActiveTab('invoices');
      // No need to call loadData() here because handleBulkCreateInvoices will call it once at the end
    } catch (err) {
      console.error('Error creating invoice from order:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid skapande av faktura.');
      // Re-throw the error so the bulk handler can count it as a failure
      throw err;
    } finally {
      setFormLoading(false);
    }
  };



  // New handler to save changes and create invoice
  const handleSavePreInvoiceChangesAndCreateInvoice = async () => {
    if (!selectedOrder) return;
    try {
      for (const key in attachmentsToInclude) {
        const [type, id] = key.split('_');
        const shouldInclude = attachmentsToInclude[key];
        if (type === 'note') {
          await updateNoteInvoiceFlag(id, shouldInclude);
        } else if (type === 'attachment') {
          await updateAttachmentInvoiceFlag(id, shouldInclude);
        }
      }
      setFormLoading(true);

      // 1. Update the order with new assignment details
      const assignmentUpdates = {
        assignment_type: preInvoiceAssignmentType,
        assigned_to_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null,
        assigned_to_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null,
      };

      const updateResult = await updateOrderInDb(selectedOrder.id, assignmentUpdates);
      if (updateResult.error) {
        showError('Fel', `Kunde inte uppdatera order: ${updateResult.error.message}`);
        return;
      }
      // 2. Create the invoice with the updated info
      await handleCreateInvoiceFromOrder(selectedOrder, workSummary, assignmentUpdates, formData);
      setShowUnifiedModal(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error('Error saving pre-invoice changes and creating invoice:', err);
      showError('Fel', 'Ett oväntat fel inträffade.');
    } finally {
      setFormLoading(false);
    }
  };



  const handleBulkCreateInvoices = async () => {
    if (selectedOrders.length === 0) {
      showError('Fel', 'Välj minst en order för att skapa fakturor.');
      return;
    }
    if (!confirm(`Är du säker på att du vill skapa ${selectedOrders.length} fakturor?`)) {
      return;
    }
    try {
      setBulkProcessing(true);
      let successCount = 0;
      let errorCount = 0;
      for (const orderId of selectedOrders) {
        const order = readyToInvoiceOrders.find(o => o.id === orderId);
        if (!order) continue;
        try {
          await handleCreateInvoiceFromOrder(order);
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }
      if (successCount > 0) {

        success('Framgång', `${successCount} fakturor skapade framgångsrikt!`);
      }
      if (errorCount > 0) {

        showError('Varning', `${errorCount} fakturor kunde inte skapas.`);
      }
      setSelectedOrders([]);
      loadData();
    } catch (err) {
      console.error('Error bulk creating invoices:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid bulk-skapande av fakturor.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {

      const result = await deleteInvoice(invoiceToDelete.id);
      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }
      success('Framgång', 'Faktura borttagen framgångsrikt!');
      setShowDeleteDialog(false);
      setInvoiceToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting invoice:', err);

      showError('Fel', 'Ett oväntat fel inträffade vid borttagning av faktura.');
    }
  };
  const handleEditInvoiceClick = (invoice: InvoiceWithRelations) => {

    setEditingInvoice(invoice);
    loadOrderDocuments(invoice.order_id);
    setSelectedOrder(invoice.order || null); // Keep track of the related order
    // Set form data

    setFormData({
      customer_id: invoice.customer_id || '',
      order_id: invoice.order_id || '',
      due_date: invoice.due_date || '',
      invoice_number: invoice.invoice_number,
      amount: invoice.amount.toString(),
      line_items: invoice.invoice_line_items && invoice.invoice_line_items.length > 0
        ? invoice.invoice_line_items
        : [{ description: invoice.job_description || '', quantity: 1, unit_price: invoice.amount, total: invoice.amount }],
      include_rot: invoice.include_rot || false,
      rot_personnummer: invoice.rot_personnummer || null,
      rot_organisationsnummer: invoice.rot_organisationsnummer || null,
      rot_fastighetsbeteckning: invoice.rot_fastighetsbeteckning || null,
      rot_amount: invoice.rot_amount || 0

    });



    // Set other states for the modal tabs

    setWorkSummary(invoice.job_description || '');

    setPreInvoiceAssignmentType(invoice.assignment_type || 'individual');

    setPreInvoiceAssignedToUserId(invoice.assigned_to_user_id || null);

    setPreInvoiceAssignedToTeamId(invoice.assigned_to_team_id || null);



    setActiveInvoiceTab('info'); // Start on the first tab

    setShowUnifiedModal(true);

  };



  const resetForm = () => {

    setFormData({

      invoice_number: '',

      customer_id: '',

      order_id: '',

      amount: '', // Will be calculated

      due_date: '',

      line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      include_rot: false,
      rot_personnummer: null,
      rot_organisationsnummer: null,
      rot_fastighetsbeteckning: null,
      rot_amount: 0

    });

    setWorkSummary('');

    setEmailData({

      recipient_email: '',

      subject: '',

      email_body: '',

      template_type: 'standard',

      send_copy_to_team_leader: false

    });

  };



  const handleSendEmail = async () => {

    if (!selectedInvoice || !emailData.recipient_email || !emailData.subject || !emailData.email_body) {

      showError('Fel', 'Alla e-postfält måste fyllas i.');

      return;

    }



    try {

      setEmailLoading(true);



      const result = await sendInvoiceEmail(selectedInvoice.id, {

        recipient_email: emailData.recipient_email,

        subject: emailData.subject,

        email_body: emailData.email_body,

        send_copy_to_team_leader: emailData.send_copy_to_team_leader

      });



      if (result.error) {

        showError('Fel', result.error.message);

        return;

      }



      success(t.MESSAGES.SUCCESS_TITLE, t.MESSAGES.EMAIL_SENT(emailData.recipient_email));

      // Refetch data to update status
      await loadData();

      setShowEmailModal(false);
      setSelectedInvoice(null);

    } catch (err) {

      console.error('Error sending email:', err);

      showError('Fel', 'Ett oväntat fel inträffade vid skickande av e-post.');

    } finally {

      setEmailLoading(false);

    }

  };

  const toggleInvoiceSelection = (invoiceId: string) => { // <-- ADD THIS FUNCTION
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const selectAllInvoices = () => { // <-- ADD THIS FUNCTION
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(invoice => invoice.id));
    }
  };



  const toggleOrderSelection = (orderId: string) => {

    setSelectedOrders(prev =>

      prev.includes(orderId)

        ? prev.filter(id => id !== orderId)

        : [...prev, orderId]

    );

  };



  const selectAllOrders = () => {

    if (selectedOrders.length === readyToInvoiceOrders.length) {

      setSelectedOrders([]);

    } else {

      setSelectedOrders(readyToInvoiceOrders.map(order => order.id));

    }

  };



  const addLineItem = () => {

    setFormData(prev => ({

      ...prev,

      line_items: [...prev.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }]

    }));

  };



  const removeLineItem = (index: number) => {

    if (formData.line_items.length > 1) {

      setFormData(prev => ({

        ...prev,

        line_items: prev.line_items.filter((_, i) => i !== index)

      }));

    }

  };



  const updateLineItem = (index: number, field: string, value: any) => {

    setFormData(prev => {

      const newLineItems = prev.line_items.map((item, i) => {

        if (i === index) {

          const updatedItem = { ...item, [field]: value };

          updatedItem.total = updatedItem.quantity * updatedItem.unit_price;

          return updatedItem;

        }

        return item;

      });

      return { ...prev, line_items: newLineItems };

    });

  };



  /**
   * Safely converts a value to a number, ensuring no string math issues.
   * Database values can sometimes come as strings.
   */
  const toNumber = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const calculateSubtotal = (items: LineItem[]): number => {
    return items.reduce((sum, item) => sum + toNumber(item.total), 0);
  };



  const calculateVAT = (subtotal: number): number => {
    return toNumber(subtotal) * 0.25; // 25% VAT
  };



  const calculateTotal = (items: LineItem[]): number => {
    const subtotal = calculateSubtotal(items);
    return subtotal + calculateVAT(subtotal);
  };



  const handleAddSavedItem = (itemId: string) => {

    if (!itemId) return;



    const itemToAdd = savedLineItems.find(item => item.id === itemId);

    if (!itemToAdd) return;



    const newLineItem = {

      description: itemToAdd.name,

      quantity: 1,

      unit_price: itemToAdd.unit_price,

      total: itemToAdd.unit_price,

    };



    const lastItem = formData.line_items[formData.line_items.length - 1];

    if (formData.line_items.length === 1 && !lastItem.description && lastItem.unit_price === 0) {

      setFormData(prev => ({ ...prev, line_items: [newLineItem] }));

    } else {

      setFormData(prev => ({ ...prev, line_items: [...prev.line_items, newLineItem] }));

    }

  };



  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-4 shadow-lg shadow-emerald-500/20">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fakturor</h1>
              <p className="text-sm text-gray-500">Laddar...</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Laddar faktureringsinformation...</p>
          </div>
        </div>
      </div>
    );
  }



  const handleSaveLineItem = async (itemToSave: { description: string; unit_price: number }) => {

    if (!itemToSave.description || itemToSave.unit_price <= 0) {

      showError('Fel', 'Beskrivning och ett pris större än noll krävs för att spara en rad.');

      return;

    }



    // Prevent saving duplicates

    const isDuplicate = savedLineItems.some(

      item => item.name.toLowerCase() === itemToSave.description.toLowerCase()

    );



    if (isDuplicate) {

      showError('Dublett', 'En rad med detta namn finns redan sparad.');

      return;

    }



    try {

      const result = await createSavedLineItem(organisationId!, {

        name: itemToSave.description,

        unit_price: itemToSave.unit_price,

      });



      if (result.error) {

        showError('Fel', result.error.message);

      } else {

        success('Sparad!', t.MESSAGES.LINE_ITEM_SAVED(result.data?.name || ''));

        // Refresh data to get updated saved items
        await loadData();

      }

    } catch (err) {

      showError('Fel', 'Kunde inte spara raden.');

    }

  };



  if (error) {

    return (

      <div className="space-y-6">

        <h1 className="text-3xl font-bold text-gray-900">Fakturor</h1>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">

          <div className="flex items-center">

            <AlertCircle className="w-10 h-10 text-red-600 mr-4" />

            <div>

              <h3 className="text-lg font-semibold text-red-900">Kunde inte ladda fakturor</h3>

              <p className="text-red-700 mt-1">{error}</p>

            </div>

            <button

              onClick={loadData}

              className="ml-auto inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"

            >

              Försök igen

            </button>

          </div>

        </div>

      </div>

    );

  }



  return (

    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-4 shadow-lg shadow-emerald-500/20">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fakturor</h1>
            <p className="text-sm text-gray-500">
              {invoices.length} fakturor • {readyToInvoiceOrders.length} ordrar redo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={activeTab === 'invoices' ? invoices : readyToInvoiceOrders}
            filename={`fakturor-${new Date().toISOString().split('T')[0]}`}
            title="Exportera"
          />
          {activeTab === 'invoices' && (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                resetForm();
                setEditingInvoice(null);
                setSelectedOrder(null);
                setActiveInvoiceTab('info');
                setShowUnifiedModal(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Skapa Faktura
            </Button>
          )}
        </div>

      </div>



      {/* Tab Navigation */}

      <div className="border-b border-gray-200">

        <nav className="flex space-x-8">

          {[

            { id: 'invoices', label: 'Alla Fakturor', icon: Receipt },

            { id: 'ready-to-invoice', label: 'Hantera Fakturor', icon: Package },

            { id: 'credit_notes', label: 'Kreditfakturor', icon: CreditCard }

          ].map((tab: { id: string; label: string; icon: React.ElementType }) => {

            const Icon = tab.icon;

            return (

              <button

                key={tab.id}

                onClick={() => setActiveTab(tab.id as any)}

                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id

                  ? 'border-blue-500 text-blue-600'

                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'

                  }`}

              >

                <Icon className="w-4 h-4 mr-2" />

                {tab.label}

                {tab.id === 'ready-to-invoice' && readyToInvoiceOrders.length > 0 && (

                  <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">

                    {readyToInvoiceOrders.length}

                  </span>

                )}

              </button>

            );

          })}

        </nav>

      </div>



      {/* Invoices Tab */}

      {activeTab === 'invoices' && (
        <>
          {selectedInvoices.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedInvoices.length} fakturor valda
                </span>
                <button
                  type="button"
                  onClick={handleDownloadSelectedInvoices}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Ladda ner {selectedInvoices.length} PDF
                </button>
              </div>
            </div>
          )}

          {/* Filters */}

          {showFilters && (

            <div className="bg-white rounded-lg shadow-sm border p-4">

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">Sök</label>

                  <div className="relative">

                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

                    <input

                      type="text"

                      value={filters.search || ''}

                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}

                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"

                      placeholder="Sök fakturor..."

                    />

                  </div>

                </div>



                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>

                  <select

                    value={filters.status || 'all'}

                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"

                  >

                    <option value="all">Alla statusar</option>

                    {Object.entries(INVOICE_STATUS_LABELS).map(([status, label]) => (

                      <option key={status} value={status}>{label}</option>

                    ))}

                  </select>

                </div>



                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">Kund</label>

                  <select

                    value={filters.customer || 'all'}

                    onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"

                  >

                    <option value="all">Alla kunder</option>

                    {customers.map(customer => (

                      <option key={customer.id} value={customer.id}>{customer.name}</option>

                    ))}

                  </select>

                </div>



                <div className="flex items-end">

                  <button

                    onClick={() => setFilters({})}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"

                  >

                    Rensa filter

                  </button>

                </div>

              </div>

            </div>

          )}



          {/* Invoices List */}

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">

              <h3 className="text-lg font-semibold text-gray-900">Fakturor</h3>

              <button

                onClick={() => setShowFilters(!showFilters)}

                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"

              >

                <Filter className="w-4 h-4 mr-2" />

                Filter

              </button>

            </div>



            {invoices.length === 0 ? (

              <EmptyState

                type="general"

                title="Inga fakturor ännu"

                description="Skapa din första faktura eller generera fakturor från färdiga ordrar."

                actionText="Skapa Faktura"

                onAction={() => setShowUnifiedModal(true)}

              />

            ) : (

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                          onChange={selectAllInvoices}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th>{t.TABLE.INVOICE_NUMBER}</th>
                      <th>{t.TABLE.CUSTOMER}</th>
                      <th>{t.TABLE.AMOUNT}</th>
                      <th>{t.TABLE.STATUS}</th>
                      <th>{t.TABLE.DUE_DATE}</th>
                      <th>{t.TABLE.CREATED}</th>
                      <th className="text-right">{t.TABLE.ACTIONS}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={() => toggleInvoiceSelection(invoice.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm font-medium text-gray-900">

                            {invoice.invoice_number}

                          </div>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm text-gray-900">

                            {invoice.customer?.name || 'Okänd kund'}

                          </div>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div>

                            <p className="text-sm font-medium text-gray-900">

                              {formatCurrency(invoice.amount)}

                            </p>

                            {invoice.credited_amount && invoice.credited_amount > 0 && (

                              <p className="text-sm text-red-600">

                                Krediterat: {formatCurrency(Math.abs(invoice.credited_amount))}

                              </p>

                            )}

                            {invoice.net_amount !== invoice.amount && (

                              <p className="text-sm font-medium text-gray-700">

                                Netto: {formatCurrency(invoice.net_amount || invoice.amount)}

                              </p>

                            )}

                          </div>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}`}>

                            {INVOICE_STATUS_LABELS[invoice.status]}

                          </span>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">

                          {invoice.due_date ? formatDate(invoice.due_date) : '-'}

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                          {formatDate(invoice.created_at)}

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">

                          <div className="flex items-center justify-end space-x-2">
                            <label className="cursor-pointer text-gray-400 hover:text-blue-600" title="Ladda upp signerad PDF">
                              <FileUp className="w-4 h-4" />
                              <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleManualSigning(invoice.id, file);
                                }}
                              />
                            </label>

                            <button

                              onClick={() => {

                                setSelectedInvoice(invoice);
                                loadInvoiceDocuments(invoice.order_id);
                                setShowDetailsModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditInvoiceClick(invoice)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Redigera"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleOpenReminder(invoice)} className="text-gray-400 hover:text-orange-600 transition-colors" title="Sätt påminnelse">
                              <Bell className="w-4 h-4" />
                            </button>
                            {invoice.status !== 'paid' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent modal from opening
                                  handleMarkAsPaid(invoice.id);
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Markera som betald"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {canCreateCreditNote(invoice) && (
                              <button
                                onClick={() => setShowCreditNoteModal(invoice)}
                                className="text-gray-400 hover:text-red-600"
                                title="Kreditera"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setInvoiceToDelete(invoice);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
          {/* Bulk Actions */}
          {readyToInvoiceOrders.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === readyToInvoiceOrders.length && readyToInvoiceOrders.length > 0}
                      onChange={selectAllOrders}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Välj alla ({readyToInvoiceOrders.length})
                    </span>
                  </label>
                  {selectedOrders.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedOrders.length} valda
                    </span>
                  )}
                </div>

                {selectedOrders.length > 0 && (

                  <button

                    onClick={handleBulkCreateInvoices}

                    disabled={bulkProcessing}

                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"

                  >

                    {bulkProcessing ? (

                      <Loader2 className="w-4 h-4 animate-spin text-white" />

                    ) : (

                      <Receipt className="w-4 h-4 mr-2" />

                    )}

                    Skapa {selectedOrders.length} Fakturor

                  </button>

                )}

              </div>

            </div>

          )}



          {/* Orders Ready to Invoice */}

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-200">

              <h3 className="text-lg font-semibold text-gray-900">

                Ordrar redo att fakturera

                <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">

                  {readyToInvoiceOrders.length}

                </span>

              </h3>

              <p className="text-sm text-gray-600 mt-1">

                Ordrar med status "Redo att fakturera" som kan konverteras till fakturor

              </p>

            </div>



            {readyToInvoiceOrders.length === 0 ? (

              <div className="p-8 text-center text-gray-500">

                <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />

                <h3 className="text-lg font-medium text-gray-900 mb-2">Inga ordrar redo att fakturera</h3>

                <p className="text-gray-600">

                  Ordrar med status "Redo att fakturera" kommer att visas här.

                </p>

              </div>

            ) : (

              <div className="table-container">

                <table className="data-table">

                  <thead>

                    <tr>

                      <th className="px-6 py-3 text-left">

                        <input

                          type="checkbox"

                          checked={selectedOrders.length === readyToInvoiceOrders.length && readyToInvoiceOrders.length > 0}

                          onChange={selectAllOrders}

                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"

                        />

                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                        Order Titel

                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                        Kund

                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                        Värde

                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                        Tilldelning

                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                        Datum Slutfört

                      </th>

                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">

                        Åtgärder

                      </th>

                    </tr>

                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">

                    {readyToInvoiceOrders.map((order) => (

                      <tr key={order.id} className="hover:bg-gray-50">

                        {/* 1. Checkbox */}

                        <td className="px-6 py-4 whitespace-nowrap">

                          <input

                            type="checkbox"

                            checked={selectedOrders.includes(order.id)}

                            onChange={() => toggleOrderSelection(order.id)}

                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"

                          />

                        </td>



                        {/* 2. Order Titel (Correct) */}

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm font-medium text-gray-900">{order.title}</div>

                          {/* I've moved Job Type and Description here for better context */}

                          {order.job_type && (

                            <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getJobTypeColor(order.job_type)}`}>

                              {JOB_TYPE_LABELS[order.job_type]}

                            </span>

                          )}

                          <div className="text-sm text-gray-500 max-w-xs truncate" title={order.job_description || order.description}>

                            {order.job_description || order.description || ''}

                          </div>

                        </td>



                        {/* 3. Kund (Moved to correct position) */}

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm text-gray-900">{order.customer?.name || 'Okänd kund'}</div>

                          {order.customer?.email && (

                            <div className="text-sm text-gray-500">{order.customer.email}</div>

                          )}

                        </td>



                        {/* 4. Värde (Moved to correct position) */}

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm font-medium text-gray-900">

                            {order.value ? formatCurrency(order.value) : '-'}

                          </div>

                        </td>



                        {/* 5. Tilldelning (Moved to correct position) */}

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">

                          {order.assignment_type === 'individual' && order.assigned_to ? (

                            <div className="flex items-center">

                              <User className="w-4 h-4 mr-1 text-gray-400" />

                              <div>

                                <div>{order.assigned_to.full_name}</div>

                              </div>

                            </div>

                          ) : order.assignment_type === 'team' && order.assigned_team ? (

                            <div className="flex items-center">

                              <Users2 className="w-4 h-4 mr-1 text-gray-400" />

                              <div>{order.assigned_team.name}</div>

                            </div>

                          ) : (

                            <span className="text-gray-500">Ej tilldelad</span>

                          )}

                        </td>



                        {/* 6. Datum Slutfört (Moved to correct position) */}

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm text-gray-900">{formatDate(order.created_at)}</div>

                        </td>



                        {/* 7. Åtgärder (Correct) */}

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">

                          <div className="flex items-center justify-end space-x-2">

                            <button

                              onClick={() => {

                                setSelectedOrder(order);
                                loadOrderDocuments(order.id);

                                // Pre-fill form data from the selected order

                                setFormData({

                                  customer_id: order.customer_id || '',

                                  order_id: order.id,

                                  due_date: new Date(Date.now() + (systemSettings?.default_payment_terms || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

                                  invoice_number: '', // Will be generated on creation

                                  amount: '', // Will be calculated

                                  line_items: [{

                                    description: order.job_description || order.title,

                                    quantity: 1,

                                    unit_price: order.value || 0,

                                    total: order.value || 0

                                  }],

                                });

                                setWorkSummary(order.job_description || order.description || '');

                                setPreInvoiceAssignmentType(order.assignment_type || 'individual');

                                setPreInvoiceAssignedToUserId(order.assigned_to_user_id || null);

                                setPreInvoiceAssignedToTeamId(order.assigned_to_team_id || null);

                                setActiveInvoiceTab('info'); // Reset to the first tab

                                setShowUnifiedModal(true);

                              }}

                              className="text-blue-600 hover:text-blue-900"

                              title="Granska och redigera"

                            >

                              <Edit className="w-4 h-4" />

                            </button>



                          </div>

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



      {activeTab === 'credit_notes' && (

        <CreditNotesList />

      )}




      {/* Invoice Details Modal */}

      {showDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Faktura {selectedInvoice.invoice_number}
                </h3>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getInvoiceStatusColor(selectedInvoice.status)}`}>
                  {INVOICE_STATUS_LABELS[selectedInvoice.invoice_number]}
                </span>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Left Column: Details & Assignment */}

              <div className="space-y-8">
                {/* Assignment Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Utförd av</h4>
                    {!isEditingAssignment && (
                      <button
                        onClick={() => {
                          setDetailsAssignmentType(selectedInvoice.assignment_type || 'individual');
                          setDetailsAssignedToUserId(selectedInvoice.assigned_to_user_id || null);
                          setDetailsAssignedToTeamId(selectedInvoice.assigned_to_team_id || null);
                          setIsEditingAssignment(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                      >
                        <Edit className="w-3 h-3 mr-1" /> Ändra
                      </button>
                    )}
                  </div>

                  {isEditingAssignment ? (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-2">Tilldelningstyp</label>

                        <div className="flex space-x-4">

                          <label className="flex items-center">

                            <input type="radio" value="individual" checked={detailsAssignmentType === 'individual'} onChange={(e) => setDetailsAssignmentType(e.target.value as any)} className="h-4 w-4 text-blue-600" />

                            <span className="ml-2 text-sm">Individ</span>

                          </label>

                          <label className="flex items-center">

                            <input type="radio" value="team" checked={detailsAssignmentType === 'team'} onChange={(e) => setDetailsAssignmentType(e.target.value as any)} className="h-4 w-4 text-blue-600" />

                            <span className="ml-2 text-sm">Team</span>

                          </label>

                        </div>

                      </div>

                      <div>

                        {detailsAssignmentType === 'individual' ? (

                          <select value={detailsAssignedToUserId || ''} onChange={(e) => setDetailsAssignedToUserId(e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-md">

                            <option value="">Välj person...</option>

                            {teamMembers.map(member => <option key={member.id} value={member.id}>{member.full_name}</option>)}

                          </select>

                        ) : (

                          <select value={detailsAssignedToTeamId || ''} onChange={(e) => setDetailsAssignedToTeamId(e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-md">

                            <option value="">Välj team...</option>

                            {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}

                          </select>

                        )}

                      </div>

                      <div className="flex justify-end space-x-2">

                        <button onClick={() => setIsEditingAssignment(false)} className="px-3 py-1 text-sm border rounded-md">Avbryt</button>

                        <button onClick={handleSaveAssignment} disabled={formLoading} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50">

                          {formLoading ? 'Sparar...' : 'Spara'}

                        </button>

                      </div>

                    </div>

                  ) : (

                    <div className="bg-gray-50 p-4 rounded-lg">

                      {selectedInvoice.assignment_type === 'team' && selectedInvoice.assigned_team ? (

                        <div className="flex items-center">

                          <Users2 className="w-6 h-6 mr-3 text-blue-600" />

                          <div>

                            <p className="font-semibold">{selectedInvoice.assigned_team.name}</p>

                            <p className="text-sm text-gray-600">{TEAM_SPECIALTY_LABELS[selectedInvoice.assigned_team.specialty]}</p>

                          </div>

                        </div>

                      ) : selectedInvoice.assignment_type === 'individual' && selectedInvoice.assigned_user ? (

                        <div className="flex items-center">

                          <User className="w-6 h-6 mr-3 text-green-600" />

                          <div>

                            <p className="font-semibold">{selectedInvoice.assigned_user.full_name}</p>

                            <p className="text-sm text-gray-600">{selectedInvoice.assigned_user.email}</p>

                            <p className="text-sm text-gray-600">{TEAM_ROLE_LABELS[selectedInvoice.assigned_user.role_in_team || '']}</p>

                          </div>

                        </div>

                      ) : (

                        <p className="text-gray-600">Information saknas</p>

                      )}

                    </div>

                  )}

                </div>



                {/* Job Description Section */}

                <div>

                  <h4 className="font-medium text-gray-900 mb-2">Arbetsbeskrivning</h4>

                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">

                    {selectedInvoice.job_description || 'Ingen beskrivning angiven.'}

                  </div>

                </div>

                {/* ROT INFORMATION DISPLAY */}
                {selectedInvoice && selectedInvoice.include_rot && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">ROT-avdrag</h4>
                    <ROTInformation
                      data={selectedInvoice}
                      totalAmount={selectedInvoice.amount}
                    />
                  </div>
                )}



                {/* Line Items Section */}

                <div>

                  <h4 className="font-medium text-gray-900 mb-3">Fakturarader</h4>

                  <div className="border rounded-lg overflow-hidden">

                    <table className="min-w-full">

                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">

                        <tr>

                          <th className="px-4 py-2 text-left">Beskrivning</th>

                          <th className="px-4 py-2 text-right">Antal</th>

                          <th className="px-4 py-2 text-right">Pris</th>

                          <th className="px-4 py-2 text-right">Summa</th>

                        </tr>

                      </thead>

                      <tbody className="divide-y">

                        {(selectedInvoice.invoice_line_items || []).map((item, index) => (

                          <tr key={index} className="text-sm">

                            <td className="px-4 py-2">{item.description}</td>

                            <td className="px-4 py-2 text-right">{item.quantity}</td>

                            <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price)}</td>

                            <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total)}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                </div>



                {/* Credit History Section */}

                <div>

                  <h4 className="font-medium text-gray-900 mb-3">Kredithistorik</h4>

                  <InvoiceCreditHistory invoice={selectedInvoice} />
                </div>
                {/* Placeholder for future file uploads */}

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Bifogade Dokument & Anteckningar</h4>
                  <div className="space-y-2 rounded-lg border p-4 max-h-60 overflow-y-auto">
                    {invoiceOrderNotes.length === 0 && invoiceOrderAttachments.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">Inga dokumentationer inkluderade.</p>
                    )}
                    {/* Render Notes */}
                    {invoiceOrderNotes.map((note) => (
                      <div key={`note_${note.id}`} className="bg-gray-50 p-2 rounded">
                        <p className="text-xs font-semibold">{note.user?.full_name || 'System'}</p>
                        <p className="text-sm">{note.content}</p>
                      </div>
                    ))}
                    {/* Render Attachments */}
                    {invoiceOrderAttachments.map((att) => (
                      <div key={`attachment_${att.id}`} className="bg-gray-50 p-2 rounded flex items-center justify-between">
                        <div className="flex items-center">
                          <Paperclip className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-sm">{att.file_name}</span>
                        </div>
                        <a
                          href={getAttachmentPublicUrl(att.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Visa
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Right Column: Invoice Preview */}
              <div>
                <div className="mb-4 bg-gray-50 p-4 rounded-lg border print:hidden">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kund</label>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedInvoice.customer ? selectedInvoice.customer.name : (selectedInvoice.customer_name || 'Okänd kund')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedInvoice.customer ? selectedInvoice.customer.email : selectedInvoice.customer_email}
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Välj designmall</label>
                    {templates.length === 0 && (
                      <Link to="/settings" className="text-xs text-blue-600 hover:text-blue-800">
                        Skapa mall
                      </Link>
                    )}
                  </div>
                  <select
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const template = templates.find(t => t.id === e.target.value);
                      setSelectedTemplate(template || null);
                    }}
                  >
                    <option value="">Standard design</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="border shadow-sm rounded-lg bg-white overflow-hidden">
                  <InvoicePreview
                    invoice={selectedInvoice}
                    logoUrl={systemSettings?.logo_url}
                    systemSettings={systemSettings}
                    organisation={organisation}
                    template={selectedTemplate || undefined}
                  />
                </div>
              </div>

            </div>

            {/* Hidden Copy for Manual Signing */}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              ref={manualSigningInputRef}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) handleManualSigning(file);
              }}
            />

            <div className="flex justify-end space-x-3 p-6 border-t">

              <button

                type="button"

                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTemplate(null);
                }}

                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"

              >

                Stäng

              </button>

              {/* This button will be implemented in the next step */}

              <button

                type="button"

                disabled // Temporarily disabled

                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"

              >

                <MessageSquare className="w-4 h-4 mr-2" />

                Skicka via SMS

              </button>

              <button
                type="button"
                onClick={() => manualSigningInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileUp className="w-4 h-4 mr-2" />
                Manuell Signering
              </button>

              <button

                type="button"

                onClick={() => {

                  setShowDetailsModal(false);

                  setShowEmailModal(true);

                }}

                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"

              >

                <Send className="w-4 h-4 mr-2" />

                Skicka via E-post

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Unified Create/Edit/From Order Modal */}

      {showUnifiedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              if (editingInvoice) {
                handleUpdateInvoice();
              } else if (selectedOrder) {
                handleSavePreInvoiceChangesAndCreateInvoice();
              } else {
                handleCreateInvoice();
              }
            }}
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingInvoice
                  ? `Redigera Faktura ${editingInvoice.invoice_number}`
                  : selectedOrder
                    ? `Skapa Faktura från Order: ${selectedOrder.title}`
                    : 'Skapa Ny Faktura'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowUnifiedModal(false);
                  setEditingInvoice(null);
                  setSelectedOrder(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex px-6">
                {[
                  { id: 'info', label: 'Fakturainformation', icon: FileText },

                  { id: 'team', label: 'Arbetsteam & Utförande', icon: Users2 },

                  { id: 'docs', label: 'Dokument & Bevis', icon: Package },

                  { id: 'lineItems', label: 'Fakturarader', icon: Receipt }

                ].map((tab: { id: string; label: string; icon: React.ElementType }) => {

                  const Icon = tab.icon;

                  return (

                    <button

                      type="button"

                      key={tab.id}

                      onClick={() => setActiveInvoiceTab(tab.id as any)}

                      className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center ${activeInvoiceTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />

                      {tab.label}

                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">

              {/* All 4 Tab Panels Go Here */}

              {activeInvoiceTab === 'info' && (

                <div className="space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Kund *</label>
                        {!selectedOrder && (
                          <button
                            type="button"
                            onClick={() => setIsManualCustomer(!isManualCustomer)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {isManualCustomer ? 'Välj befintlig kund' : 'Ny kund (Manuell)'}
                          </button>
                        )}
                      </div>

                      {!isManualCustomer ? (
                        <select
                          required={!isManualCustomer}
                          value={formData.customer_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value, order_id: '' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          disabled={!!selectedOrder || (!!editingInvoice && !isManualCustomer)} // Allow change if not linked to order
                        >
                          <option value="">Välj kund</option>
                          {customers.map(customer => (
                            <option key={customer.id} value={customer.id}>{customer.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-3 bg-gray-50 p-3 rounded-md border">
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => setManualCustomerForm(prev => ({ ...prev, customer_type: 'company' }))}
                              className={`flex-1 py-1 text-xs rounded border ${manualCustomerForm.customer_type === 'company' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
                            >Företag</button>
                            <button
                              type="button"
                              onClick={() => setManualCustomerForm(prev => ({ ...prev, customer_type: 'private' }))}
                              className={`flex-1 py-1 text-xs rounded border ${manualCustomerForm.customer_type === 'private' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
                            >Privat</button>
                          </div>
                          <input
                            type="text"
                            placeholder={manualCustomerForm.customer_type === 'company' ? "Företagsnamn *" : "Namn *"}
                            className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={manualCustomerForm.name}
                            onChange={e => setManualCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                          {manualCustomerForm.customer_type === 'company' && (
                            <input
                              type="text"
                              placeholder="Organisationsnummer"
                              className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                              value={manualCustomerForm.org_number}
                              onChange={e => setManualCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                            />
                          )}
                          <input
                            type="email"
                            placeholder="E-post"
                            className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={manualCustomerForm.email}
                            onChange={e => setManualCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                          />
                          <input
                            type="text"
                            placeholder="Adress"
                            className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={manualCustomerForm.address}
                            onChange={e => setManualCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Postnummer"
                              className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                              value={manualCustomerForm.postal_code}
                              onChange={e => setManualCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                            />
                            <input
                              type="text"
                              placeholder="Ort"
                              className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                              value={manualCustomerForm.city}
                              onChange={e => setManualCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">Förfallodatum</label>
                      <input

                        type="date"

                        value={formData.due_date}

                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}

                        className="w-full px-3 py-2 border border-gray-300 rounded-md"

                      />

                    </div>

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">

                      Arbetsbeskrivning / Anteckningar

                    </label>

                    <textarea

                      value={workSummary}

                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWorkSummary(e.target.value)}

                      rows={4}

                      className="w-full px-3 py-2 border border-gray-300 rounded-md"

                      placeholder="Beskriv det utförda arbetet..."

                    />

                  </div>
                  <div className="border-t border-gray-200 pt-6">
                    <ROTFields
                      data={{
                        include_rot: formData.include_rot,
                        rot_personnummer: formData.rot_personnummer,
                        rot_organisationsnummer: formData.rot_organisationsnummer,
                        rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                        rot_amount: formData.rot_amount,
                      }}
                      onChange={(rotData) =>
                        setFormData(prev => ({ ...prev, ...rotData }))
                      }
                      totalAmount={calculateTotal(formData.line_items)}
                    />
                  </div>

                </div>

              )}

              {activeInvoiceTab === 'team' && (

                <div className="space-y-4">

                  <h4 className="font-medium text-gray-900 mb-4">Tilldela jobb</h4>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">Tilldelningstyp</label>

                    <div className="flex space-x-4">

                      <label className="flex items-center">

                        <input type="radio" value="individual" checked={preInvoiceAssignmentType === 'individual'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPreInvoiceAssignmentType(e.target.value as any)} className="h-4 w-4 text-blue-600" />

                        <span className="ml-2 text-sm">Individ</span>

                      </label>

                      <label className="flex items-center">

                        <input type="radio" value="team" checked={preInvoiceAssignmentType === 'team'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPreInvoiceAssignmentType(e.target.value as any)} className="h-4 w-4 text-blue-600" />

                        <span className="ml-2 text-sm">Team</span>

                      </label>

                    </div>

                  </div>

                  <div>

                    {preInvoiceAssignmentType === 'individual' ? (

                      <select value={preInvoiceAssignedToUserId || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreInvoiceAssignedToUserId(e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-md">

                        <option value="">Välj person...</option>

                        {teamMembers.map(member => <option key={member.id} value={member.id}>{member.full_name}</option>)}

                      </select>

                    ) : (

                      <select value={preInvoiceAssignedToTeamId || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreInvoiceAssignedToTeamId(e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-md">

                        <option value="">Välj team...</option>

                        {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}

                      </select>

                    )}

                  </div>

                  <div className="pt-2 pl-1 h-6">

                    {preInvoiceAssignmentType === 'team' && preInvoiceAssignedToTeamId && (

                      <p className={`text-xs px-2 py-0.5 inline-block rounded-full bg-blue-100 text-blue-800`}>

                        Specialitet: {TEAM_SPECIALTY_LABELS[teams.find(t => t.id === preInvoiceAssignedToTeamId)?.specialty || '']}

                      </p>

                    )}

                    {preInvoiceAssignmentType === 'individual' && preInvoiceAssignedToUserId && (

                      <p className={`text-xs px-2 py-0.5 inline-block rounded-full ${getTeamRoleColor((teamMembers.find(m => m.id === preInvoiceAssignedToUserId) as any)?.role_in_team || '')}`}>

                        Roll: {TEAM_ROLE_LABELS[(teamMembers.find(m => m.id === preInvoiceAssignedToUserId) as any)?.role_in_team || ''] || 'Okänd'}

                      </p>

                    )}

                  </div>

                  {/* --- END OF NEW SECTION --- */}

                </div>

              )}

              {activeInvoiceTab === 'docs' && (
                <div className="space-y-6">
                  {/* Worker's uploaded documents */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Arbetarens Dokumentation</h4>
                    <div className="space-y-2 rounded-lg border p-4 max-h-60 overflow-y-auto">
                      {orderNotes.length === 0 && orderAttachments.length === 0 && (
                        <p className="text-gray-500 text-sm">Inga anteckningar eller filer från arbetaren.</p>
                      )}
                      {/* Render Notes with Delete Button */}
                      {orderNotes.map((note) => (
                        <div key={`note_${note.id}`} className="flex items-start group">
                          <button type="button" onClick={() => setAttachmentsToInclude(prev => ({ ...prev, [`note_${note.id}`]: !prev[`note_${note.id}`] }))} className="mr-3 mt-1">
                            {attachmentsToInclude[`note_${note.id}`] ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                          </button>
                          <div className="flex-1 bg-gray-50 p-2 rounded">
                            <p className="text-xs font-semibold">{note.user?.full_name || 'System'}</p>
                            <p className="text-sm">{note.content}</p>
                          </div>
                          <button type="button" onClick={() => handleDeleteNote(note.id)} className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {/* Render Attachments with Delete Button */}
                      {orderAttachments.map((att) => (
                        <div key={`attachment_${att.id}`} className="flex items-start group">

                          <button type="button" onClick={() => setAttachmentsToInclude(prev => ({ ...prev, [`attachment_${att.id}`]: !prev[`attachment_${att.id}`] }))} className="mr-3 mt-1">
                            {attachmentsToInclude[`attachment_${att.id}`] ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                          </button>
                          <div className="flex-1 bg-gray-50 p-2 rounded flex items-center">
                            <Paperclip className="w-4 h-4 mr-2" />
                            <span className="text-sm">{att.file_name}</span>
                          </div>
                          <button type="button" onClick={() => handleDeleteAttachment(att)} className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Markera de objekt som ska inkluderas i fakturan.</p>
                  </div>

                  {/* Admin's own uploads */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Lägg till Egna Dokument</h4>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Välj filer att ladda upp</label>
                      <input
                        type="file"
                        multiple
                        onChange={handleAdminFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {adminNewFiles.length > 0 && (
                        <button
                          onClick={handleAdminUpload}
                          disabled={isUploading}
                          className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Paperclip size={16} className="mr-2" />}
                          Ladda upp {adminNewFiles.length} fil(er)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeInvoiceTab === 'lineItems' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Fakturarader</h4>
                    <div className="flex items-center space-x-2">
                      <select
                        onChange={(e) => {
                          handleAddSavedItem(e.target.value);
                          e.target.value = '';
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                        value=""
                      >
                        <option value="" disabled>Lägg till sparad rad...</option>
                        {savedLineItems.map(item => (

                          <option key={item.id} value={item.id}>

                            {item.name} - {formatCurrency(item.unit_price)}

                          </option>

                        ))}

                      </select>

                      <button

                        type="button"

                        onClick={addLineItem}

                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100"

                      >

                        <Plus className="w-4 h-4 mr-1" />

                        Lägg till tom rad

                      </button>

                    </div>

                  </div>

                  <div className="space-y-3">

                    {formData.line_items.map((item, index) => {

                      const isAlreadySaved = savedLineItems.some(

                        savedItem => savedItem.name.toLowerCase() === item.description.toLowerCase()

                      );

                      return (

                        <div key={index} className="grid grid-cols-12 gap-3 items-center">

                          <div className="col-span-5">

                            {index === 0 && <label className="block text-xs font-medium text-gray-700 mb-1">Beskrivning</label>}

                            <input

                              type="text"

                              value={item.description}

                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLineItem(index, 'description', e.target.value)}

                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"

                              placeholder="Beskrivning av tjänst/produkt"

                            />

                          </div>

                          <div className="col-span-2">

                            {index === 0 && <label className="block text-xs font-medium text-gray-700 mb-1">Antal</label>}

                            <input

                              type="number"

                              min="0"

                              step="0.01"

                              value={item.quantity}

                              onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}

                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"

                            />

                          </div>

                          <div className="col-span-2">

                            {index === 0 && <label className="block text-xs font-medium text-gray-700 mb-1">Enhetspris</label>}

                            <input

                              type="number"

                              min="0"

                              step="0.01"

                              value={item.unit_price}

                              onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}

                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"

                            />

                          </div>

                          <div className="col-span-2">

                            {index === 0 && <label className="block text-xs font-medium text-gray-700 mb-1">Summa</label>}

                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">

                              {formatCurrency(item.total)}

                            </div>

                          </div>

                          <div className="col-span-1 flex items-end h-full">

                            <div className="flex items-center">

                              {!isAlreadySaved && item.description && item.unit_price > 0 && (

                                <button type="button" onClick={() => handleSaveLineItem(item)} className="p-2 text-blue-600">

                                  <Save className="w-4 h-4" />

                                </button>

                              )}

                              {formData.line_items.length > 1 && (

                                <button type="button" onClick={() => removeLineItem(index)} className="p-2 text-red-600">

                                  <Trash2 className="w-4 h-4" />

                                </button>

                              )}

                            </div>

                          </div>

                        </div>

                      );

                    })}

                  </div>

                  <div className="mt-6 flex justify-end">{/*...Totals Section...*/}</div>

                </div>

              )}

            </div>



            <div className="flex justify-end space-x-3 p-6 border-t">

              <button

                type="button"

                onClick={() => {

                  setShowUnifiedModal(false);

                  setEditingInvoice(null);

                  setSelectedOrder(null);

                  resetForm();

                }}

                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"

              >

                Avbryt

              </button>

              <button

                type="submit"

                disabled={formLoading}

                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600"

              >

                {formLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 mr-2" />}

                {editingInvoice ? 'Spara Ändringar' : 'Skapa Faktura'}

              </button>

            </div>

          </form>

        </div>

      )}





      {/* Email Invoice Modal */}

      {showEmailModal && selectedInvoice && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-6 border-b">

              <h3 className="text-lg font-semibold text-gray-900">

                Skicka faktura via e-post

              </h3>

              <button

                onClick={() => {

                  setShowEmailModal(false);

                  setSelectedInvoice(null);

                }}

                className="text-gray-400 hover:text-gray-600"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">

              {/* Left Column: Email Form */}

              <div className="space-y-6">

                {/* Email Template Selection */}

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">E-postmall</label>

                  <select

                    value={emailData.template_type}

                    onChange={(e) => {

                      const newTemplateType = e.target.value as any;

                      const template = generateInvoiceEmailTemplate(selectedInvoice, newTemplateType);

                      setEmailData(prev => ({

                        ...prev,

                        template_type: newTemplateType,

                        subject: template.subject,

                        email_body: template.body

                      }));

                    }}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md"

                  >

                    <option value="standard">Standard faktura</option>

                    <option value="team_presentation">Team presentation</option>

                    <option value="quality_assurance">Kvalitetsgaranti</option>

                    <option value="follow_up">Uppföljning</option>

                  </select>

                </div>



                {/* Recipient */}

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">Mottagare</label>

                  <input

                    type="email"

                    value={emailData.recipient_email}

                    onChange={(e) => setEmailData(prev => ({ ...prev, recipient_email: e.target.value }))}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md"

                    placeholder="kund@email.se"

                  />

                </div>



                {/* Subject */}

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">Ämne</label>

                  <input

                    type="text"

                    value={emailData.subject}

                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md"

                  />

                </div>



                {/* Email Body */}

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">E-postinnehåll</label>

                  <textarea

                    value={emailData.email_body}

                    onChange={(e) => setEmailData(prev => ({ ...prev, email_body: e.target.value }))}

                    rows={10}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md"

                  />

                </div>



                {/* Options */}

                {selectedInvoice.assigned_team?.team_leader && (

                  <label className="flex items-center">

                    <input

                      type="checkbox"

                      checked={emailData.send_copy_to_team_leader}

                      onChange={(e) => setEmailData(prev => ({ ...prev, send_copy_to_team_leader: e.target.checked }))}

                      className="h-4 w-4 text-blue-600 rounded"

                    />

                    <span className="ml-3 text-sm text-gray-700">

                      Skicka kopia till teamledare ({selectedInvoice.assigned_team.team_leader.full_name})

                    </span>

                  </label>

                )}

              </div>

              {/* Right Column: Invoice Preview */}

              <div className="bg-gray-50 p-4 rounded-lg h-full">

                <div className="transform scale-90 -translate-y-8">

                  <InvoicePreview invoice={selectedInvoice} logoUrl={systemSettings?.logo_url} systemSettings={systemSettings} organisation={organisation} />

                </div>

              </div>

            </div>



            <div className="flex justify-end space-x-3 p-6 border-t">

              <button

                onClick={() => setShowEmailModal(false)}

                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"

              >

                Avbryt

              </button>

              <button
                type="button"

                onClick={handleSendEmail}

                disabled={emailLoading || !emailData.recipient_email || !emailData.subject || !emailData.email_body}

                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"

              >

                {emailLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 mr-2" />}

                Skicka E-post

              </button>

            </div>

          </div>

        </div>

      )}



      {showCreditNoteModal && (

        <CreditNoteModal

          invoice={showCreditNoteModal}

          isOpen={!!showCreditNoteModal}

          onClose={() => setShowCreditNoteModal(null)}

          onCreditNoteCreated={() => {

            setShowCreditNoteModal(null);

            success('Kreditfaktura skapad framgångsrikt!');

            loadData();

          }}

        />

      )}



      {/* Delete Confirmation Dialog */}

      <ConfirmDialog

        isOpen={showDeleteDialog}

        onClose={() => {

          setShowDeleteDialog(false);

          setInvoiceToDelete(null);

        }}

        onConfirm={handleDeleteInvoice}

        title="Ta bort faktura"

        message={`Är du säker på att du vill ta bort fakturan "${invoiceToDelete?.invoice_number}"? Denna åtgärd kan inte ångras.`}

        confirmText="Ta bort"

        cancelText="Avbryt"

        type="danger"

      />
      <div style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        height: '0',
        overflow: 'hidden',
        visibility: 'hidden' // Extra measure
      }}>
        <PrintableInvoices
          ref={printComponentRef}
          invoices={invoicesToPrint}
          organisation={organisation}
          systemSettings={systemSettings}
        />
      </div>

      {/* Reminder Modal */}
      {reminderEntity && (
        <ReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => {
            setIsReminderModalOpen(false);
            setReminderEntity(null);
          }}
          entityType="invoice"
          entityId={reminderEntity.id}
          entityTitle={reminderEntity.title}
          onSave={() => {
            setIsReminderModalOpen(false);
            setReminderEntity(null);
          }}
        />
      )}

    </div>

  );
}

interface PrintableProps {
  invoices: InvoiceWithRelations[];
  organisation: Organisation | null;
  systemSettings: { default_payment_terms: number; logo_url: string | null } | null;
}

const PrintableInvoices = React.forwardRef<HTMLDivElement, PrintableProps>(
  ({ invoices, organisation, systemSettings }, ref) => {
    return (
      // This div receives the ref, which is correct.
      <div ref={ref}>
        {invoices.map((invoice) => (
          // MODIFIED:
          // We wrap *each* invoice in our new 'printable-page' class.
          // We remove the old 'p-10' and inline 'pageBreakAfter' style,
          // as the CSS class now handles all of this.
          <div key={invoice.id} className="printable-page">
            <InvoicePreview
              invoice={invoice}
              logoUrl={organisation?.logo_url || null}
              systemSettings={systemSettings}
              organisation={organisation}
            />
          </div>
        ))}
      </div>
    );
  }
);

export default InvoiceManagement;
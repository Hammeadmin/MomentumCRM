import React from 'react';
import { type User } from '@supabase/supabase-js';
import {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceAsPaid,
    sendInvoiceEmail,
    generateInvoiceEmailTemplate,
    type InvoiceWithRelations,
} from '../lib/invoices';
import { uploadSignedDocument } from '../lib/storage';
import { supabase } from '../lib/supabase';
import {
    syncInvoicesToFortnox,
    syncInvoicesFromFortnox,
} from '../lib/fortnox';
import {
    updateOrder as updateOrderInDb,
    type OrderWithRelations,
    updateNoteInvoiceFlag,
    updateAttachmentInvoiceFlag,
} from '../lib/orders';
import { type TeamWithRelations } from '../lib/teams';
import { type InvoiceStatus, type UserProfile, type SystemSettings } from '../types/database';
import { INVOICES } from '../locales/sv';
import { type LineItem, type useInvoiceForm } from './useInvoiceForm';

interface UseInvoiceActionsDeps {
    organisationId: string;
    user: User | null;
    invoices: InvoiceWithRelations[];
    readyToInvoiceOrders: OrderWithRelations[];
    teamMembers: UserProfile[];
    teams: TeamWithRelations[];
    systemSettings: SystemSettings | null;
    selectedInvoice: InvoiceWithRelations | null;
    setSelectedInvoice: React.Dispatch<React.SetStateAction<InvoiceWithRelations | null>>;
    selectedOrder: OrderWithRelations | null;
    setSelectedOrder: React.Dispatch<React.SetStateAction<OrderWithRelations | null>>;
    editingInvoice: InvoiceWithRelations | null;
    setEditingInvoice: React.Dispatch<React.SetStateAction<InvoiceWithRelations | null>>;
    setShowUnifiedModal: React.Dispatch<React.SetStateAction<boolean>>;
    activeTab: 'invoices' | 'ready-to-invoice' | 'credit_notes' | string;
    setActiveTab: React.Dispatch<React.SetStateAction<'invoices' | 'ready-to-invoice' | 'credit_notes'>>;
    invoiceToDelete: InvoiceWithRelations | null;
    setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
    setInvoiceToDelete: React.Dispatch<React.SetStateAction<InvoiceWithRelations | null>>;
    selectedOrders: string[];
    setSelectedOrders: React.Dispatch<React.SetStateAction<string[]>>;
    setBulkProcessing: React.Dispatch<React.SetStateAction<boolean>>;
    attachmentsToInclude: Record<string, boolean>;
    formData: ReturnType<typeof useInvoiceForm>['formData'];
    workSummary: string;
    preInvoiceAssignmentType: 'individual' | 'team';
    preInvoiceAssignedToUserId: string | null;
    preInvoiceAssignedToTeamId: string | null;
    isManualCustomer: boolean;
    manualCustomerForm: ReturnType<typeof useInvoiceForm>['manualCustomerForm'];
    calculateTotal: (items: LineItem[]) => number;
    resetForm: () => void;
    loadData: () => void;
    formLoading: boolean;
    setFormLoading: React.Dispatch<React.SetStateAction<boolean>>;
    showError: (title: string, message: string) => void;
    showSuccess: (title: string, message: string) => void;
    t: typeof INVOICES;
}

export function useInvoiceActions(deps: UseInvoiceActionsDeps) {
    const {
        organisationId,
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
        setFormLoading,
        showError,
        showSuccess,
        t,
    } = deps;

    // ── Create Invoice ────────────────────────────────────────────────────────────

    const handleCreateInvoice = async () => {
        console.log('A. handleCreateInvoice triggered');
        if ((!isManualCustomer && !formData.customer_id) || (isManualCustomer && !manualCustomerForm.name)) {
            console.log('B. Aborting: No customer ID or manual name');
            showError('Fel', 'Kund (eller namn för manuell kund) är obligatoriskt.');
            return;
        }

        if (!formData.line_items[0]?.description) {
            console.log('C. Aborting: No line items description');
            showError('Fel', 'Minst en fakturarad med beskrivning är obligatoriskt.');
            return;
        }

        try {
            console.log('D. Setting loading state for create');
            setFormLoading(true);

            let finalCustomerId = formData.customer_id;

            if (isManualCustomer) {
                try {
                    console.log('E. Handling manual customer creation');
                    const { checkDuplicateCustomer, searchCustomers, createCustomer } = await import('../lib/database');
                    const duplicateCheck = await checkDuplicateCustomer(organisationId, manualCustomerForm.email, manualCustomerForm.name);

                    if (duplicateCheck.isDuplicate) {
                        const searchResult = await searchCustomers(organisationId, manualCustomerForm.name);
                        const existing = searchResult.data?.find(
                            (c) =>
                                c.name.toLowerCase() === manualCustomerForm.name.toLowerCase() ||
                                (c.email && manualCustomerForm.email && c.email.toLowerCase() === manualCustomerForm.email.toLowerCase())
                        );

                        if (existing) {
                            finalCustomerId = existing.id;
                            showSuccess('Info', `Hittade befintlig kund "${existing.name}". Använder denna.`);
                        } else {
                            const newCustomer = await createCustomer({
                                organisation_id: organisationId,
                                ...manualCustomerForm,
                            });
                            if (newCustomer.error || !newCustomer.data) throw new Error('Kunde inte skapa kund.');
                            finalCustomerId = newCustomer.data.id;
                        }
                    } else {
                        const newCustomer = await createCustomer({
                            organisation_id: organisationId,
                            ...manualCustomerForm,
                        });
                        if (newCustomer.error || !newCustomer.data)
                            throw new Error('Kunde inte skapa kund: ' + newCustomer.error?.message);
                        finalCustomerId = newCustomer.data.id;
                    }
                } catch (err: unknown) {
                    setFormLoading(false);
                    showError('Fel', (err instanceof Error ? err.message : null) || 'Fel vid hantering av manuell kund.');
                    return;
                }
            }

            const invoiceNumber = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
            const ocrNumber = invoiceNumber.replace(/\D/g, '');

            const invoiceData = {
                organisation_id: organisationId,
                invoice_number: invoiceNumber,
                customer_id: finalCustomerId,
                amount: calculateTotal(formData.line_items),
                due_date: formData.due_date || null,
                order_id: formData.order_id || null,
                status: 'draft' as InvoiceStatus,
                assignment_type: preInvoiceAssignmentType,
                assigned_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null,
                assigned_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null,
                job_description: workSummary,
                include_rot: formData.include_rot,
                rot_personnummer: formData.rot_personnummer,
                rot_organisationsnummer: formData.rot_organisationsnummer,
                rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                rot_amount: formData.rot_amount,
                // RUT fields
                include_rut: formData.include_rut,
                rut_personnummer: formData.rut_personnummer,
                rut_amount: formData.rut_amount,
                ocr_number: ocrNumber,
            };

            const result = await createInvoice(invoiceData, formData.line_items, user?.id);

            if (result.error) {
                showError('Fel', result.error.message);
                return;
            }

            showSuccess('Framgång', 'Faktura skapad framgångsrikt!');
            setShowUnifiedModal(false);
            resetForm();
            await loadData();
        } catch {
            showError('Fel', 'Ett oväntat fel inträffade vid skapande av faktura.');
        } finally {
            setFormLoading(false);
        }
    };

    // ── Update Invoice ────────────────────────────────────────────────────────────

    const handleUpdateInvoice = async () => {
        if (!editingInvoice) return;

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

            const invoiceUpdates = {
                customer_id: formData.customer_id,
                order_id: formData.order_id || null,
                due_date: formData.due_date || null,
                job_description: workSummary,
                amount: calculateTotal(formData.line_items),
                assignment_type: preInvoiceAssignmentType,
                assigned_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null,
                assigned_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null,
                include_rot: formData.include_rot,
                rot_personnummer: formData.rot_personnummer,
                rot_organisationsnummer: formData.rot_organisationsnummer,
                rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                rot_amount: formData.rot_amount,
                // RUT fields
                include_rut: formData.include_rut,
                rut_personnummer: formData.rut_personnummer,
                rut_amount: formData.rut_amount,
            };

            const result = await updateInvoice(editingInvoice.id, invoiceUpdates, formData.line_items);

            if (result.error) {
                showError('Fel', result.error.message);
                return;
            }

            showSuccess('Framgång', 'Faktura uppdaterad!');
            setShowUnifiedModal(false);
            setEditingInvoice(null);
            resetForm();
            await loadData();
        } catch {
            showError('Fel', 'Kunde inte uppdatera fakturan.');
        } finally {
            setFormLoading(false);
        }
    };

    // ── Create Invoice From Order ─────────────────────────────────────────────────

    const handleCreateInvoiceFromOrder = async (orderArg?: OrderWithRelations) => {
        const order = orderArg || selectedOrder;
        if (!order) {
            showError('Fel', 'Ingen order vald.');
            return;
        }

        if (!order.customer) {
            showError('Fel', 'Order saknar kundinformation.');
            throw new Error('Order saknar kundinformation.');
        }

        try {
            setFormLoading(true);

            let currentRotState;
            if (activeTab === 'orders' && !orderArg) {
                currentRotState = {
                    include_rot: formData.include_rot,
                    rot_personnummer: formData.rot_personnummer,
                    rot_organisationsnummer: formData.rot_organisationsnummer,
                    rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                    rot_amount: formData.rot_amount,
                };
            }

            let currentRutState;
            if (activeTab === 'orders' && !orderArg) {
                currentRutState = {
                    include_rut: formData.include_rut,
                    rut_personnummer: formData.rut_personnummer,
                    rut_amount: formData.rut_amount,
                };
            }

            const assignmentUpdates =
                preInvoiceAssignmentType ||
                    preInvoiceAssignedToUserId ||
                    preInvoiceAssignedToTeamId
                    ? {
                        assignment_type: preInvoiceAssignmentType,
                        assigned_to_user_id: preInvoiceAssignmentType === 'individual' ? preInvoiceAssignedToUserId : null,
                        assigned_to_team_id: preInvoiceAssignmentType === 'team' ? preInvoiceAssignedToTeamId : null,
                    }
                    : undefined;

            if (assignmentUpdates) {
                const updateResult = await updateOrderInDb(order.id, assignmentUpdates);
                if (updateResult.error) {
                    throw new Error(`Kunde inte uppdatera order innan fakturering: ${updateResult.error.message}`);
                }
            }

            const workSummaryArg = activeTab === 'orders' && !orderArg ? workSummary : undefined;

            // Bug Fix 2: Use quote line items if available, fallback to single generic item
            let lineItemsFromOrder: { description: string; quantity: number; unit_price: number; total: number }[];

            const actualQuote = Array.isArray(order.quote) ? order.quote[0] : order.quote;
            if (actualQuote?.quote_line_items && actualQuote.quote_line_items.length > 0) {
                lineItemsFromOrder = actualQuote.quote_line_items.map((item: any) => ({
                    description: item.description || 'Artikel',
                    quantity: item.quantity || 1,
                    unit_price: item.unit_price || 0,
                    total: (item.quantity || 1) * (item.unit_price || 0),
                }));
            } else {
                lineItemsFromOrder = [
                    {
                        description: order.job_description || order.title || 'Utförd tjänst enligt order',
                        quantity: 1,
                        unit_price: order.value || 0,
                        total: order.value || 0,
                    },
                ];
            }

            const invoiceNumber = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
            const ocrNumber = invoiceNumber.replace(/\D/g, '');

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (systemSettings?.default_payment_terms || 30));

            const invoiceData = {
                organisation_id: organisationId,
                invoice_number: invoiceNumber,
                customer_id: order.customer_id!,
                amount: calculateTotal(lineItemsFromOrder),
                due_date: dueDate.toISOString().split('T')[0],
                order_id: order.id,
                status: 'draft' as InvoiceStatus,
                ocr_number: ocrNumber,
                assignment_type: assignmentUpdates?.assignment_type || order.assignment_type,
                assigned_user_id: assignmentUpdates?.assigned_to_user_id || order.assigned_to_user_id,
                assigned_team_id: assignmentUpdates?.assigned_to_team_id || order.assigned_to_team_id,
                job_description: workSummaryArg || order.job_description || order.description,
                include_rot: currentRotState ? (currentRotState.include_rot as boolean) : order.include_rot,
                rot_personnummer: currentRotState ? (currentRotState.rot_personnummer as string | null) : order.rot_personnummer,
                rot_organisationsnummer: currentRotState ? (currentRotState.rot_organisationsnummer as string | null) : order.rot_organisationsnummer,
                rot_fastighetsbeteckning: currentRotState ? (currentRotState.rot_fastighetsbeteckning as string | null) : order.rot_fastighetsbeteckning,
                rot_amount: currentRotState ? (currentRotState.rot_amount as number) : order.rot_amount,
                // RUT fields
                include_rut: currentRutState ? (currentRutState.include_rut as boolean) : order.include_rut,
                rut_personnummer: currentRutState ? (currentRutState.rut_personnummer as string | null) : order.rut_personnummer,
                rut_amount: currentRutState ? (currentRutState.rut_amount as number) : order.rut_amount,
            };

            const result = await createInvoice(invoiceData, lineItemsFromOrder, user?.id);

            if (result.error) {
                throw new Error(result.error.message);
            }

            showSuccess('Framgång', `Faktura ${invoiceNumber} skapad från order "${order.title}"!`);
            setActiveTab('invoices');
        } catch (err) {
            showError('Fel', err instanceof Error ? err.message : 'Ett oväntat fel inträffade vid skapande av faktura.');
            throw err;
        } finally {
            setFormLoading(false);
        }
    };

    // ── Save Pre-Invoice Changes & Create Invoice ─────────────────────────────────

    const handleSavePreInvoiceChangesAndCreateInvoice = async () => {
        if (!selectedOrder) {
            return;
        }
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

            // Bug Fix 1: Use formData.line_items from the modal instead of hardcoding from selectedOrder.value
            const lineItems = formData.line_items.filter(item => item.description);
            if (lineItems.length === 0) {
                showError('Fel', 'Minst en fakturarad med beskrivning är obligatoriskt.');
                return;
            }

            const invoiceNumber = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
            const ocrNumber = invoiceNumber.replace(/\D/g, '');

            const invoiceData = {
                organisation_id: organisationId,
                invoice_number: invoiceNumber,
                customer_id: formData.customer_id || selectedOrder.customer_id,
                amount: calculateTotal(lineItems),
                due_date: formData.due_date || new Date(Date.now() + (systemSettings?.default_payment_terms || 30) * 86400000).toISOString().split('T')[0],
                order_id: selectedOrder.id,
                status: 'draft' as InvoiceStatus,
                ocr_number: ocrNumber,
                assignment_type: assignmentUpdates.assignment_type,
                assigned_user_id: assignmentUpdates.assigned_to_user_id,
                assigned_team_id: assignmentUpdates.assigned_to_team_id,
                job_description: workSummary,
                include_rot: formData.include_rot,
                rot_personnummer: formData.rot_personnummer,
                rot_organisationsnummer: formData.rot_organisationsnummer,
                rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                rot_amount: formData.rot_amount,
                // RUT fields
                include_rut: formData.include_rut,
                rut_personnummer: formData.rut_personnummer,
                rut_amount: formData.rut_amount,
            };

            const result = await createInvoice(invoiceData, lineItems, user?.id);

            if (result.error) {
                showError('Fel', result.error.message);
                return;
            }

            showSuccess('Framgång', `Faktura ${invoiceNumber} skapad!`);
            setShowUnifiedModal(false);
            setSelectedOrder(null);
            setActiveTab('invoices');
            await loadData();
        } catch (err) {
            showError('Fel', 'Ett oväntat fel inträffade.');
        } finally {
            setFormLoading(false);
        }
    };

    // ── Bulk Create Invoices ──────────────────────────────────────────────────────

    const handleBulkCreateInvoices = async () => {
        console.log('Bulk creation triggered. Orders selected:', selectedOrders.length);
        if (selectedOrders.length === 0) {
            showError('Fel', 'Välj minst en order för att skapa fakturor.');
            return;
        }
        if (!confirm(`Är du säker på att du vill skapa ${selectedOrders.length} fakturor?`)) {
            console.log('Bulk creation cancelled by user confirm dialog');
            return;
        }
        console.log('Bulk creation confirmed by user');
        try {
            setBulkProcessing(true);
            let successCount = 0;
            let errorCount = 0;
            for (const orderId of selectedOrders) {
                const order = readyToInvoiceOrders.find((o) => o.id === orderId);
                if (!order) continue;
                try {
                    await handleCreateInvoiceFromOrder(order);
                    successCount++;
                } catch {
                    errorCount++;
                }
            }
            if (successCount > 0) {
                showSuccess('Framgång', `${successCount} fakturor skapade framgångsrikt!`);
            }
            if (errorCount > 0) {
                showError('Varning', `${errorCount} fakturor kunde inte skapas.`);
            }
            setSelectedOrders([]);
            loadData();
        } catch {
            showError('Fel', 'Ett oväntat fel inträffade vid bulk-skapande av fakturor.');
        } finally {
            setBulkProcessing(false);
        }
    };

    // ── Delete Invoice ────────────────────────────────────────────────────────────

    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        try {
            const result = await deleteInvoice(invoiceToDelete.id);
            if (result.error) {
                showError('Fel', result.error.message);
                return;
            }
            showSuccess('Framgång', 'Faktura borttagen framgångsrikt!');
            setShowDeleteDialog(false);
            setInvoiceToDelete(null);
            loadData();
        } catch {
            showError('Fel', 'Ett oväntat fel inträffade vid borttagning av faktura.');
        }
    };

    // ── Duplicate Invoice ─────────────────────────────────────────────────────────

    const handleDuplicateInvoice = async (invoice: InvoiceWithRelations) => {
        if (!organisationId) return;

        try {
            const { data: newNumber } = await supabase.rpc('generate_invoice_number', {
                org_id: organisationId,
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
                    created_by_user_id: user?.id,
                })
                .select()
                .single();

            if (error) throw error;

            await supabase.from('invoice_history').insert({
                organisation_id: organisationId,
                invoice_id: data.id,
                action_type: 'duplicated',
                performed_by_user_id: user?.id,
                details: { source_invoice_id: invoice.id, source_invoice_number: invoice.invoice_number },
            });

            showSuccess('Faktura duplicerad', `Ny faktura #${data.invoice_number} skapad.`);
            await loadData();
        } catch {
            showError('Fel', 'Kunde inte duplicera fakturan.');
        }
    };

    // ── Mark As Paid ──────────────────────────────────────────────────────────────

    const handleMarkAsPaid = async (invoiceId: string) => {
        if (!confirm('Är du säker på att du vill markera denna faktura som betald?')) {
            return;
        }

        const result = await markInvoiceAsPaid(invoiceId);

        if (result.error) {
            showError(t.MESSAGES.ERROR_TITLE, t.MESSAGES.ERROR_MARK_PAID(result.error.message));
        } else if (result.data) {
            await loadData();
            showSuccess(t.MESSAGES.SUCCESS_TITLE, t.MESSAGES.MARKED_PAID(result.data.invoice_number));
        }
    };

    // ── Save Assignment ───────────────────────────────────────────────────────────

    const handleSaveAssignment = async (
        assignmentType: 'individual' | 'team',
        userId: string | null,
        teamId: string | null
    ) => {
        if (!selectedInvoice) return;

        const updates = {
            assignment_type: assignmentType,
            assigned_user_id: assignmentType === 'individual' ? userId : null,
            assigned_team_id: assignmentType === 'team' ? teamId : null,
        };

        try {
            setFormLoading(true);
            const result = await updateInvoice(selectedInvoice.id, updates, selectedInvoice.line_items || []);

            if (result.error) {
                showError('Fel', result.error.message);
                return;
            }

            showSuccess('Framgång', 'Tilldelning har uppdaterats.');
            await loadData();
            setSelectedInvoice((prev) =>
                prev
                    ? {
                        ...prev,
                        ...updates,
                        assigned_user: teamMembers.find((m) => m.id === userId),
                        assigned_team: teams.find((t) => t.id === teamId),
                    }
                    : null
            );
        } catch {
            showError('Fel', 'Kunde inte spara ändringar.');
        } finally {
            setFormLoading(false);
        }
    };

    // ── Manual Signing ────────────────────────────────────────────────────────────

    const handleManualSigning = async (invoiceId: string, file: File) => {
        try {
            const { url, error: uploadError } = await uploadSignedDocument(file, 'invoices');

            if (uploadError) {
                showError('Fel', 'Kunde inte ladda upp filen: ' + uploadError.message);
                return;
            }

            if (!url) {
                showError('Fel', 'Ingen URL returnerades från uppladdningen.');
                return;
            }

            const result = await updateInvoice(
                invoiceId,
                { signed_document_url: url, status: 'sent' },
                selectedInvoice?.line_items || []
            );

            if (result.error) {
                showError('Fel', 'Kunde inte uppdatera fakturan: ' + result.error.message);
                return;
            }

            await loadData();
            setSelectedInvoice((prev) =>
                prev && prev.id === invoiceId ? { ...prev, signed_document_url: url, status: 'sent' } : prev
            );

            showSuccess('Framgång', t.MESSAGES.FILE_UPLOADED);
        } catch {
            showError('Fel', 'Ett oväntat fel inträffade.');
        }
    };

    // ─────────────────────────────────
    // Fortnox Sync Handlers
    // ─────────────────────────────────

    /**
     * Sync a single invoice to Fortnox
     */
    const handleSyncSingleToFortnox = async (invoiceId: string) => {
        try {
            if (!organisationId) {
                showError('Fel', 'Organisation saknas');
                return;
            }

            const result = await syncInvoicesToFortnox(organisationId, [invoiceId]);

            // Log to activity_log
            await supabase.from('activity_log').insert({
                organisation_id: organisationId,
                user_id: user?.id,
                action: 'fortnox_sync_invoice',
                entity_type: 'invoice',
                entity_id: invoiceId,
                details: { success: result.success, failed: result.failed, errors: result.errors },
            });

            if (result.errors.length > 0) {
                showError('Synkfel', result.errors.join(', '));
            } else {
                showSuccess('Framgång', 'Fakturan har synkats till Fortnox');
            }

            await loadData();
        } catch {
            showError('Fel', 'Kunde inte synka fakturan till Fortnox');
        }
    };

    /**
     * Sync all unsynced invoices to Fortnox
     */
    const handleSyncAllToFortnox = async () => {
        try {
            if (!organisationId) {
                showError('Fel', 'Organisation saknas');
                return;
            }

            const result = await syncInvoicesToFortnox(organisationId);

            // Log to activity_log
            await supabase.from('activity_log').insert({
                organisation_id: organisationId,
                user_id: user?.id,
                action: 'fortnox_sync_all_invoices',
                entity_type: 'invoice',
                details: { success: result.success, failed: result.failed, errors: result.errors },
            });

            if (result.failed > 0) {
                showError('Synkfel', `${result.success} synkade, ${result.failed} misslyckades. ${result.errors.join(', ')}`);
            } else {
                showSuccess('Framgång', `${result.success} fakturor synkade till Fortnox`);
            }

            await loadData();
        } catch {
            showError('Fel', 'Kunde inte synka fakturor till Fortnox');
        }
    };

    /**
     * Fetch invoice statuses from Fortnox and update CRM
     */
    const handleSyncFromFortnox = async () => {
        try {
            if (!organisationId) {
                showError('Fel', 'Organisation saknas');
                return;
            }

            const result = await syncInvoicesFromFortnox(organisationId);

            // Log to activity_log
            await supabase.from('activity_log').insert({
                organisation_id: organisationId,
                user_id: user?.id,
                action: 'fortnox_sync_from',
                entity_type: 'invoice',
                details: { success: result.success, failed: result.failed, errors: result.errors },
            });

            if (result.failed > 0) {
                showError('Synkfel', `${result.success} uppdaterade, ${result.failed} misslyckades. ${result.errors.join(', ')}`);
            } else {
                showSuccess('Framgång', `${result.success} fakturor uppdaterade från Fortnox`);
            }

            await loadData();
        } catch {
            showError('Fel', 'Kunde inte hämta status från Fortnox');
        }
    };

    return {
        handleCreateInvoice,
        handleUpdateInvoice,
        handleCreateInvoiceFromOrder,
        handleSavePreInvoiceChangesAndCreateInvoice,
        handleBulkCreateInvoices,
        handleDeleteInvoice,
        handleDuplicateInvoice,
        handleMarkAsPaid,
        handleSaveAssignment,
        handleManualSigning,
        handleSyncSingleToFortnox,
        handleSyncAllToFortnox,
        handleSyncFromFortnox,
    };
}

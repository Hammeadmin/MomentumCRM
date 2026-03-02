import { useState } from 'react';
import { useFormState } from './useFormState';
import { createSavedLineItem } from '../lib/database';
import { type SavedLineItem } from '../types/database';

// Exported so other files can reference it without re-declaring
export interface LineItem {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

// Shape of the main invoice form
interface FormDataShape {
    invoice_number: string;
    customer_id: string;
    order_id: string;
    amount: string;
    due_date: string;
    line_items: LineItem[];
    include_rot: boolean;
    rot_personnummer: string | null;
    rot_organisationsnummer: string | null;
    rot_fastighetsbeteckning: string | null;
    rot_amount: number;
    // RUT fields
    include_rut: boolean;
    rut_personnummer: string | null;
    rut_amount: number;
}

// Shape of the manual customer form
interface ManualCustomerFormShape {
    name: string;
    customer_type: 'company' | 'private';
    org_number: string;
    email: string;
    address: string;
    postal_code: string;
    city: string;
}

const INITIAL_FORM_DATA: FormDataShape = {
    invoice_number: '',
    customer_id: '',
    order_id: '',
    amount: '',
    due_date: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    include_rot: false,
    rot_personnummer: null,
    rot_organisationsnummer: null,
    rot_fastighetsbeteckning: null,
    rot_amount: 0,
    // RUT fields
    include_rut: false,
    rut_personnummer: null,
    rut_amount: 0,
};

const INITIAL_MANUAL_CUSTOMER_FORM: ManualCustomerFormShape = {
    name: '',
    customer_type: 'company',
    org_number: '',
    email: '',
    address: '',
    postal_code: '',
    city: '',
};

interface UseInvoiceFormDeps {
    organisationId: string;
    savedLineItems: SavedLineItem[];
    showError: (title: string, message: string) => void;
    showSuccess: (title: string, message: string) => void;
    loadData: () => void;
}

export function useInvoiceForm({
    organisationId,
    savedLineItems,
    showError,
    showSuccess,
    loadData,
}: UseInvoiceFormDeps) {
    // formData managed by useFormState for validation/dirty-tracking infrastructure
    const [formDataState, formDataActions] = useFormState<FormDataShape>(INITIAL_FORM_DATA);

    // manualCustomerForm managed by useFormState
    const [manualCustomerFormState, manualCustomerFormActions] = useFormState<ManualCustomerFormShape>(
        INITIAL_MANUAL_CUSTOMER_FORM
    );

    // Simple non-form state
    const [workSummary, setWorkSummary] = useState('');
    const [isManualCustomer, setIsManualCustomer] = useState(false);
    const [preInvoiceAssignmentType, setPreInvoiceAssignmentType] = useState<'individual' | 'team'>('individual');
    const [preInvoiceAssignedToUserId, setPreInvoiceAssignedToUserId] = useState<string | null>(null);
    const [preInvoiceAssignedToTeamId, setPreInvoiceAssignedToTeamId] = useState<string | null>(null);

    // ── Helpers ──────────────────────────────────────────────────────────────────

    const toNumber = (value: unknown): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    const calculateSubtotal = (items: LineItem[]): number =>
        items.reduce((sum, item) => sum + toNumber(item.total), 0);

    const calculateVAT = (subtotal: number): number => toNumber(subtotal) * 0.25;

    const calculateTotal = (items: LineItem[]): number => {
        const subtotal = calculateSubtotal(items);
        return subtotal + calculateVAT(subtotal);
    };

    // ── Line item mutations ───────────────────────────────────────────────────────

    const addLineItem = () => {
        formDataActions.setValues({
            line_items: [
                ...formDataState.values.line_items,
                { description: '', quantity: 1, unit_price: 0, total: 0 },
            ],
        });
    };

    const removeLineItem = (index: number) => {
        if (formDataState.values.line_items.length > 1) {
            formDataActions.setValues({
                line_items: formDataState.values.line_items.filter((_, i) => i !== index),
            });
        }
    };

    const updateLineItem = (index: number, field: string, value: unknown) => {
        const newLineItems = formDataState.values.line_items.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item, [field]: value };
                updatedItem.total = updatedItem.quantity * updatedItem.unit_price;
                return updatedItem;
            }
            return item;
        });
        formDataActions.setValues({ line_items: newLineItems });
    };

    // ── Saved line items ──────────────────────────────────────────────────────────

    const handleAddSavedItem = (itemId: string) => {
        if (!itemId) return;
        const itemToAdd = savedLineItems.find((item) => item.id === itemId);
        if (!itemToAdd) return;

        const newLineItem: LineItem = {
            description: itemToAdd.name,
            quantity: 1,
            unit_price: itemToAdd.unit_price,
            total: itemToAdd.unit_price,
        };

        const currentItems = formDataState.values.line_items;
        const lastItem = currentItems[currentItems.length - 1];
        if (currentItems.length === 1 && !lastItem.description && lastItem.unit_price === 0) {
            formDataActions.setValues({ line_items: [newLineItem] });
        } else {
            formDataActions.setValues({ line_items: [...currentItems, newLineItem] });
        }
    };

    const handleSaveLineItem = async (itemToSave: { description: string; unit_price: number }) => {
        if (!itemToSave.description || itemToSave.unit_price <= 0) {
            showError('Fel', 'Beskrivning och ett pris större än noll krävs för att spara en rad.');
            return;
        }

        const isDuplicate = savedLineItems.some(
            (item) => item.name.toLowerCase() === itemToSave.description.toLowerCase()
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
                showSuccess('Sparad!', `"${result.data?.name || ''}" har sparats för framtida bruk.`);
                await loadData();
            }
        } catch {
            showError('Fel', 'Kunde inte spara raden.');
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────────

    const resetForm = () => {
        formDataActions.reset(INITIAL_FORM_DATA);
        manualCustomerFormActions.reset(INITIAL_MANUAL_CUSTOMER_FORM);
        setWorkSummary('');
        setIsManualCustomer(false);
        setPreInvoiceAssignmentType('individual');
        setPreInvoiceAssignedToUserId(null);
        setPreInvoiceAssignedToTeamId(null);
    };

    // ── Convenience setters that mirror the original setState API ─────────────────
    // These allow the parent and modals to set formData fields the same way as before.

    const setFormData = (
        updater:
            | Partial<FormDataShape>
            | ((prev: FormDataShape) => Partial<FormDataShape>)
    ) => {
        if (typeof updater === 'function') {
            formDataActions.setValues(updater(formDataState.values));
        } else {
            formDataActions.setValues(updater);
        }
    };

    const setManualCustomerForm = (
        updater:
            | Partial<ManualCustomerFormShape>
            | ((prev: ManualCustomerFormShape) => Partial<ManualCustomerFormShape>)
    ) => {
        if (typeof updater === 'function') {
            manualCustomerFormActions.setValues(updater(manualCustomerFormState.values));
        } else {
            manualCustomerFormActions.setValues(updater);
        }
    };

    return {
        // formData — expose the values object directly for easy reads
        formData: formDataState.values,
        setFormData,
        // manualCustomerForm — expose the values object directly
        manualCustomerForm: manualCustomerFormState.values,
        setManualCustomerForm,
        // Plain state
        workSummary,
        setWorkSummary,
        isManualCustomer,
        setIsManualCustomer,
        preInvoiceAssignmentType,
        setPreInvoiceAssignmentType,
        preInvoiceAssignedToUserId,
        setPreInvoiceAssignedToUserId,
        preInvoiceAssignedToTeamId,
        setPreInvoiceAssignedToTeamId,
        // Line item helpers
        addLineItem,
        removeLineItem,
        updateLineItem,
        handleAddSavedItem,
        handleSaveLineItem,
        // Calculation helpers
        toNumber,
        calculateSubtotal,
        calculateVAT,
        calculateTotal,
        // Reset
        resetForm,
        // Expose the raw reset actions for useInvoiceActions if needed
        _resetFormDataState: formDataActions.reset,
        _resetManualCustomerFormState: manualCustomerFormActions.reset,
    };
}

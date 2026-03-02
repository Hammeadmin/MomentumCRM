import React, { useState } from 'react';
import {
    X, FileText, Users2, Package, Receipt, Loader2, Save, Plus, Trash2, Paperclip,
    CheckSquare, Square,
} from 'lucide-react';
import ROTFields from '../../ROTFields';
import RUTFields from '../../RUTFields';
import { type InvoiceWithRelations } from '../../../lib/invoices';
import { type OrderWithRelations, type OrderAttachment } from '../../../lib/orders';
import { type UserProfile, TEAM_SPECIALTY_LABELS, TEAM_ROLE_LABELS, getTeamRoleColor } from '../../../types/database';
import { type TeamWithRelations } from '../../../lib/teams';
import { type SavedLineItem } from '../../../types/database';
import { type LineItem } from '../../../hooks/useInvoiceForm';
import { formatCurrency } from '../../../lib/database';

interface Customer {
    id: string;
    name: string;
    email?: string;
}

interface CreateEditInvoiceModalProps {
    isOpen: boolean;
    editingInvoice: InvoiceWithRelations | null;
    selectedOrder: OrderWithRelations | null;
    onClose: () => void;
    onSubmit: () => void;
    formLoading: boolean;
    // Form data
    formData: {
        customer_id: string;
        order_id: string;
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
    };
    setFormData: (updater: any) => void;
    workSummary: string;
    setWorkSummary: (v: string) => void;
    isManualCustomer: boolean;
    setIsManualCustomer: (v: boolean) => void;
    manualCustomerForm: {
        name: string;
        customer_type: 'company' | 'private';
        org_number: string;
        email: string;
        address: string;
        postal_code: string;
        city: string;
    };
    setManualCustomerForm: (updater: any) => void;
    preInvoiceAssignmentType: 'individual' | 'team';
    setPreInvoiceAssignmentType: (v: 'individual' | 'team') => void;
    preInvoiceAssignedToUserId: string | null;
    setPreInvoiceAssignedToUserId: (v: string | null) => void;
    preInvoiceAssignedToTeamId: string | null;
    setPreInvoiceAssignedToTeamId: (v: string | null) => void;
    // Line item helpers
    addLineItem: () => void;
    removeLineItem: (index: number) => void;
    updateLineItem: (index: number, field: string, value: unknown) => void;
    handleAddSavedItem: (itemId: string) => void;
    handleSaveLineItem: (item: { description: string; unit_price: number }) => void;
    calculateTotal: (items: LineItem[]) => number;
    // Data
    customers: Customer[];
    teamMembers: UserProfile[];
    teams: TeamWithRelations[];
    savedLineItems: SavedLineItem[];
    orderNotes: any[]; // TODO: type this
    orderAttachments: OrderAttachment[];
    attachmentsToInclude: Record<string, boolean>;
    setAttachmentsToInclude: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    adminNewFiles: File[];
    isUploading: boolean;
    handleAdminFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAdminUpload: () => void;
    handleDeleteNote: (noteId: string) => void;
    handleDeleteAttachment: (att: OrderAttachment) => void;
}

export default function CreateEditInvoiceModal({
    isOpen,
    editingInvoice,
    selectedOrder,
    onClose,
    onSubmit,
    formLoading,
    formData,
    setFormData,
    workSummary,
    setWorkSummary,
    isManualCustomer,
    setIsManualCustomer,
    manualCustomerForm,
    setManualCustomerForm,
    preInvoiceAssignmentType,
    setPreInvoiceAssignmentType,
    preInvoiceAssignedToUserId,
    setPreInvoiceAssignedToUserId,
    preInvoiceAssignedToTeamId,
    setPreInvoiceAssignedToTeamId,
    addLineItem,
    removeLineItem,
    updateLineItem,
    handleAddSavedItem,
    handleSaveLineItem,
    calculateTotal,
    customers,
    teamMembers,
    teams,
    savedLineItems,
    orderNotes,
    orderAttachments,
    attachmentsToInclude,
    setAttachmentsToInclude,
    adminNewFiles,
    isUploading,
    handleAdminFileChange,
    handleAdminUpload,
    handleDeleteNote,
    handleDeleteAttachment,
}: CreateEditInvoiceModalProps) {
    const [activeInvoiceTab, setActiveInvoiceTab] = useState<'info' | 'team' | 'docs' | 'lineItems'>('info');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form
                noValidate
                onSubmit={(e: React.FormEvent) => {
                    e.preventDefault();
                    console.log('Form submission triggered!');
                    onSubmit();
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
                        onClick={onClose}
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
                            { id: 'lineItems', label: 'Fakturarader', icon: Receipt },
                        ].map((tab: { id: string; label: string; icon: React.ElementType }) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    type="button"
                                    key={tab.id}
                                    onClick={() => setActiveInvoiceTab(tab.id as typeof activeInvoiceTab)}
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
                    {/* Tab: Fakturainformation */}
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
                                            onChange={(e) => setFormData((prev: any) => ({ ...prev, customer_id: e.target.value, order_id: '' }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            disabled={!!selectedOrder || (!!editingInvoice && !isManualCustomer)}
                                        >
                                            <option value="">Välj kund</option>
                                            {customers.map((customer) => (
                                                <option key={customer.id} value={customer.id}>{customer.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="space-y-3 bg-gray-50 p-3 rounded-md border">
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setManualCustomerForm((prev: any) => ({ ...prev, customer_type: 'company' }))}
                                                    className={`flex-1 py-1 text-xs rounded border ${manualCustomerForm.customer_type === 'company' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
                                                >
                                                    Företag
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setManualCustomerForm((prev: any) => ({ ...prev, customer_type: 'private' }))}
                                                    className={`flex-1 py-1 text-xs rounded border ${manualCustomerForm.customer_type === 'private' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
                                                >
                                                    Privat
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={manualCustomerForm.customer_type === 'company' ? 'Företagsnamn *' : 'Namn *'}
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                                value={manualCustomerForm.name}
                                                onChange={(e) => setManualCustomerForm((prev: any) => ({ ...prev, name: e.target.value }))}
                                            />
                                            {manualCustomerForm.customer_type === 'company' && (
                                                <input
                                                    type="text"
                                                    placeholder="Organisationsnummer"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                                    value={manualCustomerForm.org_number}
                                                    onChange={(e) => setManualCustomerForm((prev: any) => ({ ...prev, org_number: e.target.value }))}
                                                />
                                            )}
                                            <input
                                                type="email"
                                                placeholder="E-post"
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                                value={manualCustomerForm.email}
                                                onChange={(e) => setManualCustomerForm((prev: any) => ({ ...prev, email: e.target.value }))}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Adress"
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                                value={manualCustomerForm.address}
                                                onChange={(e) => setManualCustomerForm((prev: any) => ({ ...prev, address: e.target.value }))}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Postnummer"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                                    value={manualCustomerForm.postal_code}
                                                    onChange={(e) => setManualCustomerForm((prev: any) => ({ ...prev, postal_code: e.target.value }))}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Ort"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                                    value={manualCustomerForm.city}
                                                    onChange={(e) => setManualCustomerForm((prev: any) => ({ ...prev, city: e.target.value }))}
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setFormData((prev: any) => ({ ...prev, due_date: e.target.value }))
                                        }
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
                                    onChange={(rotData) => setFormData((prev: any) => ({
                                        ...prev,
                                        ...rotData,
                                        // Mutual exclusion: disable RUT when ROT is enabled
                                        ...(rotData.include_rot ? { include_rut: false, rut_personnummer: null, rut_amount: 0 } : {})
                                    }))}
                                    totalAmount={calculateTotal(formData.line_items)}
                                />
                            </div>

                            <div className="border-t border-gray-200 pt-6">
                                <RUTFields
                                    data={{
                                        include_rut: formData.include_rut,
                                        rut_personnummer: formData.rut_personnummer,
                                        rut_amount: formData.rut_amount,
                                    }}
                                    onChange={(rutData) => setFormData((prev: any) => ({
                                        ...prev,
                                        ...rutData,
                                        // Mutual exclusion: disable ROT when RUT is enabled
                                        ...(rutData.include_rut ? { include_rot: false, rot_personnummer: null, rot_organisationsnummer: null, rot_fastighetsbeteckning: null, rot_amount: 0 } : {})
                                    }))}
                                    totalAmount={calculateTotal(formData.line_items)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab: Arbetsteam & Utförande */}
                    {activeInvoiceTab === 'team' && (
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-900 mb-4">Tilldela jobb</h4>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tilldelningstyp</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="individual"
                                            checked={preInvoiceAssignmentType === 'individual'}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                setPreInvoiceAssignmentType(e.target.value as 'individual' | 'team')
                                            }
                                            className="h-4 w-4 text-blue-600"
                                        />
                                        <span className="ml-2 text-sm">Individ</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="team"
                                            checked={preInvoiceAssignmentType === 'team'}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                setPreInvoiceAssignmentType(e.target.value as 'individual' | 'team')
                                            }
                                            className="h-4 w-4 text-blue-600"
                                        />
                                        <span className="ml-2 text-sm">Team</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                {preInvoiceAssignmentType === 'individual' ? (
                                    <select
                                        value={preInvoiceAssignedToUserId || ''}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            setPreInvoiceAssignedToUserId(e.target.value || null)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Välj person...</option>
                                        {teamMembers.map((member) => (
                                            <option key={member.id} value={member.id}>{member.full_name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        value={preInvoiceAssignedToTeamId || ''}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            setPreInvoiceAssignedToTeamId(e.target.value || null)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Välj team...</option>
                                        {teams.map((team) => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="pt-2 pl-1 h-6">
                                {preInvoiceAssignmentType === 'team' && preInvoiceAssignedToTeamId && (
                                    <p className="text-xs px-2 py-0.5 inline-block rounded-full bg-blue-100 text-blue-800">
                                        Specialitet: {TEAM_SPECIALTY_LABELS[teams.find((t) => t.id === preInvoiceAssignedToTeamId)?.specialty || '']}
                                    </p>
                                )}
                                {preInvoiceAssignmentType === 'individual' && preInvoiceAssignedToUserId && (
                                    <p className={`text-xs px-2 py-0.5 inline-block rounded-full ${getTeamRoleColor((teamMembers.find((m) => m.id === preInvoiceAssignedToUserId) as any)?.role_in_team || '')}`}>
                                        Roll: {TEAM_ROLE_LABELS[(teamMembers.find((m) => m.id === preInvoiceAssignedToUserId) as any)?.role_in_team || ''] || 'Okänd'}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Dokument & Bevis */}
                    {activeInvoiceTab === 'docs' && (
                        <div className="space-y-6">
                            {/* Worker's uploaded documents */}
                            <div>
                                <h4 className="text-lg font-medium text-gray-900 mb-2">Arbetarens Dokumentation</h4>
                                <div className="space-y-2 rounded-lg border p-4 max-h-60 overflow-y-auto">
                                    {orderNotes.length === 0 && orderAttachments.length === 0 && (
                                        <p className="text-gray-500 text-sm">Inga anteckningar eller filer från arbetaren.</p>
                                    )}
                                    {orderNotes.map((note) => (
                                        <div key={`note_${note.id}`} className="flex items-start group">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAttachmentsToInclude((prev: Record<string, boolean>) => ({
                                                        ...prev,
                                                        [`note_${note.id}`]: !prev[`note_${note.id}`],
                                                    }))
                                                }
                                                className="mr-3 mt-1"
                                            >
                                                {attachmentsToInclude[`note_${note.id}`] ? (
                                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                )}
                                            </button>
                                            <div className="flex-1 bg-gray-50 p-2 rounded">
                                                <p className="text-xs font-semibold">{note.user?.full_name || 'System'}</p>
                                                <p className="text-sm">{note.content}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {orderAttachments.map((att) => (
                                        <div key={`attachment_${att.id}`} className="flex items-start group">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAttachmentsToInclude((prev: Record<string, boolean>) => ({
                                                        ...prev,
                                                        [`attachment_${att.id}`]: !prev[`attachment_${att.id}`],
                                                    }))
                                                }
                                                className="mr-3 mt-1"
                                            >
                                                {attachmentsToInclude[`attachment_${att.id}`] ? (
                                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                )}
                                            </button>
                                            <div className="flex-1 bg-gray-50 p-2 rounded flex items-center">
                                                <Paperclip className="w-4 h-4 mr-2" />
                                                <span className="text-sm">{att.file_name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAttachment(att)}
                                                className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
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
                                            {isUploading ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                            ) : (
                                                <Paperclip size={16} className="mr-2" />
                                            )}
                                            Ladda upp {adminNewFiles.length} fil(er)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Fakturarader */}
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
                                        {savedLineItems.map((item) => (
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
                                        (savedItem) => savedItem.name.toLowerCase() === item.description.toLowerCase()
                                    );

                                    return (
                                        <div key={index} className="grid grid-cols-12 gap-3 items-center">
                                            <div className="col-span-5">
                                                {index === 0 && (
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Beskrivning</label>
                                                )}
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        updateLineItem(index, 'description', e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                    placeholder="Beskrivning av tjänst/produkt"
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                {index === 0 && (
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Antal</label>
                                                )}
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
                                                {index === 0 && (
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Enhetspris</label>
                                                )}
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
                                                {index === 0 && (
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Summa</label>
                                                )}
                                                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                                                    {formatCurrency(item.total)}
                                                </div>
                                            </div>

                                            <div className="col-span-1 flex items-end h-full">
                                                <div className="flex items-center">
                                                    {!isAlreadySaved && item.description && item.unit_price > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveLineItem(item)}
                                                            className="p-2 text-blue-600"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {formData.line_items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLineItem(index)}
                                                            className="p-2 text-red-600"
                                                        >
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
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"
                    >
                        Avbryt
                    </button>
                    <button
                        type="submit"
                        disabled={formLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600"
                    >
                        {formLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {editingInvoice ? 'Spara Ändringar' : 'Skapa Faktura'}
                    </button>
                </div>
            </form>
        </div>
    );
}

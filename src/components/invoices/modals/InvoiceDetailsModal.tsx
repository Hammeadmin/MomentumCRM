import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    X, Edit, Send, FileUp, MessageSquare, User, Users2, Paperclip,
    CheckCircle, ExternalLink,
} from 'lucide-react';
import InvoicePreview from '../../InvoicePreview';
import ROTInformation from '../../ROTInformation';
import InvoiceCreditHistory from '../../InvoiceCreditHistory';
import { type InvoiceWithRelations } from '../../../lib/invoices';
import { getAttachmentPublicUrl, type OrderAttachment } from '../../../lib/orders';
import { type QuoteTemplate } from '../../../lib/quoteTemplates';
import {
    INVOICE_STATUS_LABELS,
    getInvoiceStatusColor,
    TEAM_SPECIALTY_LABELS,
    TEAM_ROLE_LABELS,
    type Organisation,
    type SystemSettings,
    type UserProfile,
} from '../../../types/database';
import { type TeamWithRelations } from '../../../lib/teams';

interface InvoiceDetailsModalProps {
    isOpen: boolean;
    invoice: InvoiceWithRelations;
    onClose: () => void;
    onEdit: (invoice: InvoiceWithRelations) => void;
    onSend: (invoice: InvoiceWithRelations) => void;
    onManualSigning: (invoiceId: string, file: File) => void;
    onSaveAssignment: (
        assignmentType: 'individual' | 'team',
        assignedToUserId: string | null,
        assignedToTeamId: string | null
    ) => void;
    templates: QuoteTemplate[];
    organisation: Organisation | null;
    systemSettings: SystemSettings | null;
    teamMembers: UserProfile[];
    teams: TeamWithRelations[];
    invoiceOrderNotes: any[]; // TODO: type this
    invoiceOrderAttachments: OrderAttachment[];
    formLoading: boolean;
    onSyncToFortnox?: (invoiceId: string) => void;
}

export default function InvoiceDetailsModal({
    isOpen,
    invoice,
    onClose,
    onEdit,
    onSend,
    onManualSigning,
    onSaveAssignment,
    templates,
    organisation,
    systemSettings,
    teamMembers,
    teams,
    invoiceOrderNotes,
    invoiceOrderAttachments,
    formLoading,
    onSyncToFortnox,
}: InvoiceDetailsModalProps) {
    const manualSigningInputRef = useRef<HTMLInputElement>(null);

    // Local state for assignment editing
    const [isEditingAssignment, setIsEditingAssignment] = useState(false);
    const [detailsAssignmentType, setDetailsAssignmentType] = useState<'individual' | 'team'>(
        invoice.assignment_type || 'individual'
    );
    const [detailsAssignedToUserId, setDetailsAssignedToUserId] = useState<string | null>(
        invoice.assigned_to_user_id || null
    );
    const [detailsAssignedToTeamId, setDetailsAssignedToTeamId] = useState<string | null>(
        invoice.assigned_to_team_id || null
    );
    const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);

    if (!isOpen) return null;

    const handleSaveAssignmentClick = () => {
        onSaveAssignment(detailsAssignmentType, detailsAssignedToUserId, detailsAssignedToTeamId);
        setIsEditingAssignment(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Faktura {invoice.invoice_number}
                        </h3>
                        {/* Bug fix #1: use invoice.status instead of invoice.invoice_number */}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                            {INVOICE_STATUS_LABELS[invoice.status]}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            setSelectedTemplate(null);
                        }}
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
                                            setDetailsAssignmentType(invoice.assignment_type || 'individual');
                                            setDetailsAssignedToUserId(invoice.assigned_to_user_id || null);
                                            setDetailsAssignedToTeamId(invoice.assigned_to_team_id || null);
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
                                                <input
                                                    type="radio"
                                                    value="individual"
                                                    checked={detailsAssignmentType === 'individual'}
                                                    onChange={(e) => setDetailsAssignmentType(e.target.value as 'individual' | 'team')}
                                                    className="h-4 w-4 text-blue-600"
                                                />
                                                <span className="ml-2 text-sm">Individ</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    value="team"
                                                    checked={detailsAssignmentType === 'team'}
                                                    onChange={(e) => setDetailsAssignmentType(e.target.value as 'individual' | 'team')}
                                                    className="h-4 w-4 text-blue-600"
                                                />
                                                <span className="ml-2 text-sm">Team</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        {detailsAssignmentType === 'individual' ? (
                                            <select
                                                value={detailsAssignedToUserId || ''}
                                                onChange={(e) => setDetailsAssignedToUserId(e.target.value || null)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">Välj person...</option>
                                                {teamMembers.map((member) => (
                                                    <option key={member.id} value={member.id}>{member.full_name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <select
                                                value={detailsAssignedToTeamId || ''}
                                                onChange={(e) => setDetailsAssignedToTeamId(e.target.value || null)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">Välj team...</option>
                                                {teams.map((team) => (
                                                    <option key={team.id} value={team.id}>{team.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setIsEditingAssignment(false)}
                                            className="px-3 py-1 text-sm border rounded-md"
                                        >
                                            Avbryt
                                        </button>
                                        <button
                                            onClick={handleSaveAssignmentClick}
                                            disabled={formLoading}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50"
                                        >
                                            {formLoading ? 'Sparar...' : 'Spara'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    {invoice.assignment_type === 'team' && invoice.assigned_team ? (
                                        <div className="flex items-center">
                                            <Users2 className="w-6 h-6 mr-3 text-blue-600" />
                                            <div>
                                                <p className="font-semibold">{invoice.assigned_team.name}</p>
                                                <p className="text-sm text-gray-600">{TEAM_SPECIALTY_LABELS[invoice.assigned_team.specialty]}</p>
                                            </div>
                                        </div>
                                    ) : invoice.assignment_type === 'individual' && invoice.assigned_user ? (
                                        <div className="flex items-center">
                                            <User className="w-6 h-6 mr-3 text-green-600" />
                                            <div>
                                                <p className="font-semibold">{invoice.assigned_user.full_name}</p>
                                                <p className="text-sm text-gray-600">{invoice.assigned_user.email}</p>
                                                <p className="text-sm text-gray-600">{TEAM_ROLE_LABELS[invoice.assigned_user.role_in_team || '']}</p>
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
                                {invoice.job_description || 'Ingen beskrivning angiven.'}
                            </div>
                        </div>

                        {/* ROT Information */}
                        {invoice.include_rot && (
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">ROT-avdrag</h4>
                                <ROTInformation data={invoice} totalAmount={invoice.amount} />
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
                                        {(invoice.invoice_line_items || []).map((item, index) => (
                                            <tr key={index} className="text-sm">
                                                <td className="px-4 py-2">{item.description}</td>
                                                <td className="px-4 py-2 text-right">{item.quantity}</td>
                                                <td className="px-4 py-2 text-right">
                                                    {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(item.unit_price)}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium">
                                                    {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Credit History Section */}
                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Kredithistorik</h4>
                            <InvoiceCreditHistory invoice={invoice} />
                        </div>

                        {/* Fortnox Section — hidden for credit notes */}
                        {!invoice.is_credit_note && onSyncToFortnox && (
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">Fortnox</h4>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    {(invoice as any).fortnox_invoice_number ? (
                                        <>
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <span className="text-sm font-medium text-green-700">Synkad</span>
                                            </div>
                                            <p className="text-sm text-gray-700">
                                                Fortnox Fakturanummer: <span className="font-mono font-semibold">{(invoice as any).fortnox_invoice_number}</span>
                                            </p>
                                            {(invoice as any).fortnox_synced_at && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Senast synkad: {new Date((invoice as any).fortnox_synced_at).toLocaleString('sv-SE')}
                                                </p>
                                            )}
                                            <a
                                                href="https://app.fortnox.se"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline mt-2"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Öppna i Fortnox
                                            </a>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-600 mb-3">Inte synkad till Fortnox.</p>
                                            <button
                                                onClick={() => onSyncToFortnox(invoice.id)}
                                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                            >
                                                Synka nu
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Attached Documents & Notes */}
                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Bifogade Dokument & Anteckningar</h4>
                            <div className="space-y-2 rounded-lg border p-4 max-h-60 overflow-y-auto">
                                {invoiceOrderNotes.length === 0 && invoiceOrderAttachments.length === 0 && (
                                    <p className="text-gray-500 text-sm text-center py-4">Inga dokumentationer inkluderade.</p>
                                )}
                                {invoiceOrderNotes.map((note) => (
                                    <div key={`note_${note.id}`} className="bg-gray-50 p-2 rounded">
                                        <p className="text-xs font-semibold">{note.user?.full_name || 'System'}</p>
                                        <p className="text-sm">{note.content}</p>
                                    </div>
                                ))}
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
                                {invoice.customer ? invoice.customer.name : (invoice.customer_name || 'Okänd kund')}
                            </div>
                            <div className="text-sm text-gray-500">
                                {invoice.customer ? invoice.customer.email : invoice.customer_email}
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
                                    const template = templates.find((t) => t.id === e.target.value);
                                    setSelectedTemplate(template || null);
                                }}
                            >
                                <option value="">Standard design</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="border shadow-sm rounded-lg bg-white overflow-hidden">
                            <InvoicePreview
                                invoice={invoice}
                                logoUrl={systemSettings?.logo_url}
                                systemSettings={systemSettings}
                                organisation={organisation}
                                template={selectedTemplate || undefined}
                            />
                        </div>
                    </div>
                </div>

                {/* Hidden file input for manual signing */}
                <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    ref={manualSigningInputRef}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        // Bug fix #2: pass invoice.id as first argument
                        if (file) onManualSigning(invoice.id, file);
                    }}
                />

                <div className="flex justify-end space-x-3 p-6 border-t">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            setSelectedTemplate(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Stäng
                    </button>
                    <button
                        type="button"
                        disabled
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
                        onClick={() => onSend(invoice)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Skicka via E-post
                    </button>
                </div>
            </div>
        </div>
    );
}

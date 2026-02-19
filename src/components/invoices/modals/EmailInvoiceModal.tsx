import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { type User } from '@supabase/supabase-js';
import { X, Send, Loader2 } from 'lucide-react';
import InvoicePreview from '../../InvoicePreview';
import { sendInvoiceEmail, generateInvoiceEmailTemplate, type InvoiceWithRelations } from '../../../lib/invoices';
import { type Organisation, type SystemSettings } from '../../../types/database';
import { useTranslation } from '../../../locales/sv';

interface EmailInvoiceModalProps {
    isOpen: boolean;
    invoice: InvoiceWithRelations;
    onClose: () => void;
    organisation: Organisation | null;
    systemSettings: SystemSettings | null;
    user: User | null;
    onEmailSent: () => void;
}

export default function EmailInvoiceModal({
    isOpen,
    invoice,
    onClose,
    organisation,
    systemSettings,
    user,
    onEmailSent,
}: EmailInvoiceModalProps) {
    const { invoices: t } = useTranslation();
    const emailPdfRef = useRef<HTMLDivElement>(null);

    const [emailData, setEmailData] = useState({
        recipient_email: '',
        subject: '',
        email_body: '',
        template_type: 'standard' as 'standard' | 'team_presentation' | 'quality_assurance' | 'follow_up',
        send_copy_to_team_leader: false,
    });
    const [emailLoading, setEmailLoading] = useState(false);

    // Initialize email data when modal opens
    useEffect(() => {
        if (isOpen && invoice) {
            const template = generateInvoiceEmailTemplate(invoice, 'standard', organisation);
            setEmailData({
                recipient_email: invoice.customer?.email || '',
                subject: template.subject,
                email_body: template.body,
                template_type: 'standard',
                send_copy_to_team_leader: false,
            });
        }
    }, [isOpen, invoice, organisation]);

    const generateInvoicePdf = async (): Promise<string | null> => {
        if (!emailPdfRef.current) return null;

        try {
            const element = emailPdfRef.current;
            element.style.left = '0';
            element.style.visibility = 'visible';

            await new Promise((resolve) => setTimeout(resolve, 100));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 794,
                height: 1123,
            });

            element.style.left = '-9999px';
            element.style.visibility = 'hidden';

            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
            });

            const pdfWidth = 210;
            const pdfHeight = 297;
            const imgAspectRatio = canvas.width / canvas.height;
            const pdfAspectRatio = pdfWidth / pdfHeight;

            let finalWidth: number;
            let finalHeight: number;

            if (imgAspectRatio > pdfAspectRatio) {
                finalWidth = pdfWidth;
                finalHeight = pdfWidth / imgAspectRatio;
            } else {
                finalHeight = pdfHeight;
                finalWidth = pdfHeight * imgAspectRatio;
            }

            const xOffset = (pdfWidth - finalWidth) / 2;
            const yOffset = 0;

            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);

            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            return pdfBase64;
        } catch (err) {
            console.error('Error generating PDF:', err);
            return null;
        }
    };

    const handleSendEmail = async () => {
        if (!emailData.recipient_email || !emailData.subject || !emailData.email_body) {
            return;
        }

        try {
            setEmailLoading(true);

            const pdfBase64 = await generateInvoicePdf();
            const attachments: { filename: string; content: string }[] = [];

            if (pdfBase64) {
                attachments.push({
                    filename: `Faktura-${invoice.invoice_number}.pdf`,
                    content: pdfBase64,
                });
            }

            const result = await sendInvoiceEmail(
                invoice.id,
                {
                    recipient_email: emailData.recipient_email,
                    subject: emailData.subject,
                    email_body: emailData.email_body,
                    attachments,
                    send_copy_to_team_leader: emailData.send_copy_to_team_leader,
                },
                user?.id
            );

            if (result.error) {
                return;
            }

            onEmailSent();
            onClose();
        } catch (err) {
            console.error('Error sending email:', err);
        } finally {
            setEmailLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Skicka faktura via e-post
                    </h3>
                    <button
                        onClick={onClose}
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
                                    const newTemplateType = e.target.value as typeof emailData.template_type;
                                    const template = generateInvoiceEmailTemplate(invoice, newTemplateType, organisation);
                                    setEmailData((prev) => ({
                                        ...prev,
                                        template_type: newTemplateType,
                                        subject: template.subject,
                                        email_body: template.body,
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
                                onChange={(e) => setEmailData((prev) => ({ ...prev, recipient_email: e.target.value }))}
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
                                onChange={(e) => setEmailData((prev) => ({ ...prev, subject: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        {/* Email Body */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">E-postinnehåll</label>
                            <textarea
                                value={emailData.email_body}
                                onChange={(e) => setEmailData((prev) => ({ ...prev, email_body: e.target.value }))}
                                rows={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        {/* Options */}
                        {invoice.assigned_team?.team_leader && (
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={emailData.send_copy_to_team_leader}
                                    onChange={(e) => setEmailData((prev) => ({ ...prev, send_copy_to_team_leader: e.target.checked }))}
                                    className="h-4 w-4 text-blue-600 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700">
                                    Skicka kopia till teamledare ({invoice.assigned_team.team_leader.full_name})
                                </span>
                            </label>
                        )}
                    </div>

                    {/* Right Column: Invoice Preview */}
                    <div className="bg-gray-50 p-4 rounded-lg h-full overflow-hidden">
                        <div className="transform scale-[0.48] origin-top-left" style={{ width: '210mm', height: '297mm' }}>
                            <div className="bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                                <InvoicePreview
                                    invoice={invoice}
                                    logoUrl={systemSettings?.logo_url}
                                    systemSettings={systemSettings}
                                    organisation={organisation}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Hidden PDF render target */}
                    <div
                        ref={emailPdfRef}
                        className="bg-white p-8"
                        style={{
                            position: 'fixed',
                            left: '-9999px',
                            top: '0',
                            width: '210mm',
                            minHeight: '297mm',
                            boxSizing: 'border-box',
                            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                        }}
                    >
                        <InvoicePreview
                            invoice={invoice}
                            logoUrl={systemSettings?.logo_url}
                            systemSettings={systemSettings}
                            organisation={organisation}
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3 p-6 border-t">
                    <button
                        onClick={onClose}
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
    );
}

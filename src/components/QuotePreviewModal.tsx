
import React, { useRef } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import QuotePreview from './QuotePreview';
import { Button } from './ui';
import type { QuoteTemplate } from '../lib/quoteTemplates';

interface QuotePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    quote: any; // Using any to be flexible with exact Quote shape mismatch
    templates: QuoteTemplate[];
    companyInfo: any;
}

export default function QuotePreviewModal({
    isOpen,
    onClose,
    quote,
    templates,
    companyInfo
}: QuotePreviewModalProps) {
    if (!isOpen) return null;

    const componentRef = useRef<HTMLDivElement>(null);

    // Use react-to-print for robust printing
    const handlePrint = useReactToPrint({
        // @ts-ignore
        content: () => componentRef.current,
        documentTitle: quote?.quote_number || 'Offert',
    });

    // Find the right template or fallback
    // If quote has a template_id, look it up. Otherwise default to first or a basic one.
    const templateId = quote?.template_id;
    const selectedTemplate = templates.find(t => t.id === templateId) || templates[0];

    // Customer info extraction
    const customerInfo = quote.customer || {
        name: 'Kundnamn',
        email: '',
        phone: '',
        address: '',
        postal_code: '',
        city: ''
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Förhandsgranskning</h3>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<Printer className="w-4 h-4" />}
                            onClick={handlePrint}
                        >
                            Skriv ut
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={<FileDown className="w-4 h-4" />}
                            onClick={handlePrint}
                        >
                            Ladda ner PDF
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 bg-gray-50 printable-page-container">
                    <div ref={componentRef} className="w-[210mm] mx-auto bg-white shadow-lg min-h-[297mm]">
                        <QuotePreview
                            quote={quote}
                            template={selectedTemplate}
                            companyInfo={companyInfo}
                            customerInfo={customerInfo}
                            logoUrl={companyInfo?.logo_url}
                            quoteNumber={quote.quote_number || 'UTKAST'}
                            validUntil={quote.valid_until}
                            isEditable={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}


import { useRef, useState, useCallback } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import QuotePreview from './QuotePreview';
import type { QuoteTemplate } from '../lib/quoteTemplates';

interface QuotePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    quote: any;
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
    const componentRef = useRef<HTMLDivElement>(null);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
        quote?.template_id || null
    );

    // Native print: opens content in a new window and triggers print dialog
    const handlePrint = useCallback(() => {
        const printContent = componentRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=800,height=1100');
        if (!printWindow) {
            alert('Popup-blockerare förhindrade utskrift. Tillåt popups för denna sida.');
            return;
        }

        // Gather all stylesheets from the current page
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => el.outerHTML)
            .join('\n');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${quote?.quote_number || 'Offert'}</title>
                ${stylesheets}
                <style>
                    body { margin: 0; padding: 20px; background: white; }
                    @media print {
                        @page { size: A4; margin: 10mm; }
                        body { padding: 0; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();

        // Wait for content + stylesheets to load, then print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 300);
        };

        // Fallback if onload doesn't fire
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 1000);
    }, [quote?.quote_number]);

    // Early return AFTER all hooks
    if (!isOpen || !quote) return null;

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

    const customerInfo = quote.customer || {
        name: 'Kundnamn',
        email: '',
        phone: '',
        address: '',
        postal_code: '',
        city: ''
    };

    return (
        <div
            className="fixed inset-0 z-[70] bg-black bg-opacity-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold text-gray-900">Förhandsgranskning</h3>
                        {templates.length > 0 && (
                            <select
                                value={selectedTemplate?.id || ''}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:ring-blue-500 focus:border-blue-500"
                            >
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Skriv ut
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            <FileDown className="w-4 h-4 mr-2" />
                            Ladda ner PDF
                        </button>
                        <button
                            type="button"
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


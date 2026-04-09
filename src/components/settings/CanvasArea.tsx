import { useState } from 'react';
import { Eye, Pencil } from 'lucide-react';
import type { QuoteTemplate, ContentBlock } from '../../lib/quoteTemplates';
import QuotePreview from '../QuotePreview';
import WireframePreview from './WireframePreview';

type CanvasMode = 'wireframe' | 'live';

interface CanvasAreaProps {
    template: QuoteTemplate;
    logoUrl: string | null;
    companyInfo: any;
    previewMode: boolean;
    selectedBlockId: string | null;
    onSelectBlock: (id: string) => void;
    onBlockUpdate: (blockId: string, content: any, settings?: any) => void;
    onBlockMove: (dragIndex: number, hoverIndex: number) => void;
    onBlockDelete: (blockId: string) => void;
    onTextOverrideUpdate: (key: string, value: string) => void;
    onAddBlock: (type: ContentBlock['type']) => void;
}

// Dummy quote data for live preview
const PREVIEW_QUOTE = {
    quote_number: 'OFFERT-PREVIEW',
    created_at: new Date().toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    subtotal: 10000,
    vat_amount: 2500,
    total_amount: 12500,
    rot_amount: 0,
    customer: {
        name: 'Testkund AB',
        address: 'Testgatan 1',
        postal_code: '123 45',
        city: 'Stockholm',
        email: 'kontakt@testkund.se',
        phone_number: '070-123 45 67',
    },
    line_items: [
        {
            name: 'Konsulttjänst',
            description: 'Utveckling av webbplats',
            quantity: 10,
            unit: 'tim',
            unit_price: 1000,
            total: 10000,
        },
        {
            name: 'Material',
            description: 'Licenser och programvara',
            quantity: 1,
            unit: 'st',
            unit_price: 2500,
            total: 2500,
        },
    ],
};

export default function CanvasArea({
    template,
    logoUrl,
    companyInfo,
    previewMode,
    selectedBlockId,
    onSelectBlock,
    onBlockUpdate,
    onBlockMove,
    onBlockDelete,
    onTextOverrideUpdate,
    onAddBlock,
}: CanvasAreaProps) {
    const [canvasMode, setCanvasMode] = useState<CanvasMode>('live');

    const templateType = template.settings?.template_type || 'quote';

    // Update preview quote number based on template type
    const previewQuote = {
        ...PREVIEW_QUOTE,
        quote_number: templateType === 'invoice' ? 'FAKTURA-PREVIEW' : 'OFFERT-PREVIEW',
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Canvas Toggle Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shrink-0">
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                        onClick={() => setCanvasMode('live')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            canvasMode === 'live'
                                ? 'bg-white shadow text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Live Preview
                    </button>
                    <button
                        onClick={() => setCanvasMode('wireframe')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            canvasMode === 'wireframe'
                                ? 'bg-white shadow text-purple-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Wireframe
                    </button>
                </div>

                <span className="text-xs text-gray-400">
                    {previewMode ? 'Förhandsgranskningsläge' : 'Redigeringsläge'}
                </span>
            </div>

            {/* Canvas Content */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
                {canvasMode === 'live' ? (
                    <div className="max-w-4xl mx-auto">
                        <QuotePreview
                            quote={previewQuote}
                            template={template}
                            logoUrl={logoUrl}
                            companyInfo={companyInfo}
                            isEditable={!previewMode}
                            onBlockUpdate={onBlockUpdate}
                            onBlockMove={onBlockMove}
                            onBlockDelete={onBlockDelete}
                            onBlockSelect={onSelectBlock}
                            onTextOverrideUpdate={onTextOverrideUpdate}
                            onAddBlock={onAddBlock}
                        />
                    </div>
                ) : (
                    <WireframePreview
                        template={template}
                        selectedBlockId={selectedBlockId}
                        onSelectBlock={onSelectBlock}
                    />
                )}
            </div>
        </div>
    );
}

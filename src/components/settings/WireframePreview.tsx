import React from 'react';
import type { QuoteTemplate, ContentBlock } from '../../lib/quoteTemplates';
import { getBlockRegistryEntry, BLOCK_CATEGORY_COLORS } from '../../lib/quoteTemplates';

interface WireframePreviewProps {
    template: QuoteTemplate;
    selectedBlockId: string | null;
    onSelectBlock: (id: string) => void;
}

export default function WireframePreview({
    template,
    selectedBlockId,
    onSelectBlock,
}: WireframePreviewProps) {
    const blocks = template.content_structure;

    return (
        <div className="mx-auto" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
            {/* A4 paper outline */}
            <div className="bg-white border-2 border-gray-300 rounded shadow-md relative" style={{ minHeight: '297mm', padding: '15mm 10mm' }}>
                {/* Document title */}
                <div className="text-center mb-4 pb-3 border-b border-dashed border-gray-200">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {template.name || 'Mall utan namn'} — Wireframe
                    </span>
                </div>

                {blocks.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-300 text-sm">
                        Tomt dokument — Lägg till block
                    </div>
                ) : (
                    <div className="space-y-1">
                        {blocks.map((block) => (
                            <WireframeBlock
                                key={block.id}
                                block={block}
                                isSelected={selectedBlockId === block.id}
                                onClick={() => onSelectBlock(block.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function WireframeBlock({
    block,
    isSelected,
    onClick,
}: {
    block: ContentBlock;
    isSelected: boolean;
    onClick: () => void;
}) {
    const entry = getBlockRegistryEntry(block.type);
    const label = entry?.label || block.type;
    const category = entry?.category || 'innehåll';
    const colors = BLOCK_CATEGORY_COLORS[category] || BLOCK_CATEGORY_COLORS['innehåll'];
    const isVisible = block.settings?.visible !== false;

    // Determine height based on block type
    const getBlockHeight = () => {
        switch (block.type) {
            case 'cover_page':
                return 'min-h-[120px]';
            case 'header_row':
            case 'split_content':
                return 'min-h-[60px]';
            case 'line_items_table':
            case 'testimonials':
                return 'min-h-[80px]';
            case 'spacer':
                return '';
            case 'divider':
                return 'h-[2px]';
            case 'page_break':
                return 'h-[30px]';
            default:
                return 'min-h-[32px]';
        }
    };

    // Special rendering for page_break and divider
    if (block.type === 'page_break') {
        return (
            <div
                onClick={onClick}
                className={`cursor-pointer flex items-center gap-2 py-2 group ${isSelected ? 'ring-2 ring-blue-400 rounded' : ''}`}
            >
                <div className="flex-1 border-t-2 border-dashed border-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Ny Sida
                </span>
                <div className="flex-1 border-t-2 border-dashed border-gray-400" />
            </div>
        );
    }

    if (block.type === 'divider') {
        const mt = block.settings?.marginTop || 0;
        const mb = block.settings?.marginBottom || 0;
        return (
            <div
                onClick={onClick}
                className={`cursor-pointer ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 rounded' : ''}`}
                style={{ marginTop: `${mt}px`, marginBottom: `${mb}px` }}
            >
                <hr className="border-gray-300" style={{ borderColor: block.settings?.borderColor || '#d1d5db' }} />
            </div>
        );
    }

    if (block.type === 'spacer') {
        const h = block.settings?.spacerHeight || 32;
        return (
            <div
                onClick={onClick}
                className={`cursor-pointer border border-dashed border-gray-200 rounded flex items-center justify-center transition-colors group ${
                    isSelected ? 'ring-2 ring-blue-400 border-blue-300' : 'hover:border-gray-300'
                } ${!isVisible ? 'opacity-30' : ''}`}
                style={{ height: `${h}px` }}
            >
                <span className="text-[9px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {h}px
                </span>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`cursor-pointer border-2 border-dashed rounded px-3 py-2 flex items-center gap-2 transition-all ${getBlockHeight()} ${
                isSelected
                    ? `${colors.border} ${colors.bg} ring-2 ring-offset-1 ring-blue-400`
                    : `border-gray-200 hover:${colors.border} hover:${colors.bg}`
            } ${!isVisible ? 'opacity-30' : ''}`}
            style={{
                marginTop: block.settings?.marginTop ? `${block.settings.marginTop}px` : undefined,
                marginBottom: block.settings?.marginBottom ? `${block.settings.marginBottom}px` : undefined,
            }}
        >
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? colors.text : 'text-gray-400'}`}>
                {label}
            </span>

            {/* Show brief content info */}
            {typeof block.content === 'string' && block.content && (
                <span className="text-[9px] text-gray-300 truncate flex-1">
                    {block.content.substring(0, 40)}{block.content.length > 40 ? '...' : ''}
                </span>
            )}
        </div>
    );
}

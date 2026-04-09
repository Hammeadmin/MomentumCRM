import React, { useState, useCallback } from 'react';
import {
    GripVertical, ChevronDown, ChevronRight, Trash2, Eye, EyeOff,
    Upload, Loader2,
    Type, MessageSquare, Package, FileText, Image as ImageIcon,
    Building, User, Receipt, Calculator, Info, FileSignature,
    Minus, Columns, LayoutGrid, FileMinus, LayoutTemplate, Star
} from 'lucide-react';
import type { ContentBlock, QuoteTemplate, BlockStyleSettings } from '../../lib/quoteTemplates';
import { BLOCK_REGISTRY, BLOCK_CATEGORY_COLORS, getBlockRegistryEntry } from '../../lib/quoteTemplates';
import StyleEditor from './StyleEditor';

// Map string icon names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Type, MessageSquare, Package, FileText, Image: ImageIcon,
    Building, User, Receipt, Calculator, Info, FileSignature,
    Minus, Columns, LayoutGrid, FileMinus, LayoutTemplate, Star
};

interface StructurePanelProps {
    template: QuoteTemplate;
    selectedBlockId: string | null;
    onSelectBlock: (id: string | null) => void;
    onStyleChange: (blockId: string, key: string, value: any) => void;
    onContentChange: (blockId: string, content: any, settings?: any) => void;
    onMoveBlock: (dragIndex: number, hoverIndex: number) => void;
    onRemoveBlock: (blockId: string) => void;
    // Image upload
    uploadingBlockId: string | null;
    onTriggerUpload: (blockId: string, fieldName?: string) => void;
}

export default function StructurePanel({
    template,
    selectedBlockId,
    onSelectBlock,
    onStyleChange,
    onContentChange,
    onMoveBlock,
    onRemoveBlock,
    uploadingBlockId,
    onTriggerUpload,
}: StructurePanelProps) {
    // Drag state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const blocks = template.content_structure;
    const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setHoverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index) {
            onMoveBlock(dragIndex, index);
        }
        setDragIndex(null);
        setHoverIndex(null);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setHoverIndex(null);
    };

    const getIcon = (block: ContentBlock) => {
        const entry = getBlockRegistryEntry(block.type);
        const iconName = entry?.icon || 'FileText';
        return ICON_MAP[iconName] || FileText;
    };

    const getLabel = (block: ContentBlock) => {
        const entry = getBlockRegistryEntry(block.type);
        return entry?.label || block.type;
    };

    const getCategoryColor = (block: ContentBlock) => {
        const entry = getBlockRegistryEntry(block.type);
        if (!entry) return BLOCK_CATEGORY_COLORS['innehåll'];
        return BLOCK_CATEGORY_COLORS[entry.category] || BLOCK_CATEGORY_COLORS['innehåll'];
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">Dokumentstruktur</h3>
                <p className="text-xs text-gray-500">{blocks.length} block{blocks.length !== 1 ? '' : ''}</p>
            </div>

            {/* Block List */}
            <div className="flex-1 overflow-y-auto">
                {blocks.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                        <p>Inga block tillagda</p>
                        <p className="text-xs mt-1">Klicka på block i verktygslådan för att lägga till</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {blocks.map((block, index) => {
                            const Icon = getIcon(block);
                            const label = getLabel(block);
                            const colors = getCategoryColor(block);
                            const isSelected = selectedBlockId === block.id;
                            const isDragging = dragIndex === index;
                            const isHoverTarget = hoverIndex === index && dragIndex !== null && dragIndex !== index;
                            const isVisible = block.settings?.visible !== false;

                            return (
                                <div key={block.id}>
                                    {/* Block row */}
                                    <div
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => onSelectBlock(isSelected ? null : block.id)}
                                        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all select-none ${
                                            isDragging ? 'opacity-40' : ''
                                        } ${
                                            isHoverTarget ? 'border-t-2 border-blue-400' : ''
                                        } ${
                                            isSelected
                                                ? `${colors.bg} border-l-3 ${colors.border}`
                                                : 'hover:bg-gray-50 border-l-3 border-transparent'
                                        } ${
                                            !isVisible ? 'opacity-50' : ''
                                        }`}
                                    >
                                        {/* Drag handle */}
                                        <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 cursor-grab active:cursor-grabbing" />

                                        {/* Icon */}
                                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                                            <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                                        </div>

                                        {/* Label */}
                                        <span className={`flex-1 text-xs font-medium truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {label}
                                        </span>

                                        {/* Expand indicator */}
                                        {isSelected ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                        )}
                                    </div>

                                    {/* Expanded settings */}
                                    {isSelected && selectedBlock && (
                                        <div className="bg-gray-50 border-t border-gray-100 p-3">
                                            <BlockInspector
                                                block={selectedBlock}
                                                onStyleChange={(key, value) => onStyleChange(selectedBlock.id, key, value)}
                                                onContentChange={(content, settings) => onContentChange(selectedBlock.id, content, settings)}
                                                onMoveUp={() => index > 0 && onMoveBlock(index, index - 1)}
                                                onMoveDown={() => index < blocks.length - 1 && onMoveBlock(index, index + 1)}
                                                onDelete={() => onRemoveBlock(selectedBlock.id)}
                                                canMoveUp={index > 0}
                                                canMoveDown={index < blocks.length - 1}
                                                uploadingBlockId={uploadingBlockId}
                                                onTriggerUpload={onTriggerUpload}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// BlockInspector — type-specific editors + StyleEditor, rendered inline
// ────────────────────────────────────────────────────────────────────────────

interface BlockInspectorProps {
    block: ContentBlock;
    onStyleChange: (key: string, value: any) => void;
    onContentChange: (content: any, settings?: any) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
    uploadingBlockId: string | null;
    onTriggerUpload: (blockId: string, fieldName?: string) => void;
}

function BlockInspector({
    block, onStyleChange, onContentChange,
    onMoveUp, onMoveDown, onDelete, canMoveUp, canMoveDown,
    uploadingBlockId, onTriggerUpload
}: BlockInspectorProps) {
    const entry = getBlockRegistryEntry(block.type);
    const blockLabel = entry?.label || block.type;

    return (
        <div className="space-y-3">
            {/* TEXT-BASED BLOCKS */}
            {['header', 'text_block', 'footer', 'terms', 'custom_text_block'].includes(block.type) && (
                <div className="pb-3 border-b border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Textinnehåll</label>
                    <textarea
                        value={typeof block.content === 'string' ? block.content : ''}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Skriv texten här..."
                    />
                </div>
            )}

            {/* IMAGE BLOCK */}
            {block.type === 'image' && (
                <div className="pb-3 border-b border-gray-200 space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bild URL</label>
                        <div className="flex space-x-1.5">
                            <input
                                type="text"
                                value={typeof block.content === 'string' ? block.content : ''}
                                onChange={(e) => onContentChange(e.target.value)}
                                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                placeholder="https://..."
                            />
                            <button
                                onClick={() => onTriggerUpload(block.id)}
                                disabled={uploadingBlockId === block.id}
                                className="px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center shrink-0"
                                title="Ladda upp bild"
                            >
                                {uploadingBlockId === block.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Storlek</label>
                            <select value={block.settings?.imageSize || 'large'} onChange={(e) => onStyleChange('imageSize', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                                <option value="small">Liten (25%)</option>
                                <option value="medium">Mellan (50%)</option>
                                <option value="large">Stor (75%)</option>
                                <option value="full">Fullbredd (100%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Justering</label>
                            <select value={block.settings?.alignment || 'center'} onChange={(e) => onStyleChange('alignment', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                                <option value="left">Vänster</option>
                                <option value="center">Centrerad</option>
                                <option value="right">Höger</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER_ROW */}
            {block.type === 'header_row' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sidhuvudinställningar</label>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">Visa logotyp</span>
                        <input type="checkbox" checked={block.content?.showLogo !== false} onChange={(e) => onContentChange({ ...block.content, showLogo: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Logotypens position</label>
                        <select value={block.settings?.logoPosition || 'left'} onChange={(e) => onStyleChange('logoPosition', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                            <option value="left">Vänster</option>
                            <option value="center">Centrerad</option>
                            <option value="right">Höger</option>
                        </select>
                    </div>
                </div>
            )}

            {/* COMPANY_INFO */}
            {(block.type === 'company_info' || block.type === 'company_details') && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Företagsinfo</label>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">Visa logotyp</span>
                        <input type="checkbox" checked={block.content?.showLogo !== false} onChange={(e) => onContentChange({ ...block.content, showLogo: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    </div>
                    <p className="text-xs text-gray-400">Företagsinformation hämtas automatiskt från ditt konto.</p>
                </div>
            )}

            {/* DOCUMENT_HEADER / DOCUMENT_TITLE / INVOICE_HEADER */}
            {['document_header', 'document_title', 'invoice_header'].includes(block.type) && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Dokumentrubrik</label>
                    <input
                        type="text"
                        value={block.content?.title || (block.type === 'invoice_header' ? 'FAKTURA' : 'OFFERT')}
                        onChange={(e) => onContentChange({ ...block.content, title: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="OFFERT"
                    />
                </div>
            )}

            {/* CUSTOMER_INFO / CUSTOMER_DETAILS */}
            {(block.type === 'customer_info' || block.type === 'customer_details') && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Kundinformation</label>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Etikett</label>
                        <input type="text" value={block.content?.label || 'Till'} onChange={(e) => onContentChange({ ...block.content, label: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" placeholder="Till" />
                    </div>
                    <p className="text-xs text-gray-400">Kundinformation fylls i automatiskt från offerten.</p>
                </div>
            )}

            {/* TOTALS */}
            {block.type === 'totals' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Summeringsinställningar</label>
                    {[
                        { key: 'showSubtotal', label: 'Visa delsumma' },
                        { key: 'showVat', label: 'Visa moms' },
                        { key: 'showTotal', label: 'Visa totalsumma' },
                        { key: 'showRot', label: 'Visa ROT/RUT' }
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                            <span className="text-xs text-gray-700">{item.label}</span>
                            <input type="checkbox" checked={block.content?.[item.key] !== false} onChange={(e) => onContentChange({ ...block.content, [item.key]: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                        </div>
                    ))}
                </div>
            )}

            {/* SIGNATURE_AREA */}
            {block.type === 'signature_area' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Signaturyta</label>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Vänster etikett</label>
                        <input type="text" value={block.content?.leftLabel || 'Leverantör'} onChange={(e) => onContentChange({ ...block.content, leftLabel: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Höger etikett</label>
                        <input type="text" value={block.content?.rightLabel || 'Kund'} onChange={(e) => onContentChange({ ...block.content, rightLabel: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                    </div>
                </div>
            )}

            {/* PAGE_FOOTER */}
            {block.type === 'page_footer' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sidfotinställningar</label>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">Visa företagsinfo</span>
                        <input type="checkbox" checked={block.content?.showCompanyInfo !== false} onChange={(e) => onContentChange({ ...block.content, showCompanyInfo: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    </div>
                </div>
            )}

            {/* QUOTE_METADATA */}
            {block.type === 'quote_metadata' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Offertinformation</label>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">Visa betalningsvillkor</span>
                        <input type="checkbox" checked={block.content?.showPaymentTerms !== false} onChange={(e) => onContentChange({ ...block.content, showPaymentTerms: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">Visa momsinformation</span>
                        <input type="checkbox" checked={block.content?.showVat !== false} onChange={(e) => onContentChange({ ...block.content, showVat: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    </div>
                </div>
            )}

            {/* SPACER */}
            {block.type === 'spacer' && (
                <div className="pb-3 border-b border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Höjd (px)</label>
                    <input type="number" min="8" max="200" value={block.settings?.spacerHeight || 32} onChange={(e) => onStyleChange('spacerHeight', parseInt(e.target.value) || 32)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                </div>
            )}

            {/* DIVIDER */}
            {block.type === 'divider' && (
                <div className="pb-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500">Avdelare mellan sektioner. Ändra marginaler nedan.</p>
                </div>
            )}

            {/* LINE_ITEMS_TABLE */}
            {block.type === 'line_items_table' && (
                <div className="pb-3 border-b border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tabellrubrik</label>
                    <input type="text" value={block.settings?.table_header || 'Specifikation'} onChange={(e) => onStyleChange('table_header', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" placeholder="t.ex. Specifikation" />
                    <p className="text-xs text-gray-400 mt-1">Produkter/tjänster fylls i automatiskt från offerten.</p>
                </div>
            )}

            {/* COVER_PAGE */}
            {block.type === 'cover_page' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Framsida</label>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Bakgrundsbild URL</label>
                        <div className="flex space-x-1.5">
                            <input type="text" value={block.content?.backgroundImage || ''} onChange={(e) => onContentChange({ ...block.content, backgroundImage: e.target.value })} className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded" placeholder="https://..." />
                            <button onClick={() => onTriggerUpload(block.id, 'backgroundImage')} disabled={uploadingBlockId === block.id} className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 shrink-0" title="Ladda upp">
                                {uploadingBlockId === block.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Titel</label>
                        <input type="text" value={block.content?.title || ''} onChange={(e) => onContentChange({ ...block.content, title: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" placeholder="Offertens titel" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Undertitel</label>
                        <input type="text" value={block.content?.subtitle || ''} onChange={(e) => onContentChange({ ...block.content, subtitle: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" placeholder="Kort beskrivning" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Passform</label>
                            <select value={block.settings?.objectFit || 'cover'} onChange={(e) => onStyleChange('objectFit', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                                <option value="contain">Innanför</option>
                                <option value="cover">Täckande</option>
                                <option value="fill">Fyll hela</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Position</label>
                            <select value={block.settings?.backgroundPosition || 'center'} onChange={(e) => onStyleChange('backgroundPosition', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                                <option value="top">Överkant</option>
                                <option value="center">Centrerad</option>
                                <option value="bottom">Nederkant</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5 text-center">Mörktoning: {block.settings?.overlayOpacity ?? 55}%</label>
                        <input type="range" min="0" max="100" value={block.settings?.overlayOpacity ?? 55} onChange={(e) => onStyleChange('overlayOpacity', parseInt(e.target.value))} className="w-full accent-blue-600" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">Visa logotyp</span>
                        <input type="checkbox" checked={block.content?.showLogo !== false} onChange={(e) => onContentChange({ ...block.content, showLogo: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    </div>
                </div>
            )}

            {/* SPLIT_CONTENT */}
            {block.type === 'split_content' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Delat Innehåll</label>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Bild-URL</label>
                        <div className="flex space-x-1.5">
                            <input type="text" value={block.content?.imageUrl || ''} onChange={(e) => onContentChange({ ...block.content, imageUrl: e.target.value })} className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded" placeholder="https://..." />
                            <button onClick={() => onTriggerUpload(block.id, 'imageUrl')} disabled={uploadingBlockId === block.id} className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 shrink-0">
                                {uploadingBlockId === block.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Rubrik</label>
                        <input type="text" value={block.content?.headline || ''} onChange={(e) => onContentChange({ ...block.content, headline: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" placeholder="Rubrik" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Brödtext</label>
                        <textarea value={block.content?.paragraph || ''} onChange={(e) => onContentChange({ ...block.content, paragraph: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" rows={3} placeholder="Beskrivning..." />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Bildposition</label>
                        <div className="flex gap-1.5">
                            <button onClick={() => onContentChange({ ...block.content, imagePosition: 'left' })} className={`flex-1 px-2 py-1 text-xs rounded border ${block.content?.imagePosition !== 'right' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>◀ Vänster</button>
                            <button onClick={() => onContentChange({ ...block.content, imagePosition: 'right' })} className={`flex-1 px-2 py-1 text-xs rounded border ${block.content?.imagePosition === 'right' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Höger ▶</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TESTIMONIALS */}
            {block.type === 'testimonials' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Omdömen</label>
                    {(Array.isArray(block.content) ? block.content : []).map((review: any, idx: number) => (
                        <div key={idx} className="border border-gray-200 rounded p-2 space-y-1">
                            <input type="text" value={review.name || ''} onChange={(e) => { const u = [...(block.content || [])]; u[idx] = { ...u[idx], name: e.target.value }; onContentChange(u); }} className="w-full px-2 py-0.5 text-xs border border-gray-300 rounded" placeholder="Namn" />
                            <input type="text" value={review.quote || ''} onChange={(e) => { const u = [...(block.content || [])]; u[idx] = { ...u[idx], quote: e.target.value }; onContentChange(u); }} className="w-full px-2 py-0.5 text-xs border border-gray-300 rounded" placeholder="Omdöme..." />
                            <button onClick={() => { onContentChange((block.content || []).filter((_: any, i: number) => i !== idx)); }} className="text-xs text-red-500 hover:text-red-700">Ta bort</button>
                        </div>
                    ))}
                    <button onClick={() => { const c = Array.isArray(block.content) ? block.content : []; onContentChange([...c, { name: '', rating: 5, quote: '' }]); }} className="w-full px-2 py-1 text-xs border border-dashed border-gray-300 rounded text-gray-600 hover:bg-gray-50">+ Lägg till omdöme</button>
                </div>
            )}

            {/* QUOTE_VALIDITY */}
            {block.type === 'quote_validity' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Giltighetstid</label>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Antal dagar</label>
                        <input type="number" min="1" max="365" value={block.content?.days || 30} onChange={(e) => onContentChange({ ...block.content, days: parseInt(e.target.value) || 30 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                    </div>
                </div>
            )}

            {/* ACCEPTANCE_SECTION */}
            {block.type === 'acceptance_section' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Acceptera offert</label>
                    <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Rubrik</label>
                        <input type="text" value={block.content?.headerText || 'Acceptera offert'} onChange={(e) => onContentChange({ ...block.content, headerText: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">Visa digital signatur</span>
                        <input type="checkbox" checked={block.content?.showDigitalSignature !== false} onChange={(e) => onContentChange({ ...block.content, showDigitalSignature: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    </div>
                </div>
            )}

            {/* PAYMENT_INFO */}
            {block.type === 'payment_info' && (
                <div className="pb-3 border-b border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Betalningsinfo</label>
                    {[
                        { key: 'showBankAccount', label: 'Visa bankkonto' },
                        { key: 'showOCR', label: 'Visa OCR' },
                        { key: 'showDueDate', label: 'Visa förfallodatum' }
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                            <span className="text-xs text-gray-700">{item.label}</span>
                            <input type="checkbox" checked={block.content?.[item.key] !== false} onChange={(e) => onContentChange({ ...block.content, [item.key]: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                        </div>
                    ))}
                </div>
            )}

            {/* PAGE_BREAK */}
            {block.type === 'page_break' && (
                <div className="pb-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500">Tvingar en ny sida vid utskrift/PDF. Inga inställningar behövs.</p>
                </div>
            )}

            {/* StyleEditor for visual styling */}
            <StyleEditor
                blockType={block.type}
                blockLabel={blockLabel}
                settings={block.settings || {}}
                onStyleChange={onStyleChange}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onDelete={onDelete}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
            />
        </div>
    );
}

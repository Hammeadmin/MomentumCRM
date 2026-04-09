import React, { useMemo } from 'react';
import {
    Type, MessageSquare, Package, FileText, Image as ImageIcon,
    Building, User, Receipt, Calculator, Info, FileSignature,
    Minus, Columns, LayoutGrid, FileMinus, LayoutTemplate, Star
} from 'lucide-react';
import type { ContentBlockType, QuoteTemplate } from '../../lib/quoteTemplates';
import {
    BLOCK_REGISTRY,
    BLOCK_CATEGORY_LABELS,
    BLOCK_CATEGORY_COLORS,
    type BlockRegistryEntry
} from '../../lib/quoteTemplates';

// Map string icon names from BLOCK_REGISTRY to actual Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Type, MessageSquare, Package, FileText, Image: ImageIcon,
    Building, User, Receipt, Calculator, Info, FileSignature,
    Minus, Columns, LayoutGrid, FileMinus, LayoutTemplate, Star
};

interface ToolboxSidebarProps {
    selectedTemplate: QuoteTemplate | null;
    onAddBlock: (type: ContentBlockType) => void;
    onTemplateChange: (updates: Partial<QuoteTemplate>) => void;
    onDesignOptionChange: (key: string, value: any) => void;
    onTextOverrideChange: (key: string, value: string) => void;
    templateType: 'quote' | 'invoice';
    onTemplateTypeChange: (type: 'quote' | 'invoice') => void;
}

// Category display order
const CATEGORY_ORDER = ['innehåll', 'företag', 'kund', 'ekonomi', 'layout', 'premium'] as const;

export default function ToolboxSidebar({
    selectedTemplate,
    onAddBlock,
    onTemplateChange,
    onDesignOptionChange,
    onTextOverrideChange,
    templateType,
    onTemplateTypeChange,
}: ToolboxSidebarProps) {

    // Group and filter blocks based on docType
    const groupedBlocks = useMemo(() => {
        const filtered = BLOCK_REGISTRY.filter(
            entry => entry.docType === 'both' || entry.docType === templateType
        );
        const groups: Record<string, BlockRegistryEntry[]> = {};
        CATEGORY_ORDER.forEach(cat => { groups[cat] = []; });
        filtered.forEach(entry => {
            if (groups[entry.category]) {
                groups[entry.category].push(entry);
            }
        });
        return groups;
    }, [templateType]);

    if (!selectedTemplate) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm p-6 text-center">
                <p>Välj en mall för att visa verktygslådan</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Document Type Selector */}
            <div className="p-3 border-b border-gray-200">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Dokumenttyp
                </label>
                <div className="flex gap-1.5">
                    <button
                        onClick={() => onTemplateTypeChange('quote')}
                        className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                            templateType === 'quote'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-blue-50 border border-gray-200'
                        }`}
                    >
                        📄 Offert
                    </button>
                    <button
                        onClick={() => onTemplateTypeChange('invoice')}
                        className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                            templateType === 'invoice'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-50 border border-gray-200'
                        }`}
                    >
                        💰 Faktura
                    </button>
                </div>
            </div>

            {/* Block Categories */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {CATEGORY_ORDER.map(category => {
                    const blocks = groupedBlocks[category];
                    if (!blocks || blocks.length === 0) return null;
                    const colors = BLOCK_CATEGORY_COLORS[category];
                    return (
                        <div key={category}>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                {BLOCK_CATEGORY_LABELS[category]}
                            </h3>
                            <div className="grid grid-cols-2 gap-1.5">
                                {blocks.map((entry) => {
                                    const IconComponent = ICON_MAP[entry.icon] || FileText;
                                    return (
                                        <button
                                            key={entry.type}
                                            onClick={() => onAddBlock(entry.type)}
                                            className={`flex flex-col items-center justify-center p-2.5 border border-gray-200 rounded-lg ${colors?.hover || 'hover:border-blue-500 hover:bg-blue-50'} transition-colors text-gray-700`}
                                        >
                                            <IconComponent className="w-4 h-4 mb-0.5" />
                                            <span className="text-[10px] font-medium leading-tight text-center">{entry.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Global Settings */}
            <div className="border-t border-gray-200 p-3 space-y-3 bg-gray-50">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inställningar</h3>

                {/* Template Name */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mallnamn</label>
                    <input
                        type="text"
                        value={selectedTemplate.name}
                        onChange={(e) => onTemplateChange({ name: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                </div>

                {/* VAT & Payment Terms */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Moms (%)</label>
                        <input
                            type="number"
                            value={selectedTemplate.settings?.default_vat_rate ?? 25}
                            onChange={(e) => onTemplateChange({
                                settings: { ...selectedTemplate.settings, default_vat_rate: parseFloat(e.target.value) }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Dagar</label>
                        <input
                            type="number"
                            value={selectedTemplate.settings?.default_payment_terms ?? 30}
                            onChange={(e) => onTemplateChange({
                                settings: { ...selectedTemplate.settings, default_payment_terms: parseInt(e.target.value) }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                    </div>
                </div>

                {/* Design */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Design</h4>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Typsnitt</label>
                        <select
                            value={selectedTemplate.design_options?.font_family || 'Inter'}
                            onChange={(e) => onDesignOptionChange('font_family', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                            <option value="Inter">Inter</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Playfair Display">Playfair Display</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-gray-700">Färg</label>
                        <input
                            type="color"
                            value={selectedTemplate.design_options?.primary_color || '#2563EB'}
                            onChange={(e) => onDesignOptionChange('primary_color', e.target.value)}
                            className="h-6 w-8 border border-gray-300 rounded cursor-pointer"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Logotyp</label>
                        <div className="flex bg-gray-100 rounded p-1">
                            {(['left', 'center', 'right'] as const).map((pos) => (
                                <button
                                    key={pos}
                                    onClick={() => onDesignOptionChange('logo_position', pos)}
                                    className={`flex-1 py-1 text-xs rounded capitalize ${
                                        selectedTemplate.design_options?.logo_position === pos
                                            ? 'bg-white shadow text-blue-600 font-medium'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {pos === 'left' ? 'Vänster' : pos === 'center' ? 'Mitt' : 'Höger'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Standardtexter</label>
                        <input
                            placeholder="Rubrik (t.ex OFFERT)"
                            value={selectedTemplate.design_options?.text_overrides?.title || ''}
                            onChange={(e) => onTextOverrideChange('title', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

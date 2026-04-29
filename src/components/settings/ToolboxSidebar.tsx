import React, { useMemo, useState } from 'react';
import {
    Type, MessageSquare, Package, FileText, Image as ImageIcon,
    Building, User, Receipt, Calculator, Info, FileSignature,
    Minus, Columns, LayoutGrid, FileMinus, LayoutTemplate, Star,
    Settings, Layers
} from 'lucide-react';
import type { ContentBlockType, QuoteTemplate } from '../../lib/quoteTemplates';
import {
    BLOCK_REGISTRY,
    BLOCK_CATEGORY_LABELS,
    BLOCK_CATEGORY_COLORS,
    type BlockRegistryEntry
} from '../../lib/quoteTemplates';

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
    const [activeTab, setActiveTab] = useState<'komponenter' | 'inställningar'>('komponenter');

    const groupedBlocks = useMemo(() => {
        const filtered = BLOCK_REGISTRY.filter(
            entry => entry.docType === 'both' || entry.docType === templateType
        );
        const groups: Record<string, BlockRegistryEntry[]> = {};
        CATEGORY_ORDER.forEach(cat => { groups[cat] = []; });
        filtered.forEach(entry => {
            if (groups[entry.category]) groups[entry.category].push(entry);
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
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 shrink-0">
                <button
                    onClick={() => setActiveTab('komponenter')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                        activeTab === 'komponenter'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Komponenter
                </button>
                <button
                    onClick={() => setActiveTab('inställningar')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                        activeTab === 'inställningar'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <Settings className="w-3.5 h-3.5" />
                    Inställningar
                </button>
            </div>

            {/* ── TAB: Komponenter ── */}
            {activeTab === 'komponenter' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Document type toggle — always visible at top of this tab */}
                    <div className="p-3 border-b border-gray-200 shrink-0">
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

                    {/* Block categories — scrollable, gets all remaining height */}
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
                </div>
            )}

            {/* ── TAB: Inställningar ── */}
            {activeTab === 'inställningar' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {/* Template name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Mallnamn
                        </label>
                        <input
                            type="text"
                            value={selectedTemplate.name}
                            onChange={(e) => onTemplateChange({ name: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* VAT & Payment Terms */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Standardvärden
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Moms (%)</label>
                                <input
                                    type="number"
                                    value={selectedTemplate.settings?.default_vat_rate ?? 25}
                                    onChange={(e) => onTemplateChange({
                                        settings: { ...selectedTemplate.settings, default_vat_rate: parseFloat(e.target.value) }
                                    })}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Betal. (dagar)</label>
                                <input
                                    type="number"
                                    value={selectedTemplate.settings?.default_payment_terms ?? 30}
                                    onChange={(e) => onTemplateChange({
                                        settings: { ...selectedTemplate.settings, default_payment_terms: parseInt(e.target.value) }
                                    })}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Design */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Design
                        </label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Typsnitt</label>
                                <select
                                    value={selectedTemplate.design_options?.font_family || 'Inter'}
                                    onChange={(e) => onDesignOptionChange('font_family', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="Inter">Inter</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Open Sans">Open Sans</option>
                                    <option value="Playfair Display">Playfair Display</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-gray-600">Accentfärg</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={selectedTemplate.design_options?.primary_color || '#2563EB'}
                                        onChange={(e) => onDesignOptionChange('primary_color', e.target.value)}
                                        className="h-7 w-10 border border-gray-300 rounded cursor-pointer p-0.5"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">
                                        {selectedTemplate.design_options?.primary_color || '#2563EB'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Logotyp position</label>
                                <div className="flex bg-gray-100 rounded-md p-1 gap-1">
                                    {(['left', 'center', 'right'] as const).map((pos) => (
                                        <button
                                            key={pos}
                                            onClick={() => onDesignOptionChange('logo_position', pos)}
                                            className={`flex-1 py-1 text-xs rounded transition-all ${
                                                selectedTemplate.design_options?.logo_position === pos
                                                    ? 'bg-white shadow text-blue-600 font-semibold'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {pos === 'left' ? 'Vänster' : pos === 'center' ? 'Mitt' : 'Höger'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text overrides */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Textöversättningar
                        </label>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Rubrik (t.ex. OFFERT)</label>
                            <input
                                placeholder="Lämna tomt för standard"
                                value={selectedTemplate.design_options?.text_overrides?.title || ''}
                                onChange={(e) => onTextOverrideChange('title', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

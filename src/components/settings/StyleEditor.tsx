import React from 'react';
import {
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type,
    Palette,
    Square,
    ArrowUp,
    ArrowDown,
    Trash2,
    ChevronDown
} from 'lucide-react';
import type { BlockStyleSettings } from '../../lib/quoteTemplates';

interface StyleEditorProps {
    blockType: string;
    blockLabel: string;
    settings: BlockStyleSettings & { [key: string]: any };
    onStyleChange: (key: string, value: any) => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
}

const FONT_SIZE_OPTIONS = [
    { value: 'xs', label: 'Extra Small' },
    { value: 'sm', label: 'Small' },
    { value: 'base', label: 'Normal' },
    { value: 'lg', label: 'Large' },
    { value: 'xl', label: 'Extra Large' },
    { value: '2xl', label: '2XL' },
    { value: '3xl', label: '3XL' }
];

const FONT_WEIGHT_OPTIONS = [
    { value: 'normal', label: 'Normal' },
    { value: 'medium', label: 'Medium' },
    { value: 'semibold', label: 'Semibold' },
    { value: 'bold', label: 'Bold' }
];

function StyleEditor({
    blockType,
    blockLabel,
    settings,
    onStyleChange,
    onMoveUp,
    onMoveDown,
    onDelete,
    canMoveUp = true,
    canMoveDown = true
}: StyleEditorProps) {
    return (
        <div className="space-y-4">
            {/* Header with actions */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                    <h3 className="text-sm font-bold text-gray-900">{blockLabel}</h3>
                    <p className="text-xs text-gray-500 capitalize">{blockType.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-1">
                    {onMoveUp && (
                        <button
                            onClick={onMoveUp}
                            disabled={!canMoveUp}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Flytta upp"
                        >
                            <ArrowUp className="w-4 h-4" />
                        </button>
                    )}
                    {onMoveDown && (
                        <button
                            onClick={onMoveDown}
                            disabled={!canMoveDown}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Flytta ner"
                        >
                            <ArrowDown className="w-4 h-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Ta bort"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Typography Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Type className="w-3.5 h-3.5" />
                    <span>Typografi</span>
                </div>

                {/* Font Size */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Textstorlek</label>
                    <div className="relative">
                        <select
                            value={settings.fontSize || 'base'}
                            onChange={(e) => onStyleChange('fontSize', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white appearance-none cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            {FONT_SIZE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Font Weight */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tjocklek</label>
                    <div className="grid grid-cols-4 gap-1">
                        {FONT_WEIGHT_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => onStyleChange('fontWeight', opt.value)}
                                className={`py-1.5 text-xs rounded transition-colors ${(settings.fontWeight || 'normal') === opt.value
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                style={{ fontWeight: opt.value === 'normal' ? 400 : opt.value === 'medium' ? 500 : opt.value === 'semibold' ? 600 : 700 }}
                            >
                                {opt.label.charAt(0)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Text Color */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Textfärg</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={settings.fontColor || '#1f2937'}
                            onChange={(e) => onStyleChange('fontColor', e.target.value)}
                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                            type="text"
                            value={settings.fontColor || '#1f2937'}
                            onChange={(e) => onStyleChange('fontColor', e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded font-mono"
                            placeholder="#000000"
                        />
                        <button
                            onClick={() => onStyleChange('fontColor', undefined)}
                            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Text Alignment */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Justering</label>
                    <div className="flex bg-gray-100 rounded p-1">
                        {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                                key={align}
                                onClick={() => onStyleChange('textAlign', align)}
                                className={`flex-1 p-2 rounded flex justify-center transition-colors ${(settings.textAlign || 'left') === align
                                        ? 'bg-white shadow text-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {align === 'left' && <AlignLeft className="w-4 h-4" />}
                                {align === 'center' && <AlignCenter className="w-4 h-4" />}
                                {align === 'right' && <AlignRight className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Spacing Section */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Square className="w-3.5 h-3.5" />
                    <span>Avstånd</span>
                </div>

                {/* Margin */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Marginal (px)</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-gray-400 mb-0.5 block">Topp</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.marginTop || 0}
                                onChange={(e) => onStyleChange('marginTop', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 mb-0.5 block">Botten</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.marginBottom || 0}
                                onChange={(e) => onStyleChange('marginBottom', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            />
                        </div>
                    </div>
                </div>

                {/* Padding */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Utfyllnad (px)</label>
                    <div className="grid grid-cols-4 gap-1">
                        <div>
                            <label className="text-[10px] text-gray-400 mb-0.5 block text-center">↑</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.paddingTop || 0}
                                onChange={(e) => onStyleChange('paddingTop', parseInt(e.target.value) || 0)}
                                className="w-full px-1 py-1 text-xs border border-gray-300 rounded text-center"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 mb-0.5 block text-center">→</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.paddingRight || 0}
                                onChange={(e) => onStyleChange('paddingRight', parseInt(e.target.value) || 0)}
                                className="w-full px-1 py-1 text-xs border border-gray-300 rounded text-center"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 mb-0.5 block text-center">↓</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.paddingBottom || 0}
                                onChange={(e) => onStyleChange('paddingBottom', parseInt(e.target.value) || 0)}
                                className="w-full px-1 py-1 text-xs border border-gray-300 rounded text-center"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 mb-0.5 block text-center">←</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.paddingLeft || 0}
                                onChange={(e) => onStyleChange('paddingLeft', parseInt(e.target.value) || 0)}
                                className="w-full px-1 py-1 text-xs border border-gray-300 rounded text-center"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Background & Border Section */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Bakgrund & Kant</span>
                </div>

                {/* Background Color */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bakgrundsfärg</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={settings.backgroundColor || '#ffffff'}
                            onChange={(e) => onStyleChange('backgroundColor', e.target.value)}
                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                            type="text"
                            value={settings.backgroundColor || ''}
                            onChange={(e) => onStyleChange('backgroundColor', e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded font-mono"
                            placeholder="transparent"
                        />
                        <button
                            onClick={() => onStyleChange('backgroundColor', undefined)}
                            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Border */}
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Bredd</label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={settings.borderWidth || 0}
                            onChange={(e) => onStyleChange('borderWidth', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Radie</label>
                        <input
                            type="number"
                            min="0"
                            max="50"
                            value={settings.borderRadius || 0}
                            onChange={(e) => onStyleChange('borderRadius', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Färg</label>
                        <input
                            type="color"
                            value={settings.borderColor || '#e5e7eb'}
                            onChange={(e) => onStyleChange('borderColor', e.target.value)}
                            className="w-full h-7 rounded border border-gray-300 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Block-specific settings */}
            {blockType === 'image' && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Bild URL</label>
                    <input
                        type="text"
                        value={settings.imageUrl || ''}
                        onChange={(e) => onStyleChange('imageUrl', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="https://..."
                    />
                </div>
            )}

            {blockType === 'line_items_table' && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Tabellrubrik</label>
                    <input
                        type="text"
                        value={settings.table_header || ''}
                        onChange={(e) => onStyleChange('table_header', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="t.ex. Specifikation"
                    />
                </div>
            )}
        </div>
    );
}

export default StyleEditor;

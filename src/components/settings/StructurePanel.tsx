import React, { useState, useCallback } from 'react';
import {
    GripVertical, ChevronDown, ChevronRight, Trash2, Eye, EyeOff,
    Upload, Loader2, Plus, MoveRight,
    Type, MessageSquare, Package, FileText, Image as ImageIcon,
    Building, User, Receipt, Calculator, Info, FileSignature,
    Minus, Columns, LayoutGrid, FileMinus, LayoutTemplate, Star
} from 'lucide-react';
import type { ContentBlock, QuoteTemplate, BlockStyleSettings, ContentBlockType, RowColumn } from '../../lib/quoteTemplates';
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
    onAddBlock: (type: ContentBlockType, afterBlockId?: string) => void;
    onAddColumnToRow: (rowId: string, blockType: ContentBlockType) => void;
    onMoveBlockToRow: (blockId: string, rowId: string) => void;
    onRemoveColumnFromRow: (rowId: string, columnId: string) => void;
    onUpdateColumnWidth: (rowId: string, columnId: string, width: string) => void;
    onChangeColumnBlockType: (rowId: string, columnId: string, blockType: ContentBlockType) => void;
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
    onAddBlock,
    onAddColumnToRow,
    onMoveBlockToRow,
    onRemoveColumnFromRow,
    onUpdateColumnWidth,
    onChangeColumnBlockType,
    uploadingBlockId,
    onTriggerUpload,
}: StructurePanelProps) {
    // Drag state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    // Insert-after state: blockId after which we're showing picker, or 'start' for top
    const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
    // Move-to-row picker: blockId being moved
    const [movePickerBlockId, setMovePickerBlockId] = useState<string | null>(null);

    const blocks = template.content_structure;
    const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;
    const rowBlocks = blocks.filter(b => b.type === 'row');

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
                        {/* Insert-at-top button */}
                        <InsertButton
                            isOpen={insertAfterId === '__start__'}
                            onToggle={() => setInsertAfterId(insertAfterId === '__start__' ? null : '__start__')}
                            onInsert={(type) => { onAddBlock(type, undefined); setInsertAfterId(null); }}
                            onClose={() => setInsertAfterId(null)}
                            atTop
                        />
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

                                        {/* Move to row button (only for non-row blocks when rows exist) */}
                                        {block.type !== 'row' && rowBlocks.length > 0 && (
                                            <div className="relative flex-shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setMovePickerBlockId(movePickerBlockId === block.id ? null : block.id); }}
                                                    title="Flytta in i kolumnrad"
                                                    className="p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50"
                                                >
                                                    <MoveRight className="w-3 h-3" />
                                                </button>
                                                {movePickerBlockId === block.id && (
                                                    <div onClick={(e) => e.stopPropagation()} onDragStart={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 z-30 bg-white border border-blue-200 rounded-lg shadow-lg p-2 w-40">
                                                        <p className="text-xs font-semibold text-gray-500 mb-1 px-1">Flytta till rad:</p>
                                                        {rowBlocks.map((row, ri) => (
                                                            <button
                                                                key={row.id}
                                                                onClick={(e) => { e.stopPropagation(); onMoveBlockToRow(block.id, row.id); setMovePickerBlockId(null); }}
                                                                className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-blue-50 hover:text-blue-700 text-gray-700"
                                                            >
                                                                Kolumnrad {ri + 1}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

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
                                            {selectedBlock.type === 'row' ? (
                                                <RowColumnEditor
                                                    rowBlock={selectedBlock}
                                                    existingBlocks={blocks.filter(b => b.type !== 'row' && b.id !== selectedBlock.id)}
                                                    onAddColumn={(type) => onAddColumnToRow(selectedBlock.id, type)}
                                                    onMoveExistingToColumn={(blockId) => onMoveBlockToRow(blockId, selectedBlock.id)}
                                                    onRemoveColumn={(colId) => onRemoveColumnFromRow(selectedBlock.id, colId)}
                                                    onUpdateColumnWidth={(colId, width) => onUpdateColumnWidth(selectedBlock.id, colId, width)}
                                                    onChangeColumnBlockType={(colId, type) => onChangeColumnBlockType(selectedBlock.id, colId, type)}
                                                    onStyleChange={(key, value) => onStyleChange(selectedBlock.id, key, value)}
                                                    onMoveUp={() => index > 0 && onMoveBlock(index, index - 1)}
                                                    onMoveDown={() => index < blocks.length - 1 && onMoveBlock(index, index + 1)}
                                                    onDelete={() => onRemoveBlock(selectedBlock.id)}
                                                    canMoveUp={index > 0}
                                                    canMoveDown={index < blocks.length - 1}
                                                />
                                            ) : (
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
                                            )}
                                        </div>
                                    )}

                                    {/* Insert-after button */}
                                    <InsertButton
                                        isOpen={insertAfterId === block.id}
                                        onToggle={() => setInsertAfterId(insertAfterId === block.id ? null : block.id)}
                                        onInsert={(type) => { onAddBlock(type, block.id); setInsertAfterId(null); }}
                                        onClose={() => setInsertAfterId(null)}
                                    />
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
// InsertButton — compact + button between blocks, opens block-type mini picker
// ────────────────────────────────────────────────────────────────────────────

const QUICK_BLOCKS: { type: ContentBlockType; label: string }[] = [
    { type: 'text_block', label: 'Text' },
    { type: 'header', label: 'Rubrik' },
    { type: 'spacer', label: 'Mellanrum' },
    { type: 'divider', label: 'Avdelare' },
    { type: 'image', label: 'Bild' },
    { type: 'line_items_table', label: 'Artiklar' },
    { type: 'totals', label: 'Summering' },
    { type: 'terms', label: 'Villkor' },
    { type: 'signature_area', label: 'Signatur' },
    { type: 'page_break', label: 'Sidbrytning' },
];

interface InsertButtonProps {
    isOpen: boolean;
    onToggle: () => void;
    onInsert: (type: ContentBlockType) => void;
    onClose: () => void;
    atTop?: boolean;
}

function InsertButton({ isOpen, onToggle, onInsert, onClose, atTop }: InsertButtonProps) {
    return (
        <div className={`relative group/insert flex flex-col items-center ${atTop ? 'py-0.5' : ''}`}>
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                title="Infoga block här"
                className={`flex items-center gap-1 w-full justify-center py-0.5 text-xs font-medium transition-all
                    ${isOpen
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-transparent hover:text-blue-400 hover:bg-blue-50'
                    }`}
            >
                <Plus className="w-3 h-3" />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 z-20 bg-white border border-blue-200 rounded-lg shadow-lg p-2 mt-1 top-full">
                    <p className="text-xs font-semibold text-gray-500 mb-1.5 px-1">Välj blocktyp att infoga:</p>
                    <div className="grid grid-cols-2 gap-1">
                        {QUICK_BLOCKS.map(({ type, label }) => (
                            <button
                                key={type}
                                onClick={() => onInsert(type)}
                                className="text-left px-2 py-1 text-xs rounded hover:bg-blue-50 hover:text-blue-700 text-gray-700 transition-colors"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onClose}
                        className="mt-1.5 w-full text-xs text-gray-400 hover:text-gray-600 text-center py-0.5"
                    >
                        Avbryt
                    </button>
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// RowColumnEditor — editor for row blocks with column management
// ────────────────────────────────────────────────────────────────────────────

interface RowColumnEditorProps {
    rowBlock: ContentBlock;
    existingBlocks: ContentBlock[]; // top-level non-row blocks to move into this row
    onAddColumn: (blockType: ContentBlockType) => void;
    onMoveExistingToColumn: (blockId: string) => void;
    onRemoveColumn: (columnId: string) => void;
    onUpdateColumnWidth: (columnId: string, width: string) => void;
    onChangeColumnBlockType: (columnId: string, blockType: ContentBlockType) => void;
    onStyleChange: (key: string, value: any) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
}

const WIDTH_OPTIONS = [
    { value: '1/4', label: '25%' },
    { value: '1/3', label: '33%' },
    { value: '1/2', label: '50%' },
    { value: '2/3', label: '67%' },
    { value: '3/4', label: '75%' },
    { value: '1/1', label: '100%' },
];

function RowColumnEditor({ rowBlock, existingBlocks, onAddColumn, onMoveExistingToColumn, onRemoveColumn, onUpdateColumnWidth, onChangeColumnBlockType, onStyleChange, onMoveUp, onMoveDown, onDelete, canMoveUp, canMoveDown }: RowColumnEditorProps) {
    const [showAddPicker, setShowAddPicker] = useState(false);
    const [addTab, setAddTab] = useState<'new' | 'existing'>('new');
    const columns: RowColumn[] = rowBlock.content?.columns || [];

    return (
        <div className="space-y-3">
            {/* Move/Delete actions */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kolumnrad</span>
                <div className="flex items-center gap-1">
                    <button onClick={onMoveUp} disabled={!canMoveUp} className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Flytta upp"><ChevronDown className="w-3 h-3 rotate-180" /></button>
                    <button onClick={onMoveDown} disabled={!canMoveDown} className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Flytta ner"><ChevronDown className="w-3 h-3" /></button>
                    <button onClick={onDelete} className="p-1 rounded text-red-400 hover:text-red-600" title="Ta bort rad"><Trash2 className="w-3 h-3" /></button>
                </div>
            </div>

            {/* Gap setting */}
            <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-16 shrink-0">Mellanrum</label>
                <input
                    type="range" min="0" max="48" step="4"
                    value={rowBlock.settings?.gap ?? 16}
                    onChange={(e) => onStyleChange('gap', parseInt(e.target.value))}
                    className="flex-1"
                />
                <span className="text-xs text-gray-500 w-8 text-right">{rowBlock.settings?.gap ?? 16}px</span>
            </div>

            {/* Columns */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kolumner ({columns.length})</p>
                {columns.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Inga kolumner ännu</p>
                )}
                {columns.map((col, colIdx) => {
                    return (
                        <div key={col.id} className="flex items-center gap-1.5 p-2 bg-white border border-gray-200 rounded-lg">
                            <span className="text-xs text-gray-400 w-4 shrink-0">{colIdx + 1}.</span>

                            {/* Block type picker */}
                            <select
                                value={col.block.type}
                                onChange={(e) => onChangeColumnBlockType(col.id, e.target.value as ContentBlockType)}
                                className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded bg-white"
                                title="Blocktyp"
                            >
                                {QUICK_BLOCKS.map(qb => (
                                    <option key={qb.type} value={qb.type}>{qb.label}</option>
                                ))}
                            </select>

                            {/* Width picker */}
                            <select
                                value={col.width}
                                onChange={(e) => onUpdateColumnWidth(col.id, e.target.value)}
                                className="w-14 px-1 py-1 text-xs border border-gray-200 rounded bg-white shrink-0"
                                title="Kolumnbredd"
                            >
                                {WIDTH_OPTIONS.map(w => (
                                    <option key={w.value} value={w.value}>{w.label}</option>
                                ))}
                            </select>

                            {/* Remove column */}
                            <button onClick={() => onRemoveColumn(col.id)} className="p-1 text-red-400 hover:text-red-600 shrink-0" title="Ta bort kolumn">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Add column */}
            <div className="relative">
                <button
                    onClick={() => setShowAddPicker(!showAddPicker)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-blue-300 rounded-lg text-xs text-blue-600 hover:bg-blue-50"
                >
                    <Plus className="w-3 h-3" />
                    Lägg till kolumn
                </button>
                {showAddPicker && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 z-20 bg-white border border-blue-200 rounded-lg shadow-lg p-2">
                        {/* Tabs */}
                        <div className="flex mb-2 border-b border-gray-100">
                            <button onClick={() => setAddTab('new')} className={`flex-1 py-1 text-xs font-medium rounded-tl ${addTab === 'new' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'}`}>
                                Ny typ
                            </button>
                            <button onClick={() => setAddTab('existing')} className={`flex-1 py-1 text-xs font-medium rounded-tr ${addTab === 'existing' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'}`}>
                                Befintligt
                            </button>
                        </div>

                        {addTab === 'new' ? (
                            <div className="grid grid-cols-2 gap-1">
                                {QUICK_BLOCKS.map(({ type, label }) => (
                                    <button key={type} onClick={() => { onAddColumn(type); setShowAddPicker(false); }}
                                        className="text-left px-2 py-1 text-xs rounded hover:bg-blue-50 hover:text-blue-700 text-gray-700">
                                        {label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {existingBlocks.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-2">Inga block att flytta</p>
                                ) : existingBlocks.map(b => {
                                    const entry = getBlockRegistryEntry(b.type);
                                    return (
                                        <button key={b.id} onClick={() => { onMoveExistingToColumn(b.id); setShowAddPicker(false); }}
                                            className="block w-full text-left px-2 py-1.5 text-xs rounded hover:bg-blue-50 hover:text-blue-700 text-gray-700 border border-transparent hover:border-blue-200">
                                            {entry?.label || b.type}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <button onClick={() => setShowAddPicker(false)} className="mt-1.5 w-full text-xs text-gray-400 hover:text-gray-600 text-center py-0.5">Avbryt</button>
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

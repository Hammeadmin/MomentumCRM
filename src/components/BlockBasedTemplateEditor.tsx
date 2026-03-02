import React, { useState } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  Type,
  FileText,
  Package,
  MessageSquare,
  Edit,
  Save,
  X,
  Image as ImageIcon,
  Layout,
  FileMinus,
  LayoutTemplate,
  Columns,
  Star
} from 'lucide-react';
import { UNIT_LABELS, UNIT_DESCRIPTIONS, type QuoteLineItemTemplate } from '../lib/quoteTemplates';
import { formatCurrency } from '../lib/database';

export interface ContentBlock {
  id: string;
  type: 'header' | 'text_block' | 'line_items_table' | 'footer' | 'image' | 'page_break' | 'cover_page' | 'split_content' | 'testimonials';
  content: any;
  settings?: any;
}

interface BlockBasedTemplateEditorProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
  className?: string;
}

function BlockBasedTemplateEditor({ blocks, onBlocksChange, className = '' }: BlockBasedTemplateEditorProps) {
  const [draggedBlock, setDraggedBlock] = useState<ContentBlock | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);

  const blockTypes = [
    { type: 'header', label: 'Rubrik', icon: Type, description: 'Huvudrubrik för offerten' },
    { type: 'text_block', label: 'Textblock', icon: MessageSquare, description: 'Beskrivande text' },
    { type: 'line_items_table', label: 'Artikeltabell', icon: Package, description: 'Tabell med artiklar och priser' },
    { type: 'image', label: 'Bild', icon: ImageIcon, description: 'Bild från URL' },
    { type: 'footer', label: 'Sidfot', icon: FileText, description: 'Avslutande text' },
    { type: 'page_break', label: 'Sidbrytning', icon: FileMinus, description: 'Tvinga ny sida vid utskrift/PDF' },
    { type: 'cover_page', label: 'Framsida', icon: LayoutTemplate, description: 'Helsides framsida med bakgrundsbild' },
    { type: 'split_content', label: 'Delat Innehåll', icon: Columns, description: 'Bild och text sida vid sida' },
    { type: 'testimonials', label: 'Omdömen', icon: Star, description: 'Kundrecensioner och betyg' }
  ];

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type)
    };

    onBlocksChange([...blocks, newBlock]);
  };

  const getDefaultContent = (type: ContentBlock['type']) => {
    switch (type) {
      case 'header':
        return 'Ny offert';
      case 'text_block':
        return 'Beskrivning av arbetet som ska utföras...';
      case 'line_items_table':
        return [];
      case 'image':
        return '';
      case 'footer':
        return 'Tack för förtroendet! Vi ser fram emot att arbeta med er.';
      case 'page_break':
        return null;
      case 'cover_page':
        return { backgroundImage: '', title: 'Offertens Titel', subtitle: 'Undertitel eller slogan', showLogo: true };
      case 'split_content':
        return { imageUrl: '', headline: 'Rubrik', paragraph: 'Beskriv ert innehåll här...', imagePosition: 'left' };
      case 'testimonials':
        return [];
      default:
        return '';
    }
  };

  const updateBlock = (blockId: string, content: any, settings?: any) => {
    onBlocksChange(blocks.map(block =>
      block.id === blockId ? { ...block, content, ...(settings ? { settings: { ...block.settings, ...settings } } : {}) } : block
    ));
  };

  const removeBlock = (blockId: string) => {
    onBlocksChange(blocks.filter(block => block.id !== blockId));
  };

  const handleDragStart = (e: React.DragEvent, block: ContentBlock) => {
    setDraggedBlock(block);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedBlock) return;

    const dragIndex = blocks.findIndex(b => b.id === draggedBlock.id);
    if (dragIndex === dropIndex) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(dropIndex, 0, movedBlock);

    onBlocksChange(newBlocks);
    setDraggedBlock(null);
  };

  const addLineItem = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'line_items_table') return;

    const newItem: QuoteLineItemTemplate = {
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      unit: 'st'
    };

    updateBlock(blockId, [...(block.content || []), newItem]);
  };

  const updateLineItem = (blockId: string, itemIndex: number, updates: Partial<QuoteLineItemTemplate>) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'line_items_table') return;

    const updatedItems = (block.content || []).map((item: QuoteLineItemTemplate, index: number) =>
      index === itemIndex ? { ...item, ...updates } : item
    );

    updateBlock(blockId, updatedItems);
  };

  const removeLineItem = (blockId: string, itemIndex: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'line_items_table') return;

    const updatedItems = (block.content || []).filter((_: any, index: number) => index !== itemIndex);
    updateBlock(blockId, updatedItems);
  };

  const getBlockIcon = (type: string) => {
    const blockType = blockTypes.find(bt => bt.type === type);
    return blockType ? blockType.icon : Type;
  };

  const getBlockLabel = (type: string) => {
    const blockType = blockTypes.find(bt => bt.type === type);
    return blockType ? blockType.label : type;
  };

  const renderBlockContent = (block: ContentBlock) => {
    const Icon = getBlockIcon(block.type);
    const isEditing = editingBlock === block.id;

    switch (block.type) {
      case 'header':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4" />
              <span>{getBlockLabel(block.type)}</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Rubriktext..."
                autoFocus
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">{block.content}</h3>
            )}
          </div>
        );

      case 'text_block':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4" />
              <span>{getBlockLabel(block.type)}</span>
            </div>
            {isEditing ? (
              <textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Textinnehåll..."
                autoFocus
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{block.content}</p>
            )}
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4" />
              <span>{getBlockLabel(block.type)}</span>
            </div>
            {isEditing ? (
              <textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sidfottext..."
                autoFocus
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{block.content}</p>
            )}
          </div>
        );

      case 'line_items_table':
        const lineItems = block.content || [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Icon className="w-4 h-4" />
                <span>{getBlockLabel(block.type)}</span>
              </div>
              <button
                onClick={() => addLineItem(block.id)}
                className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="w-3 h-3 mr-1" />
                Lägg till artikel
              </button>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Inga artiklar ännu</p>
                <button
                  onClick={() => addLineItem(block.id)}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Lägg till första artikel
                </button>
              </div>

            ) : (
              <div className="space-y-3">
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rubrik för tabell (valfritt)</label>
                  <input
                    type="text"
                    value={block.settings?.table_header || ''}
                    onChange={(e) => updateBlock(block.id, block.content, { table_header: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="T.ex. Fakturaspecifikation"
                  />
                </div>
                {lineItems.map((item: QuoteLineItemTemplate, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Namn *
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateLineItem(block.id, index, { name: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Artikelnamn"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Beskrivning
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(block.id, index, { description: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Beskrivning"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Antal
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(block.id, index, { quantity: parseFloat(e.target.value) || 1 })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Enhet
                        </label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateLineItem(block.id, index, { unit: e.target.value as any })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Object.entries(UNIT_DESCRIPTIONS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          À-pris
                        </label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(block.id, index, { unit_price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="md:col-span-1 flex items-end">
                        <button
                          onClick={() => removeLineItem(block.id, index)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Ta bort artikel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        Summa: {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="text-right pt-3 border-t">
                  <span className="text-lg font-bold text-gray-900">
                    Total: {formatCurrency(lineItems.reduce((sum: number, item: QuoteLineItemTemplate) =>
                      sum + (item.quantity * item.unit_price), 0
                    ))}
                  </span>
                </div>
              </div>
            )
            }
          </div >
        );

      case 'image':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4" />
              <span>{getBlockLabel(block.type)}</span>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bild-URL</label>
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Justering</label>
                  <select
                    value={block.settings?.alignment || 'center'}
                    onChange={(e) => updateBlock(block.id, block.content, { alignment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="left">Vänster</option>
                    <option value="center">Centrerad</option>
                    <option value="right">Höger</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <img src={block.content} alt="Block" className="h-10 w-10 object-cover rounded bg-gray-100" />
                <span className="text-gray-500 truncate">{block.content || 'Ingen bild vald'}</span>
              </div>
            )}
          </div>
        );

      case 'page_break':
        return (
          <div className="py-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <FileMinus className="w-4 h-4" />
              <span>Sidbrytning</span>
            </div>
            <div className="border-t-2 border-dashed border-gray-400 relative">
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-500 font-medium tracking-widest">
                --- SIDBRYTNING ---
              </span>
            </div>
          </div>
        );

      case 'cover_page':
        const coverContent = block.content || {};
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <LayoutTemplate className="w-4 h-4" />
              <span>Framsida</span>
            </div>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bakgrundsbild URL</label>
                  <input
                    type="text"
                    value={coverContent.backgroundImage || ''}
                    onChange={(e) => updateBlock(block.id, { ...coverContent, backgroundImage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Titel</label>
                  <input
                    type="text"
                    value={coverContent.title || ''}
                    onChange={(e) => updateBlock(block.id, { ...coverContent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Offertens titel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Undertitel</label>
                  <input
                    type="text"
                    value={coverContent.subtitle || ''}
                    onChange={(e) => updateBlock(block.id, { ...coverContent, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Kort beskrivning eller slogan"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={coverContent.showLogo !== false}
                    onChange={(e) => updateBlock(block.id, { ...coverContent, showLogo: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-xs font-medium text-gray-700">Visa logotyp</label>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 text-white text-center relative overflow-hidden" style={{ minHeight: '120px' }}>
                {coverContent.backgroundImage && (
                  <img src={coverContent.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <div className="relative z-10">
                  <p className="text-lg font-bold">{coverContent.title || 'Titel'}</p>
                  <p className="text-sm opacity-80">{coverContent.subtitle || 'Undertitel'}</p>
                  {coverContent.showLogo !== false && <p className="text-xs mt-2 opacity-60">🏢 Logotyp visas</p>}
                </div>
              </div>
            )}
          </div>
        );

      case 'split_content':
        const splitContent = block.content || {};
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Columns className="w-4 h-4" />
              <span>Delat Innehåll</span>
            </div>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bild-URL</label>
                  <input
                    type="text"
                    value={splitContent.imageUrl || ''}
                    onChange={(e) => updateBlock(block.id, { ...splitContent, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rubrik</label>
                  <input
                    type="text"
                    value={splitContent.headline || ''}
                    onChange={(e) => updateBlock(block.id, { ...splitContent, headline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Rubrik"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Brödtext</label>
                  <textarea
                    value={splitContent.paragraph || ''}
                    onChange={(e) => updateBlock(block.id, { ...splitContent, paragraph: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Beskrivning..."
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <label className="text-xs font-medium text-gray-700">Bildposition:</label>
                  <button
                    onClick={() => updateBlock(block.id, { ...splitContent, imagePosition: 'left' })}
                    className={`px-3 py-1 text-xs rounded-md border ${splitContent.imagePosition !== 'right' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    ◀ Bild vänster
                  </button>
                  <button
                    onClick={() => updateBlock(block.id, { ...splitContent, imagePosition: 'right' })}
                    className={`px-3 py-1 text-xs rounded-md border ${splitContent.imagePosition === 'right' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Bild höger ▶
                  </button>
                </div>
              </div>
            ) : (
              <div className={`flex gap-4 items-start ${splitContent.imagePosition === 'right' ? 'flex-row-reverse' : ''}`}>
                <div className="w-24 h-20 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                  {splitContent.imageUrl ? (
                    <img src={splitContent.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Bild</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{splitContent.headline || 'Rubrik'}</p>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-3">{splitContent.paragraph || 'Brödtext...'}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'testimonials':
        const reviews = Array.isArray(block.content) ? block.content : [];
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Star className="w-4 h-4" />
                <span>Omdömen ({reviews.length})</span>
              </div>
              <button
                onClick={() => {
                  const newReviews = [...reviews, { name: '', rating: 5, quote: '' }];
                  updateBlock(block.id, newReviews);
                }}
                className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="w-3 h-3 mr-1" />
                Lägg till omdöme
              </button>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <Star className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Inga omdömen ännu</p>
                <button
                  onClick={() => updateBlock(block.id, [{ name: '', rating: 5, quote: '' }])}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Lägg till första omdömet
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Namn</label>
                        <input
                          type="text"
                          value={review.name}
                          onChange={(e) => {
                            const updated = [...reviews];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            updateBlock(block.id, updated);
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Kundens namn"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Betyg (1-5)</label>
                        <select
                          value={review.rating}
                          onChange={(e) => {
                            const updated = [...reviews];
                            updated[idx] = { ...updated[idx], rating: parseInt(e.target.value) };
                            updateBlock(block.id, updated);
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          {[1, 2, 3, 4, 5].map(v => (
                            <option key={v} value={v}>{'★'.repeat(v)}{'☆'.repeat(5 - v)} ({v})</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-6">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Omdöme</label>
                        <input
                          type="text"
                          value={review.quote}
                          onChange={(e) => {
                            const updated = [...reviews];
                            updated[idx] = { ...updated[idx], quote: e.target.value };
                            updateBlock(block.id, updated);
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Vad sa kunden?"
                        />
                      </div>
                      <div className="md:col-span-1 flex items-end">
                        <button
                          onClick={() => {
                            const updated = reviews.filter((_: any, i: number) => i !== idx);
                            updateBlock(block.id, updated);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Ta bort omdöme"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return <div>Okänd blocktyp: {block.type}</div>;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Add Block Buttons */}
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <span className="text-sm font-medium text-gray-700 mr-2">Lägg till block:</span>
        {blockTypes.map((blockType) => {
          const Icon = blockType.icon;
          return (
            <button
              key={blockType.type}
              onClick={() => addBlock(blockType.type as ContentBlock['type'])}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
              title={blockType.description}
            >
              <Icon className="w-3 h-3 mr-1" />
              {blockType.label}
            </button>
          );
        })}
      </div>

      {/* Blocks List */}
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => handleDragStart(e, block)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`border rounded-lg p-4 transition-all cursor-move ${dragOverIndex === index
              ? 'border-blue-500 bg-blue-50 transform scale-105'
              : 'border-gray-200 hover:border-gray-300'
              } ${draggedBlock?.id === block.id
                ? 'opacity-50 transform rotate-1'
                : ''
              }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-2">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>

              <div className="flex-1">
                {renderBlockContent(block)}
              </div>

              <div className="flex-shrink-0 flex items-center space-x-1">
                <button
                  onClick={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                  className="text-gray-400 hover:text-blue-600"
                  title="Redigera"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeBlock(block.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Ta bort block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">Inga block ännu</p>
          <p className="text-sm mt-1">Lägg till block för att bygga din offertmall</p>
        </div>
      )}
    </div>
  );
}

export default BlockBasedTemplateEditor;
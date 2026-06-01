import React, { useState, useEffect } from 'react';
import {
    Save, Plus, Eye, Layout, AlertTriangle, Loader2
} from 'lucide-react';
import {
    QuoteTemplate,
    getQuoteTemplates,
    createQuoteTemplate,
    updateQuoteTemplate,
    deleteQuoteTemplate,
    createDefaultTemplates,
    createDefaultInvoiceTemplates,
    ContentBlock,
    getBlockDefaults,
    ContentBlockType
} from '../../lib/quoteTemplates';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadTemplateImage } from '../../lib/storage';
import ConfirmDialog from '../ConfirmDialog';
import ToolboxSidebar from './ToolboxSidebar';
import StructurePanel from './StructurePanel';
import CanvasArea from './CanvasArea';

function TemplateBuilder() {
    const { session } = useAuth();
    const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [creatingDefaults, setCreatingDefaults] = useState(false);
    const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [pendingUploadBlockId, setPendingUploadBlockId] = useState<string | null>(null);
    const [pendingUploadField, setPendingUploadField] = useState<string | null>(null);

    // Default design options
    const defaultDesignOptions = {
        font_family: 'Inter',
        primary_color: '#2563EB',
        logo_position: 'left' as const,
        show_signature_area: true,
        show_product_images: false,
        text_overrides: {}
    };

    // ────────────────────────────────────────────────────────────────
    // Image upload
    // ────────────────────────────────────────────────────────────────

    const handleImageUpload = async (file: File, blockId: string, fieldName?: string) => {
        const orgId = templates[0]?.organisation_id || session?.user?.id;
        if (!orgId) return;
        try {
            setUploadingBlockId(blockId);
            const publicUrl = await uploadTemplateImage(file, orgId);
            if (publicUrl && selectedTemplate) {
                const updatedStructure = selectedTemplate.content_structure.map(b => {
                    if (b.id !== blockId) return b;
                    if (fieldName) {
                        return { ...b, content: { ...(b.content as any), [fieldName]: publicUrl } };
                    }
                    return { ...b, content: publicUrl };
                });
                setSelectedTemplate({ ...selectedTemplate, content_structure: updatedStructure });
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Det gick inte att ladda upp bilden.');
        } finally {
            setUploadingBlockId(null);
        }
    };

    const triggerFileUpload = (blockId: string, fieldName?: string) => {
        setPendingUploadBlockId(blockId);
        setPendingUploadField(fieldName || null);
        fileInputRef.current?.click();
    };

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && pendingUploadBlockId) {
            handleImageUpload(file, pendingUploadBlockId, pendingUploadField || undefined);
        }
        e.target.value = '';
    };

    // ────────────────────────────────────────────────────────────────
    // Fetch & load
    // ────────────────────────────────────────────────────────────────

    useEffect(() => { fetchTemplates(); }, [session?.user?.id]);

    const fetchTemplates = async () => {
        if (!session?.user?.id) return;
        const { data: profile } = await supabase.from('user_profiles').select('organisation_id').eq('id', session.user.id).single();
        if (profile?.organisation_id) {
            const { data } = await getQuoteTemplates(profile.organisation_id);
            if (data) setTemplates(data);
            const { data: orgData } = await supabase.from('organisations').select('id, name, email, phone, org_number, address, postal_code, city, bank_account, bank_name, vat_number, iban, bic, f_skatt_approved, website, logo_url').eq('id', profile.organisation_id).single();
            if (orgData) {
                if (orgData.logo_url) setLogoUrl(orgData.logo_url);
                setCompanyInfo(orgData);
            }
        }
        setLoading(false);
    };

    // ────────────────────────────────────────────────────────────────
    // Template CRUD
    // ────────────────────────────────────────────────────────────────

    const handleCreateEmptyTemplate = () => {
        const newTemplate: QuoteTemplate = {
            id: 'new_template',
            organisation_id: templates[0]?.organisation_id || '',
            name: 'Ny Mall',
            description: '',
            content_structure: [
                { id: crypto.randomUUID(), type: 'header', ...getBlockDefaults('header') },
                { id: crypto.randomUUID(), type: 'line_items_table', ...getBlockDefaults('line_items_table') },
                { id: crypto.randomUUID(), type: 'footer', ...getBlockDefaults('footer') }
            ],
            settings: { template_type: 'quote', default_vat_rate: 25, default_payment_terms: 30 },
            design_options: { ...defaultDesignOptions }
        };
        setSelectedTemplate(newTemplate);
        setPreviewMode(false);
        setSelectedBlockId(null);
    };

    const handleCreateQuoteStarter = () => {
        const b = (type: ContentBlockType): ContentBlock => ({ id: crypto.randomUUID(), type, ...getBlockDefaults(type) });
        const newTemplate: QuoteTemplate = {
            id: 'new_template',
            organisation_id: templates[0]?.organisation_id || '',
            name: 'Offertmall (Standard)',
            description: 'Komplett offertmall med alla nödvändiga sektioner',
            content_structure: [
                b('header_row'), b('spacer'), b('document_header'), b('spacer'), b('customer_info'),
                b('quote_metadata'), b('divider'), b('line_items_table'), b('divider'), b('totals'),
                b('spacer'), b('terms'), b('spacer'), b('signature_area'), b('page_footer')
            ],
            settings: { template_type: 'quote', default_vat_rate: 25, default_payment_terms: 30 },
            design_options: { ...defaultDesignOptions }
        };
        setSelectedTemplate(newTemplate);
        setPreviewMode(false);
        setSelectedBlockId(null);
    };

    const handleCreateInvoiceStarter = () => {
        const b = (type: ContentBlockType): ContentBlock => ({ id: crypto.randomUUID(), type, ...getBlockDefaults(type) });
        const newTemplate: QuoteTemplate = {
            id: 'new_template',
            organisation_id: templates[0]?.organisation_id || '',
            name: 'Fakturamall (Standard)',
            description: 'Komplett fakturamall med betalningsinformation och F-skatt',
            content_structure: [
                b('header_row'), b('spacer'), b('invoice_header'), b('spacer'), b('customer_info'),
                b('divider'), b('line_items_table'), b('divider'), b('totals'), b('spacer'),
                b('payment_info'), b('spacer'), b('f_skatt_text'), b('page_footer')
            ],
            settings: { template_type: 'invoice', default_vat_rate: 25, default_payment_terms: 30 },
            design_options: { ...defaultDesignOptions }
        };
        setSelectedTemplate(newTemplate);
        setPreviewMode(false);
        setSelectedBlockId(null);
    };

    const handleCreatePremiumStarter = () => {
        const b = (type: ContentBlockType, contentOverride?: any, settingsOverride?: any): ContentBlock => {
            const d = getBlockDefaults(type);
            return { id: crypto.randomUUID(), type, content: contentOverride ?? d.content, settings: { ...d.settings, ...settingsOverride } };
        };
        const newTemplate: QuoteTemplate = {
            id: 'new_template',
            organisation_id: templates[0]?.organisation_id || '',
            name: 'Premium Offert (Flersidig)',
            description: 'Professionell flersidig offert med framsida, om oss, offertdetaljer, garantier och omdömen',
            content_structure: [
                b('cover_page', {
                    backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
                    title: 'Professionell Offert', subtitle: 'Skräddarsydd lösning för ert projekt', showLogo: true
                }),
                b('page_break'),
                b('split_content', {
                    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600',
                    headline: 'Om Oss',
                    paragraph: 'Vi är ett erfaret team med passion för kvalitet och kundnöjdhet. Med över 10 års erfarenhet levererar vi skräddarsydda lösningar som överträffar förväntningar.',
                    imagePosition: 'left'
                }),
                b('spacer'),
                b('split_content', {
                    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600',
                    headline: 'Varför Välja Oss?',
                    paragraph: '✓ Certifierade och försäkrade\n✓ Garanti på allt arbete\n✓ Miljövänliga metoder\n✓ Snabb och pålitlig service\n✓ Konkurrenskraftiga priser',
                    imagePosition: 'right'
                }),
                b('page_break'),
                b('header_row'), b('customer_info'), b('spacer'),
                b('header', 'Offertspecifikation', { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' }),
                b('text_block', 'Nedan presenterar vi vår detaljerade offert baserad på era önskemål och vår besiktning.'),
                b('line_items_table'), b('totals'), b('divider'), b('quote_validity'),
                b('page_break'),
                b('header', 'Garantier & Villkor', { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' }),
                b('terms', 'Betalningsvillkor: 30 dagar netto.\n\nGaranti: Vi lämnar 5 års garanti på allt utfört arbete.\n\nFörsäkring: Vi är fullt försäkrade för alla typer av skador som kan uppstå.'),
                b('acceptance_section'),
                b('page_break'),
                b('header', 'Vad Våra Kunder Säger', { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' }),
                b('spacer'),
                b('testimonials', [
                    { name: 'Anna Svensson', rating: 5, quote: 'Fantastiskt arbete! Resultatet överträffade alla våra förväntningar.' },
                    { name: 'Erik Johansson', rating: 5, quote: 'Professionella från start till slut. Punktliga och noggranna.' },
                    { name: 'Maria Lindberg', rating: 4, quote: 'Mycket nöjd med kvaliteten. Bra kommunikation genom hela projektet.' }
                ]),
                b('page_footer')
            ],
            settings: { template_type: 'quote', default_vat_rate: 25, default_payment_terms: 30 },
            design_options: { ...defaultDesignOptions }
        };
        setSelectedTemplate(newTemplate);
        setPreviewMode(false);
        setSelectedBlockId(null);
    };

    const handleDuplicateTemplate = async () => {
        if (!selectedTemplate) return;
        const newTemplate = {
            ...selectedTemplate,
            name: `${selectedTemplate.name} (Kopia)`,
            content_structure: selectedTemplate.content_structure.map(b => ({ ...b, id: crypto.randomUUID() })),
            design_options: { ...selectedTemplate.design_options }
        };
        delete (newTemplate as any).id;
        delete (newTemplate as any).created_at;
        const { data } = await createQuoteTemplate(newTemplate);
        if (data) { setTemplates([...templates, data]); setSelectedTemplate(data); }
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;
        setSaving(true);
        const templateToSave = {
            ...selectedTemplate,
            settings: { ...selectedTemplate.settings, design_options: selectedTemplate.design_options }
        };
        if (selectedTemplate.id === 'new_template') {
            const { data: profile } = await supabase.from('user_profiles').select('organisation_id').eq('id', session?.user?.id).single();
            if (profile?.organisation_id) {
                delete (templateToSave as any).id;
                delete (templateToSave as any).design_options;
                templateToSave.organisation_id = profile.organisation_id;
                const { data } = await createQuoteTemplate(templateToSave);
                if (data) { setTemplates([...templates, data]); setSelectedTemplate(data); }
            }
        } else {
            delete (templateToSave as any).design_options;
            const { error } = await updateQuoteTemplate(selectedTemplate.id, {
                name: selectedTemplate.name,
                description: selectedTemplate.description,
                content_structure: selectedTemplate.content_structure,
                settings: templateToSave.settings
            });
            if (!error) fetchTemplates();
        }
        setSaving(false);
    };

    const handleDeleteTemplate = async () => {
        if (!selectedTemplate || selectedTemplate.id === 'new_template') return;
        const { error } = await deleteQuoteTemplate(selectedTemplate.id);
        if (!error) { setTemplates(templates.filter(t => t.id !== selectedTemplate.id)); setSelectedTemplate(null); setSelectedBlockId(null); }
        setShowDeleteConfirm(false);
    };

    const handleCreateDefaults = async () => {
        const { data: profile } = await supabase.from('user_profiles').select('organisation_id').eq('id', session?.user?.id).single();
        if (!profile?.organisation_id) return;
        setCreatingDefaults(true);
        try {
            const tType = selectedTemplate?.settings?.template_type || 'quote';
            if (tType === 'invoice') { await createDefaultInvoiceTemplates(profile.organisation_id); }
            else { await createDefaultTemplates(profile.organisation_id); }
            await fetchTemplates();
        } catch (err) { console.error('Error creating default templates:', err); }
        finally { setCreatingDefaults(false); }
    };

    // ────────────────────────────────────────────────────────────────
    // Block operations (passed to sub-components)
    // ────────────────────────────────────────────────────────────────

    const handleAddBlock = (type: ContentBlockType, afterBlockId?: string) => {
        if (!selectedTemplate) return;
        const defaults = getBlockDefaults(type);
        const newBlock: ContentBlock = { id: crypto.randomUUID(), type, content: defaults.content, settings: defaults.settings };
        const blocks = selectedTemplate.content_structure;
        let newBlocks: ContentBlock[];
        if (afterBlockId) {
            const idx = blocks.findIndex(b => b.id === afterBlockId);
            if (idx !== -1) {
                newBlocks = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
            } else {
                newBlocks = [...blocks, newBlock];
            }
        } else {
            newBlocks = [...blocks, newBlock];
        }
        setSelectedTemplate({ ...selectedTemplate, content_structure: newBlocks });
        setSelectedBlockId(newBlock.id);
    };

    const handleRemoveBlock = (blockId: string) => {
        if (!selectedTemplate) return;
        const newStructure = selectedTemplate.content_structure
            .filter(b => b.id !== blockId)
            .map(b => {
                if (b.type === 'row' && b.content?.columns) {
                    return {
                        ...b,
                        content: {
                            ...b.content,
                            columns: b.content.columns.filter((col: any) => col.block.id !== blockId)
                        }
                    };
                }
                return b;
            });
        setSelectedTemplate({ ...selectedTemplate, content_structure: newStructure });
        if (selectedBlockId === blockId) setSelectedBlockId(null);
    };

    const handleBlockMove = (dragIndex: number, hoverIndex: number) => {
        if (!selectedTemplate) return;
        const newBlocks = [...selectedTemplate.content_structure];
        const dragBlock = newBlocks[dragIndex];
        newBlocks.splice(dragIndex, 1);
        newBlocks.splice(hoverIndex, 0, dragBlock);
        setSelectedTemplate({ ...selectedTemplate, content_structure: newBlocks });
    };

    const handleBlockStyleChange = (blockId: string, styleKey: string, value: any) => {
        if (!selectedTemplate) return;
        const updatedStructure = selectedTemplate.content_structure.map(b => {
            if (b.id === blockId) return { ...b, settings: { ...b.settings, [styleKey]: value } };
            if (b.type === 'row' && b.content?.columns) {
                return {
                    ...b,
                    content: {
                        ...b.content,
                        columns: b.content.columns.map((col: any) =>
                            col.block.id === blockId
                                ? { ...col, block: { ...col.block, settings: { ...col.block.settings, [styleKey]: value } } }
                                : col
                        )
                    }
                };
            }
            return b;
        });
        setSelectedTemplate({ ...selectedTemplate, content_structure: updatedStructure });
    };

    const handleUpdateBlockContent = (blockId: string, content: any, settings?: any) => {
        if (!selectedTemplate) return;
        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: selectedTemplate.content_structure.map(b => {
                if (b.id === blockId) return { ...b, content, settings: { ...b.settings, ...settings } };
                if (b.type === 'row' && b.content?.columns) {
                    return {
                        ...b,
                        content: {
                            ...b.content,
                            columns: b.content.columns.map((col: any) =>
                                col.block.id === blockId
                                    ? { ...col, block: { ...col.block, content, settings: { ...col.block.settings, ...settings } } }
                                    : col
                            )
                        }
                    };
                }
                return b;
            })
        });
    };

    const handleAddColumnToRow = (rowId: string, blockType: ContentBlockType) => {
        if (!selectedTemplate) return;
        const defaults = getBlockDefaults(blockType);
        const newCol = {
            id: crypto.randomUUID(),
            width: '1/2' as const,
            block: { id: crypto.randomUUID(), type: blockType, content: defaults.content, settings: defaults.settings }
        };
        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: selectedTemplate.content_structure.map(b =>
                b.id === rowId && b.type === 'row'
                    ? { ...b, content: { ...b.content, columns: [...(b.content?.columns || []), newCol] } }
                    : b
            )
        });
    };

    const handleRemoveColumnFromRow = (rowId: string, columnId: string) => {
        if (!selectedTemplate) return;
        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: selectedTemplate.content_structure.map(b =>
                b.id === rowId && b.type === 'row'
                    ? { ...b, content: { ...b.content, columns: b.content.columns.filter((col: any) => col.id !== columnId) } }
                    : b
            )
        });
    };

    const handleUpdateColumnWidth = (rowId: string, columnId: string, width: string) => {
        if (!selectedTemplate) return;
        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: selectedTemplate.content_structure.map(b =>
                b.id === rowId && b.type === 'row'
                    ? { ...b, content: { ...b.content, columns: b.content.columns.map((col: any) => col.id === columnId ? { ...col, width } : col) } }
                    : b
            )
        });
    };

    const handleChangeColumnBlockType = (rowId: string, columnId: string, blockType: ContentBlockType) => {
        if (!selectedTemplate) return;
        const defaults = getBlockDefaults(blockType);
        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: selectedTemplate.content_structure.map(b =>
                b.id === rowId && b.type === 'row'
                    ? { ...b, content: { ...b.content, columns: b.content.columns.map((col: any) =>
                        col.id === columnId
                            ? { ...col, block: { id: col.block.id, type: blockType, content: defaults.content, settings: defaults.settings } }
                            : col
                    ) } }
                    : b
            )
        });
    };

    const updateDesignOption = (key: string, value: any) => {
        if (!selectedTemplate) return;
        setSelectedTemplate({ ...selectedTemplate, design_options: { ...selectedTemplate.design_options, [key]: value } });
    };

    const updateTextOverride = (key: string, value: string) => {
        if (!selectedTemplate) return;
        const currentOverrides = selectedTemplate.design_options?.text_overrides || {};
        updateDesignOption('text_overrides', { ...currentOverrides, [key]: value });
    };

    const handleTemplateChange = (updates: Partial<QuoteTemplate>) => {
        if (!selectedTemplate) return;
        setSelectedTemplate({ ...selectedTemplate, ...updates });
    };

    const handleTemplateTypeChange = (type: 'quote' | 'invoice') => {
        if (!selectedTemplate) return;
        setSelectedTemplate({
            ...selectedTemplate,
            settings: { ...selectedTemplate.settings, template_type: type }
        });
    };

    // ────────────────────────────────────────────────────────────────
    // Loading
    // ────────────────────────────────────────────────────────────────

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Laddar mallar...</div>;

    const templateType = (selectedTemplate?.settings?.template_type || 'quote') as 'quote' | 'invoice';

    // ────────────────────────────────────────────────────────────────
    // Render
    // ────────────────────────────────────────────────────────────────

    return (
        <div className="h-[calc(100vh-200px)] flex flex-col">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4 shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">Mallbyggare</h2>
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Template Selector */}
                    {templates.length > 0 && (
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedTemplate?.id || ''}
                                onChange={(e) => {
                                    const tmpl = templates.find(t => t.id === e.target.value);
                                    if (tmpl) { setSelectedTemplate(tmpl); setSelectedBlockId(null); }
                                }}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
                            >
                                <option value="">Välj mall...</option>
                                {templates.filter(t => t.settings?.template_type === 'invoice').length > 0 && (
                                    <optgroup label="📋 Fakturor">
                                        {templates
                                            .filter(t => t.settings?.template_type === 'invoice')
                                            .map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                    </optgroup>
                                )}
                                {templates.filter(t => t.settings?.template_type !== 'invoice').length > 0 && (
                                    <optgroup label="📄 Offerter">
                                        {templates
                                            .filter(t => t.settings?.template_type !== 'invoice')
                                            .map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                    </optgroup>
                                )}
                            </select>
                            {selectedTemplate && (
                                <button
                                    onClick={() => handleTemplateTypeChange(templateType === 'invoice' ? 'quote' : 'invoice')}
                                    title="Klicka för att byta malltyp"
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                        templateType === 'invoice'
                                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    }`}
                                >
                                    {templateType === 'invoice' ? '💰 Faktura' : '📄 Offert'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Preview toggle */}
                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        disabled={!selectedTemplate}
                        className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${previewMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        {previewMode ? 'Redigera' : 'Förhandsgr.'}
                    </button>

                    {/* Create / Copy dropdown */}
                    <div className="relative inline-block text-left">
                        <button onClick={() => setDropdownOpen(!dropdownOpen)} className="inline-flex items-center px-3 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50">
                            <Plus className="w-4 h-4 mr-2" /> Ny / Kopiera
                        </button>
                        {dropdownOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Från fördefinierad</div>
                                    <button onClick={() => { handleCreateQuoteStarter(); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">📄 Offertmall (Standard)</button>
                                    <button onClick={() => { handleCreatePremiumStarter(); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">⭐ Premium Offert (Flersidig)</button>
                                    <button onClick={() => { handleCreateInvoiceStarter(); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">📋 Fakturamall (Standard)</button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Annat</div>
                                    <button onClick={() => { handleCreateEmptyTemplate(); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Ny tom mall</button>
                                    <button onClick={() => { handleDuplicateTemplate(); setDropdownOpen(false); }} disabled={!selectedTemplate || selectedTemplate.id === 'new_template'} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400">Kopiera vald</button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Hantera</div>
                                    <button onClick={() => { handleCreateDefaults(); setDropdownOpen(false); }} disabled={creatingDefaults} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400">{creatingDefaults ? '⏳ Skapar...' : '📦 Skapa standardmallar'}</button>
                                    <button onClick={() => { setShowDeleteConfirm(true); setDropdownOpen(false); }} disabled={!selectedTemplate || selectedTemplate.id === 'new_template'} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:text-gray-400">🗑️ Ta bort vald mall</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save */}
                    <button onClick={handleSave} disabled={saving || !selectedTemplate} className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {saving ? 'Sparar...' : 'Spara'}
                    </button>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="flex-1 flex gap-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                {/* Left: Toolbox */}
                <div className="w-52 border-r border-gray-200 bg-white shrink-0 overflow-hidden">
                    <ToolboxSidebar
                        selectedTemplate={selectedTemplate}
                        onAddBlock={(type) => handleAddBlock(type, selectedBlockId ?? undefined)}
                        onTemplateChange={handleTemplateChange}
                        onDesignOptionChange={updateDesignOption}
                        onTextOverrideChange={updateTextOverride}
                        templateType={templateType}
                        onTemplateTypeChange={handleTemplateTypeChange}
                    />
                </div>

                {/* Middle: Structure */}
                <div className="w-64 border-r border-gray-200 bg-white shrink-0 overflow-hidden">
                    {selectedTemplate ? (
                        <StructurePanel
                            template={selectedTemplate}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={setSelectedBlockId}
                            onStyleChange={handleBlockStyleChange}
                            onContentChange={handleUpdateBlockContent}
                            onMoveBlock={handleBlockMove}
                            onRemoveBlock={handleRemoveBlock}
                            onAddBlock={handleAddBlock}
                            onAddColumnToRow={handleAddColumnToRow}
                            onRemoveColumnFromRow={handleRemoveColumnFromRow}
                            onUpdateColumnWidth={handleUpdateColumnWidth}
                            onChangeColumnBlockType={handleChangeColumnBlockType}
                            uploadingBlockId={uploadingBlockId}
                            onTriggerUpload={triggerFileUpload}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm p-6 text-center">
                            <p>Välj eller skapa en mall</p>
                        </div>
                    )}
                </div>

                {/* Right: Canvas */}
                <div className="flex-1 overflow-hidden">
                    {selectedTemplate ? (
                        <CanvasArea
                            template={selectedTemplate}
                            logoUrl={logoUrl}
                            companyInfo={companyInfo}
                            previewMode={previewMode}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={(id) => setSelectedBlockId(id)}
                            onBlockUpdate={handleUpdateBlockContent}
                            onBlockMove={handleBlockMove}
                            onBlockDelete={handleRemoveBlock}
                            onTextOverrideUpdate={updateTextOverride}
                            onAddBlock={handleAddBlock}
                        />
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center justify-center h-full">
                            <Layout className="w-12 h-12 mb-4 text-gray-300" />
                            <p>Välj en mall i sidopanelen för att börja redigera</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden File Input for Image Uploads */}
            <input type="file" ref={fileInputRef} onChange={onFileSelected} className="hidden" accept="image/*" />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteTemplate}
                title="Ta bort mall"
                message={`Är du säker på att du vill ta bort mallen "${selectedTemplate?.name}"? Denna åtgärd kan inte ångras.`}
                confirmText="Ta bort"
                type="danger"
            />
        </div>
    );
}

export default TemplateBuilder;

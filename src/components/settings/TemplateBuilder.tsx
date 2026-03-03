import React, { useState, useEffect } from 'react';
import {
    Save,
    Plus,
    Trash2,
    Layout,
    Type,
    Image as ImageIcon,
    Eye,
    MessageSquare,
    Package,
    FileText,
    ArrowLeft,
    Building,
    User,
    Receipt,
    Calculator,
    FileSignature,
    Info,
    Minus,
    Columns,
    LayoutGrid,
    FileMinus,
    LayoutTemplate,
    Star,
    AlertTriangle,
    Upload,
    Loader2
} from 'lucide-react';
import {
    QuoteTemplate,
    getQuoteTemplates,
    createQuoteTemplate,
    updateQuoteTemplate,
    deleteQuoteTemplate,
    reorderQuoteTemplates,
    createDefaultTemplates,
    createDefaultInvoiceTemplates,
    ContentBlock,
    BlockStyleSettings
} from '../../lib/quoteTemplates';
import QuotePreview from '../QuotePreview';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadTemplateImage } from '../../lib/storage';
import StyleEditor from './StyleEditor';
import ConfirmDialog from '../ConfirmDialog';

function TemplateBuilder() {
    const { session } = useAuth();
    const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false); // False = Edit Mode (default)
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [creatingDefaults, setCreatingDefaults] = useState(false);
    const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [pendingUploadBlockId, setPendingUploadBlockId] = useState<string | null>(null);
    const [pendingUploadField, setPendingUploadField] = useState<string | null>(null);

    const handleImageUpload = async (file: File, blockId: string, fieldName?: string) => {
        const orgId = templates[0]?.organisation_id || session?.user?.id;
        if (!orgId) return;

        try {
            setUploadingBlockId(blockId);
            const publicUrl = await uploadTemplateImage(file, orgId);

            if (publicUrl && selectedTemplate) {
                // Update the correct block
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

    // Default design options
    const defaultDesignOptions = {
        font_family: 'Inter',
        primary_color: '#2563EB', // blue-600
        logo_position: 'left' as const,
        show_signature_area: true,
        show_product_images: false,
        text_overrides: {}
    };

    // Helper to get default settings for any block type
    const getDefaultBlockSettings = (type: string): any => {
        switch (type) {
            case 'header':
                return { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' };
            case 'text_block':
                return { fontSize: 'base', textAlign: 'left' };
            case 'line_items_table':
                return { table_header: 'Specifikation' };
            case 'footer':
                return { fontSize: 'sm', textAlign: 'center' };
            case 'image':
                return { alignment: 'center', imageSize: 'large', imageOpacity: 100, objectFit: 'contain', imageEffect: 'none' };
            case 'cover_page':
                return { overlayOpacity: 55, backgroundPosition: 'center', imageSize: 'full', alignment: 'center', objectFit: 'cover', imageEffect: 'none' };
            case 'logo':
                return { alignment: 'left', maxHeight: 80 };
            case 'company_info':
                return { logoPosition: 'left', showBorder: true, fontSize: 'base' };
            case 'document_header':
                return { fontSize: '3xl', fontWeight: 'bold', textAlign: 'right' };
            case 'customer_info':
                return { showBorder: false, fontSize: 'base' };
            case 'quote_metadata':
                return { fontSize: 'sm' };
            case 'totals':
                return { textAlign: 'right', fontSize: 'base' };
            case 'terms':
                return { fontSize: 'sm' };
            case 'signature_area':
                return { columns: 2 };
            case 'page_footer':
                return { fontSize: 'xs', textAlign: 'center' };
            case 'divider':
                return { marginTop: 16, marginBottom: 16 };
            case 'spacer':
                return { spacerHeight: 32 };
            case 'header_row':
                return { logoPosition: 'left' };
            default:
                return {};
        }
    };

    // Helper to ensure all blocks have unique IDs AND default settings
    const ensureUniqueBlockIds = (blocks: ContentBlock[]): ContentBlock[] => {
        return blocks.map(block => ({
            ...block,
            id: crypto.randomUUID(),
            settings: { ...getDefaultBlockSettings(block.type), ...(block.settings || {}) }
        }));
    };

    // Helper to ensure loaded blocks have settings (doesn't change IDs)
    const ensureBlockSettings = (blocks: ContentBlock[]): ContentBlock[] => {
        return blocks.map(block => ({
            ...block,
            settings: { ...getDefaultBlockSettings(block.type), ...(block.settings || {}) }
        }));
    };

    useEffect(() => {
        fetchTemplates();
    }, [session?.user?.id]);

    const fetchTemplates = async () => {
        if (!session?.user?.id) return;

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('organisation_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.organisation_id) {
            const { data, error } = await getQuoteTemplates(profile.organisation_id);
            if (data) {
                setTemplates(data);
            }

            // Also fetch logo URL from organisation
            const { data: orgData } = await supabase
                .from('organisations')
                .select('logo_url')
                .eq('id', profile.organisation_id)
                .single();
            if (orgData?.logo_url) {
                setLogoUrl(orgData.logo_url);
            }
        }
        setLoading(false);
    };

    const handleCreateEmptyTemplate = () => {
        const newTemplate: QuoteTemplate = {
            id: 'new_template',
            organisation_id: templates[0]?.organisation_id || '',
            name: 'Ny Mall',
            description: '',
            content_structure: [
                { id: crypto.randomUUID(), type: 'header', content: 'Rubrik', settings: getDefaultBlockSettings('header') },
                { id: crypto.randomUUID(), type: 'line_items_table', content: [], settings: getDefaultBlockSettings('line_items_table') },
                { id: crypto.randomUUID(), type: 'footer', content: 'Tack för att ni valde oss!', settings: getDefaultBlockSettings('footer') }
            ],
            settings: {
                template_type: 'quote',
                default_vat_rate: 25,
                default_payment_terms: 30
            },
            design_options: { ...defaultDesignOptions }
        };
        setSelectedTemplate(newTemplate);
        setPreviewMode(false);
        setSelectedBlockId(null);
    };

    // Create a complete Quote starter template with professional layout
    const handleCreateQuoteStarter = () => {
        const newTemplate: QuoteTemplate = {
            id: 'new_template',
            organisation_id: templates[0]?.organisation_id || '',
            name: 'Offertmall (Standard)',
            description: 'Komplett offertmall med alla nödvändiga sektioner',
            content_structure: [
                { id: crypto.randomUUID(), type: 'header_row', content: { showLogo: true }, settings: { logoPosition: 'left' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 20 } },
                { id: crypto.randomUUID(), type: 'document_header', content: { title: 'OFFERT' }, settings: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'right' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 16 } },
                { id: crypto.randomUUID(), type: 'customer_info', content: { label: 'Till' }, settings: { showBorder: false, fontSize: 'base' } },
                { id: crypto.randomUUID(), type: 'quote_metadata', content: { showPaymentTerms: true, showVat: true }, settings: { fontSize: 'sm' } },
                { id: crypto.randomUUID(), type: 'divider', content: null, settings: { marginTop: 16, marginBottom: 16 } },
                { id: crypto.randomUUID(), type: 'line_items_table', content: [], settings: { table_header: 'Specifikation' } },
                { id: crypto.randomUUID(), type: 'divider', content: null, settings: { marginTop: 16, marginBottom: 16 } },
                { id: crypto.randomUUID(), type: 'totals', content: { showSubtotal: true, showVat: true, showTotal: true, showRot: true }, settings: { textAlign: 'right', fontSize: 'base' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 24 } },
                { id: crypto.randomUUID(), type: 'terms', content: 'Betalningsvillkor: 30 dagar netto.\nOfferten är giltig i 30 dagar från offertdatum.\nPriserna är exklusive moms om inget annat anges.', settings: { fontSize: 'sm' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 32 } },
                { id: crypto.randomUUID(), type: 'signature_area', content: { leftLabel: 'Leverantör', rightLabel: 'Kund' }, settings: { columns: 2 } },
                { id: crypto.randomUUID(), type: 'page_footer', content: { showCompanyInfo: true }, settings: { fontSize: 'xs', textAlign: 'center' } }
            ],
            settings: {
                template_type: 'quote',
                default_vat_rate: 25,
                default_payment_terms: 30
            },
            design_options: { ...defaultDesignOptions }
        };
        setSelectedTemplate(newTemplate);
        setPreviewMode(false);
        setSelectedBlockId(null);
    };

    // Create a complete Invoice starter template with payment information
    const handleCreateInvoiceStarter = () => {
        const newTemplate: QuoteTemplate = {
            id: 'new_template',
            organisation_id: templates[0]?.organisation_id || '',
            name: 'Fakturamall (Standard)',
            description: 'Komplett fakturamall med betalningsinformation och F-skatt',
            content_structure: [
                { id: crypto.randomUUID(), type: 'header_row', content: { showLogo: true }, settings: { logoPosition: 'left' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 20 } },
                { id: crypto.randomUUID(), type: 'invoice_header', content: { title: 'FAKTURA' }, settings: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'right' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 16 } },
                { id: crypto.randomUUID(), type: 'customer_info', content: { label: 'Fakturamottagare' }, settings: { showBorder: false, fontSize: 'base' } },
                { id: crypto.randomUUID(), type: 'divider', content: null, settings: { marginTop: 16, marginBottom: 16 } },
                { id: crypto.randomUUID(), type: 'line_items_table', content: [], settings: { table_header: 'Specifikation' } },
                { id: crypto.randomUUID(), type: 'divider', content: null, settings: { marginTop: 16, marginBottom: 16 } },
                { id: crypto.randomUUID(), type: 'totals', content: { showSubtotal: true, showVat: true, showTotal: true, showRot: true }, settings: { textAlign: 'right', fontSize: 'base' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 24 } },
                { id: crypto.randomUUID(), type: 'payment_info', content: { showBankAccount: true, showOCR: true, showDueDate: true }, settings: { fontSize: 'sm' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 16 } },
                { id: crypto.randomUUID(), type: 'f_skatt_text', content: 'Godkänd för F-skatt. Innehar F-skattsedel.', settings: { fontSize: 'xs', textAlign: 'center' } },
                { id: crypto.randomUUID(), type: 'page_footer', content: { showCompanyInfo: true }, settings: { fontSize: 'xs', textAlign: 'center' } }
            ],
            settings: {
                template_type: 'invoice',
                default_vat_rate: 25,
                default_payment_terms: 30
            },
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
            id: undefined,
            created_at: undefined,
            // @ts-ignore
            settings: selectedTemplate.settings || {},
            content_structure: ensureUniqueBlockIds(selectedTemplate.content_structure),
            design_options: { ...selectedTemplate.design_options }
        };

        delete (newTemplate as any).id;
        delete (newTemplate as any).created_at;

        const { data, error } = await createQuoteTemplate(newTemplate);
        if (data) {
            setTemplates([...templates, data]);
            setSelectedTemplate(data);
        }
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;
        setSaving(true);

        const templateToSave = {
            ...selectedTemplate,
            content_structure: selectedTemplate.content_structure, // IDs are preserved
            settings: {
                ...selectedTemplate.settings,
                design_options: selectedTemplate.design_options
            }
        };

        if (selectedTemplate.id === 'new_template') {
            const { data: profile } = await supabase.from('user_profiles').select('organisation_id').eq('id', session?.user?.id).single();
            if (profile?.organisation_id) {
                // @ts-ignore
                delete templateToSave.id;
                // @ts-ignore
                delete templateToSave.design_options;
                templateToSave.organisation_id = profile.organisation_id;

                const { data } = await createQuoteTemplate(templateToSave);
                if (data) {
                    setTemplates([...templates, data]);
                    setSelectedTemplate(data);
                }
            }
        } else {
            // @ts-ignore
            delete templateToSave.design_options;

            const { error } = await updateQuoteTemplate(selectedTemplate.id, {
                name: selectedTemplate.name,
                description: selectedTemplate.description,
                content_structure: selectedTemplate.content_structure,
                settings: templateToSave.settings
            });
            if (!error) {
                fetchTemplates();
            }
        }
        setSaving(false);
    };

    const updateDesignOption = (key: string, value: any) => {
        if (!selectedTemplate) return;
        setSelectedTemplate({
            ...selectedTemplate,
            design_options: {
                ...selectedTemplate.design_options,
                [key]: value
            }
        });
    };

    const updateTextOverride = (key: string, value: string) => {
        if (!selectedTemplate) return;
        const currentOverrides = selectedTemplate.design_options?.text_overrides || {};
        updateDesignOption('text_overrides', {
            ...currentOverrides,
            [key]: value
        });
    };

    const handleAddBlock = (type: ContentBlock['type']) => {
        if (!selectedTemplate) return;

        let content: any = '';
        let settings: any = {};

        // Set default content based on block type
        switch (type) {
            case 'header':
                content = 'Ny Rubrik';
                settings = { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' };
                break;
            case 'text_block':
                content = 'Ny text...';
                settings = { fontSize: 'base', textAlign: 'left' };
                break;
            case 'line_items_table':
                content = [];
                settings = { table_header: 'Specifikation' };
                break;
            case 'footer':
                content = 'Tack för att ni valde oss!';
                settings = { fontSize: 'sm', textAlign: 'center' };
                break;
            case 'image':
                content = 'https://via.placeholder.com/600x200';
                settings = { alignment: 'center' };
                break;
            case 'logo':
                content = null; // Uses logoUrl from system settings
                settings = { alignment: 'left', maxHeight: 80 };
                break;
            case 'company_info':
                content = { showLogo: true };
                settings = { logoPosition: 'left', showBorder: true };
                break;
            case 'document_header':
                content = { title: 'OFFERT' };
                settings = { fontSize: '3xl', fontWeight: 'bold', textAlign: 'right' };
                break;
            case 'customer_info':
                content = { label: 'Till' };
                settings = { showBorder: false };
                break;
            case 'quote_metadata':
                content = { showPaymentTerms: true, showVat: true };
                settings = {};
                break;
            case 'totals':
                content = { showSubtotal: true, showVat: true, showTotal: true, showRot: true };
                settings = { textAlign: 'right' };
                break;
            case 'terms':
                content = 'Betalning ska ske inom 30 dagar från fakturadatum.\nOfferten är giltig i 30 dagar.';
                settings = { fontSize: 'sm' };
                break;
            case 'signature_area':
                content = { leftLabel: 'Leverantör', rightLabel: 'Kund' };
                settings = { columns: 2 };
                break;
            case 'page_footer':
                content = { showCompanyInfo: true };
                settings = { fontSize: 'xs', textAlign: 'center' };
                break;
            case 'divider':
                content = null;
                settings = { marginTop: 16, marginBottom: 16 };
                break;
            case 'spacer':
                content = null;
                settings = { spacerHeight: 32 };
                break;
            case 'header_row':
                // Two-column header: company info left, document header right
                content = { showLogo: true };
                settings = { logoPosition: 'left' };
                break;
            // Invoice-specific blocks
            case 'payment_info':
                content = { showBankAccount: true, showOCR: true, showDueDate: true };
                settings = { fontSize: 'sm' };
                break;
            case 'invoice_header':
                content = { title: 'FAKTURA' };
                settings = { fontSize: '3xl', fontWeight: 'bold', textAlign: 'right' };
                break;
            case 'f_skatt_text':
                content = 'Godkänd för F-skatt. Innehar F-skattsedel.';
                settings = { fontSize: 'xs', textAlign: 'center' };
                break;
            // Quote-specific blocks
            case 'quote_validity':
                content = { days: 30 };
                settings = { fontSize: 'sm' };
                break;
            case 'acceptance_section':
                content = { headerText: 'Acceptera offert', showDigitalSignature: true };
                settings = { fontSize: 'base' };
                break;
            // Multi-page / Premium blocks
            case 'page_break':
                content = null;
                settings = {};
                break;
            case 'cover_page':
                content = { backgroundImage: '', title: 'Offertens Titel', subtitle: 'Undertitel', showLogo: true };
                settings = {};
                break;
            case 'split_content':
                content = { imageUrl: '', headline: 'Rubrik', paragraph: 'Beskriv ert innehåll här...', imagePosition: 'left' };
                settings = {};
                break;
            case 'testimonials':
                content = [];
                settings = {};
                break;
            default:
                content = '';
        }

        const newBlock: ContentBlock = {
            id: crypto.randomUUID(),
            type,
            content,
            settings
        };

        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: [...selectedTemplate.content_structure, newBlock]
        });
        setSelectedBlockId(newBlock.id);
    };

    const handleRemoveBlock = (blockId: string) => {
        if (!selectedTemplate) return;
        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: selectedTemplate.content_structure.filter(b => b.id !== blockId)
        });
        if (selectedBlockId === blockId) setSelectedBlockId(null);
    };

    // Delete template entirely
    const handleDeleteTemplate = async () => {
        if (!selectedTemplate || selectedTemplate.id === 'new_template') return;
        const { error } = await deleteQuoteTemplate(selectedTemplate.id);
        if (!error) {
            setTemplates(templates.filter(t => t.id !== selectedTemplate.id));
            setSelectedTemplate(null);
            setSelectedBlockId(null);
        }
        setShowDeleteConfirm(false);
    };

    // Create default templates from quoteTemplates.ts
    const handleCreateDefaults = async () => {
        const { data: profile } = await supabase.from('user_profiles').select('organisation_id').eq('id', session?.user?.id).single();
        if (!profile?.organisation_id) return;
        setCreatingDefaults(true);
        try {
            const templateType = selectedTemplate?.settings?.template_type || 'quote';
            if (templateType === 'invoice') {
                await createDefaultInvoiceTemplates(profile.organisation_id);
            } else {
                await createDefaultTemplates(profile.organisation_id);
            }
            await fetchTemplates();
        } catch (err) {
            console.error('Error creating default templates:', err);
        } finally {
            setCreatingDefaults(false);
        }
    };

    // Create Premium Multi-page Starter
    const handleCreatePremiumStarter = () => {
        const newTemplate: QuoteTemplate = {
            id: 'new_template',
            organisation_id: templates[0]?.organisation_id || '',
            name: 'Premium Offert (Flersidig)',
            description: 'Professionell flersidig offert med framsida, om oss, offertdetaljer, garantier och omdömen',
            content_structure: [
                { id: crypto.randomUUID(), type: 'cover_page', content: { backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200', title: 'Professionell Offert', subtitle: 'Skräddarsydd lösning för ert projekt', showLogo: true }, settings: {} },
                { id: crypto.randomUUID(), type: 'page_break', content: null, settings: {} },
                { id: crypto.randomUUID(), type: 'split_content', content: { imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600', headline: 'Om Oss', paragraph: 'Vi är ett erfaret team med passion för kvalitet och kundnöjdhet. Med över 10 års erfarenhet levererar vi skräddarsydda lösningar som överträffar förväntningar.', imagePosition: 'left' }, settings: {} },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 32 } },
                { id: crypto.randomUUID(), type: 'split_content', content: { imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600', headline: 'Varför Välja Oss?', paragraph: '✓ Certifierade och försäkrade\n✓ Garanti på allt arbete\n✓ Miljövänliga metoder\n✓ Snabb och pålitlig service\n✓ Konkurrenskraftiga priser', imagePosition: 'right' }, settings: {} },
                { id: crypto.randomUUID(), type: 'page_break', content: null, settings: {} },
                { id: crypto.randomUUID(), type: 'header_row', content: { showLogo: true }, settings: { logoPosition: 'left' } },
                { id: crypto.randomUUID(), type: 'customer_info', content: { label: 'Till' }, settings: { showBorder: false } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 20 } },
                { id: crypto.randomUUID(), type: 'header', content: 'Offertspecifikation', settings: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
                { id: crypto.randomUUID(), type: 'text_block', content: 'Nedan presenterar vi vår detaljerade offert baserad på era önskemål och vår besiktning.', settings: { fontSize: 'base', textAlign: 'left' } },
                { id: crypto.randomUUID(), type: 'line_items_table', content: [], settings: { table_header: 'Specifikation' } },
                { id: crypto.randomUUID(), type: 'totals', content: { showSubtotal: true, showVat: true, showTotal: true, showRot: true }, settings: { textAlign: 'right' } },
                { id: crypto.randomUUID(), type: 'divider', content: null, settings: { marginTop: 16, marginBottom: 16 } },
                { id: crypto.randomUUID(), type: 'quote_validity', content: { days: 30 }, settings: { fontSize: 'sm' } },
                { id: crypto.randomUUID(), type: 'page_break', content: null, settings: {} },
                { id: crypto.randomUUID(), type: 'header', content: 'Garantier & Villkor', settings: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
                { id: crypto.randomUUID(), type: 'terms', content: 'Betalningsvillkor: 30 dagar netto.\n\nGaranti: Vi lämnar 5 års garanti på allt utfört arbete.\n\nFörsäkring: Vi är fullt försäkrade för alla typer av skador som kan uppstå.', settings: { fontSize: 'sm' } },
                { id: crypto.randomUUID(), type: 'acceptance_section', content: { headerText: 'Acceptera offert', showDigitalSignature: true }, settings: { fontSize: 'base' } },
                { id: crypto.randomUUID(), type: 'page_break', content: null, settings: {} },
                { id: crypto.randomUUID(), type: 'header', content: 'Vad Våra Kunder Säger', settings: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
                { id: crypto.randomUUID(), type: 'spacer', content: null, settings: { spacerHeight: 16 } },
                {
                    id: crypto.randomUUID(), type: 'testimonials', content: [
                        { name: 'Anna Svensson', rating: 5, quote: 'Fantastiskt arbete! Resultatet överträffade alla våra förväntningar.' },
                        { name: 'Erik Johansson', rating: 5, quote: 'Professionella från start till slut. Punktliga och noggranna.' },
                        { name: 'Maria Lindberg', rating: 4, quote: 'Mycket nöjd med kvaliteten. Bra kommunikation genom hela projektet.' }
                    ], settings: {}
                },
                { id: crypto.randomUUID(), type: 'page_footer', content: { showCompanyInfo: true }, settings: { fontSize: 'xs', textAlign: 'center' } }
            ],
            settings: {
                template_type: 'quote',
                default_vat_rate: 25,
                default_payment_terms: 30
            },
            design_options: { ...defaultDesignOptions }
        };
        setSelectedTemplate(newTemplate);
        setPreviewMode(false);
        setSelectedBlockId(null);
    };

    const handleBlockMove = (dragIndex: number, hoverIndex: number) => {
        if (!selectedTemplate) return;
        const newBlocks = [...selectedTemplate.content_structure];
        const dragBlock = newBlocks[dragIndex];
        newBlocks.splice(dragIndex, 1);
        newBlocks.splice(hoverIndex, 0, dragBlock);

        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: newBlocks
        });
    };

    // Handler for granular style changes from StyleEditor
    const handleBlockStyleChange = (blockId: string, styleKey: string, value: any) => {
        if (!selectedTemplate) return;
        const updatedStructure = selectedTemplate.content_structure.map(b =>
            b.id === blockId
                ? { ...b, settings: { ...b.settings, [styleKey]: value } }
                : b
        );
        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: updatedStructure
        });
    };

    // Move block up in the list
    const handleMoveBlockUp = (index: number) => {
        if (index === 0 || !selectedTemplate) return;
        handleBlockMove(index, index - 1);
    };

    // Move block down in the list
    const handleMoveBlockDown = (index: number) => {
        if (!selectedTemplate || index === selectedTemplate.content_structure.length - 1) return;
        handleBlockMove(index, index + 1);
    };

    const handleUpdateBlockContent = (blockId: string, content: any, settings?: any) => {
        if (!selectedTemplate) return;
        setSelectedTemplate({
            ...selectedTemplate,
            content_structure: selectedTemplate.content_structure.map(b =>
                b.id === blockId ? { ...b, content, settings: { ...b.settings, ...settings } } : b
            )
        });
    };

    if (loading) return <div>Laddar mallar...</div>;

    // All available block types organized by category
    // docType: 'both' = available in all templates, 'quote' = quote only, 'invoice' = invoice only
    const blockTypes = [
        // Content blocks (available in both)
        { type: 'header', label: 'Rubrik', icon: Type, category: 'content', docType: 'both' },
        { type: 'text_block', label: 'Text', icon: MessageSquare, category: 'content', docType: 'both' },
        { type: 'line_items_table', label: 'Artiklar', icon: Package, category: 'content', docType: 'both' },
        { type: 'image', label: 'Bild', icon: ImageIcon, category: 'content', docType: 'both' },
        { type: 'logo', label: 'Logotyp', icon: ImageIcon, category: 'content', docType: 'both' },
        // Template sections (available in both)
        { type: 'company_info', label: 'Företagsinfo', icon: Building, category: 'section', docType: 'both' },
        { type: 'document_header', label: 'Dokumentrubrik', icon: Receipt, category: 'section', docType: 'both' },
        { type: 'customer_info', label: 'Kundinfo', icon: User, category: 'section', docType: 'both' },
        { type: 'totals', label: 'Summering', icon: Calculator, category: 'section', docType: 'both' },
        { type: 'terms', label: 'Villkor', icon: FileText, category: 'section', docType: 'both' },
        { type: 'page_footer', label: 'Sidfot', icon: FileText, category: 'section', docType: 'both' },
        // Quote-specific blocks
        { type: 'quote_metadata', label: 'Offertinfo', icon: Info, category: 'section', docType: 'quote' },
        { type: 'quote_validity', label: 'Giltighetstid', icon: Info, category: 'section', docType: 'quote' },
        { type: 'signature_area', label: 'Signatur', icon: FileSignature, category: 'section', docType: 'quote' },
        { type: 'acceptance_section', label: 'Acceptera offert', icon: FileSignature, category: 'section', docType: 'quote' },
        // Invoice-specific blocks
        { type: 'invoice_header', label: 'Fakturahuvud', icon: Receipt, category: 'section', docType: 'invoice' },
        { type: 'payment_info', label: 'Betalningsinfo', icon: Calculator, category: 'section', docType: 'invoice' },
        { type: 'f_skatt_text', label: 'F-skatt text', icon: FileText, category: 'section', docType: 'invoice' },
        // Layout elements (available in both)
        { type: 'header_row', label: 'Sidhuvud (2-kolumn)', icon: Columns, category: 'layout', docType: 'both' },
        { type: 'divider', label: 'Avdelare', icon: Minus, category: 'layout', docType: 'both' },
        { type: 'spacer', label: 'Mellanrum', icon: LayoutGrid, category: 'layout', docType: 'both' },
        // Premium / Multi-page blocks (quote only)
        { type: 'page_break', label: 'Ny Sida', icon: FileMinus, category: 'premium', docType: 'quote' },
        { type: 'cover_page', label: 'Framsida', icon: LayoutTemplate, category: 'premium', docType: 'quote' },
        { type: 'split_content', label: 'Delat Innehåll', icon: Columns, category: 'premium', docType: 'both' },
        { type: 'testimonials', label: 'Omdömen', icon: Star, category: 'premium', docType: 'quote' }
    ];

    // Filter blocks based on current template type
    const templateType = selectedTemplate?.settings?.template_type || 'quote';
    const filteredBlockTypes = blockTypes.filter(block =>
        block.docType === 'both' || block.docType === templateType
    );

    // Get the currently selected block object
    const selectedBlock = selectedTemplate?.content_structure.find(b => b.id === selectedBlockId);

    return (
        <div className="h-[calc(100vh-200px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Mallbyggare</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        disabled={!selectedTemplate}
                        className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${previewMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        {previewMode ? 'Gå till redigeringsläge' : 'Förhandsgranska'}
                    </button>

                    <div className="relative inline-block text-left">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="inline-flex items-center px-3 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Ny / Kopiera
                        </button>
                        {dropdownOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Från fördefinierad</div>
                                    <button
                                        onClick={() => { handleCreateQuoteStarter(); setDropdownOpen(false); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        📄 Offertmall (Standard)
                                    </button>
                                    <button
                                        onClick={() => { handleCreatePremiumStarter(); setDropdownOpen(false); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        ⭐ Premium Offert (Flersidig)
                                    </button>
                                    <button
                                        onClick={() => { handleCreateInvoiceStarter(); setDropdownOpen(false); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        📋 Fakturamall (Standard)
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Annat</div>
                                    <button
                                        onClick={() => { handleCreateEmptyTemplate(); setDropdownOpen(false); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Ny tom mall
                                    </button>
                                    <button
                                        onClick={() => { handleDuplicateTemplate(); setDropdownOpen(false); }}
                                        disabled={!selectedTemplate || selectedTemplate.id === 'new_template'}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                                    >
                                        Kopiera vald
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Hantera</div>
                                    <button
                                        onClick={() => { handleCreateDefaults(); setDropdownOpen(false); }}
                                        disabled={creatingDefaults}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                                    >
                                        {creatingDefaults ? '⏳ Skapar...' : '📦 Skapa standardmallar'}
                                    </button>
                                    <button
                                        onClick={() => { setShowDeleteConfirm(true); setDropdownOpen(false); }}
                                        disabled={!selectedTemplate || selectedTemplate.id === 'new_template'}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:text-gray-400"
                                    >
                                        🗑️ Ta bort vald mall
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedTemplate}
                        className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Sparar...' : 'Spara'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Sidebar - Toolbox & Settings */}
                <div className="w-80 bg-white border border-gray-200 rounded-lg overflow-y-auto flex flex-col shrink-0">
                    <div className="p-4 border-b border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Välj Mall</label>
                        <select
                            value={selectedTemplate?.id || ''}
                            onChange={(e) => {
                                const t = templates.find(t => t.id === e.target.value);
                                if (t) {
                                    const templateCopy = JSON.parse(JSON.stringify(t));
                                    // Ensure all blocks have settings but keep their IDs
                                    templateCopy.content_structure = ensureBlockSettings(templateCopy.content_structure);
                                    if (!templateCopy.design_options) templateCopy.design_options = { ...defaultDesignOptions };
                                    setSelectedTemplate(templateCopy);
                                    setPreviewMode(false);
                                    setSelectedBlockId(null);
                                }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Välj en mall</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedTemplate && !previewMode && (
                        <div className="flex-1 overflow-y-auto">
                            {selectedBlockId && selectedBlock ? (
                                /* Block Inspector - Type-specific Editors */
                                <div className="p-4 bg-gray-50 h-full overflow-y-auto">
                                    <button
                                        onClick={() => setSelectedBlockId(null)}
                                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-4"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka till verktygslådan
                                    </button>

                                    {/* Block type heading */}
                                    <div className="mb-4 pb-3 border-b border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-900">
                                            {blockTypes.find(bt => bt.type === selectedBlock.type)?.label || selectedBlock.type}
                                        </h3>
                                        <p className="text-xs text-gray-500">{selectedBlock.type}</p>
                                    </div>

                                    {/* TEXT-BASED BLOCKS: header, text_block, footer, terms */}
                                    {['header', 'text_block', 'footer', 'terms'].includes(selectedBlock.type) && (
                                        <div className="mb-4 pb-4 border-b border-gray-200">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                Textinnehåll
                                            </label>
                                            <textarea
                                                value={typeof selectedBlock.content === 'string' ? selectedBlock.content : ''}
                                                onChange={(e) => handleUpdateBlockContent(selectedBlock.id, e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                rows={4}
                                                placeholder="Skriv texten här..."
                                            />
                                        </div>
                                    )}

                                    {/* IMAGE BLOCK */}
                                    {selectedBlock.type === 'image' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bild URL</label>
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="text"
                                                        value={typeof selectedBlock.content === 'string' ? selectedBlock.content : ''}
                                                        onChange={(e) => handleUpdateBlockContent(selectedBlock.id, e.target.value)}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="https://..."
                                                    />
                                                    <button
                                                        onClick={() => triggerFileUpload(selectedBlock.id)}
                                                        disabled={uploadingBlockId === selectedBlock.id}
                                                        className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 flex items-center shrink-0"
                                                        title="Ladda upp bild"
                                                    >
                                                        {uploadingBlockId === selectedBlock.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                        ) : (
                                                            <Upload className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Storlek</label>
                                                    <select
                                                        value={selectedBlock.settings?.imageSize || 'large'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'imageSize', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="small">Liten (25%)</option>
                                                        <option value="medium">Mellan (50%)</option>
                                                        <option value="large">Stor (75%)</option>
                                                        <option value="full">Fullbredd (100%)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Justering</label>
                                                    <select
                                                        value={selectedBlock.settings?.alignment || 'center'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'alignment', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="left">Vänster</option>
                                                        <option value="center">Centrerad</option>
                                                        <option value="right">Höger</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Utseende</label>
                                                    <select
                                                        value={selectedBlock.settings?.imageEffect || 'none'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'imageEffect', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="none">Standard</option>
                                                        <option value="fade">Tona ut nedåt</option>
                                                        <option value="rounded">Rundade hörn</option>
                                                        <option value="shadow">Skugga</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Passform</label>
                                                    <select
                                                        value={selectedBlock.settings?.objectFit || 'contain'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'objectFit', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="contain">Innanför (Contain)</option>
                                                        <option value="cover">Täckande (Cover)</option>
                                                        <option value="fill">Fyll hela (Fill)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1 text-center">
                                                    Opacitet: {selectedBlock.settings?.imageOpacity ?? 100}%
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={selectedBlock.settings?.imageOpacity ?? 100}
                                                    onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'imageOpacity', parseInt(e.target.value))}
                                                    className="w-full accent-blue-600"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* HEADER_ROW: Two-column header settings */}
                                    {selectedBlock.type === 'header_row' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sidhuvudinställningar</label>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">Visa logotyp</span>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBlock.content?.showLogo !== false}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, showLogo: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Logotypens position</label>
                                                <select
                                                    value={selectedBlock.settings?.logoPosition || 'left'}
                                                    onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'logoPosition', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                >
                                                    <option value="left">Vänster</option>
                                                    <option value="center">Centrerad</option>
                                                    <option value="right">Höger</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* COMPANY_INFO BLOCK */}
                                    {selectedBlock.type === 'company_info' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Företagsinfo</label>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">Visa logotyp</span>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBlock.content?.showLogo !== false}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, showLogo: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400">Företagsinformation hämtas automatiskt från ditt konto.</p>
                                        </div>
                                    )}

                                    {/* DOCUMENT_HEADER BLOCK */}
                                    {selectedBlock.type === 'document_header' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Dokumentrubrik</label>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Titel</label>
                                                <input
                                                    type="text"
                                                    value={selectedBlock.content?.title || 'OFFERT'}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, title: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    placeholder="OFFERT"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* CUSTOMER_INFO BLOCK */}
                                    {selectedBlock.type === 'customer_info' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Kundinformation</label>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Etikett</label>
                                                <input
                                                    type="text"
                                                    value={selectedBlock.content?.label || 'Till'}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, label: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    placeholder="Till"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400">Kundinformation fylls i automatiskt från offerten.</p>
                                        </div>
                                    )}

                                    {/* SIGNATURE_AREA BLOCK */}
                                    {selectedBlock.type === 'signature_area' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Signaturyta</label>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Vänster etikett</label>
                                                <input
                                                    type="text"
                                                    value={selectedBlock.content?.leftLabel || 'Leverantör'}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, leftLabel: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Höger etikett</label>
                                                <input
                                                    type="text"
                                                    value={selectedBlock.content?.rightLabel || 'Kund'}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, rightLabel: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* PAGE_FOOTER BLOCK */}
                                    {selectedBlock.type === 'page_footer' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sidfotinställningar</label>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">Visa företagsinfo</span>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBlock.content?.showCompanyInfo !== false}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, showCompanyInfo: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* TOTALS BLOCK */}
                                    {selectedBlock.type === 'totals' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Summeringsinställningar</label>
                                            <div className="space-y-2">
                                                {[
                                                    { key: 'showSubtotal', label: 'Visa delsumma' },
                                                    { key: 'showVat', label: 'Visa moms' },
                                                    { key: 'showTotal', label: 'Visa totalsumma' },
                                                    { key: 'showRot', label: 'Visa ROT/RUT' }
                                                ].map(item => (
                                                    <div key={item.key} className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-700">{item.label}</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBlock.content?.[item.key] !== false}
                                                            onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, [item.key]: e.target.checked })}
                                                            className="w-4 h-4 text-blue-600 rounded"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* QUOTE_METADATA BLOCK */}
                                    {selectedBlock.type === 'quote_metadata' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Offertinformation</label>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-700">Visa betalningsvillkor</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedBlock.content?.showPaymentTerms !== false}
                                                        onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, showPaymentTerms: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-700">Visa momsinformation</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedBlock.content?.showVat !== false}
                                                        onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, showVat: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* DIVIDER BLOCK */}
                                    {selectedBlock.type === 'divider' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200">
                                            <p className="text-xs text-gray-500">Avdelare mellan sektioner. Ändra marginaler nedan.</p>
                                        </div>
                                    )}

                                    {/* SPACER BLOCK */}
                                    {selectedBlock.type === 'spacer' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Höjd (px)</label>
                                            <input
                                                type="number"
                                                min="8"
                                                max="200"
                                                value={selectedBlock.settings?.spacerHeight || 32}
                                                onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'spacerHeight', parseInt(e.target.value) || 32)}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                            />
                                        </div>
                                    )}

                                    {/* COVER_PAGE BLOCK */}
                                    {selectedBlock.type === 'cover_page' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Framsida</label>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Bakgrundsbild URL</label>
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="text"
                                                        value={selectedBlock.content?.backgroundImage || ''}
                                                        onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, backgroundImage: e.target.value })}
                                                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                        placeholder="https://images.unsplash.com/..."
                                                    />
                                                    <button
                                                        onClick={() => triggerFileUpload(selectedBlock.id, 'backgroundImage')}
                                                        disabled={uploadingBlockId === selectedBlock.id}
                                                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center shrink-0"
                                                        title="Ladda upp bild"
                                                    >
                                                        {uploadingBlockId === selectedBlock.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                        ) : (
                                                            <Upload className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-4">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Bildstorlek</label>
                                                    <select
                                                        value={selectedBlock.settings?.imageSize || 'full'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'imageSize', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="small">Liten (25%)</option>
                                                        <option value="medium">Mellan (50%)</option>
                                                        <option value="large">Stor (75%)</option>
                                                        <option value="full">Fullbredd (100%)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Passform</label>
                                                    <select
                                                        value={selectedBlock.settings?.objectFit || 'cover'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'objectFit', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="contain">Innanför (Contain)</option>
                                                        <option value="cover">Täckande (Cover)</option>
                                                        <option value="fill">Fyll hela (Fill)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Justering</label>
                                                    <select
                                                        value={selectedBlock.settings?.alignment || 'center'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'alignment', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="left">Vänster</option>
                                                        <option value="center">Centrerad</option>
                                                        <option value="right">Höger</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Utseende</label>
                                                    <select
                                                        value={selectedBlock.settings?.imageEffect || 'none'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'imageEffect', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="none">Standard</option>
                                                        <option value="fade">Tona ut nedåt</option>
                                                        <option value="rounded">Rundade hörn</option>
                                                        <option value="shadow">Skugga</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1 text-center">
                                                        Bildopacitet: {selectedBlock.settings?.imageOpacity ?? 100}%
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={selectedBlock.settings?.imageOpacity ?? 100}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'imageOpacity', parseInt(e.target.value))}
                                                        className="w-full accent-blue-600"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1 text-center">
                                                        Mörktoning: {selectedBlock.settings?.overlayOpacity ?? 55}%
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={selectedBlock.settings?.overlayOpacity ?? 55}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'overlayOpacity', parseInt(e.target.value))}
                                                        className="w-full accent-blue-600"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 mt-2">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Bildposition (för Täckande)</label>
                                                    <select
                                                        value={selectedBlock.settings?.backgroundPosition || 'center'}
                                                        onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'backgroundPosition', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="top">Överkant</option>
                                                        <option value="center">Centrerad</option>
                                                        <option value="bottom">Nederkant</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Titel</label>
                                                <input
                                                    type="text"
                                                    value={selectedBlock.content?.title || ''}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, title: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    placeholder="Offertens titel"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Undertitel</label>
                                                <input
                                                    type="text"
                                                    value={selectedBlock.content?.subtitle || ''}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, subtitle: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    placeholder="Kort beskrivning"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">Visa logotyp</span>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBlock.content?.showLogo !== false}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, showLogo: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* SPLIT_CONTENT BLOCK */}
                                    {selectedBlock.type === 'split_content' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Delat Innehåll</label>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Bild-URL</label>
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="text"
                                                        value={selectedBlock.content?.imageUrl || ''}
                                                        onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, imageUrl: e.target.value })}
                                                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                        placeholder="https://..."
                                                    />
                                                    <button
                                                        onClick={() => triggerFileUpload(selectedBlock.id, 'imageUrl')}
                                                        disabled={uploadingBlockId === selectedBlock.id}
                                                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center shrink-0"
                                                        title="Ladda upp bild"
                                                    >
                                                        {uploadingBlockId === selectedBlock.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                        ) : (
                                                            <Upload className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Rubrik</label>
                                                <input
                                                    type="text"
                                                    value={selectedBlock.content?.headline || ''}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, headline: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    placeholder="Rubrik"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Brödtext</label>
                                                <textarea
                                                    value={selectedBlock.content?.paragraph || ''}
                                                    onChange={(e) => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, paragraph: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    rows={4}
                                                    placeholder="Beskrivning..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Bildposition</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, imagePosition: 'left' })}
                                                        className={`flex-1 px-3 py-1.5 text-xs rounded border ${selectedBlock.content?.imagePosition !== 'right' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        ◀ Vänster
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateBlockContent(selectedBlock.id, { ...selectedBlock.content, imagePosition: 'right' })}
                                                        className={`flex-1 px-3 py-1.5 text-xs rounded border ${selectedBlock.content?.imagePosition === 'right' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        Höger ▶
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TESTIMONIALS BLOCK */}
                                    {selectedBlock.type === 'testimonials' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Omdömen</label>
                                            {(Array.isArray(selectedBlock.content) ? selectedBlock.content : []).map((review: any, idx: number) => (
                                                <div key={idx} className="border border-gray-200 rounded-lg p-2 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={review.name || ''}
                                                        onChange={(e) => {
                                                            const updated = [...(selectedBlock.content || [])];
                                                            updated[idx] = { ...updated[idx], name: e.target.value };
                                                            handleUpdateBlockContent(selectedBlock.id, updated);
                                                        }}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                        placeholder="Kundens namn"
                                                    />
                                                    <select
                                                        value={review.rating || 5}
                                                        onChange={(e) => {
                                                            const updated = [...(selectedBlock.content || [])];
                                                            updated[idx] = { ...updated[idx], rating: parseInt(e.target.value) };
                                                            handleUpdateBlockContent(selectedBlock.id, updated);
                                                        }}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                    >
                                                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{'★'.repeat(v)}{'☆'.repeat(5 - v)}</option>)}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={review.quote || ''}
                                                        onChange={(e) => {
                                                            const updated = [...(selectedBlock.content || [])];
                                                            updated[idx] = { ...updated[idx], quote: e.target.value };
                                                            handleUpdateBlockContent(selectedBlock.id, updated);
                                                        }}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                        placeholder="Kundens omdöme..."
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const updated = (selectedBlock.content || []).filter((_: any, i: number) => i !== idx);
                                                            handleUpdateBlockContent(selectedBlock.id, updated);
                                                        }}
                                                        className="text-xs text-red-500 hover:text-red-700"
                                                    >
                                                        Ta bort
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const current = Array.isArray(selectedBlock.content) ? selectedBlock.content : [];
                                                    handleUpdateBlockContent(selectedBlock.id, [...current, { name: '', rating: 5, quote: '' }]);
                                                }}
                                                className="w-full px-3 py-1.5 text-xs border border-dashed border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                                            >
                                                + Lägg till omdöme
                                            </button>
                                        </div>
                                    )}

                                    {/* PAGE_BREAK BLOCK */}
                                    {selectedBlock.type === 'page_break' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200">
                                            <p className="text-xs text-gray-500">Tvingar en ny sida vid utskrift/PDF. Inga inställningar behövs.</p>
                                        </div>
                                    )}

                                    {/* LINE_ITEMS_TABLE BLOCK */}
                                    {selectedBlock.type === 'line_items_table' && (
                                        <div className="mb-4 pb-4 border-b border-gray-200">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tabellrubrik</label>
                                            <input
                                                type="text"
                                                value={selectedBlock.settings?.table_header || 'Specifikation'}
                                                onChange={(e) => handleBlockStyleChange(selectedBlock.id, 'table_header', e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                placeholder="t.ex. Specifikation"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Produkter/tjänster fylls i automatiskt från offerten.</p>
                                        </div>
                                    )}

                                    {/* StyleEditor for visual styling */}
                                    <StyleEditor
                                        blockType={selectedBlock.type}
                                        blockLabel={blockTypes.find(bt => bt.type === selectedBlock.type)?.label || selectedBlock.type}
                                        settings={selectedBlock.settings || {}}
                                        onStyleChange={(key, value) => handleBlockStyleChange(selectedBlock.id, key, value)}
                                        onMoveUp={() => {
                                            const idx = selectedTemplate.content_structure.findIndex(b => b.id === selectedBlockId);
                                            handleMoveBlockUp(idx);
                                        }}
                                        onMoveDown={() => {
                                            const idx = selectedTemplate.content_structure.findIndex(b => b.id === selectedBlockId);
                                            handleMoveBlockDown(idx);
                                        }}
                                        onDelete={() => handleRemoveBlock(selectedBlockId)}
                                        canMoveUp={selectedTemplate.content_structure.findIndex(b => b.id === selectedBlockId) > 0}
                                        canMoveDown={selectedTemplate.content_structure.findIndex(b => b.id === selectedBlockId) < selectedTemplate.content_structure.length - 1}
                                    />
                                </div>
                            ) : (
                                /* Default Sidebar Content */
                                <div className="p-4 space-y-4 overflow-y-auto">
                                    {/* Template Type Selector */}
                                    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg border border-gray-200">
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Dokumenttyp
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    if (!selectedTemplate) return;
                                                    setSelectedTemplate({
                                                        ...selectedTemplate,
                                                        settings: { ...selectedTemplate.settings, template_type: 'quote' }
                                                    });
                                                }}
                                                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${templateType === 'quote'
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
                                                    }`}
                                            >
                                                📄 Offert
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!selectedTemplate) return;
                                                    setSelectedTemplate({
                                                        ...selectedTemplate,
                                                        settings: { ...selectedTemplate.settings, template_type: 'invoice' }
                                                    });
                                                }}
                                                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${templateType === 'invoice'
                                                    ? 'bg-green-600 text-white shadow-md'
                                                    : 'bg-white text-gray-600 hover:bg-green-50 border border-gray-200'
                                                    }`}
                                            >
                                                💰 Faktura
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-2">
                                            {templateType === 'invoice'
                                                ? 'Visar faktura-specifika block (OCR, bank, F-skatt)'
                                                : 'Visar offert-specifika block (giltighetstid, signatur)'
                                            }
                                        </p>
                                    </div>

                                    {/* Content Blocks */}
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Innehåll
                                        </h3>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {filteredBlockTypes.filter(b => b.category === 'content').map((block) => (
                                                <button
                                                    key={block.type}
                                                    onClick={() => handleAddBlock(block.type as any)}
                                                    className="flex flex-col items-center justify-center p-2.5 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-700 hover:text-blue-600"
                                                >
                                                    <block.icon className="w-4 h-4 mb-0.5" />
                                                    <span className="text-[10px] font-medium">{block.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Template Sections */}
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Sektioner
                                        </h3>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {filteredBlockTypes.filter(b => b.category === 'section').map((block) => (
                                                <button
                                                    key={block.type}
                                                    onClick={() => handleAddBlock(block.type as any)}
                                                    className="flex flex-col items-center justify-center p-2.5 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-gray-700 hover:text-green-600"
                                                >
                                                    <block.icon className="w-4 h-4 mb-0.5" />
                                                    <span className="text-[10px] font-medium">{block.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Layout Elements */}
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Layout
                                        </h3>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {filteredBlockTypes.filter(b => b.category === 'layout').map((block) => (
                                                <button
                                                    key={block.type}
                                                    onClick={() => handleAddBlock(block.type as any)}
                                                    className="flex flex-col items-center justify-center p-2.5 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-gray-700 hover:text-purple-600"
                                                >
                                                    <block.icon className="w-4 h-4 mb-0.5" />
                                                    <span className="text-[10px] font-medium">{block.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Premium / Multi-page Elements */}
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Premium / Flersidig
                                        </h3>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {filteredBlockTypes.filter(b => b.category === 'premium').map((block) => (
                                                <button
                                                    key={block.type}
                                                    onClick={() => handleAddBlock(block.type as any)}
                                                    className="flex flex-col items-center justify-center p-2.5 border border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-gray-700 hover:text-amber-600"
                                                >
                                                    <block.icon className="w-4 h-4 mb-0.5" />
                                                    <span className="text-[10px] font-medium">{block.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Global Settings */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                            Inställningar
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Mallnamn</label>
                                                <input
                                                    type="text"
                                                    value={selectedTemplate.name}
                                                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Moms (%)</label>
                                                    <input
                                                        type="number"
                                                        value={selectedTemplate.settings?.default_vat_rate ?? 25}
                                                        onChange={(e) => setSelectedTemplate({
                                                            ...selectedTemplate,
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
                                                        onChange={(e) => setSelectedTemplate({
                                                            ...selectedTemplate,
                                                            settings: { ...selectedTemplate.settings, default_payment_terms: parseInt(e.target.value) }
                                                        })}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Design */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                            Design & Text
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Typsnitt</label>
                                                <select
                                                    value={selectedTemplate.design_options?.font_family || 'Inter'}
                                                    onChange={(e) => updateDesignOption('font_family', e.target.value)}
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
                                                    onChange={(e) => updateDesignOption('primary_color', e.target.value)}
                                                    className="h-6 w-8 border border-gray-300 rounded cursor-pointer"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Logotyp</label>
                                                <div className="flex bg-gray-100 rounded p-1">
                                                    {['left', 'center', 'right'].map((pos) => (
                                                        <button
                                                            key={pos}
                                                            onClick={() => updateDesignOption('logo_position', pos)}
                                                            className={`flex-1 py-1 text-xs rounded capitalize ${selectedTemplate.design_options?.logo_position === pos ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                                        >
                                                            {pos === 'left' ? 'Vänster' : pos === 'center' ? 'Mitt' : 'Höger'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Text Overrides Section */}
                                            <div className="pt-2">
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Standardtexter</label>
                                                <div className="space-y-2">
                                                    <input
                                                        placeholder="Rubrik (t.ex OFFERT)"
                                                        value={selectedTemplate.design_options?.text_overrides?.title || ''}
                                                        onChange={(e) => updateTextOverride('title', e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Main Area - Preview / Canvas */}
                <div className="flex-1 bg-gray-100 border border-gray-200 rounded-lg overflow-y-auto p-8 flex justify-center relative">
                    {selectedTemplate ? (
                        <div className="w-full max-w-4xl">
                            {/* Scale wrapper if needed, but better to just use scroll */}
                            <QuotePreview
                                quote={{
                                    quote_number: selectedTemplate.settings?.template_type === 'invoice' ? 'FAKTURA-PREVIEW' : 'OFFERT-PREVIEW',
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
                                        city: 'Stockholm'
                                    },
                                    line_items: [
                                        {
                                            name: 'Konsulttjänst',
                                            description: 'Utveckling av webbplats',
                                            quantity: 10,
                                            unit: 'tim',
                                            unit_price: 1000,
                                            total: 10000
                                        },
                                        {
                                            name: 'Material',
                                            description: 'Licenser och programvara',
                                            quantity: 1,
                                            unit: 'st',
                                            unit_price: 2500,
                                            total: 2500
                                        }
                                    ]
                                }}
                                template={selectedTemplate}
                                logoUrl={logoUrl}
                                isEditable={!previewMode}
                                onBlockUpdate={handleUpdateBlockContent}
                                onBlockMove={handleBlockMove}
                                onBlockDelete={handleRemoveBlock}
                                onBlockSelect={(id) => setSelectedBlockId(id)}
                                onTextOverrideUpdate={updateTextOverride}
                                onAddBlock={handleAddBlock}
                            />
                        </div>
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center justify-center h-full">
                            <Layout className="w-12 h-12 mb-4 text-gray-300" />
                            <p>Välj en mall i sidopanelen för att börja redigera</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden File Input for Image Uploads */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileSelected}
                className="hidden"
                accept="image/*"
            />

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


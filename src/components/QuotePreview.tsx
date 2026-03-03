import React, { useState, useRef, useEffect } from 'react';
import { Building, Mail, Phone, MapPin, Trash2, GripVertical, Settings, Star, FileMinus, Plus } from 'lucide-react';
import type { QuoteTemplate, ContentBlock, BlockStyleSettings } from '../lib/quoteTemplates';
import { formatCurrency, formatDate } from '../lib/database';
import { UNIT_LABELS } from '../lib/quoteTemplates';

// Helper function to convert BlockStyleSettings to CSS properties
const getBlockStyles = (settings?: BlockStyleSettings, fontFamily?: string): React.CSSProperties => {
  if (!settings) return { fontFamily };

  const fontSizeMap: Record<string, string> = {
    'xs': '0.75rem',
    'sm': '0.875rem',
    'base': '1rem',
    'lg': '1.125rem',
    'xl': '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem'
  };

  const fontWeightMap: Record<string, number> = {
    'normal': 400,
    'medium': 500,
    'semibold': 600,
    'bold': 700
  };

  return {
    fontFamily: fontFamily,
    fontSize: settings.fontSize ? fontSizeMap[settings.fontSize] : undefined,
    fontWeight: settings.fontWeight ? fontWeightMap[settings.fontWeight] : undefined,
    color: settings.fontColor,
    textAlign: settings.textAlign,
    paddingTop: settings.paddingTop ? `${settings.paddingTop}px` : undefined,
    paddingBottom: settings.paddingBottom ? `${settings.paddingBottom}px` : undefined,
    paddingLeft: settings.paddingLeft ? `${settings.paddingLeft}px` : undefined,
    paddingRight: settings.paddingRight ? `${settings.paddingRight}px` : undefined,
    marginTop: settings.marginTop ? `${settings.marginTop}px` : undefined,
    marginBottom: settings.marginBottom ? `${settings.marginBottom}px` : undefined,
    backgroundColor: settings.backgroundColor,
    borderWidth: settings.borderWidth ? `${settings.borderWidth}px` : undefined,
    borderColor: settings.borderColor,
    borderRadius: settings.borderRadius ? `${settings.borderRadius}px` : undefined,
    borderStyle: settings.borderWidth ? 'solid' : undefined,
    // Add custom properties used for image and cover_page blocks
    imageSize: settings.imageSize,
    alignment: (settings as any).alignment,
    imageEffect: settings.imageEffect,
    imageOpacity: settings.imageOpacity,
    objectFit: settings.objectFit,
    backgroundPosition: settings.backgroundPosition,
    overlayOpacity: settings.overlayOpacity,
  } as any; // Cast as any since we're returning custom non-CSS properties
};

// --- Interfaces ---

interface QuotePreviewProps {
  template?: QuoteTemplate;
  quote: any;
  logoUrl?: string | null;
  companyInfo?: any;
  customerInfo?: any;
  quoteNumber?: string;
  validUntil?: string;
  isEditable?: boolean;
  onBlockUpdate?: (blockId: string, content: any, settings?: any) => void;
  onBlockMove?: (dragIndex: number, hoverIndex: number) => void;
  onBlockDelete?: (blockId: string) => void;
  onBlockSelect?: (blockId: string) => void;
  onTextOverrideUpdate?: (key: string, value: string) => void;
  onAddBlock?: (type: ContentBlock['type']) => void;
}

interface EditableElementProps {
  initialContent: string;
  onSave: (content: string) => void;
  className?: string;
  style?: React.CSSProperties;
  tagName?: 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'div';
  isEditable?: boolean;
  placeholder?: string;
}

// --- Helper Components ---


const EditableElement = ({
  initialContent,
  onSave,
  className = '',
  style = {},
  tagName: Tag = 'p',
  isEditable = false,
  placeholder = 'Klicka för att redigera...'
}: EditableElementProps) => {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  if (!isEditable) {
    return <Tag className={className} style={style}>{content}</Tag>;
  }

  return (
    <Tag
      className={`${className} hover:bg-indigo-50 hover:outline-dashed hover:outline-1 hover:outline-indigo-300 rounded px-1 -mx-1 transition-colors cursor-text focus:bg-white focus:outline-indigo-500 focus:ring-2 focus:ring-indigo-200`}
      style={{ ...style, minHeight: '1.5em' }}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const newContent = e.currentTarget.textContent || '';
        if (newContent !== initialContent) {
          onSave(newContent);
        }
      }}
      dangerouslySetInnerHTML={{ __html: content || `<span class="text-gray-400 opacity-50">${placeholder}</span>` }}
    />
  );
};

const DraggableBlockWrapper = ({
  children,
  index,
  //   id, // Unused
  moveBlock,
  isEditable,
  onDelete,
  onSettings
}: {
  children: React.ReactNode;
  index: number;
  id: string; // Keep in type def
  moveBlock?: (dragIndex: number, hoverIndex: number) => void;
  isEditable?: boolean;
  onDelete?: () => void;
  onSettings?: () => void;
}) => {
  if (!isEditable) return <>{children}</>;

  const ref = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    // Add ghost class/styling if needed
    if (ref.current) ref.current.style.opacity = '0.4';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (ref.current) ref.current.style.opacity = '1';
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const hoverIndex = index;

    if (dragIndex === hoverIndex) return;
    if (moveBlock) moveBlock(dragIndex, hoverIndex);
  };

  const handleDragEnd = () => {
    if (ref.current) ref.current.style.opacity = '1';
  };

  return (
    <div
      ref={ref}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className="relative mb-4 rounded-lg border-2 border-dashed border-transparent hover:border-indigo-300 bg-white transition-all"
    >
      {/* Toolbar - always visible at top right inside the block */}
      <div className="absolute -top-3 right-2 flex items-center gap-1 bg-white shadow-sm border border-gray-200 rounded-md px-1 py-0.5 z-20">
        <div className="p-1 text-gray-400 cursor-move hover:text-indigo-600" title="Dra för att flytta">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        {onSettings && (
          <button
            onClick={(e) => { e.stopPropagation(); onSettings(); }}
            className="p-1 text-gray-400 hover:text-indigo-600"
            title="Inställningar"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Ta bort"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="pt-4">
        {children}
      </div>
    </div>
  );
};

// --- Main Component ---

function QuotePreview({
  template,
  logoUrl,
  companyInfo,
  customerInfo,
  quoteNumber = 'O2024-001',
  validUntil,
  quote,
  isEditable = false,
  onBlockUpdate,
  onBlockMove,
  onBlockDelete,
  onBlockSelect,
  onTextOverrideUpdate,
  onAddBlock
}: QuotePreviewProps) {
  const subtotal = quote.subtotal || 0;
  const vatAmount = quote.vat_amount || 0;
  const total = quote.total_amount || 0;
  const rotAmount = quote.rot_amount || 0;
  const finalAmount = total - rotAmount;

  const defaultCompany = {
    name: 'Företagsnamn',
    org_number: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: ''
  };

  const defaultCustomer = {
    // Empty defaults for cleaner preview if data missing
    name: 'Exempel Kund AB',
    email: 'kontakt@exempel.se',
    phone: '',
    address: '',
    postal_code: '',
    city: ''
  };

  const company = companyInfo || defaultCompany;
  const customer = customerInfo || defaultCustomer;

  // Extract settings
  const paymentTerms = template?.settings?.default_payment_terms || 30;
  let vatRate = template?.settings?.default_vat_rate ?? 25;
  if (vatRate > 1) vatRate = vatRate / 100;

  const designOptions = (template?.settings?.design_options || template?.design_options || {}) as any;
  const {
    font_family = 'Inter',
    primary_color = '#4f46e5', // Indigo-600 matches theme better
    // logo_position = 'right', // Unused
    // show_signature_area = true, // Unused
    show_product_images = false,
    text_overrides = {}
  } = designOptions;

  const getLabel = (key: string, defaultText: string) => text_overrides[key] || defaultText;

  const Label = ({ id, defaultText, className = '', style = {} }: { id: string, defaultText: string, className?: string, style?: any }) => (
    <EditableElement
      initialContent={getLabel(id, defaultText)}
      onSave={(val) => onTextOverrideUpdate?.(id, val)}
      isEditable={isEditable}
      className={className}
      style={style}
      tagName="span"
    />
  );

  const templateType = template?.settings?.template_type || 'quote';

  const labels = {
    quote: {
      title: getLabel('title', 'OFFERT'),
      number: getLabel('number_label', 'Offertnr'),
      to: getLabel('to_label', 'Offert till'),
      info: getLabel('info_label', 'Offertinformation'),
      footer: getLabel('footer_text', 'Tack för förtroendet! Vi ser fram emot att arbeta med er.')
    },
    invoice: {
      title: getLabel('invoice_title', 'FAKTURA'),
      number: getLabel('invoice_number_label', 'Fakturanr'),
      to: getLabel('invoice_to_label', 'Faktura till'),
      info: getLabel('invoice_info_label', 'Fakturainformation'),
      footer: getLabel('invoice_footer_text', 'Tack för din betalning!')
    }
  };

  // const currentLabels = labels[templateType] || labels.quote;

  const interpolateVariables = (text: string) => {
    if (!text) return '';
    let result = text;
    // Basic interpolation - in edit mode we might want to show raw tags on focus?
    // For now, simple replacement
    result = result.replace(/{{quote\.number}}/g, quoteNumber || '');
    result = result.replace(/{{quote\.title}}/g, quote.title || '');
    result = result.replace(/{{quote\.date}}/g, formatDate(quote.created_at || new Date().toISOString()));
    result = result.replace(/{{customer\.name}}/g, customer.name || '');
    result = result.replace(/{{company\.name}}/g, company.name || '');
    return result;
  };

  const renderContentBlock = (block: ContentBlock, index: number) => {
    // Helper to get content based on mode
    const getContent = (content: any) => {
      if (typeof content !== 'string') return content;
      return isEditable ? content : interpolateVariables(content);
    };

    let innerContent;

    switch (block.type) {
      case 'header':
        const headerStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div
            className="mb-2"
            style={{
              textAlign: block.settings?.textAlign || 'center',
              backgroundColor: block.settings?.backgroundColor,
              borderWidth: block.settings?.borderWidth ? `${block.settings.borderWidth}px` : undefined,
              borderColor: block.settings?.borderColor,
              borderRadius: block.settings?.borderRadius ? `${block.settings.borderRadius}px` : undefined,
              borderStyle: block.settings?.borderWidth ? 'solid' : undefined,
              padding: `${block.settings?.paddingTop || 0}px ${block.settings?.paddingRight || 0}px ${block.settings?.paddingBottom || 0}px ${block.settings?.paddingLeft || 0}px`,
              margin: `${block.settings?.marginTop || 0}px 0 ${block.settings?.marginBottom || 0}px 0`,
            }}
          >
            <EditableElement
              tagName="h2"
              className="text-2xl font-bold text-gray-800"
              style={{
                fontFamily: font_family,
                fontSize: headerStyles.fontSize,
                fontWeight: headerStyles.fontWeight as any,
                color: headerStyles.color,
              }}
              initialContent={getContent(block.content)}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, val)}
            />
          </div>
        );
        break;

      case 'text_block':
        const textStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div
            className="mb-2"
            style={{
              textAlign: block.settings?.textAlign || 'left',
              backgroundColor: block.settings?.backgroundColor,
              borderWidth: block.settings?.borderWidth ? `${block.settings.borderWidth}px` : undefined,
              borderColor: block.settings?.borderColor,
              borderRadius: block.settings?.borderRadius ? `${block.settings.borderRadius}px` : undefined,
              borderStyle: block.settings?.borderWidth ? 'solid' : undefined,
              padding: `${block.settings?.paddingTop || 0}px ${block.settings?.paddingRight || 0}px ${block.settings?.paddingBottom || 0}px ${block.settings?.paddingLeft || 0}px`,
              margin: `${block.settings?.marginTop || 0}px 0 ${block.settings?.marginBottom || 0}px 0`,
            }}
          >
            <EditableElement
              tagName="p"
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
              style={{
                fontFamily: font_family,
                fontSize: textStyles.fontSize,
                fontWeight: textStyles.fontWeight as any,
                color: textStyles.color,
              }}
              initialContent={getContent(block.content)}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, val)}
            />
          </div>
        );
        break;

      case 'line_items_table':
        const lineItems = quote.line_items || block.content || [];
        // Table is complex update, maybe just header for now in inline?
        // Actually, user likely wants to edit column headers?
        // keeping it simple for "content" loop, but allowing header edit
        const tableHeader = block.settings?.table_header !== undefined ? block.settings.table_header : (templateType === 'invoice' ? 'Fakturaspecifikation' : 'Offertspecifikation');

        innerContent = (
          <div className="mb-6">
            {tableHeader && (
              <EditableElement
                tagName="h3"
                className="text-lg font-semibold text-gray-800 mb-4"
                style={{ color: primary_color, fontFamily: font_family }}
                initialContent={tableHeader}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, block.content, { ...block.settings, table_header: val })}
              />
            )}
            <div className="">
              <table className="min-w-full">
                <thead className="border-b-2" style={{ borderColor: primary_color }}>
                  <tr>
                    {show_product_images && (
                      <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                        <Label id="table_image" defaultText="Bild" />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      <Label id="table_desc" defaultText="Beskrivning" />
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      <Label id="table_qty" defaultText="Antal" />
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      <Label id="table_unit" defaultText="Enhet" />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      <Label id="table_price" defaultText="À-pris" />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      <Label id="table_total" defaultText="Summa" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 italic bg-gray-50">
                        Inga artiklar valda
                      </td>
                    </tr>
                  )}
                  {lineItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {show_product_images && (
                        <td className="px-4 py-4">
                          {item.image_url ? (
                            <img src={item.image_url} alt="Produkt" className="h-12 w-12 object-cover rounded border border-gray-200" />
                          ) : (
                            <div className="h-12 w-12 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                              <span className="text-xs">No img</span>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900" style={{ fontFamily: font_family }}>{item.name || 'Produkt'}</p>
                          {item.description && <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: font_family }}>{item.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-900" style={{ fontFamily: font_family }}>{item.quantity}</td>
                      <td className="px-4 py-4 text-center text-sm text-gray-900" style={{ fontFamily: font_family }}>{UNIT_LABELS[item.unit as keyof typeof UNIT_LABELS] || item.unit}</td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900" style={{ fontFamily: font_family }}>{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-gray-900" style={{ fontFamily: font_family }}>{formatCurrency(item.total || (item.quantity * item.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        break;

      case 'footer':
        innerContent = (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <EditableElement
              tagName="p"
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: font_family }}
              initialContent={block.content}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, val)}
            />
          </div>
        );
        break;

      case 'image':
        const alignment = block.settings?.alignment || 'center';
        const imgSize = block.settings?.imageSize || 'large';
        const imgOpacity = (block.settings?.imageOpacity ?? 100) / 100;
        const imgObjectFit = block.settings?.objectFit || 'contain';
        const imgEffect = block.settings?.imageEffect || 'none';

        const sizeMap: Record<string, string> = { small: '25%', medium: '50%', large: '75%', full: '100%' };
        const maxW = sizeMap[imgSize] || '75%';

        const imgStyle: React.CSSProperties = {
          maxWidth: maxW,
          width: maxW,
          height: 'auto',
          maxHeight: '500px',
          objectFit: imgObjectFit as any,
          opacity: imgOpacity,
          ...(imgEffect === 'rounded' ? { borderRadius: '12px' } : {}),
          ...(imgEffect === 'shadow' ? { boxShadow: '0 8px 30px rgba(0,0,0,0.15)' } : {}),
        };

        const fadeOverlay = imgEffect === 'fade';

        innerContent = (
          <div className={`mb-6 flex ${alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center'}`}>
            <div className="relative inline-block" style={{ maxWidth: maxW, width: maxW }}>
              <img
                src={block.content as string}
                alt="Block"
                style={imgStyle}
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
              />
              {fadeOverlay && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, transparent 60%, white 100%)',
                  }}
                />
              )}
            </div>
            {isEditable && (
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100">
                <span className="bg-white px-2 py-1 rounded text-xs shadow">Klicka för inställningar</span>
              </div>
            )}
          </div>
        );
        break;

      case 'logo':
        // Standalone company logo block
        const logoBlockStyles = getBlockStyles(block.settings, font_family);
        const logoAlignment = block.settings?.alignment || 'left';
        const logoMaxHeight = block.settings?.maxHeight || 80;
        innerContent = (
          <div
            className="py-4"
            style={{
              textAlign: logoAlignment,
              ...logoBlockStyles
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Företagslogotyp"
                style={{
                  maxHeight: `${logoMaxHeight}px`,
                  width: 'auto',
                  display: 'inline-block'
                }}
              />
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-400 inline-block"
                style={{ maxWidth: '200px' }}
              >
                <p className="text-xs">Ingen logotyp</p>
                <p className="text-xs opacity-70">Lägg till i inställningar</p>
              </div>
            )}
          </div>
        );
        break;

      case 'company_info':
        // Company information block - editable and applies block styles
        const companyStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div
            className="pb-6 border-b-2"
            style={{
              borderColor: block.settings?.borderColor || '#e5e7eb',
              ...companyStyles
            }}
          >
            {block.settings?.showLogo !== false && logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-12 w-auto mb-4" />
            )}
            <EditableElement
              tagName="h2"
              className="text-xl font-bold"
              style={{ color: companyStyles.color || primary_color, fontFamily: font_family }}
              initialContent={company.name}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, companyName: val })}
            />
            <div className="text-sm mt-2 space-y-1" style={{ color: companyStyles.color || '#4b5563' }}>
              {company.org_number && <p>Org.nr: {company.org_number}</p>}
              {company.address && <p>{company.address}, {company.postal_code} {company.city}</p>}
              {company.email && <p>{company.email}</p>}
              {company.phone && <p>{company.phone}</p>}
            </div>
          </div>
        );
        break;

      case 'document_header':
        // Document title (OFFERT/FAKTURA) and number/date
        const docStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div className="text-right mb-6" style={{ textAlign: block.settings?.textAlign || 'right' }}>
            <EditableElement
              tagName="h1"
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{
                color: primary_color,
                fontFamily: font_family,
                fontSize: docStyles.fontSize,
                fontWeight: docStyles.fontWeight as any
              }}
              initialContent={block.content?.title || (templateType === 'invoice' ? 'FAKTURA' : 'OFFERT')}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, title: val })}
            />
            <div className="text-sm space-y-1">
              <p><span className="font-semibold">Nr:</span> {quoteNumber}</p>
              <p><span className="font-semibold">Datum:</span> {formatDate(new Date().toISOString())}</p>
              {validUntil && <p><span className="font-semibold">Giltig till:</span> {formatDate(validUntil)}</p>}
            </div>
          </div>
        );
        break;

      case 'customer_info':
        // Customer/recipient information block
        const custStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div className="mb-6" style={custStyles}>
            <EditableElement
              tagName="h3"
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: custStyles.color || '#9ca3af' }}
              initialContent={block.content?.label || 'Till'}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, label: val })}
            />
            <div className="space-y-1" style={{ color: custStyles.color || '#1f2937' }}>
              <p className="font-bold text-lg">{customer.name}</p>
              {customer.address && <p>{customer.address}</p>}
              {(customer.postal_code || customer.city) && <p>{customer.postal_code} {customer.city}</p>}
              {customer.email && <p className="text-sm mt-2" style={{ opacity: 0.7 }}>{customer.email}</p>}
            </div>
          </div>
        );
        break;

      case 'quote_metadata':
        // Payment terms and VAT info
        const metaStyles = getBlockStyles(block.settings, font_family);
        const metaHeaderText = templateType === 'invoice' ? 'Fakturainformation' : (block.content?.headerText || 'Offertinformation');
        innerContent = (
          <div className="mb-6" style={metaStyles}>
            <EditableElement
              tagName="h3"
              className="font-bold uppercase tracking-widest mb-3"
              style={{
                color: metaStyles.color || '#9ca3af',
                fontSize: metaStyles.fontSize || '0.75rem'
              }}
              initialContent={metaHeaderText}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, headerText: val })}
            />
            <div className="space-y-2" style={{ color: metaStyles.color || 'inherit', fontSize: metaStyles.fontSize || '0.875rem' }}>
              {block.content?.showPaymentTerms !== false && (
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span style={{ opacity: 0.7 }}>Betalningsvillkor</span>
                  <span className="font-semibold">{paymentTerms} dagar</span>
                </div>
              )}
              {block.content?.showVat !== false && (
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span style={{ opacity: 0.7 }}>Moms</span>
                  <span className="font-semibold">{(vatRate * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>
        );
        break;

      case 'totals':
        // Financial totals section - applies block styles
        const totalsStyles = getBlockStyles(block.settings, font_family);
        const totalsAlign = block.settings?.textAlign || 'right';
        // Determine alignment classes
        const totalsAlignClass = totalsAlign === 'left' ? 'mr-auto' : totalsAlign === 'center' ? 'mx-auto' : 'ml-auto';
        innerContent = (
          <div className="py-6 border-t border-gray-200" style={totalsStyles}>
            <div className={`w-full max-w-sm ${totalsAlignClass} space-y-3`}>
              {block.content?.showSubtotal !== false && (
                <div className="flex justify-between text-sm" style={{ color: totalsStyles.color || '#4b5563' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              )}
              {block.content?.showVat !== false && (
                <div className="flex justify-between text-sm" style={{ color: totalsStyles.color || '#4b5563' }}>
                  <span>Moms ({(vatRate * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
              )}
              {block.content?.showRot !== false && rotAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>ROT-avdrag</span>
                  <span>-{formatCurrency(rotAmount)}</span>
                </div>
              )}
              {block.content?.showTotal !== false && (
                <div className="flex justify-between text-xl font-bold pt-4 border-t-2 border-gray-100" style={{ color: totalsStyles.color || '#111827' }}>
                  <span>Totalt</span>
                  <span>{formatCurrency(finalAmount)}</span>
                </div>
              )}
            </div>
          </div>
        );
        break;

      case 'terms':
        // Terms and conditions section - applies block styles
        const termsStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div className="pt-6 border-t border-gray-200" style={termsStyles}>
            <EditableElement
              tagName="h3"
              className="font-bold text-sm mb-3"
              style={{ color: termsStyles.color || primary_color }}
              initialContent="Villkor och information"
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, title: val })}
            />
            <EditableElement
              tagName="p"
              className="text-sm whitespace-pre-wrap"
              style={{ color: termsStyles.color || '#4b5563' }}
              initialContent={typeof block.content === 'string' ? block.content : `Betalning ska ske inom ${paymentTerms} dagar från fakturadatum.`}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, val)}
            />
          </div>
        );
        break;

      case 'signature_area':
        // Signature lines - applies block styles
        const sigStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div className="mt-12 pt-12 border-t border-gray-200 grid grid-cols-2 gap-16" style={sigStyles}>
            <div>
              <div className="h-12 border-b mb-2" style={{ borderColor: sigStyles.borderColor || '#d1d5db' }}></div>
              <EditableElement
                tagName="p"
                className="text-xs uppercase tracking-wide"
                style={{ color: sigStyles.color || '#6b7280' }}
                initialContent={`Datum & Underskrift ${block.content?.leftLabel || company.name}`}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, leftLabel: val })}
              />
            </div>
            <div>
              <div className="h-12 border-b mb-2" style={{ borderColor: sigStyles.borderColor || '#d1d5db' }}></div>
              <EditableElement
                tagName="p"
                className="text-xs uppercase tracking-wide"
                style={{ color: sigStyles.color || '#6b7280' }}
                initialContent={`Datum & Underskrift ${block.content?.rightLabel || customer.name}`}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, rightLabel: val })}
              />
            </div>
          </div>
        );
        break;

      case 'page_footer':
        // Page footer with company info - applies block styles
        const footerStyles = getBlockStyles(block.settings, font_family);
        const footerSegments: string[] = [];
        if (company.name) footerSegments.push(company.name);
        if (company.org_number) footerSegments.push(`Org.nr: ${company.org_number}`);
        if (company.vat_number) footerSegments.push(`Momsreg.nr: ${company.vat_number}`);
        if (company.iban) footerSegments.push(`IBAN: ${company.iban}`);
        if (company.bic) footerSegments.push(`BIC: ${company.bic}`);
        if (company.f_skatt_approved !== false) footerSegments.push('Godkänd för F-skatt');
        if (company.email) footerSegments.push(company.email);
        innerContent = (
          <div
            className="mt-12 border-t pt-6"
            style={{
              textAlign: (footerStyles.textAlign as any) || 'center',
              fontSize: footerStyles.fontSize || '0.75rem',
              color: footerStyles.color || '#9ca3af',
              backgroundColor: footerStyles.backgroundColor,
              borderColor: footerStyles.borderColor || '#f3f4f6',
              paddingTop: footerStyles.paddingTop,
              paddingBottom: footerStyles.paddingBottom,
              marginTop: footerStyles.marginTop
            }}
          >
            {block.content?.showCompanyInfo !== false && (
              <p className="mb-1">{footerSegments.join(' | ')}</p>
            )}
          </div>
        );
        break;

      // ==================== INVOICE-SPECIFIC BLOCKS ====================
      case 'payment_info':
        // Payment information block - bank account, OCR, due date
        const paymentStyles = getBlockStyles(block.settings, font_family);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + paymentTerms);
        innerContent = (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 my-6" style={paymentStyles}>
            <h3 className="font-bold text-indigo-800 mb-4 text-lg">Betalningsinformation</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {block.content?.showDueDate !== false && (
                <div>
                  <span className="text-gray-500 block">Förfallodatum</span>
                  <span className="font-semibold text-gray-800">{dueDate.toLocaleDateString('sv-SE')}</span>
                </div>
              )}
              {block.content?.showBankAccount !== false && (
                <div>
                  <span className="text-gray-500 block">Bankgiro / Kontonummer</span>
                  <span className="font-semibold text-gray-800">{company.bank_account || 'Ej angivet'}</span>
                </div>
              )}
              {company.iban && (
                <div>
                  <span className="text-gray-500 block">IBAN</span>
                  <span className="font-semibold text-gray-800 font-mono">{company.iban}</span>
                </div>
              )}
              {company.bic && (
                <div>
                  <span className="text-gray-500 block">BIC/SWIFT</span>
                  <span className="font-semibold text-gray-800 font-mono">{company.bic}</span>
                </div>
              )}
              {block.content?.showOCR !== false && (
                <div className="col-span-2 mt-2 p-3 bg-white rounded border border-blue-100">
                  <span className="text-gray-500 block text-xs uppercase tracking-wider">OCR-nummer</span>
                  <span className="font-mono font-bold text-2xl text-blue-700">
                    {block.content?.ocrNumber || '1234567890'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
        break;

      case 'invoice_header':
        // Invoice header block - similar to document_header but styled for invoices
        const invHeaderStyles = getBlockStyles(block.settings, font_family);
        const invAlign = invHeaderStyles.textAlign || 'right';
        const invAlignClass = invAlign === 'left' ? 'text-left' : invAlign === 'center' ? 'text-center' : 'text-right';
        innerContent = (
          <div className={`mb-4 ${invAlignClass}`} style={invHeaderStyles}>
            <EditableElement
              tagName="h1"
              className="font-bold tracking-tight text-green-700"
              style={{ fontSize: invHeaderStyles.fontSize || '2.25rem', fontWeight: invHeaderStyles.fontWeight || 'bold' }}
              initialContent={block.content?.title || 'FAKTURA'}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, title: val })}
            />
            <p className="text-sm text-gray-500 mt-1">
              Fakturanummer: <span className="font-mono font-semibold">{block.content?.invoiceNumber || 'FAK-2024-001'}</span>
            </p>
            <p className="text-sm text-gray-500">
              Fakturadatum: {new Date().toLocaleDateString('sv-SE')}
            </p>
          </div>
        );
        break;

      case 'f_skatt_text':
        // F-skatt text disclaimer
        const fskattStyles = getBlockStyles(block.settings, font_family);
        const fskattText = company.f_skatt_approved !== false
          ? 'Godkänd för F-skatt. Innehar F-skattsedel.'
          : '';
        innerContent = (
          <div
            className="mt-8 pt-4 border-t border-gray-200 text-center"
            style={{ ...fskattStyles, color: fskattStyles.color || '#6b7280' }}
          >
            {company.f_skatt_approved !== false ? (
              <EditableElement
                tagName="p"
                className="text-xs"
                initialContent={typeof block.content === 'string' ? block.content : fskattText}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, val)}
              />
            ) : (
              <p className="text-xs text-gray-400 italic">F-skatt ej godkänd</p>
            )}
            {company.vat_number && (
              <p className="text-xs mt-1">
                Momsnr: {company.vat_number}
              </p>
            )}
          </div>
        );
        break;

      // ==================== QUOTE-SPECIFIC BLOCKS ====================
      case 'quote_validity':
        // Quote validity period display
        const validityStyles = getBlockStyles(block.settings, font_family);
        const validDays = block.content?.days || 30;
        const validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + validDays);
        innerContent = (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4" style={validityStyles}>
            <p className="text-amber-800">
              <span className="font-medium">Offerens giltighetstid:</span>{' '}
              <span className="font-semibold">{validDays} dagar</span>
              <span className="text-amber-600 text-sm ml-2">
                (giltig t.o.m. {validUntilDate.toLocaleDateString('sv-SE')})
              </span>
            </p>
          </div>
        );
        break;

      case 'acceptance_section':
        // Digital acceptance / signature section for quotes
        const acceptStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300" style={acceptStyles}>
            <EditableElement
              tagName="h3"
              className="font-bold text-lg mb-4"
              style={{ color: acceptStyles.color || primary_color }}
              initialContent={block.content?.headerText || 'Acceptera offert'}
              isEditable={isEditable}
              onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, headerText: val })}
            />
            {block.content?.showDigitalSignature !== false && (
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-sm text-gray-600 mb-4">
                  För att acceptera offerten, vänligen bekräfta nedan eller kontakta oss direkt.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-12 border-b-2 border-gray-400 mb-1"></div>
                    <p className="text-xs text-gray-500">Kundens namnteckning</p>
                  </div>
                  <div className="w-32">
                    <div className="h-12 border-b-2 border-gray-400 mb-1"></div>
                    <p className="text-xs text-gray-500">Datum</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        break;

      case 'divider':
        // Horizontal divider line
        innerContent = (
          <hr
            className="border-gray-200"
            style={{
              marginTop: block.settings?.marginTop || 16,
              marginBottom: block.settings?.marginBottom || 16,
              borderColor: block.settings?.borderColor || '#e5e7eb'
            }}
          />
        );
        break;

      case 'spacer':
        // Vertical spacing
        innerContent = (
          <div style={{ height: block.settings?.spacerHeight || 32 }}></div>
        );
        break;

      case 'header_row':
        // Two-column header: company info left, document header right
        const logoPos = block.settings?.logoPosition || 'left';
        innerContent = (
          <div className={`flex ${logoPos === 'center' ? 'flex-col items-center text-center' : 'justify-between items-start'} pb-8 border-b-2`} style={{ borderColor: block.settings?.borderColor || '#e5e7eb' }}>

            {/* Left Column - Company Info */}
            <div className={`flex-1 ${logoPos === 'right' ? '' : 'order-1'} ${logoPos === 'center' ? 'w-full' : ''}`}>
              {/* Logo */}
              {block.content?.showLogo !== false && logoUrl && (
                <img
                  src={logoUrl}
                  alt="Företagslogo"
                  className="h-16 w-auto object-contain mb-4"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              {block.content?.showLogo !== false && !logoUrl && (
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: primary_color }}>
                  <Building className="w-8 h-8 text-white" />
                </div>
              )}

              <div className={logoPos === 'center' ? 'mb-6' : ''}>
                <EditableElement
                  tagName="h1"
                  className="text-2xl font-bold"
                  style={{ color: primary_color, fontFamily: font_family }}
                  initialContent={company.name}
                  isEditable={isEditable}
                  onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, companyName: val })}
                />
                {company.org_number && <p className="text-sm text-gray-600">Org.nr: {company.org_number}</p>}
              </div>

              <div className={`space-y-1 text-sm text-gray-600 mt-4 ${logoPos === 'center' ? 'flex flex-col items-center' : ''}`}>
                {company.address && <div className="flex items-center"><MapPin className="w-4 h-4 mr-2" />{company.address}, {company.postal_code} {company.city}</div>}
                {company.phone && <div className="flex items-center"><Phone className="w-4 h-4 mr-2" />{company.phone}</div>}
                {company.email && <div className="flex items-center"><Mail className="w-4 h-4 mr-2" />{company.email}</div>}
              </div>
            </div>

            {/* Right Column - Document Header */}
            <div className={`${logoPos === 'right' ? 'order-1 text-right' : 'order-2 text-right'} ${logoPos === 'center' ? 'w-full text-center mt-6 pt-6 border-t' : ''}`}>
              {logoPos === 'right' && logoUrl && (
                <div className="flex justify-end mb-4">
                  <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                </div>
              )}

              <EditableElement
                tagName="h2"
                className="text-3xl font-bold mb-2 uppercase tracking-wide"
                style={{ color: primary_color, fontFamily: font_family }}
                initialContent={templateType === 'invoice' ? 'FAKTURA' : 'OFFERT'}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, { ...block.content, title: val })}
              />

              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Nr:</span> {quoteNumber}</p>
                <p><span className="font-semibold">Datum:</span> {formatDate(new Date().toISOString())}</p>
                {validUntil && <p><span className="font-semibold">Giltig till:</span> {formatDate(validUntil)}</p>}
              </div>
            </div>
          </div>
        );
        break;

      // ==================== MULTI-PAGE / PREMIUM BLOCKS ====================
      case 'page_break':
        // Element that forces a page break in print/PDF, and visually separates pages in the editor
        innerContent = (
          <div
            className="break-after-page"
            style={{
              pageBreakAfter: 'always',
              breakAfter: 'page' as any,
            }}
            aria-hidden={!isEditable}
          >
            {/* Visible indicator only on screen, hidden in print */}
            {isEditable ? (
              <div className="mx--8 my-8 bg-gray-100 py-8 px-4 border-y border-gray-300 shadow-inner print:hidden flex flex-col items-center justify-center">
                <div className="bg-white rounded shadow-sm border border-gray-200 px-6 py-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <FileMinus className="w-4 h-4" />
                  Sidbrytning — Ny Sida
                </div>
              </div>
            ) : (
              // In preview mode (not editing), just hide it on screen
              <div className="h-0 w-full print:hidden"></div>
            )}
          </div>
        );
        break;

      case 'cover_page':
        // Full-page cover with background image, dark overlay, logo, title, and subtitle
        const cover = block.content || {};
        const coverStyles = getBlockStyles(block.settings, font_family);
        const customStyles = coverStyles as any; // Bypass TS CSSProperty checking for custom props

        // If settings are missing (old template), assume standard full-cover behavior
        const currentSize = customStyles.imageSize || 'full';
        const currentFit = customStyles.objectFit || 'cover';

        // Image Settings for Cover Page (similar to standard image block)
        const coverSizeCls = currentSize === 'small' ? 'w-1/4' :
          currentSize === 'medium' ? 'w-2/4' :
            currentSize === 'large' ? 'w-3/4' : 'w-full';

        // If it's cover or fill, and width is full, we typically want h-full too so it fills the screen
        const isFullBg = coverSizeCls === 'w-full' && (currentFit === 'cover' || currentFit === 'fill');
        const heightCls = isFullBg ? 'h-full' : 'h-auto';

        const coverAlignCls = customStyles.alignment === 'left' ? 'justify-start' :
          customStyles.alignment === 'right' ? 'justify-end' : 'justify-center';

        let coverEffectCls = '';
        if (customStyles.imageEffect === 'fade') coverEffectCls = '[mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]';
        if (customStyles.imageEffect === 'rounded') coverEffectCls = 'rounded-2xl';
        if (customStyles.imageEffect === 'shadow') coverEffectCls = 'shadow-2xl';

        const coverOpacity = customStyles.imageOpacity !== undefined ? customStyles.imageOpacity / 100 : 1;
        const coverObjPosition = customStyles.backgroundPosition || 'center';

        innerContent = (
          <div
            className="relative flex flex-col items-center justify-center text-center text-white overflow-hidden rounded-lg print:rounded-none"
            style={{
              height: '250mm',
              maxHeight: '250mm',
              overflow: 'hidden',
              backgroundColor: coverStyles.backgroundColor || '#1e293b',
              ...coverStyles, // allow other block styles if any
            }}
          >
            {/* The actual image rendered via <img> tag to support advanced settings */}
            {cover.backgroundImage && (
              <div className={`absolute inset-0 z-0 flex ${coverAlignCls} items-center overflow-hidden`}>
                <img
                  src={cover.backgroundImage}
                  alt="Bakgrund"
                  className={`${coverSizeCls} ${heightCls} ${coverEffectCls}`}
                  style={{
                    objectFit: currentFit as 'contain' | 'cover' | 'fill',
                    objectPosition: coverObjPosition,
                    opacity: coverOpacity
                  }}
                />
              </div>
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black z-0" style={{ opacity: (block.settings?.overlayOpacity ?? 55) / 100 }} />

            {/* Content */}
            <div className="relative z-10 px-12 py-8 flex flex-col items-center justify-center h-full w-full">
              {/* Logo */}
              {cover.showLogo !== false && (
                <div className="mb-8">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-24 w-auto object-contain mx-auto"
                      style={{ filter: 'brightness(0) invert(1)' }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                      <Building className="w-10 h-10 text-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <EditableElement
                tagName="h1"
                className="text-5xl font-bold tracking-tight mb-4"
                style={{ fontFamily: font_family, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                initialContent={cover.title || 'Offert'}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, { ...cover, title: val })}
              />

              {/* Subtitle */}
              <EditableElement
                tagName="p"
                className="text-xl opacity-90 max-w-lg"
                style={{ fontFamily: font_family, color: '#e2e8f0', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                initialContent={cover.subtitle || ''}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, { ...cover, subtitle: val })}
              />

              {/* Company name */}
              {company.name && (
                <p className="mt-12 text-sm uppercase tracking-widest opacity-70" style={{ fontFamily: font_family }}>
                  {company.name}
                </p>
              )}
            </div>
          </div>
        );
        break;

      case 'split_content':
        // Side-by-side image + text content block
        const split = block.content || {};
        const splitStyles = getBlockStyles(block.settings, font_family);
        const imgOnRight = split.imagePosition === 'right';
        innerContent = (
          <div
            className={`flex gap-8 items-start my-6 ${imgOnRight ? 'flex-row-reverse' : ''}`}
            style={splitStyles}
          >
            {/* Image */}
            <div className="w-2/5 flex-shrink-0">
              {split.imageUrl ? (
                <img
                  src={split.imageUrl}
                  alt={split.headline || ''}
                  className="w-full h-auto rounded-lg shadow-md object-cover"
                  style={{ maxHeight: '300px' }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: '200px' }}>
                  <span className="text-gray-400 text-sm">Ingen bild</span>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex-1">
              <EditableElement
                tagName="h2"
                className="text-2xl font-bold text-gray-900 mb-3"
                style={{ fontFamily: font_family, color: splitStyles.color || primary_color }}
                initialContent={split.headline || 'Rubrik'}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, { ...split, headline: val })}
              />
              <EditableElement
                tagName="p"
                className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                style={{ fontFamily: font_family }}
                initialContent={split.paragraph || ''}
                isEditable={isEditable}
                onSave={(val) => onBlockUpdate?.(block.id, { ...split, paragraph: val })}
              />
            </div>
          </div>
        );
        break;

      case 'testimonials':
        // Grid of customer review cards with star ratings
        const testimonials = Array.isArray(block.content) ? block.content : [];
        const testimonialStyles = getBlockStyles(block.settings, font_family);
        innerContent = (
          <div className="my-6" style={testimonialStyles}>
            {testimonials.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic">
                Inga kundomdömen tillagda
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map((review: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-xl p-6 border border-gray-100 shadow-sm"
                    style={{ fontFamily: font_family }}
                  >
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= (review.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-gray-700 text-sm italic leading-relaxed mb-4">
                      "{review.quote || 'Kundomdöme'}"
                    </p>

                    {/* Reviewer name */}
                    <p className="text-sm font-semibold text-gray-900">
                      — {review.name || 'Anonym'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        break;

      default:
        return null;
    }

    return (
      <DraggableBlockWrapper
        key={block.id}
        id={block.id}
        index={index}
        moveBlock={onBlockMove}
        isEditable={isEditable}
        onDelete={() => onBlockDelete?.(block.id)}
        // We can pass a generic onSettings handler later if needed
        // We can pass a generic onSettings handler later if needed
        onSettings={() => {
          onBlockSelect?.(block.id);
        }}
      >
        {innerContent}
      </DraggableBlockWrapper>
    );
  };

  const Logo = () => (
    logoUrl ? (
      <img
        src={logoUrl}
        alt="Företagslogo"
        className="h-16 w-auto object-contain mb-4"
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
      />
    ) : (
      <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: primary_color }}>
        <Building className="w-8 h-8 text-white" />
      </div>
    )
  );

  return (
    <div className={`bg-white border border-gray-200 shadow-lg max-w-4xl mx-auto min-h-[800px] relative print:shadow-none print:border-0 print:max-w-none ${isEditable ? 'ring-offset-2 ring-2 ring-blue-100' : ''}`} style={{ fontFamily: font_family }}>

      {/* Edit Mode Indicator Banner */}
      {isEditable && (
        <div className="sticky top-0 z-30 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium print:hidden">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs">✏️</span>
          <span>Redigeringsläge aktivt</span>
          <span className="text-blue-200 text-xs ml-2">Klicka på text för att redigera • Dra block för att flytta</span>
        </div>
      )}

      {/* Content area with print margins */}
      <div className="p-8 print:p-0">

        {/* 100% Block-Based Layout - No Hardcoded Sections */}
        {(!template?.content_structure || template.content_structure.length === 0) && isEditable && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400">
            <p className="text-lg mb-4">Denna mall är tom</p>
            <p className="text-sm">Lägg till block från verktygslådan till höger för att bygga din {templateType === 'invoice' ? 'faktura' : 'offert'}.</p>
            <p className="text-xs mt-4 text-gray-300">Tips: Börja med Företagsinfo, Dokumentrubrik, Kundinfo, Artiklar, Summering, och Sidfot.</p>
          </div>
        )}

        {/* Default blocks when no template is provided (standard view) */}
        {(!template?.content_structure || template.content_structure.length === 0) && !isEditable && (
          <div className="space-y-6">
            {/* Header with company and document info */}
            <div className="flex justify-between items-start pb-6 border-b-2" style={{ borderColor: primary_color }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: primary_color }}>{company.name}</h2>
                <div className="text-sm mt-2 space-y-1 text-gray-600">
                  {company.org_number && <p>Org.nr: {company.org_number}</p>}
                  {company.address && <p>{company.address}, {company.postal_code} {company.city}</p>}
                  {company.email && <p>{company.email}</p>}
                  {company.phone && <p>{company.phone}</p>}
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold mb-2 uppercase tracking-wide" style={{ color: primary_color }}>
                  {templateType === 'invoice' ? 'FAKTURA' : 'OFFERT'}
                </h1>
                <div className="text-sm space-y-1">
                  <p><span className="font-semibold">Nr:</span> {quoteNumber}</p>
                  <p><span className="font-semibold">Datum:</span> {formatDate(quote.created_at || new Date().toISOString())}</p>
                  {validUntil && <p><span className="font-semibold">Giltig till:</span> {formatDate(validUntil)}</p>}
                </div>
              </div>
            </div>

            {/* Customer info */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-400">Till</h3>
              <div className="space-y-1 text-gray-900">
                <p className="font-bold text-lg">{customer.name}</p>
                {customer.address && <p>{customer.address}</p>}
                {(customer.postal_code || customer.city) && <p>{customer.postal_code} {customer.city}</p>}
                {customer.email && <p className="text-sm mt-2 text-gray-600">{customer.email}</p>}
              </div>
            </div>

            {/* Line items table */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: primary_color }}>Specifikation</h3>
              <table className="min-w-full">
                <thead className="border-b-2" style={{ borderColor: primary_color }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color }}>Beskrivning</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color }}>Antal</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color }}>À-pris</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color }}>Summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(!quote.line_items || quote.line_items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 italic bg-gray-50">
                        Inga artiklar valda
                      </td>
                    </tr>
                  )}
                  {quote.line_items?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name || item.description || 'Produkt'}</p>
                          {item.description && item.name && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(item.total || (item.quantity * item.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="py-6 border-t border-gray-200">
              <div className="w-full max-w-sm ml-auto space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Moms (25%)</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                {rotAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>ROT-avdrag</span>
                    <span>-{formatCurrency(rotAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-4 border-t-2 border-gray-100 text-gray-900">
                  <span>Totalt</span>
                  <span>{formatCurrency(finalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
              <p className="mb-1">{company.name} | {company.org_number} | {company.city}</p>
              <p>{company.email} | {company.phone}</p>
            </div>
          </div>
        )}

        {/* Render ALL blocks from content_structure (template-based) */}
        <div className="space-y-2 print:space-y-4">
          {template?.content_structure?.map((block, index) => renderContentBlock(block, index))}

          {/* Add New Page Button within the editor canvas */}
          {isEditable && onAddBlock && (
            <div className="mt-12 mb-4 flex justify-center print:hidden">
              <button
                onClick={() => onAddBlock('page_break')}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Lägg till ny sida</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm 10mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Prevent page breaks inside important elements */
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
          img { page-break-inside: avoid; }
          
          /* Keep headings with their content */
          h1, h2, h3, h4 {
            page-break-after: avoid;
          }
          
          /* Reset shadows for better printing */
          * {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default QuotePreview;
import React, { useRef } from 'react';
import { Building } from 'lucide-react';
import type { InvoiceWithRelations } from '../lib/invoices';
import { formatCurrency, formatDate } from '../lib/database';
import type { Organisation } from '../types/database';
import type { QuoteTemplate, ContentBlock } from '../lib/quoteTemplates';
import { UNIT_LABELS } from '../lib/quoteTemplates';

interface InvoicePreviewProps {
  invoice: InvoiceWithRelations;
  logoUrl?: string | null;
  systemSettings?: { invoice_footer_text?: string | null } | null;
  default_payment_terms?: number;
  organisation: Organisation | null;
  template?: QuoteTemplate;
}

function InvoicePreview({
  invoice,
  logoUrl,
  systemSettings,
  organisation,
  template
}: InvoicePreviewProps) {
  if (!invoice) return null;

  const subtotal = invoice.subtotal ?? invoice.invoice_line_items?.reduce((sum, item) => sum + item.total, 0) ?? 0;
  const total = invoice.amount || 0;
  // Derive VAT from total - subtotal when not explicitly stored (avoids wrong 25% fallback for 0%/omvänd customers)
  const vatAmount = invoice.vat_amount != null ? invoice.vat_amount : Math.max(0, total - subtotal);
  const rotAmount = invoice.rot_amount || 0;
  const rutAmount = (invoice as any).rut_amount || 0;
  const finalAmount = total - rotAmount - rutAmount;

  // Extract settings and design options with defaults
  // design_options can live at top level OR inside settings — check both
  const paymentTerms = template?.settings?.default_payment_terms || 30;
  const {
    font_family = 'Inter',
    primary_color = '#2563eb',
    logo_position = 'right',
    show_signature_area = false,
    show_product_images = false
  } = template?.design_options || template?.settings?.design_options || {};

  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;

    const originalBody = document.body.innerHTML;
    const printContent = element.outerHTML;

    document.body.innerHTML = `
      <html>
        <head>
          <title>Faktura ${invoice.invoice_number}</title>
          <style>
              @page {
                size: A4;
                margin: 0;
              }
              body { 
                margin: 0; 
                padding: 0; 
                font-family: ${font_family}, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              @media print {
                html, body { 
                    width: 210mm; 
                    height: 297mm !important; 
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important; 
                }
                #invoice-container { 
                    zoom: 0.90 !important;
                    height: 100% !important; 
                    max-height: 100% !important;
                    padding: 15mm 20mm !important;
                    display: flex !important;
                    flex-direction: column !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: hidden !important;
                    page-break-after: avoid !important;
                    page-break-before: avoid !important;
                    page-break-inside: avoid !important;
                }
                * { box-sizing: border-box; }
                .no-break { page-break-inside: avoid; }
              }
            </style>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body>${printContent}</body>
      </html>
    `;

    setTimeout(() => {
      window.print();
      document.body.innerHTML = originalBody;
      window.location.reload();
    }, 500);
  };

  const interpolateVariables = (text: string) => {
    if (!text) return '';
    let result = text;

    // Invoice variables
    result = result.replace(/{{invoice\.number}}/g, invoice.invoice_number || '');
    result = result.replace(/{{invoice\.date}}/g, invoice.created_at ? formatDate(invoice.created_at) : '');
    result = result.replace(/{{invoice\.due_date}}/g, invoice.due_date ? formatDate(invoice.due_date) : '');
    result = result.replace(/{{order\.ref}}/g, invoice.order_id ? `Order #${invoice.order_id.slice(0, 8)}` : '');

    // Customer variables
    result = result.replace(/{{customer\.name}}/g, invoice.customer?.name || '');
    result = result.replace(/{{customer\.email}}/g, invoice.customer?.email || '');
    result = result.replace(/{{customer\.address}}/g, invoice.customer?.address || '');

    // Company variables
    result = result.replace(/{{company\.name}}/g, organisation?.name || '');
    result = result.replace(/{{company\.org_number}}/g, organisation?.org_number || '');
    result = result.replace(/{{company\.email}}/g, organisation?.email || '');
    result = result.replace(/{{company\.phone}}/g, organisation?.phone || '');

    return result;
  };

  const renderContentBlock = (block: ContentBlock) => {
    const content = typeof block.content === 'string' ? interpolateVariables(block.content) : block.content;

    switch (block.type) {

      // ── Layout helpers ────────────────────────────────────────────────────
      case 'spacer':
        return <div style={{ height: `${block.settings?.spacerHeight ?? 16}px` }} />;

      case 'divider':
        return <hr className="border-gray-200 my-4" />;

      // ── Text content ─────────────────────────────────────────────────────
      case 'header':
        return (
          <div className="mb-6">
            <h2 className="text-2xl font-bold" style={{ color: primary_color, fontFamily: font_family }}>
              {content as string}
            </h2>
          </div>
        );

      case 'text_block':
      case 'custom_text_block':
        return (
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm" style={{ fontFamily: font_family }}>
              {content as string}
            </p>
          </div>
        );

      case 'terms':
        return (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: font_family }}>
              {typeof block.content === 'string' ? interpolateVariables(block.content) : ''}
            </p>
          </div>
        );

      case 'f_skatt_text':
        return (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500" style={{ fontFamily: font_family }}>
              {typeof block.content === 'string' && block.content
                ? block.content
                : 'Godkänd för F-skatt. Innehar F-skattsedel.'}
            </p>
          </div>
        );

      case 'footer':
        return (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm" style={{ fontFamily: font_family }}>
              {content as string}
            </p>
          </div>
        );

      // ── Company / document header ─────────────────────────────────────────
      case 'header_row': {
        return (
          <div className={`flex ${logo_position === 'center' ? 'flex-col items-center text-center' : 'justify-between items-start'} pb-8 border-b-2 mb-6`} style={{ borderColor: primary_color }}>
            {/* Left: company info */}
            <div className="flex-1">
              {logo_position !== 'right' && <Logo />}
              <h1 className="text-xl font-bold" style={{ color: primary_color, fontFamily: font_family }}>
                {organisation?.name || 'Företagsnamn'}
              </h1>
              {organisation?.org_number && <p className="text-sm text-gray-600">Org.nr: {organisation.org_number}</p>}
              <div className="space-y-0.5 text-sm text-gray-600 mt-2">
                {organisation?.address && <p>{organisation.address}</p>}
                {organisation?.postal_code && organisation?.city && <p>{organisation.postal_code} {organisation.city}</p>}
                {organisation?.phone && <p>{organisation.phone}</p>}
                {organisation?.email && <p>{organisation.email}</p>}
              </div>
            </div>
            {/* Right: document title */}
            <div className="text-right">
              {logo_position === 'right' && <div className="flex justify-end mb-2"><Logo /></div>}
              <h2 className="text-3xl font-bold mb-2" style={{ color: primary_color, fontFamily: font_family }}>FAKTURA</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Fakturanr:</span> {invoice.invoice_number}</p>
                <p><span className="font-semibold">Datum:</span> {formatDate(invoice.created_at)}</p>
                {invoice.due_date && <p><span className="font-semibold">Förfaller:</span> {formatDate(invoice.due_date)}</p>}
              </div>
            </div>
          </div>
        );
      }

      case 'invoice_header': {
        return (
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-3" style={{ color: primary_color, fontFamily: font_family }}>FAKTURA</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p><span className="font-semibold">Fakturanummer:</span> {invoice.invoice_number}</p>
                <p><span className="font-semibold">Fakturadatum:</span> {formatDate(invoice.created_at)}</p>
                {invoice.due_date && <p><span className="font-semibold">Förfallodatum:</span> {formatDate(invoice.due_date)}</p>}
                {invoice.ocr_number && <p><span className="font-semibold">OCR:</span> {invoice.ocr_number}</p>}
              </div>
            </div>
          </div>
        );
      }

      // ── Customer / assignment ─────────────────────────────────────────────
      case 'customer_info':
      case 'customer_details': {
        return (
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ color: primary_color }}>
                Fakturera till
              </h3>
              <p className="font-bold" style={{ fontFamily: font_family }}>{invoice.customer?.name}</p>
              {invoice.customer?.org_number && <p className="text-sm text-gray-600">Org.nr: {invoice.customer.org_number}</p>}
              {invoice.customer?.address && <p className="text-sm">{invoice.customer.address}</p>}
              {invoice.customer?.postal_code && invoice.customer?.city && (
                <p className="text-sm">{invoice.customer.postal_code} {invoice.customer.city}</p>
              )}
              {invoice.customer?.email && <p className="text-sm mt-1 text-gray-600">{invoice.customer.email}</p>}
              {invoice.customer?.phone_number && <p className="text-sm text-gray-600">{invoice.customer.phone_number}</p>}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ color: primary_color }}>
                Arbete utfört av
              </h3>
              <p className="text-sm text-gray-700" style={{ fontFamily: font_family }}>
                {invoice.assignment_type === 'team' && invoice.assigned_team
                  ? invoice.assigned_team.name
                  : invoice.assignment_type === 'individual' && invoice.assigned_user
                  ? invoice.assigned_user.full_name
                  : organisation?.name || 'Momentum CRM'}
              </p>
            </div>
          </div>
        );
      }

      // ── Line items ────────────────────────────────────────────────────────
      case 'line_items_table': {
        const lineItems = invoice.invoice_line_items || [];
        if (lineItems.length === 0) return null;

        return (
          <div className="mb-8">
            <h3 className="text-base font-semibold mb-4" style={{ color: primary_color, fontFamily: font_family }}>
              Fakturaspecifikation
            </h3>
            {invoice.job_description && (
              <p className="text-sm text-gray-600 pb-4 border-b mb-4">{invoice.job_description}</p>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b-2" style={{ borderColor: primary_color }}>
                  <tr>
                    {show_product_images && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: primary_color }}>Bild</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: primary_color }}>Beskrivning</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: primary_color }}>Antal</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: primary_color }}>Enhet</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: primary_color }}>À-pris</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: primary_color }}>Summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {show_product_images && (
                        <td className="px-4 py-3">
                          {(item as any).image_url ? (
                            <img src={(item as any).image_url} alt="Produkt" className="h-12 w-12 object-cover rounded border border-gray-200" />
                          ) : (
                            <div className="h-10 w-10 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-400">–</span>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900" style={{ fontFamily: font_family }}>{item.description}</p></td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">{item.unit ? ((UNIT_LABELS as any)[item.unit] || item.unit) : '-'}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // ── Totals ────────────────────────────────────────────────────────────
      case 'totals':
      case 'subtotal':
      case 'vat_info':
      case 'total':
      case 'rot_rut_info': {
        return (
          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Moms ({subtotal > 0 ? Math.round((vatAmount / subtotal) * 100) : 0}%):</span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
                <span>Totalt att betala:</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              {rotAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>ROT-avdrag (30%):</span>
                  <span className="font-medium">-{formatCurrency(rotAmount)}</span>
                </div>
              )}
              {rutAmount > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>RUT-avdrag:</span>
                  <span className="font-medium">-{formatCurrency(rutAmount)}</span>
                </div>
              )}
              {(rotAmount > 0 || rutAmount > 0) && (
                <div className="flex justify-between font-bold text-green-700 pt-2 border-t border-green-300">
                  <span>Att betala efter avdrag:</span>
                  <span>{formatCurrency(finalAmount)}</span>
                </div>
              )}
            </div>
          </div>
        );
      }

      // ── Payment info ──────────────────────────────────────────────────────
      case 'payment_info':
      case 'bank_details': {
        return (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <h4 className="font-semibold mb-2" style={{ color: primary_color, fontFamily: font_family }}>Betalningsinformation</h4>
                <div className="text-gray-700 space-y-1">
                  {organisation?.bank_account && <p><strong>Bankkonto / BG:</strong> {organisation.bank_account}</p>}
                  {organisation?.bank_name && <p><strong>Bank:</strong> {organisation.bank_name}</p>}
                  {invoice.ocr_number && <p><strong>OCR:</strong> {invoice.ocr_number}</p>}
                  {(organisation?.iban || organisation?.bic) && (
                    <p>
                      {organisation?.iban && <span>IBAN: {organisation.iban}</span>}
                      {organisation?.iban && organisation?.bic && <span> | </span>}
                      {organisation?.bic && <span>BIC: {organisation.bic}</span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <h4 className="font-semibold mb-2" style={{ color: primary_color, fontFamily: font_family }}>Betalningsvillkor</h4>
                <p className="font-medium">Förfallodatum: {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}</p>
                <p className="text-gray-500 text-xs mt-1">Dröjsmålsränta enl. räntelagen.</p>
              </div>
            </div>
          </div>
        );
      }

      // ── Page footer ───────────────────────────────────────────────────────
      case 'page_footer': {
        return (
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p className="font-bold text-sm text-gray-700">{organisation?.name || 'Företagsnamn'}</p>
            <p>
              {organisation?.org_number && <span>Org.nr: {organisation.org_number}{organisation?.vat_number ? ' | ' : ''}</span>}
              {organisation?.vat_number && <span>Momsreg.nr: {organisation.vat_number} | Godkänd för F-skatt</span>}
            </p>
            <p className="mt-1">
              {organisation?.email && <span>{organisation.email}{organisation?.website ? ' | ' : ''}</span>}
              {organisation?.website && <span>{organisation.website}</span>}
            </p>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const Logo = () => (
    organisation?.logo_url ? (
      <img src={organisation.logo_url} alt={`${organisation.name} Logo`} className="h-24 w-auto mb-4 object-contain" />
    ) : (
      <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: primary_color }}>
        <Building className="w-10 h-10 text-white" />
      </div>
    )
  );


  // Fallback content structure if no template
  const contentStructure = template?.content_structure || [
    { id: 'default-lines', type: 'line_items_table', content: 'default' }
  ];

  return (
    <>
      <div className="flex justify-end mb-3 max-w-4xl mx-auto">
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          style={{ backgroundColor: primary_color }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Ladda ner PDF
        </button>
      </div>
      <div ref={printRef} id="invoice-container" className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm max-w-4xl mx-auto flex flex-col min-h-full" style={{ fontFamily: font_family }}>

        {/* Static header — only when no template (template provides header_row / invoice_header blocks) */}
        {!template && (
          <div className={`flex ${logo_position === 'center' ? 'flex-col items-center text-center' : 'justify-between items-start'} pb-8 border-b-2 border-gray-200`}>
            <div className={`flex-1 ${logo_position === 'right' ? '' : 'order-1'} ${logo_position === 'center' ? 'w-full' : ''}`}>
              {(logo_position === 'left' || logo_position === 'center') && <Logo />}
              <div className={logo_position === 'center' ? 'mb-6' : ''}>
                <h1 className="text-xl font-bold text-gray-900" style={{ color: primary_color }}>{organisation?.name || 'Företagsnamn'}</h1>
                {organisation?.org_number && <p className="text-sm text-gray-600">Org.nr: {organisation.org_number}</p>}
              </div>
              <div className={`space-y-1 text-sm text-gray-600 mt-4 ${logo_position === 'center' ? 'flex flex-col items-center' : ''}`}>
                {organisation?.address && <p>{organisation.address}</p>}
                {organisation?.postal_code && organisation?.city && <p>{`${organisation.postal_code} ${organisation.city}`}</p>}
                {organisation?.phone && <p>{organisation.phone}</p>}
                {organisation?.email && <p>{organisation.email}</p>}
              </div>
            </div>
            <div className={`${logo_position === 'right' ? 'order-1 text-right' : 'order-2 text-right'} ${logo_position === 'center' ? 'w-full text-center mt-6 pt-6 border-t' : ''}`}>
              {logo_position === 'right' && <div className="flex justify-end"><Logo /></div>}
              <h2 className="text-3xl font-bold mb-2" style={{ color: primary_color }}>FAKTURA</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Fakturanr:</span> {invoice.invoice_number}</p>
                <p><span className="font-semibold">Datum:</span> {formatDate(invoice.created_at)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Static customer info — only when no template */}
        {!template && (
          <div className="grid grid-cols-2 gap-8 mt-8 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ color: primary_color }}>Fakturera till</h3>
              <p className="font-bold">{invoice.customer?.name}</p>
              {invoice.customer?.org_number && <p className="text-gray-600">Org.nr: {invoice.customer.org_number}</p>}
              {invoice.customer?.address && <p>{invoice.customer.address}</p>}
              {invoice.customer?.postal_code && invoice.customer?.city && <p>{`${invoice.customer.postal_code} ${invoice.customer.city}`}</p>}
              {invoice.customer?.email && <p className="mt-1 text-gray-600">{invoice.customer.email}</p>}
              {invoice.customer?.phone_number && <p className="text-gray-600">{invoice.customer.phone_number}</p>}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ color: primary_color }}>Arbete utfört av</h3>
              <div className="text-gray-600">
                {invoice.assignment_type === 'team' && invoice.assigned_team ? (
                  <p>{invoice.assigned_team.name}</p>
                ) : invoice.assignment_type === 'individual' && invoice.assigned_user ? (
                  <p>{invoice.assigned_user.full_name}</p>
                ) : (
                  <p>Momentum CRM</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content blocks — template drives layout when provided, otherwise just line items */}
        <div className={template ? '' : 'flex-grow'}>
          {contentStructure.map((block: any, index: number) => (
            <div key={block.id || index}>
              {renderContentBlock(block)}
            </div>
          ))}
        </div>

        {/* Static totals/payment/footer — only when no template (template provides totals/payment_info/page_footer blocks) */}
        {!template && <div className="mt-auto">
          {/* Totals */}
          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Moms ({subtotal > 0 ? Math.round(vatAmount / subtotal * 100) : 0}%):</span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Totalt att betala:</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              {rotAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>ROT-avdrag (30%):</span>
                  <span className="font-medium">-{formatCurrency(rotAmount)}</span>
                </div>
              )}
              {rutAmount > 0 && (
                <div className="flex justify-between text-sm text-purple-600">
                  <span>RUT-avdrag:</span>
                  <span className="font-medium">-{formatCurrency(rutAmount)}</span>
                </div>
              )}
              {(rotAmount > 0 || rutAmount > 0) && (
                <div className="flex justify-between text-xl font-bold text-green-700 pt-2 border-t border-green-300">
                  <span>Att betala efter avdrag:</span>
                  <span>{formatCurrency(finalAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment & Terms */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2" style={{ color: primary_color }}>Betalningsinformation</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  {organisation?.bank_account && <p><strong>Bankkonto / BG:</strong> {organisation.bank_account}</p>}
                  {organisation?.bank_name && <p><strong>Bank:</strong> {organisation.bank_name}</p>}
                  {invoice.ocr_number && <p><strong>OCR:</strong> {invoice.ocr_number}</p>}
                </div>
              </div>
              <div className="text-right">
                <h4 className="font-semibold text-gray-800 mb-2" style={{ color: primary_color }}>Betalningsvillkor</h4>
                <p className="text-sm text-gray-700 font-medium">
                  Förfallodatum: {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
                </p>
                <p className="text-sm text-gray-500">
                  Dröjsmålsränta enl. räntelagen.
                </p>
              </div>
            </div>
          </div>

          {/* Signature Area */}
          {show_signature_area && (
            <div className="py-8 mt-6 border-t border-gray-200 grid grid-cols-2 gap-12">
              <div>
                <p className="text-sm font-medium mb-8 border-b border-gray-300">Datum & Underskrift {organisation?.name}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p className="font-bold text-sm text-gray-700">{organisation?.name || 'Företagsnamn'}</p>
            <p>
              {organisation?.org_number && <span>Org.nr: {organisation.org_number} | </span>}
              {organisation?.vat_number && <span>Momsreg.nr: {organisation.vat_number} | Godkänd för F-skatt</span>}
            </p>
            {(organisation?.iban || organisation?.bic) && (
              <p className="mt-1">
                {organisation?.iban && <span>IBAN: {organisation.iban} </span>}
                {organisation?.iban && organisation?.bic && <span>| </span>}
                {organisation?.bic && <span>BIC: {organisation.bic}</span>}
              </p>
            )}
            <p className="mt-1">
              {organisation?.email && <span>{organisation.email} | </span>}
              {organisation?.website && <span>{organisation.website}</span>}
            </p>
          </div>
        </div>}

      </div>
    </>
  );
}

export default InvoicePreview;

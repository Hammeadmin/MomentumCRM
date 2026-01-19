import React from 'react';
import { Building, Mail, Phone, MapPin } from 'lucide-react';
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

  const subtotal = invoice.subtotal || invoice.invoice_line_items?.reduce((sum, item) => sum + item.total, 0) || 0;
  const vatAmount = invoice.vat_amount || subtotal * 0.25;
  const total = invoice.amount || 0;
  const rotAmount = invoice.rot_amount || 0;
  const finalAmount = total - rotAmount;

  // Extract settings and design options with defaults
  const paymentTerms = template?.settings?.default_payment_terms || 30; // Or from systemSettings?
  const {
    font_family = 'Inter',
    primary_color = '#2563eb',
    logo_position = 'right',
    show_signature_area = false, // Default false for invoices usually
    show_product_images = false
  } = template?.design_options || {};

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
      case 'header':
        return (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: font_family }}>{content as string}</h2>
          </div>
        );

      case 'text_block':
        return (
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: font_family }}>{content as string}</p>
          </div>
        );

      case 'line_items_table':
        // Use invoice line items
        const lineItems = invoice.invoice_line_items || [];
        if (lineItems.length === 0) return null;

        return (
          <div className="mb-8 flex-grow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4" style={{ color: primary_color, fontFamily: font_family }}>Fakturaspecifikation</h3>
            {invoice.job_description && (
              <p className="text-sm text-gray-600 pb-4 border-b mb-4">
                {invoice.job_description}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b-2" style={{ borderColor: primary_color }}>
                  <tr>
                    {show_product_images && (
                      <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                        Bild
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      Beskrivning
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      Antal
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      Enhet
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      À-pris
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider" style={{ color: primary_color, fontFamily: font_family }}>
                      Summa
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {show_product_images && (
                        <td className="px-4 py-4">
                          {(item as any).image_url ? (
                            <img src={(item as any).image_url} alt="Produkt" className="h-12 w-12 object-cover rounded border border-gray-200" />
                          ) : (
                            <div className="h-12 w-12 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                              <span className="text-xs">Ingen bild</span>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900" style={{ fontFamily: font_family }}>{item.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-900" style={{ fontFamily: font_family }}>
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-900" style={{ fontFamily: font_family }}>
                        {/* Inline conditional for unit label or fallback */}
                        {item.unit ? ((UNIT_LABELS as any)[item.unit] || item.unit) : '-'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900" style={{ fontFamily: font_family }}>
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-gray-900" style={{ fontFamily: font_family }}>
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: font_family }}>{content as string}</p>
          </div>
        );

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
    <div className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm max-w-4xl mx-auto flex flex-col h-full" style={{ fontFamily: font_family }}>

      {/* Dynamic Header */}
      <div className={`flex ${logo_position === 'center' ? 'flex-col items-center text-center' : 'justify-between items-start'} pb-8 border-b-2 border-gray-200`}>

        {/* Left Side (or Center Top) */}
        <div className={`flex-1 ${logo_position === 'right' ? '' : 'order-1'} ${logo_position === 'center' ? 'w-full' : ''}`}>
          {(logo_position === 'left' || logo_position === 'center') && <Logo />}

          <div className={logo_position === 'center' ? 'mb-6' : ''}>
            <h1 className="text-xl font-bold text-gray-900" style={{ color: primary_color }}>{organisation?.name || 'Företagsnamn'}</h1>
            {organisation?.org_number && (
              <p className="text-sm text-gray-600">Org.nr: {organisation.org_number}</p>
            )}
          </div>

          <div className={`space-y-1 text-sm text-gray-600 mt-4 ${logo_position === 'center' ? 'flex flex-col items-center' : ''}`}>
            {organisation?.address && <p>{organisation.address}</p>}
            {organisation?.postal_code && organisation?.city && (
              <p>{`${organisation.postal_code} ${organisation.city}`}</p>
            )}
            {organisation?.phone && <div className="flex items-center justify-center"><Phone className="w-4 h-4 mr-2" />{organisation.phone}</div>}
            {organisation?.email && <div className="flex items-center justify-center"><Mail className="w-4 h-4 mr-2" />{organisation.email}</div>}
          </div>
        </div>

        {/* Right Side (or Center Bottom) */}
        <div className={`${logo_position === 'right' ? 'order-1 text-right' : 'order-2 text-right'} ${logo_position === 'center' ? 'w-full text-center mt-6 pt-6 border-t' : ''}`}>
          {logo_position === 'right' && (
            <div className="flex justify-end"><Logo /></div>
          )}
          <h2 className="text-3xl font-bold mb-2" style={{ color: primary_color }}>FAKTURA</h2>
          <div className="space-y-1 text-sm">
            <p><span className="font-semibold">Fakturanr:</span> {invoice.invoice_number}</p>
            <p><span className="font-semibold">Datum:</span> {formatDate(invoice.created_at)}</p>
          </div>
        </div>
      </div>


      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-8 mt-8 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ color: primary_color }}>Fakturera till</h3>
          <p className="font-bold">{invoice.customer.name}</p>
          {invoice.customer.address && <p>{invoice.customer.address}</p>}
          {invoice.customer.postal_code && invoice.customer.city && (
            <p>{`${invoice.customer.postal_code} ${invoice.customer.city}`}</p>
          )}
          <p>Sverige</p>
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

      {/* Render Content Blocks (including line items) */}
      <div className="flex-grow">
        {contentStructure.map((block: any, index: number) => (
          <div key={block.id || index}>
            {renderContentBlock(block)}
          </div>
        ))}
      </div>


      {/* Totals & Footer Info */}
      <div className="mt-auto">
        {/* Totals */}
        <div className="flex justify-end mt-4 pt-4 border-t">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Moms ({(vatAmount / subtotal * 100 || 25).toFixed(0)}%):</span>
              <span className="font-medium">{formatCurrency(vatAmount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
              <span>Totalt att betala:</span>
              <span>{formatCurrency(invoice.amount)}</span>
            </div>
            {rotAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>ROT-avdrag (30%):</span>
                  <span className="font-medium">-{formatCurrency(rotAmount)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-green-700 pt-2 border-t border-green-300">
                  <span>Att betala efter ROT:</span>
                  <span>{formatCurrency(finalAmount)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment & Terms */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2" style={{ color: primary_color }}>Betalningsinformation</h4>
              <div className="text-sm text-gray-700 space-y-1">
                {organisation?.bank_account && <p><strong>Bankkonto:</strong> {organisation.bank_account}</p>}
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
          <p>
            {organisation?.email && <span>{organisation.email} | </span>}
            {organisation?.website && <span>{organisation.website}</span>}
          </p>
        </div>
      </div>

    </div>
  );
}

export default InvoicePreview;
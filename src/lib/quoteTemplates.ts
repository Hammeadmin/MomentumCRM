import { supabase } from './supabase';

export interface QuoteTemplate {
  id: string;
  organisation_id: string;
  name: string;
  description?: string | null;
  content_structure: ContentBlock[];
  default_line_items?: QuoteLineItemTemplate[]; // Keep for backward compatibility
  settings: {
    default_vat_rate?: number;
    default_payment_terms?: number;
    notes?: string;
    template_type?: 'quote' | 'invoice';
    design_options?: {
      font_family?: string;
      primary_color?: string;
      logo_position?: 'left' | 'center' | 'right';
      show_signature_area?: boolean;
      show_product_images?: boolean;
      header_text?: string;
      footer_text?: string;
    };
  };
  design_options?: {
    font_family?: string;
    primary_color?: string;
    logo_position?: 'left' | 'center' | 'right';
    show_signature_area?: boolean;
    show_product_images?: boolean;
    header_text?: string;
    footer_text?: string;
    text_overrides?: Record<string, string>;
  };
  sort_order?: number;
  created_at?: string | null;
}

// Block style settings for full visual control
export interface BlockStyleSettings {
  // Typography
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  fontColor?: string; // hex color
  textAlign?: 'left' | 'center' | 'right';

  // Spacing (in pixels)
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  marginTop?: number;
  marginBottom?: number;

  // Background
  backgroundColor?: string; // hex color or 'transparent'

  // Border
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;

  // Image display settings
  imageSize?: 'small' | 'medium' | 'large' | 'full';
  imageOpacity?: number; // 0-100
  objectFit?: 'cover' | 'contain' | 'fill';
  imageEffect?: 'none' | 'fade' | 'rounded' | 'shadow';
  overlayOpacity?: number; // 0-100, for cover_page overlay
  backgroundPosition?: 'center' | 'top' | 'bottom';
}

// All possible block types that can appear in a template
export type ContentBlockType =
  // Standard content blocks
  | 'header'           // Custom heading text
  | 'text_block'       // Custom paragraph text
  | 'line_items_table' // Products/services table
  | 'footer'           // Custom footer text
  | 'image'            // Custom image
  | 'logo'             // Company logo (standalone)
  // Template sections (previously hardcoded)
  | 'company_info'     // Provider/company information block
  | 'document_header'  // Document title (OFFERT/FAKTURA), number, date
  | 'customer_info'    // Recipient/customer information
  | 'quote_metadata'   // Quote/invoice details (payment terms, VAT)
  | 'totals'           // Subtotal, VAT, discounts, total amount
  | 'terms'            // Terms and conditions section
  | 'signature_area'   // Signature lines
  | 'page_footer'      // Page footer with company info
  | 'divider'          // Horizontal divider line
  | 'spacer'           // Vertical spacing
  // Layout blocks
  | 'row'              // Horizontal row with 2-3 columns
  | 'header_row'       // Special: Company info left + Document header right
  // Invoice-specific blocks
  | 'payment_info'     // Bank account, OCR number, due date
  | 'invoice_header'   // Invoice number, date, due date display
  | 'f_skatt_text'     // "Godkänd för F-skatt" legal disclaimer
  // Quote-specific blocks
  | 'quote_validity'   // "Offerten giltig till..." display
  | 'acceptance_section' // Digital signature / acceptance area
  // Multi-page / premium blocks
  | 'page_break'       // Force a new page in print/PDF
  | 'cover_page'       // Full-page cover with background image, title, subtitle
  | 'split_content'    // Side-by-side image + text (About Us, etc.)
  | 'testimonials';    // Grid of customer review cards

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: any;
  settings?: BlockStyleSettings & {
    table_header?: string;
    alignment?: 'left' | 'center' | 'right';
    showLogo?: boolean;
    logoPosition?: 'left' | 'center' | 'right';
    showBorder?: boolean;
    columns?: 1 | 2;
    spacerHeight?: number;
    [key: string]: any;
  };
}

export interface QuoteLineItemTemplate {
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit: 'st' | 'kvm' | 'tim' | 'löpm' | 'kg' | 'liter' | 'meter';
  category?: string;
}

export interface ProductLibraryItem {
  id: string;
  organisation_id: string;
  name: string;
  description: string;
  unit_price: number;
  unit: 'st' | 'kvm' | 'tim' | 'löpm' | 'kg' | 'liter' | 'meter';
  vat_rate?: number | null; // VAT percentage (default 25%)
  category?: string | null;
  created_at?: string | null;
}

export interface ProductFilters {
  category?: string;
  search?: string;
}

// Quote Templates operations
export const getQuoteTemplates = async (
  organisationId: string
): Promise<{ data: QuoteTemplate[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Ensure content_structure exists and migrate if needed
    const processedData = (data || []).map(template => {
      // Robust check: if content_structure is null, empty, or has no blocks
      if (!template.content_structure || template.content_structure.length === 0) {

        // Strategy 1: Migrate from legacy default_line_items if present
        if (template.default_line_items && template.default_line_items.length > 0) {
          template.content_structure = [
            { id: '1', type: 'header', content: template.name },
            { id: '2', type: 'text_block', content: template.description || 'Beskrivning av offerten' },
            { id: '3', type: 'line_items_table', content: template.default_line_items },
            { id: '4', type: 'footer', content: 'Tack för förtroendet! Vi ser fram emot att arbeta med er.' }
          ];
        }
        // Strategy 2: If it's a "Standard" or known template name but empty, regenerate default structure
        else {
          // Fallback default structure so the user never sees a blank page
          template.content_structure = [
            { id: '1', type: 'header_row', content: null },
            { id: '2', type: 'customer_info', content: null },
            { id: '3', type: 'spacer', content: null, settings: { spacerHeight: 20 } },
            { id: '4', type: 'header', content: template.name || 'Offert', settings: { fontSize: '2xl', fontWeight: 'bold' } },
            { id: '5', type: 'text_block', content: template.description || 'Vi erbjuder följande tjänster.' },
            { id: '6', type: 'line_items_table', content: [] },
            { id: '7', type: 'totals', content: null },
            { id: '8', type: 'quote_validity', content: null },
            { id: '9', type: 'page_footer', content: null }
          ];
        }
      }
      return template;
    });

    return { data: processedData, error: null };
  } catch (err) {
    console.error('Error fetching quote templates:', err);
    return { data: null, error: err as Error };
  }
};

export const updateQuoteTemplateOrder = async (
  templateId: string,
  newSortOrder: number
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quote_templates')
      .update({ sort_order: newSortOrder })
      .eq('id', templateId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error updating template order:', err);
    return { error: err as Error };
  }
};

export const reorderQuoteTemplates = async (
  organisationId: string,
  templateIds: string[]
): Promise<{ error: Error | null }> => {
  try {
    // Update sort_order for each template based on its position in the array
    const updates = templateIds.map((templateId, index) =>
      supabase
        .from('quote_templates')
        .update({ sort_order: index })
        .eq('id', templateId)
        .eq('organisation_id', organisationId)
    );

    const results = await Promise.all(updates);

    // Check if any updates failed
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      return { error: new Error(`Failed to update ${errors.length} templates`) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error reordering templates:', err);
    return { error: err as Error };
  }
};

export const createQuoteTemplate = async (
  template: Omit<QuoteTemplate, 'id' | 'created_at'>
): Promise<{ data: QuoteTemplate | null; error: Error | null }> => {
  try {
    // Get the next sort_order value
    const { data: maxOrderData } = await supabase
      .from('quote_templates')
      .select('sort_order')
      .eq('organisation_id', template.organisation_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (maxOrderData?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('quote_templates')
      .insert([{ ...template, sort_order: nextSortOrder }])
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating quote template:', err);
    return { data: null, error: err as Error };
  }
};

export const updateQuoteTemplate = async (
  id: string,
  updates: Partial<QuoteTemplate>
): Promise<{ data: QuoteTemplate | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating quote template:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteQuoteTemplate = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quote_templates')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting quote template:', err);
    return { error: err as Error };
  }
};

// Product Library operations (using quote_line_items table)
export const getProductLibrary = async (
  organisationId: string,
  filters: ProductFilters = {}
): Promise<{ data: ProductLibraryItem[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('quote_line_items')
      .select('id, organisation_id, name, description, unit_price, unit, vat_rate, category, created_at')
      .eq('organisation_id', organisationId)
      .eq('is_library_item', true);

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('name');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching product library:', err);
    return { data: null, error: err as Error };
  }
};

export const createProductLibraryItem = async (
  item: Omit<ProductLibraryItem, 'id' | 'created_at'>
): Promise<{ data: ProductLibraryItem | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_line_items')
      .insert([{
        organisation_id: item.organisation_id,
        name: item.name,
        description: item.description,
        unit_price: item.unit_price,
        unit: item.unit,
        category: item.category,
        vat_rate: item.vat_rate ?? 25,
        is_library_item: true,
        quantity: 1, // Default for library items
        total: item.unit_price, // Default for library items
        sort_order: 0 // Default for library items
      }])
      .select('id, organisation_id, name, description, unit_price, unit, vat_rate, category, created_at')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating product library item:', err);
    return { data: null, error: err as Error };
  }
};

export const updateProductLibraryItem = async (
  id: string,
  updates: Partial<Omit<ProductLibraryItem, 'id' | 'created_at'>>
): Promise<{ data: ProductLibraryItem | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_line_items')
      .update(updates)
      .eq('id', id)
      .eq('is_library_item', true)
      .select('id, organisation_id, name, description, unit_price, unit, vat_rate, category, created_at')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating product library item:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteProductLibraryItem = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quote_line_items')
      .delete()
      .eq('id', id)
      .eq('is_library_item', true);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting product library item:', err);
    return { error: err as Error };
  }
};

// Utility functions
export const getProductCategories = async (
  organisationId: string
): Promise<{ data: string[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_line_items')
      .select('category')
      .eq('organisation_id', organisationId)
      .eq('is_library_item', true)
      .not('category', 'is', null);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const categories = Array.from(new Set(data?.map(item => item.category).filter(Boolean))) as string[];
    return { data: categories, error: null };
  } catch (err) {
    console.error('Error fetching product categories:', err);
    return { data: null, error: err as Error };
  }
};

export const createDefaultTemplates = async (
  organisationId: string
): Promise<{ error: Error | null }> => {
  try {
    const defaultTemplates: Omit<QuoteTemplate, 'id' | 'created_at' | 'sort_order'>[] = [
      {
        organisation_id: organisationId,
        name: 'Professionell Offert',
        description: 'Komplett offertmall med alla professionella element',
        content_structure: [
          // Company & Document Header Row
          { id: '1', type: 'header_row', content: null },
          // Customer Information
          { id: '2', type: 'customer_info', content: null },
          // Spacer
          { id: '3', type: 'spacer', content: null, settings: { spacerHeight: 24 } },
          // Quote Title
          { id: '4', type: 'header', content: 'Offert', settings: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
          // Quote Description
          { id: '5', type: 'text_block', content: 'Tack för ert intresse! Vi har nöjet att presentera följande offert för ert projekt.' },
          // Line Items Table
          {
            id: '6',
            type: 'line_items_table',
            content: [
              {
                name: 'Exempeltjänst',
                description: 'Beskrivning av tjänsten',
                quantity: 1,
                unit_price: 1000,
                unit: 'st',
                category: 'Tjänster'
              }
            ]
          },
          // Totals
          { id: '7', type: 'totals', content: null },
          // Divider
          { id: '8', type: 'divider', content: null },
          // Quote Validity
          { id: '9', type: 'quote_validity', content: null },
          // Terms Section
          { id: '10', type: 'terms', content: 'Betalningsvillkor: 30 dagar netto.\nGaranti: Vi garanterar vårt arbete enligt gällande villkor.\nUtförande: Arbetet påbörjas efter godkänd offert.' },
          // Acceptance Section
          { id: '11', type: 'acceptance_section', content: null },
          // Page Footer
          { id: '12', type: 'page_footer', content: null }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30,
          notes: 'Professionell offertmall med alla standardelement',
          template_type: 'quote'
        }
      },
      {
        organisation_id: organisationId,
        name: 'Enkel Offert',
        description: 'Enkel offertmall för snabba offerter',
        content_structure: [
          { id: '1', type: 'header_row', content: null },
          { id: '2', type: 'customer_info', content: null },
          { id: '3', type: 'spacer', content: null, settings: { spacerHeight: 16 } },
          { id: '4', type: 'header', content: 'Offert', settings: { fontSize: 'xl', fontWeight: 'bold' } },
          { id: '5', type: 'text_block', content: 'Vi erbjuder följande tjänster enligt nedan.' },
          {
            id: '6',
            type: 'line_items_table',
            content: []
          },
          { id: '7', type: 'totals', content: null },
          { id: '8', type: 'quote_validity', content: null },
          { id: '9', type: 'footer', content: 'Betalningsvillkor: 30 dagar netto. Vid frågor, kontakta oss gärna.' }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30,
          template_type: 'quote'
        }
      },
      {
        organisation_id: organisationId,
        name: 'Taktvätt - Standard',
        description: 'Standardmall för taktvätt med vanliga tjänster',
        content_structure: [
          { id: '1', type: 'header_row', content: null },
          { id: '2', type: 'customer_info', content: null },
          { id: '3', type: 'spacer', content: null, settings: { spacerHeight: 16 } },
          { id: '4', type: 'header', content: 'Offert för Taktvätt', settings: { fontSize: 'xl', fontWeight: 'bold' } },
          { id: '5', type: 'text_block', content: 'Vi erbjuder professionell taktvätt med miljövänliga metoder och garanterat resultat.' },
          {
            id: '6',
            type: 'line_items_table',
            content: [
              {
                name: 'Taktvätt',
                description: 'Grundlig rengöring av takyta',
                quantity: 1,
                unit_price: 150,
                unit: 'kvm',
                category: 'Taktvätt'
              },
              {
                name: 'Mossbehandling',
                description: 'Behandling mot mossa och alger',
                quantity: 1,
                unit_price: 50,
                unit: 'kvm',
                category: 'Taktvätt'
              },
              {
                name: 'Takrännerengöring',
                description: 'Rengöring av takrännor och stuprör',
                quantity: 1,
                unit_price: 800,
                unit: 'st',
                category: 'Taktvätt'
              }
            ]
          },
          { id: '7', type: 'totals', content: null },
          { id: '8', type: 'divider', content: null },
          { id: '9', type: 'quote_validity', content: null },
          { id: '10', type: 'terms', content: 'Pris inkluderar material och arbetskostnad.\nGaranti på utfört arbete enligt våra standardvillkor.' },
          { id: '11', type: 'page_footer', content: null }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30,
          template_type: 'quote'
        }
      },
      // ==================== PREMIUM MULTI-PAGE TEMPLATE ====================
      {
        organisation_id: organisationId,
        name: 'Premium Offert (Flersidig)',
        description: 'Professionell flersidig offert med framsida, om oss, offertdetaljer, garantier och omdömen',
        content_structure: [
          // ---- PAGE 1: COVER ----
          {
            id: 'p1', type: 'cover_page',
            content: {
              backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
              title: 'Professionell Offert',
              subtitle: 'Skräddarsydd lösning för ert projekt',
              showLogo: true
            }
          },
          { id: 'pb1', type: 'page_break', content: null },

          // ---- PAGE 2: ABOUT US ----
          {
            id: 'p2a', type: 'split_content',
            content: {
              imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600',
              headline: 'Om Oss',
              paragraph: 'Vi är ett erfaret team med passion för kvalitet och kundnöjdhet. Med över 10 års erfarenhet levererar vi skräddarsydda lösningar som överträffar förväntningar.\n\nVår filosofi bygger på transparens, pålitlighet och hantverksskicklighet.',
              imagePosition: 'left'
            }
          },
          { id: 'p2s', type: 'spacer', content: null, settings: { spacerHeight: 32 } },
          {
            id: 'p2b', type: 'split_content',
            content: {
              imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600',
              headline: 'Varför Välja Oss?',
              paragraph: '✓ Certifierade och försäkrade\n✓ Garanti på allt arbete\n✓ Miljövänliga metoder\n✓ Snabb och pålitlig service\n✓ Konkurrenskraftiga priser',
              imagePosition: 'right'
            }
          },
          { id: 'pb2', type: 'page_break', content: null },

          // ---- PAGE 3: QUOTE DETAILS ----
          { id: 'p3row', type: 'header_row', content: null },
          { id: 'p3cust', type: 'customer_info', content: null },
          { id: 'p3sp', type: 'spacer', content: null, settings: { spacerHeight: 20 } },
          { id: 'p3h', type: 'header', content: 'Offertspecifikation', settings: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
          { id: 'p3desc', type: 'text_block', content: 'Nedan presenterar vi vår detaljerade offert baserad på era önskemål och vår besiktning.' },
          {
            id: 'p3items', type: 'line_items_table', content: [
              { name: 'Exempeltjänst', description: 'Beskrivning av tjänsten', quantity: 1, unit_price: 5000, unit: 'st', category: 'Tjänster' }
            ]
          },
          { id: 'p3tot', type: 'totals', content: null },
          { id: 'p3div', type: 'divider', content: null },
          { id: 'p3val', type: 'quote_validity', content: null },
          { id: 'pb3', type: 'page_break', content: null },

          // ---- PAGE 4: GUARANTEES & TERMS ----
          { id: 'p4h', type: 'header', content: 'Garantier & Villkor', settings: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
          { id: 'p4sp', type: 'spacer', content: null, settings: { spacerHeight: 16 } },
          { id: 'p4terms', type: 'terms', content: 'Betalningsvillkor: 30 dagar netto.\n\nGaranti: Vi lämnar 5 års garanti på allt utfört arbete.\n\nFörsäkring: Vi är fullt försäkrade för alla typer av skador som kan uppstå.\n\nMiljö: Vi använder uteslutande miljögodkända produkter och metoder.\n\nÄndringar: Eventuella tilläggsarbeten faktureras separat efter skriftlig överenskommelse.' },
          { id: 'p4acc', type: 'acceptance_section', content: null },
          { id: 'pb4', type: 'page_break', content: null },

          // ---- PAGE 5: TESTIMONIALS ----
          { id: 'p5h', type: 'header', content: 'Vad Våra Kunder Säger', settings: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
          { id: 'p5sp', type: 'spacer', content: null, settings: { spacerHeight: 16 } },
          {
            id: 'p5t', type: 'testimonials',
            content: [
              { name: 'Anna Svensson', rating: 5, quote: 'Fantastiskt arbete! Resultatet överträffade alla våra förväntningar. Rekommenderas varmt.' },
              { name: 'Erik Johansson', rating: 5, quote: 'Professionella från start till slut. Punktliga, noggranna och vänliga. Kommer definitivt anlita igen.' },
              { name: 'Maria Lindberg', rating: 4, quote: 'Mycket nöjd med kvaliteten. Bra kommunikation genom hela projektet och rimligt pris.' }
            ]
          },
          { id: 'p5sp2', type: 'spacer', content: null, settings: { spacerHeight: 24 } },

          // ---- FOOTER ----
          { id: 'pfoot', type: 'page_footer', content: null }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30,
          notes: 'Premium flersidig offertmall med framsida, om oss, offertdetaljer, garantier och kundomdömen',
          template_type: 'quote'
        }
      }
    ];

    for (const template of defaultTemplates) {
      await createQuoteTemplate(template);
    }

    return { error: null };
  } catch (err) {
    console.error('Error creating default templates:', err);
    return { error: err as Error };
  }
};

export const createDefaultInvoiceTemplates = async (
  organisationId: string
): Promise<{ error: Error | null }> => {
  try {
    const defaultTemplates: Omit<QuoteTemplate, 'id' | 'created_at' | 'sort_order'>[] = [
      {
        organisation_id: organisationId,
        name: 'Professionell Faktura',
        description: 'Komplett fakturamall med alla obligatoriska element',
        content_structure: [
          // Company & Document Header Row
          { id: '1', type: 'header_row', content: null },
          // Customer Information
          { id: '2', type: 'customer_info', content: null },
          // Spacer
          { id: '3', type: 'spacer', content: null, settings: { spacerHeight: 20 } },
          // Invoice Header (number, date, due date)
          { id: '4', type: 'invoice_header', content: null },
          // Line Items Table
          {
            id: '5',
            type: 'line_items_table',
            content: [] // Empty - products come from invoice
          },
          // Totals
          { id: '6', type: 'totals', content: null },
          // Divider
          { id: '7', type: 'divider', content: null },
          // Payment Information (OCR, bank details, due date)
          { id: '8', type: 'payment_info', content: null },
          // Terms Section
          { id: '9', type: 'terms', content: 'Betalningsvillkor: 30 dagar netto.\nDröjsmålsränta: Vid försenad betalning debiteras dröjsmålsränta enligt räntelagen.\nFakturering sker enligt Sveriges lagar.' },
          // F-skatt Text
          { id: '10', type: 'f_skatt_text', content: null },
          // Page Footer
          { id: '11', type: 'page_footer', content: null }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30,
          template_type: 'invoice'
        }
      },
      {
        organisation_id: organisationId,
        name: 'Enkel Faktura',
        description: 'Minimalistisk fakturamall för snabba fakturor',
        content_structure: [
          { id: '1', type: 'header_row', content: null },
          { id: '2', type: 'customer_info', content: null },
          { id: '3', type: 'spacer', content: null, settings: { spacerHeight: 16 } },
          { id: '4', type: 'header', content: 'Faktura', settings: { fontSize: 'xl', fontWeight: 'bold' } },
          {
            id: '5',
            type: 'line_items_table',
            content: []
          },
          { id: '6', type: 'totals', content: null },
          { id: '7', type: 'payment_info', content: null },
          { id: '8', type: 'f_skatt_text', content: null }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30,
          template_type: 'invoice'
        }
      },
      {
        organisation_id: organisationId,
        name: 'ROT/RUT Faktura',
        description: 'Fakturamall med ROT/RUT-avdrag',
        content_structure: [
          { id: '1', type: 'header_row', content: null },
          { id: '2', type: 'customer_info', content: null },
          { id: '3', type: 'spacer', content: null, settings: { spacerHeight: 16 } },
          { id: '4', type: 'invoice_header', content: null },
          {
            id: '5',
            type: 'line_items_table',
            content: []
          },
          { id: '6', type: 'totals', content: null },
          // ROT/RUT info text block
          { id: '7', type: 'text_block', content: '**ROT/RUT-avdrag**\nDenna faktura är underlag för ROT/RUT-avdrag. Avdraget hanteras via Skatteverket.\nArbetskostnad som berättigar till avdrag visas separat på raden.', settings: { backgroundColor: '#EBF5FF', paddingTop: 12, paddingBottom: 12, paddingLeft: 12, paddingRight: 12, borderRadius: 8 } },
          { id: '8', type: 'divider', content: null },
          { id: '9', type: 'payment_info', content: null },
          { id: '10', type: 'terms', content: 'Betalning: Efter ROT/RUT-avdrag ska resterande belopp betalas inom 30 dagar.\nObservera: ROT/RUT-avdrag kan endast göras av fysisk person för arbete i egen bostad.' },
          { id: '11', type: 'f_skatt_text', content: null },
          { id: '12', type: 'page_footer', content: null }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30,
          template_type: 'invoice'
        }
      }
    ];

    for (const template of defaultTemplates) {
      await createQuoteTemplate(template);
    }

    return { error: null };
  } catch (err) {
    console.error('Error creating default invoice templates:', err);
    return { error: err as Error };
  }
};

// Helper function to extract line items from content structure
export const extractLineItemsFromTemplate = (template: QuoteTemplate): QuoteLineItemTemplate[] => {
  const lineItemsBlocks = template.content_structure.filter(block => block.type === 'line_items_table');
  const allLineItems: QuoteLineItemTemplate[] = [];

  lineItemsBlocks.forEach(block => {
    if (Array.isArray(block.content)) {
      allLineItems.push(...block.content);
    }
  });

  return allLineItems;
};

// Helper function to calculate template total from content structure
export const calculateTemplateTotal = (template: QuoteTemplate): number => {
  const lineItems = extractLineItemsFromTemplate(template);
  return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
};

export const createDefaultProductLibrary = async (
  organisationId: string
): Promise<{ error: Error | null }> => {
  try {
    const defaultProducts: Omit<ProductLibraryItem, 'id' | 'created_at'>[] = [
      // Taktvätt
      {
        organisation_id: organisationId,
        name: 'Taktvätt',
        description: 'Grundlig rengöring av takyta med professionell utrustning',
        unit_price: 150,
        unit: 'kvm',
        category: 'Taktvätt'
      },
      {
        organisation_id: organisationId,
        name: 'Mossbehandling',
        description: 'Behandling mot mossa och alger på takyta',
        unit_price: 50,
        unit: 'kvm',
        category: 'Taktvätt'
      },
      {
        organisation_id: organisationId,
        name: 'Takrännerengöring',
        description: 'Rengöring av takrännor och stuprör',
        unit_price: 800,
        unit: 'st',
        category: 'Taktvätt'
      },
      // Fasadtvätt
      {
        organisation_id: organisationId,
        name: 'Fasadtvätt',
        description: 'Professionell fasadrengöring med miljövänliga medel',
        unit_price: 80,
        unit: 'kvm',
        category: 'Fasadtvätt'
      },
      {
        organisation_id: organisationId,
        name: 'Högtryckstvätt',
        description: 'Högtryckstvätt av fasadytor och betongstrukturer',
        unit_price: 120,
        unit: 'kvm',
        category: 'Fasadtvätt'
      },
      // Fönsterputsning
      {
        organisation_id: organisationId,
        name: 'Fönsterputsning',
        description: 'Professionell fönsterputsning in- och utsida',
        unit_price: 25,
        unit: 'kvm',
        category: 'Fönsterputsning'
      },
      {
        organisation_id: organisationId,
        name: 'Karmrengöring',
        description: 'Rengöring av fönsterkarmar och trösklar',
        unit_price: 15,
        unit: 'löpm',
        category: 'Fönsterputsning'
      },
      // Allmänt
      {
        organisation_id: organisationId,
        name: 'Arbetstid',
        description: 'Allmän arbetstid för diverse uppdrag',
        unit_price: 650,
        unit: 'tim',
        category: 'Allmänt'
      },
      {
        organisation_id: organisationId,
        name: 'Materialhantering',
        description: 'Hantering och transport av material',
        unit_price: 200,
        unit: 'st',
        category: 'Allmänt'
      }
    ];

    for (const product of defaultProducts) {
      await createProductLibraryItem(product);
    }

    return { error: null };
  } catch (err) {
    console.error('Error creating default product library:', err);
    return { error: err as Error };
  }
};

// Unit labels for Swedish
export const UNIT_LABELS = {
  st: 'st',
  kvm: 'kvm',
  tim: 'tim',
  löpm: 'löpm',
  kg: 'kg',
  liter: 'liter',
  meter: 'meter'
};

export const UNIT_DESCRIPTIONS = {
  st: 'Styck',
  kvm: 'Kvadratmeter',
  tim: 'Timmar',
  löpm: 'Löpmeter',
  kg: 'Kilogram',
  liter: 'Liter',
  meter: 'Meter'
};
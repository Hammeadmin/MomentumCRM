import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Mail, MessageSquare, Send, Paperclip, Loader2, FileText, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { createCommunication, EMAIL_TEMPLATES, SMS_TEMPLATES, processTemplate, validateEmail, validatePhoneNumber } from '../lib/communications';
import type { Customer, Order, Invoice, Quote } from '../types/database';
import { Button } from './ui';

interface ContactCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onCommunicationSent?: () => void;
}

interface Attachment {
  file: File;
  base64: string;
}

type ContactMethod = 'email' | 'sms';
type ContextType = 'order' | 'invoice' | 'quote';

interface ContextDataState {
  orders: Order[];
  invoices: Invoice[];
  quotes: Quote[];
  ordersLoading: boolean;
  invoicesLoading: boolean;
  quotesLoading: boolean;
  ordersLoaded: boolean;
  invoicesLoaded: boolean;
  quotesLoaded: boolean;
}

const extractTemplateVariables = (template: string): string[] => {
  const regex = /\{([^}]+)\}/g;
  const matches = template.match(regex);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
};

const requiresContext = (variables: string[]): { order: boolean; invoice: boolean; quote: boolean } => {
  const orderVars = ['order_id', 'order_title', 'order_description', 'planned_date', 'visit_time', 'estimated_duration'];
  const invoiceVars = ['invoice_number', 'invoice_amount', 'invoice_due_date'];
  const quoteVars = ['quote_number', 'quote_amount', 'quote_valid_until'];

  return {
    order: variables.some(v => orderVars.includes(v)),
    invoice: variables.some(v => invoiceVars.includes(v)),
    quote: variables.some(v => quoteVars.includes(v))
  };
};

const ContactCustomerModal: React.FC<ContactCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onCommunicationSent
}) => {
  const { user, organisationId, organisation } = useAuth();
  const { success, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingRef = useRef({ orders: false, invoices: false, quotes: false });

  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [contextData, setContextData] = useState<ContextDataState>({
    orders: [],
    invoices: [],
    quotes: [],
    ordersLoading: false,
    invoicesLoading: false,
    quotesLoading: false,
    ordersLoaded: false,
    invoicesLoaded: false,
    quotesLoaded: false
  });
  const [selectedContextType, setSelectedContextType] = useState<ContextType | null>(null);
  const [selectedContextId, setSelectedContextId] = useState<string>('');
  const [showContextSection, setShowContextSection] = useState(false);

  const templates = contactMethod === 'email' ? EMAIL_TEMPLATES : SMS_TEMPLATES;

  const selectedTemplateObj = useMemo(() => {
    return templates.find(t => t.id === selectedTemplate);
  }, [templates, selectedTemplate]);

  const templateVariables = useMemo(() => {
    if (!selectedTemplateObj) return [];
    const contentVars = extractTemplateVariables(selectedTemplateObj.content);
    if ('subject' in selectedTemplateObj) {
      const subjectVars = extractTemplateVariables(selectedTemplateObj.subject);
      return [...new Set([...contentVars, ...subjectVars])];
    }
    return contentVars;
  }, [selectedTemplateObj]);

  const contextRequirements = useMemo(() => {
    return requiresContext(templateVariables);
  }, [templateVariables]);

  const needsContextSelector = useMemo(() => {
    return contextRequirements.order || contextRequirements.invoice || contextRequirements.quote;
  }, [contextRequirements]);

  useEffect(() => {
    if (!isOpen) {
      setContextData({
        orders: [],
        invoices: [],
        quotes: [],
        ordersLoading: false,
        invoicesLoading: false,
        quotesLoading: false,
        ordersLoaded: false,
        invoicesLoaded: false,
        quotesLoaded: false
      });
      setShowContextSection(false);
      loadingRef.current = { orders: false, invoices: false, quotes: false };
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTemplate && needsContextSelector) {
      setShowContextSection(true);
      setSelectedContextType(null);
      setSelectedContextId('');
    } else {
      setShowContextSection(false);
    }
  }, [selectedTemplate, needsContextSelector]);

  const loadOrders = useCallback(async () => {
    if (!organisationId || !customer?.id) return;
    if (loadingRef.current.orders || contextData.ordersLoaded) return;

    loadingRef.current.orders = true;
    setContextData(prev => ({ ...prev, ordersLoading: true }));

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading orders:', error);
        throw error;
      }

      setContextData(prev => ({
        ...prev,
        orders: data || [],
        ordersLoaded: true,
        ordersLoading: false
      }));
    } catch (err) {
      console.error('Error loading orders:', err);
      setContextData(prev => ({ ...prev, ordersLoading: false }));
    } finally {
      loadingRef.current.orders = false;
    }
  }, [organisationId, customer?.id, contextData.ordersLoaded]);

  const loadInvoices = useCallback(async () => {
    if (!organisationId || !customer?.id) return;
    if (loadingRef.current.invoices || contextData.invoicesLoaded) return;

    loadingRef.current.invoices = true;
    setContextData(prev => ({ ...prev, invoicesLoading: true }));

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading invoices:', error);
        throw error;
      }

      setContextData(prev => ({
        ...prev,
        invoices: data || [],
        invoicesLoaded: true,
        invoicesLoading: false
      }));
    } catch (err) {
      console.error('Error loading invoices:', err);
      setContextData(prev => ({ ...prev, invoicesLoading: false }));
    } finally {
      loadingRef.current.invoices = false;
    }
  }, [organisationId, customer?.id, contextData.invoicesLoaded]);

  const loadQuotes = useCallback(async () => {
    if (!organisationId || !customer?.id) return;
    if (loadingRef.current.quotes || contextData.quotesLoaded) return;

    loadingRef.current.quotes = true;
    setContextData(prev => ({ ...prev, quotesLoading: true }));

    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, total_amount, valid_until, status, title')
        .eq('organisation_id', organisationId)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading quotes:', error);
        throw error;
      }

      setContextData(prev => ({
        ...prev,
        quotes: data || [],
        quotesLoaded: true,
        quotesLoading: false
      }));
    } catch (err) {
      console.error('Error loading quotes:', err);
      setContextData(prev => ({ ...prev, quotesLoading: false }));
    } finally {
      loadingRef.current.quotes = false;
    }
  }, [organisationId, customer?.id, contextData.quotesLoaded]);

  const buildVariables = useCallback((contextType: ContextType | null, contextId: string): Record<string, string> => {
    const companyName = organisation?.name || 'Vart foretag';

    const baseVariables: Record<string, string> = {
      customer_name: customer.name,
      company_name: companyName,
      date: new Date().toLocaleDateString('sv-SE'),
      time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
      minutes: '15',
    };

    if (contextType === 'order' && contextId) {
      const order = contextData.orders.find(o => o.id === contextId);
      if (order) {
        return {
          ...baseVariables,
          order_id: order.id.slice(-8).toUpperCase(),
          order_title: order.title || '',
          order_description: order.description || order.job_description || '',
          planned_date: order.planned_start_date
            ? new Date(order.planned_start_date).toLocaleDateString('sv-SE')
            : 'Ej bestamt',
          visit_time: 'Enligt overenskommelse',
          estimated_duration: '2-4 timmar',
        };
      }
    }

    if (contextType === 'invoice' && contextId) {
      const invoice = contextData.invoices.find(i => i.id === contextId);
      if (invoice) {
        const invoiceAmount = invoice.amount ?? 0;
        return {
          ...baseVariables,
          invoice_number: invoice.invoice_number || invoice.id.slice(-8).toUpperCase(),
          invoice_amount: invoiceAmount.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' }),
          invoice_due_date: invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString('sv-SE')
            : 'Ej angivet',
        };
      }
    }

    if (contextType === 'quote' && contextId) {
      const quote = contextData.quotes.find(q => q.id === contextId);
      if (quote) {
        return {
          ...baseVariables,
          quote_number: quote.quote_number || quote.id.slice(-8).toUpperCase(),
          quote_amount: quote.total_amount?.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' }) || '0 kr',
          quote_valid_until: quote.valid_until
            ? new Date(quote.valid_until).toLocaleDateString('sv-SE')
            : 'Ej angivet',
        };
      }
    }

    return baseVariables;
  }, [organisation?.name, customer.name, contextData]);

  const applyTemplate = useCallback((template: typeof selectedTemplateObj, variables: Record<string, string>) => {
    if (!template) return;

    const processedContent = processTemplate(template.content, variables);
    setContent(processedContent);

    if (contactMethod === 'email' && 'subject' in template) {
      const processedSubject = processTemplate(template.subject, variables);
      setSubject(processedSubject);
    }
  }, [contactMethod]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    setSelectedContextType(null);
    setSelectedContextId('');

    if (!templateId) {
      setContent('');
      setSubject('');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const variables = buildVariables(null, '');
    applyTemplate(template, variables);
  };

  const handleContextChange = (type: ContextType, id: string) => {
    if (selectedContextType === type && selectedContextId === id) return;

    setSelectedContextType(id ? type : null);
    setSelectedContextId(id);

    if (selectedTemplateObj && id) {
      const variables = buildVariables(type, id);
      applyTemplate(selectedTemplateObj, variables);
    } else if (selectedTemplateObj && !id) {
      const variables = buildVariables(null, '');
      applyTemplate(selectedTemplateObj, variables);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 10 * 1024 * 1024;

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        showError('Fil for stor', `${file.name} overstiger maxgransen pa 10MB`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        setAttachments(prev => [...prev, { file, base64 }]);
      } catch {
        showError('Fel', `Kunde inte lasa ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '46' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  const handleSend = async () => {
    if (!organisationId || !user) {
      showError('Fel', 'Du maste vara inloggad');
      return;
    }

    if (contactMethod === 'email') {
      if (!customer.email) {
        showError('Fel', 'Kunden har ingen e-postadress');
        return;
      }
      if (!validateEmail(customer.email)) {
        showError('Fel', 'Ogiltig e-postadress');
        return;
      }
      if (!subject.trim()) {
        showError('Fel', 'Amne ar obligatoriskt');
        return;
      }
    } else {
      if (!customer.phone_number) {
        showError('Fel', 'Kunden har inget telefonnummer');
        return;
      }
      if (!validatePhoneNumber(customer.phone_number)) {
        showError('Fel', 'Ogiltigt telefonnummer');
        return;
      }
    }

    if (!content.trim()) {
      showError('Fel', 'Meddelande ar obligatoriskt');
      return;
    }

    setIsSending(true);

    try {
      const orderId = selectedContextType === 'order' ? selectedContextId : undefined;

      const communicationResult = await createCommunication({
        organisation_id: organisationId,
        customer_id: customer.id,
        order_id: orderId || null,
        type: contactMethod,
        recipient: contactMethod === 'email' ? customer.email! : customer.phone_number!,
        subject: contactMethod === 'email' ? subject : null,
        content: content,
        status: 'draft',
        created_by_user_id: user.id,
      });

      if (communicationResult.error) {
        throw communicationResult.error;
      }

      const communicationId = communicationResult.data?.id;

      if (contactMethod === 'email') {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            communication_id: communicationId,
            to: customer.email,
            subject: subject,
            content: content,
            attachments: attachments.map(att => ({
              filename: att.file.name,
              content: att.base64
            }))
          }
        });

        if (error || !data?.success) {
          throw new Error(error?.message || data?.error || 'Kunde inte skicka e-post');
        }
      } else {
        const formattedPhone = formatPhoneNumber(customer.phone_number!);
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            to: formattedPhone,
            message: content,
            organisation_id: organisationId,
            created_by_user_id: user.id
          }
        });

        if (error || !data?.success) {
          throw new Error(error?.message || data?.error || 'Kunde inte skicka SMS');
        }
      }

      success(
        contactMethod === 'email' ? 'E-post skickat' : 'SMS skickat',
        `Meddelandet har skickats till ${customer.name}`
      );

      onCommunicationSent?.();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ett fel uppstod';
      showError('Kunde inte skicka', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setContactMethod('email');
    setSelectedTemplate('');
    setSubject('');
    setContent('');
    setAttachments([]);
    setSelectedContextType(null);
    setSelectedContextId('');
    setShowContextSection(false);
    onClose();
  };

  if (!isOpen) return null;

  const hasEmail = !!customer.email;
  const hasPhone = !!customer.phone_number;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Kontakta kund
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {customer.name}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kontaktmetod
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setContactMethod('email'); setSelectedTemplate(''); }}
                disabled={!hasEmail}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  contactMethod === 'email'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } ${!hasEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Mail className="w-5 h-5" />
                <span className="font-medium">E-post</span>
                {!hasEmail && <span className="text-xs text-gray-400">(saknas)</span>}
              </button>
              <button
                type="button"
                onClick={() => { setContactMethod('sms'); setSelectedTemplate(''); setSubject(''); setAttachments([]); }}
                disabled={!hasPhone}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  contactMethod === 'sms'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } ${!hasPhone ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">SMS</span>
                {!hasPhone && <span className="text-xs text-gray-400">(saknas)</span>}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Mottagare:</span>{' '}
              {contactMethod === 'email' ? customer.email || 'Ingen e-post' : customer.phone_number || 'Inget telefonnummer'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mall (valfritt)
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Skriv eget meddelande...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {showContextSection && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Valj relaterad data for mallen
              </label>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                Valj en order, faktura eller offert for att automatiskt fylla i uppgifterna i mallen.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Order {contextRequirements.order && <span className="text-blue-500">*</span>}
                  </label>
                  <select
                    value={selectedContextType === 'order' ? selectedContextId : ''}
                    onChange={(e) => handleContextChange('order', e.target.value)}
                    onClick={loadOrders}
                    onFocus={loadOrders}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">
                      {contextData.ordersLoading ? 'Laddar ordrar...' : 'Valj order...'}
                    </option>
                    {contextData.orders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.title || 'Utan titel'} (#{order.id.slice(-6).toUpperCase()})
                      </option>
                    ))}
                    {contextData.ordersLoaded && contextData.orders.length === 0 && (
                      <option disabled>Inga ordrar for denna kund</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Faktura {contextRequirements.invoice && <span className="text-blue-500">*</span>}
                  </label>
                  <select
                    value={selectedContextType === 'invoice' ? selectedContextId : ''}
                    onChange={(e) => handleContextChange('invoice', e.target.value)}
                    onClick={loadInvoices}
                    onFocus={loadInvoices}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">
                      {contextData.invoicesLoading ? 'Laddar fakturor...' : 'Valj faktura...'}
                    </option>
                    {contextData.invoices.map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number || `#${invoice.id.slice(-6).toUpperCase()}`} - {(invoice.amount ?? 0).toLocaleString('sv-SE')} kr
                      </option>
                    ))}
                    {contextData.invoicesLoaded && contextData.invoices.length === 0 && (
                      <option disabled>Inga fakturor for denna kund</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Offert {contextRequirements.quote && <span className="text-blue-500">*</span>}
                  </label>
                  <select
                    value={selectedContextType === 'quote' ? selectedContextId : ''}
                    onChange={(e) => handleContextChange('quote', e.target.value)}
                    onClick={loadQuotes}
                    onFocus={loadQuotes}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">
                      {contextData.quotesLoading ? 'Laddar offerter...' : 'Valj offert...'}
                    </option>
                    {contextData.quotes.map(quote => (
                      <option key={quote.id} value={quote.id}>
                        {quote.quote_number || quote.title || `#${quote.id.slice(-6).toUpperCase()}`} - {quote.total_amount?.toLocaleString('sv-SE')} kr
                      </option>
                    ))}
                    {contextData.quotesLoaded && contextData.quotes.length === 0 && (
                      <option disabled>Inga offerter for denna kund</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {contactMethod === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amne *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ange amne..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meddelande *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={contactMethod === 'email' ? 8 : 4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={contactMethod === 'email' ? 'Skriv ditt meddelande...' : 'Max 160 tecken rekommenderas...'}
            />
            {contactMethod === 'sms' && (
              <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{content.length} tecken</span>
                <span>{Math.ceil(content.length / 160) || 1} SMS</span>
              </div>
            )}
          </div>

          {contactMethod === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bilagor
              </label>
              <div className="space-y-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
                        {att.file.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({(att.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full justify-center"
                >
                  <Paperclip className="w-4 h-4" />
                  Lagg till bilaga
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                />
              </div>
            </div>
          )}

          {((!hasEmail && contactMethod === 'email') || (!hasPhone && contactMethod === 'sms')) && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {contactMethod === 'email'
                  ? 'Kunden har ingen registrerad e-postadress. Uppdatera kundens uppgifter for att skicka e-post.'
                  : 'Kunden har inget registrerat telefonnummer. Uppdatera kundens uppgifter for att skicka SMS.'
                }
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Avbryt
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={isSending || (contactMethod === 'email' && !hasEmail) || (contactMethod === 'sms' && !hasPhone)}
            icon={isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          >
            {isSending ? 'Skickar...' : (contactMethod === 'email' ? 'Skicka e-post' : 'Skicka SMS')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactCustomerModal;

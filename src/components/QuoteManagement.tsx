import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  Copy,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  RefreshCw,
  AlertCircle,
  Briefcase,
  FileUp,
  Loader2
} from 'lucide-react';
import {
  getQuotes,
  getCustomers,
  getLeads,
  updateQuote,
  deleteQuote,
  duplicateQuote,
  convertQuoteToJob,
  getQuoteById,
  formatCurrency,
  formatDate
} from '../lib/database';
import { sendOrderConfirmationEmail } from '../lib/quotes';
import { uploadSignedDocument } from '../lib/storage';
import { getQuoteTemplates, type QuoteTemplate } from '../lib/quoteTemplates';
import type { Quote, Customer, Lead, QuoteStatus, QuoteLineItem } from '../types/database';
import { QUOTE_STATUS_LABELS, getQuoteStatusColor } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import SendCustomerReminderModal from './SendCustomerReminderModal';
import QuoteEditModal from './QuoteEditModal';
import QuotePreviewModal from './QuotePreviewModal';
import SendQuoteModal from './SendQuoteModal';
import { Button } from './ui';
import { supabase } from '../lib/supabase';

interface QuoteWithRelations extends Quote {
  customer?: Customer;
  lead?: Lead;
  line_items?: QuoteLineItem[];
}

function QuoteManagement() {
  const { organisationId } = useAuth();
  const { success } = useToast();
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<QuoteWithRelations | null>(null);

  // Reminder states
  const [showCustomerReminderModal, setShowCustomerReminderModal] = useState(false);
  const [quoteForCustomerReminder, setQuoteForCustomerReminder] = useState<QuoteWithRelations | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteWithRelations | null>(null);

  // Send Quote states
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [quoteToSend, setQuoteToSend] = useState<QuoteWithRelations | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');


  useEffect(() => {
    // Check if we navigated here with an order object in the state
    const orderToQuote = location.state?.orderToQuote;
    // Check if we navigated here from customer page to create quote for customer
    const createForCustomer = location.state?.createForCustomer;

    if (orderToQuote) {
      // Pre-populate by setting a "draft" editing quote
      // Use cast to satisfy type, empty ID ensures it is treated as creation
      const draftQuote = {
        id: '',
        customer_id: orderToQuote.customer_id,
        lead_id: orderToQuote.lead_id || '',
        title: `Offert för: ${orderToQuote.title}`,
        description: orderToQuote.description || '',
        // Note: order_id might need to be handled if we want to link back explicitly
        // For now, mapping basic fields
        status: 'draft',
        total_amount: 0
      } as unknown as QuoteWithRelations;

      setEditingQuote(draftQuote);
      setShowCreateModal(true);

      // Clear the state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title)
    } else if (createForCustomer) {
      // Pre-populate with just the customer
      const draftQuote = {
        id: '',
        customer_id: createForCustomer.id,
        customer: createForCustomer,
        title: `Offert för ${createForCustomer.name}`,
        description: '',
        status: 'draft',
        total_amount: 0
      } as unknown as QuoteWithRelations;

      setEditingQuote(draftQuote);
      setShowCreateModal(true);

      // Clear the state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  useEffect(() => {
    loadData();
  }, [statusFilter, searchTerm, dateFrom, dateTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        status: statusFilter,
        search: searchTerm,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      };

      const [quotesResult, customersResult, leadsResult, templatesResult] = await Promise.all([
        getQuotes(organisationId!, filters),
        getCustomers(organisationId!),
        getLeads(organisationId!),
        getQuoteTemplates(organisationId!)
      ]);

      if (quotesResult.error) {
        setError(quotesResult.error.message);
        return;
      }

      if (customersResult.error) {
        setError(customersResult.error.message);
        return;
      }

      if (leadsResult.error) {
        setError(leadsResult.error.message);
        return;
      }

      // Load templates for quote creation
      if (templatesResult.error) {
        setError(templatesResult.error.message);
        return;
      }

      setTemplates(templatesResult.data || []);

      setQuotes(quotesResult.data || []);
      setCustomers(customersResult.data || []);
      setLeads(leadsResult.data || []);

      // Load company info for template preview
      const { data: orgData } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', organisationId!)
        .single();
      setCompanyInfo(orgData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid hämtning av data.');
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna offert?')) return;

    try {
      const result = await deleteQuote(quoteId);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      await loadData();
    } catch (err) {
      console.error('Error deleting quote:', err);
      setError('Kunde inte ta bort offert.');
    }
  };

  const handleDuplicateQuote = async (quoteId: string) => {
    try {
      const result = await duplicateQuote(quoteId);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      await loadData();
    } catch (err) {
      console.error('Error duplicating quote:', err);
      setError('Kunde inte kopiera offert.');
    }
  };

  const handleConvertToJob = async (quoteId: string) => {
    if (!confirm('Konvertera denna offert till ett jobb?')) return;

    try {
      const result = await convertQuoteToJob(quoteId);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      success('Konverterad', 'Offert konverterad till jobb!');
      await loadData();
    } catch (err) {
      console.error('Error converting to job:', err);
      setError('Kunde inte konvertera offert till jobb.');
    }
  };

  const handleViewQuote = (quote: QuoteWithRelations) => {
    navigate(`/app/offert/${quote.id}`);
  };

  const handlePreviewQuote = (quote: QuoteWithRelations) => {
    setPreviewQuote(quote);
    setShowPreviewModal(true);
  };

  const handleEditQuote = async (quote: QuoteWithRelations) => {
    try {
      // Fetch full quote details including line items
      const result = await getQuoteById(quote.id);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setEditingQuote(result.data);
      setShowCreateModal(true);
    } catch (err) {
      console.error('Error preparing quote for edit:', err);
      setError('Kunde inte förbereda offert för redigering.');
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus) => {
    try {
      const result = await updateQuote(quoteId, { status: newStatus });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Send order confirmation email if the quote is being accepted
      if (newStatus === 'accepted') {
        const quoteResult = await getQuoteById(quoteId);
        if (quoteResult.data && quoteResult.data.order_id) {
          // Fetch the order to get the ID for the email
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('id', quoteResult.data.order_id)
            .single();

          if (order) {
            await sendOrderConfirmationEmail(quoteResult.data, order);
          }
        }
      }

      await loadData();
    } catch (err) {
      console.error('Error updating quote status:', err);
      setError('Kunde inte uppdatera offertstatus.');
    }
  };

  const handleManualSigning = async (quoteId: string, file: File) => {
    try {
      // 1. Upload file
      let url: string;
      try {
        url = await uploadSignedDocument(file, 'quotes');
      } catch (uploadError: any) {
        setError('Kunde inte ladda upp filen: ' + uploadError.message);
        return;
      }

      // 2. Update quote in DB
      const { error: updateError } = await updateQuote(
        quoteId,
        { signed_document_url: url, status: 'accepted' }
      );

      if (updateError) {
        setError('Kunde inte uppdatera offerten: ' + updateError.message);
        return;
      }

      // 3. Update local state
      setQuotes((prev: QuoteWithRelations[]) => prev.map((q: QuoteWithRelations) =>
        q.id === quoteId
          ? { ...q, signed_document_url: url, status: 'accepted' }
          : q
      ));

      // Also update editingQuote if it matches (unlikely but safe)
      if (editingQuote?.id === quoteId) {
        setEditingQuote(prev => prev ? { ...prev, signed_document_url: url, status: 'accepted' } : null);
      }

      success('Uppladdad', 'Signerad offert uppladdad och sparad!');
    } catch (err) {
      console.error('Error in manual signing:', err);
      setError('Ett oväntat fel inträffade.');
    }
  };



  const handleOpenCustomerReminder = (quote: QuoteWithRelations) => {
    setQuoteForCustomerReminder(quote);
    setShowCustomerReminderModal(true);
  };



  const handleSaveQuote = async () => {
    await loadData();
    setShowCreateModal(false);
    setEditingQuote(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mr-4 shadow-lg shadow-indigo-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Offerter</h1>
              <p className="text-sm text-gray-500">Laddar...</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Laddar offerter...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Offerter</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-10 h-10 text-red-600 mr-4" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Kunde inte ladda offerter</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={loadData}
              className="ml-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Försök igen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mr-4 shadow-lg shadow-indigo-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Offerter</h1>
            <p className="text-sm text-gray-500">
              {quotes.length} offerter totalt
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Uppdatera
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingQuote(null);
              setShowCreateModal(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Skapa Offert
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Sök offerter..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alla</option>
              <option value="draft">Utkast</option>
              <option value="sent">Skickade</option>
              <option value="accepted">Accepterade</option>
              <option value="declined">Avvisade</option>
            </select>
          </div>
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Från datum"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Till datum"
            />
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Offertnummer</th>
                <th>Kund</th>
                <th>Titel</th>
                <th>Belopp</th>
                <th>Status</th>
                <th>Giltig till</th>
                <th className="text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Inga offerter ännu</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Skapa din första offert för att komma igång.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          setEditingQuote(null);
                          setShowCreateModal(true);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Skapa Offert
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => handleViewQuote(quote)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quote.quote_number || 'Genereras...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quote.customer?.name || 'Okänd kund'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{quote.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(quote.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQuoteStatusColor(quote.status)}`}>
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quote.valid_until ? formatDate(quote.valid_until) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium border-l border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                        {/* Preview Action */}
                        <button
                          onClick={() => handlePreviewQuote(quote)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                          title="Förhandsgranska"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleEditQuote(quote)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                          title="Redigera"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateQuote(quote.id)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                          title="Kopiera"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {quote.status === 'draft' && (
                          <button
                            onClick={() => {
                              setQuoteToSend(quote);
                              setShowSendQuoteModal(true);
                            }}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-colors"
                            title="Skicka offert (Email/SMS)"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {quote.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'accepted')}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                              title="Markera som accepterad"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'declined')}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                              title="Markera som avvisad"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {quote.status === 'accepted' && (
                          <button
                            onClick={() => handleConvertToJob(quote.id)}
                            className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full transition-colors"
                            title="Konvertera till jobb"
                          >
                            <Briefcase className="w-4 h-4" />
                          </button>
                        )}
                        {(quote.status === 'sent' || quote.status === 'draft') && (
                          <label className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Manuell signering (Ladda upp PDF)">
                            <FileUp className="w-4 h-4" />
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const file = e.target.files?.[0];
                                if (file) handleManualSigning(quote.id, file);
                              }}
                            />
                          </label>
                        )}
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="h-4 w-px bg-gray-300 mx-2"></div>

                        <button
                          onClick={() => handleOpenCustomerReminder(quote)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-1"
                        >
                          Påminnelse
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Quote Modal */}
      {
        showCreateModal && (
          <QuoteEditModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setEditingQuote(null);
            }}
            quote={editingQuote}
            customers={customers}
            leads={leads}
            templates={templates}
            companyInfo={companyInfo}
            organisationId={organisationId!}
            onSave={handleSaveQuote}
          />
        )
      }









      {/* Customer Reminder Modal */}
      {
        showCustomerReminderModal && quoteForCustomerReminder && (
          <SendCustomerReminderModal
            isOpen={showCustomerReminderModal}
            onClose={() => {
              setShowCustomerReminderModal(false);
              setQuoteForCustomerReminder(null);
            }}
            entityType="quote"
            entity={quoteForCustomerReminder}
            customerEmail={quoteForCustomerReminder.customer?.email || undefined}
            customerPhone={quoteForCustomerReminder.customer?.phone_number || undefined}
          />
        )
      }

      {/* Send Quote Modal */}
      {
        showSendQuoteModal && quoteToSend && (
          <SendQuoteModal
            isOpen={showSendQuoteModal}
            onClose={() => {
              setShowSendQuoteModal(false);
              setQuoteToSend(null);
            }}
            quote={quoteToSend}
          />
        )
      }

      {
        showPreviewModal && previewQuote && (
          <QuotePreviewModal
            isOpen={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            quote={previewQuote}
            templates={templates}
            companyInfo={companyInfo}
          />
        )
      }
    </div >
  );
}

export default QuoteManagement;
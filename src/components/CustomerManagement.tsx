import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, Edit, Trash2, Eye, Phone, Mail, MapPin, Calendar, Building, User, X, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, TrendingUp, FileText, Briefcase, Receipt, Clock, Activity, Loader2, MessageSquare, Hash
} from 'lucide-react';
import {
  searchCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerInteractions, checkDuplicateCustomer, formatDate, formatDateTime, formatCurrency
} from '../lib/database';
import type { Customer, Lead, Quote, Job, Invoice, UserProfile } from '../types/database';
import { LEAD_STATUS_LABELS, QUOTE_STATUS_LABELS, JOB_STATUS_LABELS, INVOICE_STATUS_LABELS } from '../types/database';

import ContactCustomerModal from './ContactCustomerModal';
import { useAuth } from '../contexts/AuthContext';
import { Button, Badge } from './ui';



const swedishCities = [
  "Alingsås", "Arboga", "Arvika", "Askersund", "Avesta",
  "Boden", "Bollnäs", "Borgholm", "Borlänge", "Borås", "Båstad",
  "Eksjö", "Enköping", "Eskilstuna", "Eslöv",
  "Fagersta", "Falkenberg", "Falköping", "Falsterbo", "Falun", "Filipstad", "Flen",
  "Gränna", "Gävle", "Göteborg",
  "Hagfors", "Halmstad", "Haparanda", "Hedemora", "Helsingborg", "Hjo", "Hudiksvall", "Huskvarna", "Härnösand", "Hässleholm", "Höganäs",
  "Jönköping",
  "Kalmar", "Karlshamn", "Karlskoga", "Karlskrona", "Karlstad", "Katrineholm", "Kiruna", "Kramfors", "Kristianstad", "Kristinehamn", "Kumla", "Kungsbacka", "Kungälv", "Köping",
  "Laholm", "Landskrona", "Lidköping", "Lindesberg", "Linköping", "Ljungby", "Ludvika", "Luleå", "Lund", "Lycksele", "Lysekil",
  "Malmö", "Mariefred", "Mariestad", "Marstrand", "Mjölby", "Motala", "Mölndal",
  "Nora", "Norrköping", "Norrtälje", "Nybro", "Nyköping", "Nynäshamn", "Nässjö",
  "Oskarshamn", "Oxelösund",
  "Piteå",
  "Ronneby",
  "Sala", "Sandviken", "Sigtuna", "Simrishamn", "Skara", "Skellefteå", "Skänninge", "Skövde", "Sollefteå", "Stockholm", "Strängnäs", "Strömstad", "Sundsvall", "Säffle", "Säter", "Sävsjö", "Söderhamn", "Söderköping", "Södertälje", "Sölvesborg",
  "Tidaholm", "Torshälla", "Tranås", "Trelleborg", "Trollhättan", "Trosa",
  "Uddevalla", "Ulricehamn", "Umeå", "Uppsala",
  "Vadstena", "Varberg", "Vetlanda", "Vimmerby", "Visby", "Vänersborg", "Värnamo", "Västervik", "Västerås", "Växjö",
  "Ystad",
  "Åhus", "Åmål",
  "Ängelholm",
  "Örebro", "Öregrund", "Örnsköldsvik", "Östersund", "Östhammar"
];

interface CustomerWithStats extends Customer {
  total_leads?: number;
  total_jobs?: number;
  last_contact?: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone_number: string;
  address: string;
  postal_code: string;
  city: string;
  customer_type: 'private' | 'company';
  org_number: string;
  sales_area: string;
  vat_handling: '25%' | 'omvänd byggmoms';
  e_invoice_address: string;
  invoice_delivery_method: 'e-post' | 'brev' | 'e-faktura';
  // ROT fields
  include_rot: boolean;
  rot_personnummer: string;
  rot_fastighetsbeteckning: string;
  // RUT fields
  include_rut: boolean;
  rut_personnummer: string;
}

interface CustomerInteractions {
  leads: (Lead & { assigned_to?: UserProfile })[];
  quotes: (Quote & { lead?: Lead })[];
  jobs: (Job & { quote?: Quote; assigned_to?: UserProfile })[];
  invoices: (Invoice & { job?: Job })[];
}

const getInitialFormData = (): CustomerFormData => ({
  name: '',
  email: '',
  phone_number: '',
  address: '',
  postal_code: '',
  city: '',
  customer_type: 'company',
  org_number: '',
  sales_area: '',
  vat_handling: '25%',
  e_invoice_address: '',
  invoice_delivery_method: 'e-post',
  include_rot: false,
  rot_personnummer: '',
  rot_fastighetsbeteckning: '',
  include_rut: false,
  rut_personnummer: '',
});

function CustomerManagement() {
  const { organisationId } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [customerInteractions, setCustomerInteractions] = useState<CustomerInteractions | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'activity'>('info');

  const [customerForm, setCustomerForm] = useState<CustomerFormData>(getInitialFormData());

  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  useEffect(() => {
    loadCustomers();
  }, [currentPage, searchTerm]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await searchCustomers(organisationId!, searchTerm, {}, { page: currentPage, limit: itemsPerPage });
      if (result.error) throw new Error(result.error.message);
      setCustomers(result.data || []);
      setTotalCount(result.totalCount || 0);
    } catch (err: any) {
      setError(err.message || 'Ett oväntat fel inträffade.');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetails = async (customerId: string) => {
    try {
      const result = await getCustomerInteractions(customerId);
      if (result.error) throw new Error(result.error.message);
      setCustomerInteractions({
        leads: result.leads,
        quotes: result.quotes,
        jobs: result.jobs,
        invoices: result.invoices,
      });
    } catch (err: any) {
      setError(err.message || 'Kunde inte ladda kunddetaljer.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent, isEditing: boolean) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDuplicateError(null);

    try {
      const duplicateCheck = await checkDuplicateCustomer(organisationId!, customerForm.email, customerForm.name, isEditing ? selectedCustomer?.id : undefined);
      if (duplicateCheck.error) throw new Error(duplicateCheck.error.message);
      if (duplicateCheck.isDuplicate) {
        const field = duplicateCheck.duplicateField === 'email' ? 'e-postadress' : 'namn';
        setDuplicateError(`En kund med samma ${field} finns redan.`);
        setIsSubmitting(false);
        return;
      }

      const customerData = {
        ...customerForm,
        organisation_id: organisationId!,
        email: customerForm.email || null,
        phone_number: customerForm.phone_number || null,
        address: customerForm.address || null,
        postal_code: customerForm.postal_code || null,
        city: customerForm.city || null,
        org_number: customerForm.customer_type === 'company' ? customerForm.org_number || null : null,
        sales_area: customerForm.sales_area || null,
        e_invoice_address: customerForm.e_invoice_address || null,
        include_rot: customerForm.include_rot,
        rot_personnummer: customerForm.rot_personnummer || null,
        rot_fastighetsbeteckning: customerForm.rot_fastighetsbeteckning || null,
        include_rut: customerForm.include_rut,
        rut_personnummer: customerForm.rut_personnummer || null,
      };

      const result = isEditing
        ? await updateCustomer(selectedCustomer!.id, customerData)
        : await createCustomer(customerData);

      if (result.error) throw new Error(result.error.message);

      setShowAddModal(false);
      setShowEditModal(false);
      await loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Ett fel inträffade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setCustomerForm({
      name: customer.name || '',
      email: customer.email || '',
      phone_number: customer.phone_number || '',
      address: customer.address || '',
      postal_code: customer.postal_code || '',
      city: customer.city || '',
      customer_type: customer.customer_type || 'company',
      org_number: customer.org_number || '',
      sales_area: customer.sales_area || '',
      vat_handling: customer.vat_handling || '25%',
      e_invoice_address: customer.e_invoice_address || '',
      invoice_delivery_method: customer.invoice_delivery_method || 'e-post',
      include_rot: customer.include_rot || false,
      rot_personnummer: customer.rot_personnummer || '',
      rot_fastighetsbeteckning: customer.rot_fastighetsbeteckning || '',
      include_rut: customer.include_rut || false,
      rut_personnummer: customer.rut_personnummer || '',
    });
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleDeleteCustomer = async (customer: CustomerWithStats) => {
    if (!confirm(`Är du säker på att du vill ta bort "${customer.name}"?`)) return;

    try {
      const result = await deleteCustomer(customer.id);
      if (result.error) throw new Error(result.error.message);
      await loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Kunde inte ta bort kund.');
    }
  };

  const handleViewCustomer = async (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setDetailTab('info');
    setShowDetailModal(true);
    setCustomerInteractions(null);
    await loadCustomerDetails(customer.id);
  };

  const handleContactCustomer = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setShowContactModal(true);
  };

  const createTimeline = () => {
    if (!customerInteractions) return [];
    const timeline = [
      ...customerInteractions.leads.map(lead => ({ id: `lead-${lead.id}`, type: 'lead', title: lead.title, status: lead.status, date: lead.created_at, description: `Lead: ${LEAD_STATUS_LABELS[lead.status]}`, assignedTo: lead.assigned_to?.full_name, value: lead.estimated_value })),
      ...customerInteractions.quotes.map(quote => ({ id: `quote-${quote.id}`, type: 'quote', title: quote.title, status: quote.status, date: quote.created_at, description: `Offert: ${QUOTE_STATUS_LABELS[quote.status]}`, value: quote.total_amount })),
      ...customerInteractions.jobs.map(job => ({ id: `job-${job.id}`, type: 'job', title: job.title, status: job.status, date: job.created_at, description: `Jobb: ${JOB_STATUS_LABELS[job.status]}`, assignedTo: job.assigned_to?.full_name, value: job.value })),
      ...customerInteractions.invoices.map(invoice => ({ id: `invoice-${invoice.id}`, type: 'invoice', title: `Faktura ${invoice.invoice_number}`, status: invoice.status, date: invoice.created_at, description: `Faktura: ${INVOICE_STATUS_LABELS[invoice.status]}`, value: invoice.amount }))
    ];
    return timeline.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  };

  const getInteractionIcon = (type: string) => ({ lead: TrendingUp, quote: FileText, job: Briefcase, invoice: Receipt }[type] || Activity);
  const getInteractionColor = (type: string, status?: string) => ({ lead: 'text-blue-600', quote: 'text-purple-600', job: 'text-orange-600', invoice: 'text-green-600' }[type] || 'text-gray-600');

  const formatPersonnummer = (value: string): string => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length === 0) return '';

    // Already has century prefix (starts with 19 or 20)
    if (digits.startsWith('19') || digits.startsWith('20')) {
      if (digits.length <= 8) return digits;
      return digits.slice(0, 8) + '-' + digits.slice(8, 12);
    }

    // Only add century when user has typed all 10 digits
    if (digits.length === 10) {
      const yy = parseInt(digits.slice(0, 2), 10);
      const currentYearShort = new Date().getFullYear() % 100;
      const century = yy > currentYearShort ? '19' : '20';
      const fullDigits = century + digits;
      return fullDigits.slice(0, 8) + '-' + fullDigits.slice(8, 12);
    }

    // Still typing — return digits as-is, insert hyphen if past position 8
    if (digits.length <= 8) return digits;
    return digits.slice(0, 8) + '-' + digits.slice(8, 10);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kunder</h1>
            <p className="text-sm text-gray-500">{totalCount} registrerade kunder</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadCustomers} icon={<RefreshCw className="w-4 h-4" />}>
            Uppdatera
          </Button>
          <Button variant="primary" size="md" onClick={() => { setCustomerForm(getInitialFormData()); setShowAddModal(true); }} icon={<Plus className="w-4 h-4" />}>
            Lägg till Kund
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Sök på namn, e-post eller telefonnummer..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kund</th>
                <th>Kontakt</th>
                <th>Säljområde</th>
                <th className="text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-12">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Laddar kunder...</p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-12">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium">Inga kunder hittades</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Börja med att lägga till din första kund</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => handleViewCustomer(customer)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td>
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mr-4">
                          {customer.customer_type === 'company' ? <Building className="w-5 h-5 text-primary-600 dark:text-primary-400" /> : <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{customer.city || 'Okänd ort'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {customer.email && <div className="text-gray-900 dark:text-gray-100 flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-400" />{customer.email}</div>}
                      {customer.phone_number && <div className="text-gray-500 dark:text-gray-400 flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-400" />{customer.phone_number}</div>}
                    </td>
                    <td className="text-gray-500 dark:text-gray-400">{customer.sales_area || '-'}</td>
                    <td className="cell-actions">
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={(e) => { e.stopPropagation(); handleContactCustomer(customer); }} title="Kontakta" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><MessageSquare className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleViewCustomer(customer); }} title="Visa detaljer" className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }} title="Redigera" className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer); }} title="Ta bort" className="p-2 text-gray-400 hover:text-error-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Föregående
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Nästa
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Visar{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}till{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>
                  {' '}av{' '}
                  <span className="font-medium">{totalCount}</span>
                  {' '}resultat
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`
                              relative inline-flex items-center px-4 py-2 border text-sm font-medium
                              ${currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }
                            `}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">{showEditModal ? 'Redigera Kund' : 'Skapa Ny Kund'}</h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form id="customer-form" onSubmit={(e) => handleFormSubmit(e, showEditModal)} className="flex-1 overflow-y-auto p-6 space-y-6">
              {duplicateError && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{duplicateError}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kundtyp</label>
                <div className="flex items-center space-x-4 p-1 bg-gray-100 rounded-lg">
                  <button type="button" onClick={() => setCustomerForm(prev => ({ ...prev, customer_type: 'company' }))} className={`flex-1 py-2 rounded-md text-sm ${customerForm.customer_type === 'company' ? 'bg-white shadow' : ''}`}>Företag</button>
                  <button type="button" onClick={() => setCustomerForm(prev => ({ ...prev, customer_type: 'private' }))} className={`flex-1 py-2 rounded-md text-sm ${customerForm.customer_type === 'private' ? 'bg-white shadow' : ''}`}>Privatperson</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{customerForm.customer_type === 'company' ? 'Företagsnamn' : 'Namn'} *</label>
                  <input type="text" required value={customerForm.name} onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                </div>
                {customerForm.customer_type === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organisationsnummer</label>
                    <input type="text" value={customerForm.org_number} onChange={(e) => setCustomerForm(prev => ({ ...prev, org_number: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                  <input type="email" value={customerForm.email} onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="tel" value={customerForm.phone_number} onChange={(e) => setCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adress</label>
                <input type="text" value={customerForm.address} onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postnummer</label>
                  <input type="text" value={customerForm.postal_code} onChange={(e) => setCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                  <input type="text" value={customerForm.city} onChange={(e) => setCustomerForm(prev => ({ ...prev, city: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Säljområde</label>
                <select value={customerForm.sales_area} onChange={(e) => setCustomerForm(prev => ({ ...prev, sales_area: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-white">
                  <option value="">Välj område...</option>
                  {swedishCities.sort().map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div className="border-t pt-6">
                <h4 className="text-md font-semibold text-gray-800 mb-4">Faktureringsinställningar</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Momshantering</label>
                    <select value={customerForm.vat_handling} onChange={(e) => setCustomerForm(prev => ({ ...prev, vat_handling: e.target.value as any }))} className="w-full px-3 py-2 border rounded-md bg-white">
                      <option value="25%">25% (Standard)</option>
                      <option value="omvänd byggmoms">Omvänd byggmoms</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leveranssätt för faktura</label>
                    <select value={customerForm.invoice_delivery_method} onChange={(e) => setCustomerForm(prev => ({ ...prev, invoice_delivery_method: e.target.value as any }))} className="w-full px-3 py-2 border rounded-md bg-white">
                      <option value="e-post">E-post</option>
                      <option value="brev">Brev</option>
                      <option value="e-faktura">E-faktura</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-fakturaadress (valfritt)</label>
                  <input type="text" value={customerForm.e_invoice_address} onChange={(e) => setCustomerForm(prev => ({ ...prev, e_invoice_address: e.target.value }))} className="w-full px-3 py-2 border rounded-md" placeholder="GLN-nummer eller Peppol-ID" />
                </div>
              </div>

              {/* ROT / RUT Section */}
              {/* ROT / RUT Section */}
              {customerForm.customer_type === 'private' && (
                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">ROT / RUT-uppgifter</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer (ROT)</label>
                      <input
                        type="text"
                        value={customerForm.rot_personnummer}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, rot_personnummer: formatPersonnummer(e.target.value) }))}
                        placeholder="YYYYMMDD-XXXX"
                        maxLength={13}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fastighetsbeteckning</label>
                      <input
                        type="text"
                        value={customerForm.rot_fastighetsbeteckning}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, rot_fastighetsbeteckning: e.target.value }))}
                        placeholder="t.ex. Stockholm Södermalm 1:23"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer (RUT)</label>
                      <input
                        type="text"
                        value={customerForm.rut_personnummer}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, rut_personnummer: formatPersonnummer(e.target.value) }))}
                        placeholder="YYYYMMDD-XXXX"
                        maxLength={13}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customerForm.include_rot}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, include_rot: e.target.checked, include_rut: e.target.checked ? false : prev.include_rut }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Inkludera ROT-avdrag</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customerForm.include_rut}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, include_rut: e.target.checked, include_rot: e.target.checked ? false : prev.include_rot }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Inkludera RUT-avdrag</span>
                    </label>
                  </div>
                </div>
              )}
            </form>
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-4 py-2 border rounded-md">Avbryt</button>
              <button type="submit" form="customer-form" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md">{isSubmitting ? 'Sparar...' : (showEditModal ? 'Spara ändringar' : 'Skapa Kund')}</button>
            </div>
          </div>
        </div>
      )}


      {/* Customer Detail Modal */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Kunddetaljer</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedCustomer(null);
                  setCustomerInteractions(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="border-b border-gray-200 px-6">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setDetailTab('info')}
                  className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${detailTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Kundinformation
                </button>
                <button
                  onClick={() => setDetailTab('activity')}
                  className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${detailTab === 'activity'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Aktivitet
                  {customerInteractions && (() => {
                    const count = createTimeline().length; return count > 0 ? (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{count}</span>
                    ) : null;
                  })()}
                </button>
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: Kundinformation */}
              {detailTab === 'info' && (
                <div className="space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedCustomer.total_leads || 0}</div>
                      <div className="text-xs font-medium text-blue-500 mt-1">Leads</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedCustomer.total_jobs || 0}</div>
                      <div className="text-xs font-medium text-green-500 mt-1">Jobb</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-sm font-semibold text-gray-700">
                        {selectedCustomer.created_at ? formatDate(selectedCustomer.created_at) : '—'}
                      </div>
                      <div className="text-xs font-medium text-gray-500 mt-1">Kund sedan</div>
                    </div>
                  </div>

                  {/* Section: Kontaktuppgifter */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kontaktuppgifter</h4>
                    <div className="bg-gray-50 rounded-lg p-5">
                      <div className="flex items-center mb-4">
                        <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                          {selectedCustomer.customer_type === 'company'
                            ? <Building className="w-5 h-5 text-blue-600" />
                            : <User className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{selectedCustomer.name}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${selectedCustomer.customer_type === 'company'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                            }`}>
                            {selectedCustomer.customer_type === 'company' ? 'Företag' : 'Privatperson'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {selectedCustomer.email && (
                          <div>
                            <div className="text-xs text-gray-500 mb-0.5">E-post</div>
                            <a href={`mailto:${selectedCustomer.email}`} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" />
                              {selectedCustomer.email}
                            </a>
                          </div>
                        )}
                        {selectedCustomer.phone_number && (
                          <div>
                            <div className="text-xs text-gray-500 mb-0.5">Telefon</div>
                            <a href={`tel:${selectedCustomer.phone_number}`} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" />
                              {selectedCustomer.phone_number}
                            </a>
                          </div>
                        )}
                        {(selectedCustomer.address || selectedCustomer.postal_code || selectedCustomer.city) && (
                          <div className="sm:col-span-2">
                            <div className="text-xs text-gray-500 mb-0.5">Adress</div>
                            <div className="text-sm text-gray-900 flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                {selectedCustomer.address && <div>{selectedCustomer.address}</div>}
                                {(selectedCustomer.postal_code || selectedCustomer.city) && (
                                  <div>{[selectedCustomer.postal_code, selectedCustomer.city].filter(Boolean).join(' ')}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section: Företagsinformation (company only) */}
                  {selectedCustomer.customer_type === 'company' && (selectedCustomer.org_number || selectedCustomer.vat_handling || selectedCustomer.fortnox_customer_number) && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Företagsinformation</h4>
                      <div className="bg-gray-50 rounded-lg p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                          {selectedCustomer.org_number && (
                            <div>
                              <div className="text-xs text-gray-500 mb-0.5">Organisationsnummer</div>
                              <div className="text-sm text-gray-900 font-medium">{selectedCustomer.org_number}</div>
                            </div>
                          )}
                          {selectedCustomer.vat_handling && (
                            <div>
                              <div className="text-xs text-gray-500 mb-0.5">Momshantering</div>
                              <div className="text-sm text-gray-900">
                                {selectedCustomer.vat_handling === 'omvänd byggmoms' ? 'Omvänd byggmoms' : '25% (Standard)'}
                              </div>
                            </div>
                          )}
                          {selectedCustomer.fortnox_customer_number && (
                            <div>
                              <div className="text-xs text-gray-500 mb-0.5">Fortnox kundnummer</div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                                <Hash className="w-3 h-3" />
                                {selectedCustomer.fortnox_customer_number}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section: Faktureringsinställningar */}
                  {(selectedCustomer.invoice_delivery_method || selectedCustomer.sales_area || selectedCustomer.e_invoice_address) && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Faktureringsinställningar</h4>
                      <div className="bg-gray-50 rounded-lg p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                          {selectedCustomer.invoice_delivery_method && (
                            <div>
                              <div className="text-xs text-gray-500 mb-0.5">Leveranssätt för faktura</div>
                              <div className="text-sm text-gray-900 capitalize">{selectedCustomer.invoice_delivery_method}</div>
                            </div>
                          )}
                          {selectedCustomer.sales_area && (
                            <div>
                              <div className="text-xs text-gray-500 mb-0.5">Säljområde</div>
                              <div className="text-sm text-gray-900">{selectedCustomer.sales_area}</div>
                            </div>
                          )}
                          {selectedCustomer.e_invoice_address && (
                            <div className="sm:col-span-2">
                              <div className="text-xs text-gray-500 mb-0.5">E-fakturaadress</div>
                              <div className="text-sm text-gray-900 font-mono">{selectedCustomer.e_invoice_address}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section: ROT / RUT (private customers with relevant data) */}
                  {selectedCustomer.customer_type === 'private' &&
                    (selectedCustomer.include_rot || selectedCustomer.include_rut ||
                      selectedCustomer.rot_personnummer || selectedCustomer.rut_personnummer ||
                      selectedCustomer.rot_fastighetsbeteckning) && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">ROT / RUT</h4>
                        <div className="bg-gray-50 rounded-lg p-5">
                          {/* Active badges */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedCustomer.include_rot && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                ✓ ROT aktiv
                              </span>
                            )}
                            {selectedCustomer.include_rut && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                ✓ RUT aktiv
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                            {selectedCustomer.rot_personnummer && (
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">Personnummer (ROT)</div>
                                <div className="text-sm text-gray-900 font-mono">{selectedCustomer.rot_personnummer}</div>
                              </div>
                            )}
                            {selectedCustomer.rut_personnummer && (
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">Personnummer (RUT)</div>
                                <div className="text-sm text-gray-900 font-mono">{selectedCustomer.rut_personnummer}</div>
                              </div>
                            )}
                            {selectedCustomer.rot_fastighetsbeteckning && (
                              <div className="sm:col-span-2">
                                <div className="text-xs text-gray-500 mb-0.5">Fastighetsbeteckning</div>
                                <div className="text-sm text-gray-900">{selectedCustomer.rot_fastighetsbeteckning}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Snabbåtgärder</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          navigate('/app/leads', { state: { createForCustomer: selectedCustomer } });
                        }}
                        className="flex flex-col items-center justify-center px-3 py-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium gap-1.5"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Skapa Lead
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          navigate('/app/offerter', { state: { createForCustomer: selectedCustomer } });
                        }}
                        className="flex flex-col items-center justify-center px-3 py-3 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium gap-1.5"
                      >
                        <FileText className="w-4 h-4" />
                        Ny Offert
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          navigate('/app/kalender', { state: { createMeetingForCustomer: selectedCustomer } });
                        }}
                        className="flex flex-col items-center justify-center px-3 py-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm font-medium gap-1.5"
                      >
                        <Calendar className="w-4 h-4" />
                        Boka Möte
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleContactCustomer(selectedCustomer);
                        }}
                        className="flex flex-col items-center justify-center px-3 py-3 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors text-sm font-medium gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Kontakta
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Aktivitet */}
              {detailTab === 'activity' && (
                <div>
                  {!customerInteractions ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {createTimeline().length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="font-medium text-gray-600">Inga interaktioner ännu</p>
                          <p className="text-sm mt-1">Skapa en lead eller offert för att komma igång</p>
                        </div>
                      ) : (
                        createTimeline().map((item) => {
                          const Icon = getInteractionIcon(item.type);
                          const color = getInteractionColor(item.type, item.status);

                          return (
                            <div key={item.id} className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Icon className={`w-4 h-4 ${color}`} />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                  {item.value && (
                                    <span className="text-sm font-medium text-green-600">
                                      {formatCurrency(item.value)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">{item.description}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                                  <span>{item.date ? formatDateTime(item.date) : 'Okänt datum'}</span>
                                  {item.assignedTo && (
                                    <>
                                      <span>•</span>
                                      <span>Tilldelad: {item.assignedTo}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedCustomer(null);
                    setCustomerInteractions(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Stäng
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleContactCustomer(selectedCustomer);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Kontakta
                  </button>
                  <button
                    onClick={() => handleEditClick(selectedCustomer)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Redigera Kund
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <ContactCustomerModal
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          onCommunicationSent={() => {
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}

export default CustomerManagement;
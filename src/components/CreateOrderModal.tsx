/**
 * Global Create Order Modal
 * Tabbed order creation with line items, inline customer creation/editing,
 * ROT/RUT, and assignment. Opened via GlobalActionContext from anywhere in the app.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, UserPlus, Edit2, Save, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createOrder, createOrderWithQuote } from '../lib/orders';
import { getCustomers, getTeamMembers, createCustomer, updateCustomer, getSavedLineItems, getLeads } from '../lib/database';
import { UNIT_DESCRIPTIONS } from '../lib/quoteTemplates';
import { supabase } from '../lib/supabase';
import ROTFields from './ROTFields';
import RUTFields from './RUTFields';
import type { Customer, UserProfile, Lead, RichSavedLineItem } from '../types/database';
import {
  JOB_TYPE_LABELS,
  TEAM_SPECIALTY_LABELS,
  type OrderStatus,
  type JobType,
  type AssignmentType,
} from '../types/database';

interface Team {
  id: string;
  name: string;
  specialty: string;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

type TabId = 'info' | 'kund' | 'rader' | 'uppdrag' | 'avdrag';

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  const { organisationId } = useAuth();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('info');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    job_description: '',
    job_type: 'allmänt' as JobType,
    customer_id: '',
    lead_id: '',
    estimated_hours: '',
    complexity_level: '3',
    assignment_type: 'individual' as AssignmentType,
    assigned_to_user_id: '',
    assigned_to_team_id: '',
    source: '',
    region: '',
    include_rot: false,
    rot_personnummer: null as string | null,
    rot_organisationsnummer: null as string | null,
    rot_fastighetsbeteckning: null as string | null,
    rot_amount: 0,
    include_rut: false,
    rut_personnummer: null as string | null,
    rut_amount: 0,
  });

  // Line items
  const [lineItems, setLineItems] = useState([
    { product_id: '', name: '', description: '', quantity: 1, unit_price: 0, unit: '' }
  ]);

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<RichSavedLineItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Inline customer state
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isEditingExistingCustomer, setIsEditingExistingCustomer] = useState(false);
  const [savingExistingCustomer, setSavingExistingCustomer] = useState(false);
  const [existingCustomerEditForm, setExistingCustomerEditForm] = useState({
    name: '', email: '', phone_number: '', org_number: '',
    address: '', postal_code: '', city: '',
    sales_area: '', vat_handling: '25%', invoice_delivery_method: 'e-post', e_invoice_address: '',
  });
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    customer_type: 'company' as 'company' | 'private',
    org_number: '', email: '', phone_number: '',
    address: '', postal_code: '', city: '',
    sales_area: '', vat_handling: '25%', invoice_delivery_method: 'e-post', e_invoice_address: '',
  });

  useEffect(() => {
    if (isOpen && organisationId) {
      setDataLoading(true);
      Promise.all([
        getCustomers(organisationId),
        getTeamMembers(organisationId),
        supabase.from('teams').select('id, name, specialty').eq('organisation_id', organisationId),
        getSavedLineItems(organisationId),
        getLeads(organisationId),
      ]).then(([customersResult, teamMembersResult, teamsResult, productsResult, leadsResult]) => {
        if (customersResult.data) setCustomers(customersResult.data);
        if (teamMembersResult.data) setTeamMembers(teamMembersResult.data);
        if (teamsResult.data) setTeams(teamsResult.data as Team[]);
        if (productsResult.data) setProducts(productsResult.data);
        if (leadsResult.data) setLeads(leadsResult.data);
        setDataLoading(false);
      });
    }
  }, [isOpen, organisationId]);

  const resetForm = () => {
    setActiveTab('info');
    setFormData({
      title: '', description: '', job_description: '',
      job_type: 'allmänt', customer_id: '', lead_id: '',
      estimated_hours: '', complexity_level: '3',
      assignment_type: 'individual', assigned_to_user_id: '',
      assigned_to_team_id: '', source: '', region: '',
      include_rot: false, rot_personnummer: null,
      rot_organisationsnummer: null, rot_fastighetsbeteckning: null,
      rot_amount: 0,
      include_rut: false, rut_personnummer: null, rut_amount: 0,
    });
    setLineItems([{ product_id: '', name: '', description: '', quantity: 1, unit_price: 0, unit: '' }]);
    setIsNewCustomer(false);
    setIsEditingExistingCustomer(false);
    setNewCustomerForm({
      name: '', customer_type: 'company', org_number: '',
      email: '', phone_number: '', address: '', postal_code: '', city: '',
      sales_area: '', vat_handling: '25%', invoice_delivery_method: 'e-post', e_invoice_address: '',
    });
  };

  // Line item handlers
  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        item.name = product.name || '';
        item.description = product.description || '';
        item.unit_price = product.unit_price || 0;
        item.unit = product.metadata?.unit || '';
      }
    }
    updated[index] = item;
    setLineItems(updated);
  };
  const addLineItem = () =>
    setLineItems([...lineItems, { product_id: '', name: '', description: '', quantity: 1, unit_price: 0, unit: '' }]);
  const removeLineItem = (index: number) =>
    setLineItems(lineItems.filter((_, i) => i !== index));

  const totalValue = useMemo(
    () => lineItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0),
    [lineItems]
  );
  const validLineItems = lineItems.filter(i => i.name.trim() !== '');
  const validLineItemCount = validLineItems.length;
  const formatCurrency = (v: number) => `${v.toLocaleString('sv-SE')} SEK`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organisationId) { showError('Fel', 'Organisation saknas'); return; }
    if (!formData.title.trim()) { showError('Fel', 'Titel är obligatoriskt'); setActiveTab('info'); return; }
    if (!formData.job_description.trim()) { showError('Fel', 'Arbetsbeskrivning är obligatoriskt'); setActiveTab('info'); return; }
    if (formData.assignment_type === 'individual' && !formData.assigned_to_user_id) {
      showError('Fel', 'Välj en person att tilldela till'); setActiveTab('uppdrag'); return;
    }
    if (formData.assignment_type === 'team' && !formData.assigned_to_team_id) {
      showError('Fel', 'Välj ett team att tilldela till'); setActiveTab('uppdrag'); return;
    }

    setLoading(true);
    try {
      let customerId = formData.customer_id;

      if (isNewCustomer) {
        if (!newCustomerForm.name.trim()) {
          showError('Fel', 'Kundnamn är obligatoriskt'); setActiveTab('kund'); setLoading(false); return;
        }
        const { data: createdCustomer, error: customerError } = await createCustomer({
          organisation_id: organisationId,
          name: newCustomerForm.name.trim(),
          customer_type: newCustomerForm.customer_type,
          org_number: newCustomerForm.org_number.trim() || null,
          email: newCustomerForm.email.trim() || null,
          phone_number: newCustomerForm.phone_number.trim() || null,
          address: newCustomerForm.address.trim() || null,
          postal_code: newCustomerForm.postal_code.trim() || null,
          city: newCustomerForm.city.trim() || null,
          sales_area: newCustomerForm.sales_area.trim() || null,
          vat_handling: newCustomerForm.vat_handling || '25%',
          invoice_delivery_method: newCustomerForm.invoice_delivery_method || 'e-post',
          e_invoice_address: newCustomerForm.e_invoice_address.trim() || null,
        } as Omit<Customer, 'id' | 'created_at'>);
        if (customerError || !createdCustomer) {
          showError('Fel', `Kunde inte skapa kund: ${customerError?.message || 'Okänt fel'}`);
          setLoading(false); return;
        }
        customerId = createdCustomer.id;
        setCustomers(prev => [...prev, createdCustomer]);
        success('Kund skapad', `${createdCustomer.name} har lagts till`);
      }

      if (!customerId) { showError('Fel', 'Kund är obligatoriskt'); setActiveTab('kund'); setLoading(false); return; }

      const orderData = {
        organisation_id: organisationId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        job_description: formData.job_description.trim(),
        job_type: formData.job_type,
        customer_id: customerId,
        lead_id: formData.lead_id || null,
        value: validLineItems.length > 0 ? totalValue : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        complexity_level: parseInt(formData.complexity_level),
        assignment_type: formData.assignment_type,
        assigned_to_user_id: formData.assignment_type === 'individual' ? formData.assigned_to_user_id : null,
        assigned_to_team_id: formData.assignment_type === 'team' ? formData.assigned_to_team_id : null,
        source: formData.source.trim() || null,
        status: 'öppen_order' as OrderStatus,
        include_rot: formData.include_rot,
        rot_personnummer: formData.rot_personnummer,
        rot_organisationsnummer: formData.rot_organisationsnummer,
        rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
        rot_amount: formData.rot_amount,
        include_rut: formData.include_rut,
        rut_personnummer: formData.rut_personnummer,
        rut_amount: formData.rut_amount,
        region: formData.region.trim() || null,
      };

      let result;
      if (validLineItems.length > 0) {
        result = await createOrderWithQuote(
          orderData,
          validLineItems.map(item => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit: item.unit,
            is_library_item: !!item.product_id,
            total: (item.quantity || 0) * (item.unit_price || 0),
          })),
          organisationId
        );
      } else {
        result = await createOrder(orderData);
      }

      if (result.error) { showError('Fel', result.error.message); return; }
      success('Order skapad', `${formData.title} har skapats`);
      onOrderCreated?.();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Error creating order:', err);
      showError('Fel', 'Kunde inte skapa order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  const TABS: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Grundinfo' },
    { id: 'kund', label: 'Kund' },
    { id: 'rader', label: validLineItemCount > 0 ? `Orderrader (${validLineItemCount})` : 'Orderrader' },
    { id: 'uppdrag', label: 'Tilldelning' },
    { id: 'avdrag', label: 'Avdrag' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">

          {/* ── Header ──────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h3 className="text-xl font-semibold text-gray-900">Skapa Ny Order</h3>
            <button type="button" onClick={() => { onClose(); resetForm(); }} className="text-gray-400 hover:text-gray-600 rounded p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* ── Tab bar ─────────────────────────────────────── */}
          <div className="border-b flex-shrink-0 bg-gray-50">
            <nav className="flex px-4 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Scrollable content ──────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <>
                {/* ════ TAB: Grundinfo ════ */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titel <span className="text-red-500">*</span></label>
                      <input
                        type="text" required value={formData.title}
                        onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="T.ex. Takrengöring villa..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jobbtyp <span className="text-red-500">*</span></label>
                        <select required value={formData.job_type}
                          onChange={e => setFormData(p => ({ ...p, job_type: e.target.value as JobType }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
                          {Object.entries(JOB_TYPE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Uppskattade timmar</label>
                        <input type="number" step="0.5" min="0" value={formData.estimated_hours}
                          onChange={e => setFormData(p => ({ ...p, estimated_hours: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="8.0" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Komplexitet</label>
                        <select value={formData.complexity_level}
                          onChange={e => setFormData(p => ({ ...p, complexity_level: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
                          <option value="1">1 - Mycket enkelt</option>
                          <option value="2">2 - Enkelt</option>
                          <option value="3">3 - Medel</option>
                          <option value="4">4 - Svårt</option>
                          <option value="5">5 - Mycket svårt</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Källa</label>
                        <input type="text" value={formData.source}
                          onChange={e => setFormData(p => ({ ...p, source: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="T.ex. Hemsida, telefon, rekommendation..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Säljområde / Region</label>
                        <input type="text" value={formData.region}
                          onChange={e => setFormData(p => ({ ...p, region: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="T.ex. Stockholm, Göteborg..." />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Allmän beskrivning</label>
                      <textarea value={formData.description}
                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Övergripande beskrivning..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Arbetsbeskrivning <span className="text-red-500">*</span></label>
                      <textarea required value={formData.job_description}
                        onChange={e => setFormData(p => ({ ...p, job_description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Detaljerad beskrivning av arbetet..." />
                    </div>
                  </div>
                )}

                {/* ════ TAB: Kund ════ */}
                {activeTab === 'kund' && (
                  <div className="space-y-4">
                    {/* Lead picker */}
                    {leads.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">
                          Kopplad lead <span className="text-gray-400 text-xs font-normal">(valfri – autofyller kund, titel och källa)</span>
                        </label>
                        <select
                          value={formData.lead_id}
                          onChange={e => {
                            const leadId = e.target.value;
                            setFormData(prev => {
                              const updated = { ...prev, lead_id: leadId };
                              if (leadId) {
                                const lead = leads.find(l => l.id === leadId);
                                if (lead) {
                                  updated.title = lead.title || prev.title;
                                  updated.description = lead.description || prev.description;
                                  updated.customer_id = lead.customer_id || prev.customer_id;
                                  updated.source = lead.source || prev.source;
                                  updated.region = lead.city || prev.region;
                                }
                              }
                              return updated;
                            });
                            setIsNewCustomer(false);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Ingen lead kopplad</option>
                          {leads.map(l => (
                            <option key={l.id} value={l.id}>{l.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Kund <span className="text-red-500">*</span></label>
                      <button type="button"
                        onClick={() => { setIsNewCustomer(!isNewCustomer); if (!isNewCustomer) setFormData(p => ({ ...p, customer_id: '' })); }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        {isNewCustomer ? 'Välj befintlig kund' : 'Skapa ny kund'}
                      </button>
                    </div>

                    {isNewCustomer ? (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Kundnamn <span className="text-red-500">*</span></label>
                          <input type="text" value={newCustomerForm.name}
                            onChange={e => setNewCustomerForm(p => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Företagsnamn eller personnamn" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Kundtyp</label>
                            <select value={newCustomerForm.customer_type}
                              onChange={e => setNewCustomerForm(p => ({ ...p, customer_type: e.target.value as 'company' | 'private', org_number: '' }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                              <option value="company">Företag</option>
                              <option value="private">Privatperson</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {newCustomerForm.customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}
                            </label>
                            <input type="text" value={newCustomerForm.org_number}
                              onChange={e => setNewCustomerForm(p => ({ ...p, org_number: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              placeholder={newCustomerForm.customer_type === 'company' ? '556xxx-xxxx' : 'YYYYMMDD-XXXX'} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">E-post</label>
                            <input type="email" value={newCustomerForm.email}
                              onChange={e => setNewCustomerForm(p => ({ ...p, email: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="kund@exempel.se" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                            <input type="tel" value={newCustomerForm.phone_number}
                              onChange={e => setNewCustomerForm(p => ({ ...p, phone_number: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="070-123 45 67" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Adress</label>
                          <input type="text" value={newCustomerForm.address}
                            onChange={e => setNewCustomerForm(p => ({ ...p, address: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Gatuadress" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Postnummer</label>
                            <input type="text" value={newCustomerForm.postal_code}
                              onChange={e => setNewCustomerForm(p => ({ ...p, postal_code: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="123 45" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Ort</label>
                            <input type="text" value={newCustomerForm.city}
                              onChange={e => setNewCustomerForm(p => ({ ...p, city: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Stockholm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Momshantering</label>
                            <select value={newCustomerForm.vat_handling}
                              onChange={e => setNewCustomerForm(p => ({ ...p, vat_handling: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                              <option value="25%">25% moms</option>
                              <option value="12%">12% moms</option>
                              <option value="6%">6% moms</option>
                              <option value="0%">Momsfri (0%)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fakturaleverans</label>
                            <select value={newCustomerForm.invoice_delivery_method}
                              onChange={e => setNewCustomerForm(p => ({ ...p, invoice_delivery_method: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                              <option value="e-post">E-post</option>
                              <option value="e-faktura">E-faktura</option>
                              <option value="post">Post</option>
                            </select>
                          </div>
                        </div>
                        {newCustomerForm.invoice_delivery_method === 'e-faktura' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">E-fakturaadress</label>
                            <input type="text" value={newCustomerForm.e_invoice_address}
                              onChange={e => setNewCustomerForm(p => ({ ...p, e_invoice_address: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="GLN / PEPPOL-ID" />
                          </div>
                        )}
                        <p className="text-xs text-blue-700">Kunden skapas automatiskt när du skapar ordern.</p>
                      </div>
                    ) : (
                      <>
                        <select required={!isNewCustomer} value={formData.customer_id}
                          onChange={e => { setFormData(p => ({ ...p, customer_id: e.target.value })); setIsEditingExistingCustomer(false); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
                          <option value="">Välj kund...</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {formData.customer_id && selectedCustomer && (
                          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                            {!isEditingExistingCustomer ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                                    <p className="text-xs text-gray-500">{(selectedCustomer as any).customer_type === 'company' ? 'Företag' : 'Privatperson'}</p>
                                  </div>
                                  <button type="button" className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    onClick={() => {
                                      setExistingCustomerEditForm({
                                        name: selectedCustomer.name || '',
                                        email: (selectedCustomer as any).email || '',
                                        phone_number: (selectedCustomer as any).phone_number || '',
                                        org_number: (selectedCustomer as any).org_number || '',
                                        address: (selectedCustomer as any).address || '',
                                        postal_code: (selectedCustomer as any).postal_code || '',
                                        city: (selectedCustomer as any).city || '',
                                        sales_area: (selectedCustomer as any).sales_area || '',
                                        vat_handling: (selectedCustomer as any).vat_handling || '25%',
                                        invoice_delivery_method: (selectedCustomer as any).invoice_delivery_method || 'e-post',
                                        e_invoice_address: (selectedCustomer as any).e_invoice_address || '',
                                      });
                                      setIsEditingExistingCustomer(true);
                                    }}>
                                    <Edit2 className="w-3 h-3" /> Redigera
                                  </button>
                                </div>
                                {(selectedCustomer as any).email && <p className="text-xs text-gray-500">{(selectedCustomer as any).email}</p>}
                                {(selectedCustomer as any).phone_number && <p className="text-xs text-gray-500">{(selectedCustomer as any).phone_number}</p>}
                                {(selectedCustomer as any).org_number && (
                                  <p className="text-xs text-gray-500">
                                    {(selectedCustomer as any).customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}: {(selectedCustomer as any).org_number}
                                  </p>
                                )}
                                {[(selectedCustomer as any).address, (selectedCustomer as any).postal_code, (selectedCustomer as any).city].filter(Boolean).length > 0 && (
                                  <p className="text-xs text-gray-500">{[(selectedCustomer as any).address, (selectedCustomer as any).postal_code, (selectedCustomer as any).city].filter(Boolean).join(', ')}</p>
                                )}
                              </>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" placeholder="Namn *" value={existingCustomerEditForm.name} onChange={e => setExistingCustomerEditForm(p => ({ ...p, name: e.target.value }))} />
                                  <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" placeholder="E-post" value={existingCustomerEditForm.email} onChange={e => setExistingCustomerEditForm(p => ({ ...p, email: e.target.value }))} />
                                  <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" placeholder="Telefon" value={existingCustomerEditForm.phone_number} onChange={e => setExistingCustomerEditForm(p => ({ ...p, phone_number: e.target.value }))} />
                                  <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" placeholder={(selectedCustomer as any).customer_type === 'company' ? 'Org.nummer' : 'Personnummer'} value={existingCustomerEditForm.org_number} onChange={e => setExistingCustomerEditForm(p => ({ ...p, org_number: e.target.value }))} />
                                </div>
                                <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" placeholder="Adress" value={existingCustomerEditForm.address} onChange={e => setExistingCustomerEditForm(p => ({ ...p, address: e.target.value }))} />
                                <div className="flex gap-1.5">
                                  <input className="w-20 text-xs border border-gray-300 rounded px-2 py-1.5" placeholder="Postnr" value={existingCustomerEditForm.postal_code} onChange={e => setExistingCustomerEditForm(p => ({ ...p, postal_code: e.target.value }))} />
                                  <input className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5" placeholder="Stad" value={existingCustomerEditForm.city} onChange={e => setExistingCustomerEditForm(p => ({ ...p, city: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <select className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" value={existingCustomerEditForm.vat_handling} onChange={e => setExistingCustomerEditForm(p => ({ ...p, vat_handling: e.target.value }))}>
                                    <option value="25%">25% moms</option><option value="12%">12% moms</option>
                                    <option value="6%">6% moms</option><option value="0%">Momsfri</option>
                                  </select>
                                  <select className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" value={existingCustomerEditForm.invoice_delivery_method} onChange={e => setExistingCustomerEditForm(p => ({ ...p, invoice_delivery_method: e.target.value }))}>
                                    <option value="e-post">E-post</option><option value="e-faktura">E-faktura</option><option value="post">Post</option>
                                  </select>
                                  {existingCustomerEditForm.invoice_delivery_method === 'e-faktura' && (
                                    <input className="col-span-2 w-full text-xs border border-gray-300 rounded px-2 py-1.5" placeholder="E-fakturaadress (GLN/PEPPOL)" value={existingCustomerEditForm.e_invoice_address} onChange={e => setExistingCustomerEditForm(p => ({ ...p, e_invoice_address: e.target.value }))} />
                                  )}
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button type="button" className="text-xs text-gray-500 px-2 py-1" onClick={() => setIsEditingExistingCustomer(false)}>Avbryt</button>
                                  <button type="button" disabled={savingExistingCustomer}
                                    className="text-xs font-medium bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                                    onClick={async () => {
                                      setSavingExistingCustomer(true);
                                      try {
                                        await updateCustomer(selectedCustomer.id, {
                                          name: existingCustomerEditForm.name || undefined,
                                          email: existingCustomerEditForm.email || null,
                                          phone_number: existingCustomerEditForm.phone_number || null,
                                          org_number: existingCustomerEditForm.org_number || null,
                                          address: existingCustomerEditForm.address || null,
                                          postal_code: existingCustomerEditForm.postal_code || null,
                                          city: existingCustomerEditForm.city || null,
                                          sales_area: existingCustomerEditForm.sales_area || null,
                                          vat_handling: existingCustomerEditForm.vat_handling as any,
                                          invoice_delivery_method: existingCustomerEditForm.invoice_delivery_method as any,
                                          e_invoice_address: existingCustomerEditForm.e_invoice_address || null,
                                        } as any);
                                        if (organisationId) {
                                          const res = await getCustomers(organisationId);
                                          if (res.data) setCustomers(res.data);
                                        }
                                        setIsEditingExistingCustomer(false);
                                      } finally { setSavingExistingCustomer(false); }
                                    }}>
                                    {savingExistingCustomer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Spara
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ════ TAB: Orderrader ════ */}
                {activeTab === 'rader' && (
                  <div className="space-y-3">
                    {products.length > 0 ? (
                      <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                        Välj en produkt i "Bibliotek"-kolumnen för att autofylla raden, eller skriv fritt.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                        Produktbiblioteket är tomt. Lägg till produkter via Produktbibliotek-sidan, eller skriv rader fritt.
                      </p>
                    )}

                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-x-2 text-xs font-medium text-gray-500 pb-1 border-b border-gray-200">
                      <div className="col-span-4">Namn / Produkt</div>
                      <div className="col-span-2">Bibliotek</div>
                      <div className="col-span-2 text-right">Antal</div>
                      <div className="col-span-1 text-center">Enhet</div>
                      <div className="col-span-2 text-right">Á-pris (kr)</div>
                      <div className="col-span-1" />
                    </div>

                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-x-2 items-center">
                        <input type="text" placeholder="Namn / beskrivning" value={item.name}
                          onChange={e => handleLineItemChange(index, 'name', e.target.value)}
                          className="col-span-4 px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                        <select value={item.product_id}
                          onChange={e => handleLineItemChange(index, 'product_id', e.target.value)}
                          className="col-span-2 px-2 py-2 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                          <option value="">{products.length === 0 ? '—' : 'Välj…'}</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" value={item.quantity}
                          onChange={e => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                          className="col-span-2 px-2 py-2 text-sm border border-gray-300 rounded-md text-right"
                          min={0} step="0.1" />
                        <select value={item.unit} onChange={e => handleLineItemChange(index, 'unit', e.target.value)}
                          className="col-span-1 px-1 py-2 text-xs border border-gray-300 rounded-md">
                          {Object.entries(UNIT_DESCRIPTIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input type="number" value={item.unit_price}
                          onChange={e => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="col-span-2 px-2 py-2 text-sm border border-gray-300 rounded-md text-right"
                          min={0} step="0.01" />
                        <div className="col-span-1 flex justify-center">
                          <button type="button" onClick={() => removeLineItem(index)}
                            className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <button type="button" onClick={addLineItem}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                        <Plus size={16} /> Lägg till rad
                      </button>
                      <div className="text-sm font-bold text-gray-800">Totalt: {formatCurrency(totalValue)}</div>
                    </div>
                  </div>
                )}

                {/* ════ TAB: Tilldelning ════ */}
                {activeTab === 'uppdrag' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tilldelningstyp <span className="text-red-500">*</span></label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input type="radio" name="create_order_assignment_type" value="individual"
                            checked={formData.assignment_type === 'individual'}
                            onChange={e => setFormData(p => ({ ...p, assignment_type: e.target.value as AssignmentType, assigned_to_team_id: '', assigned_to_user_id: '' }))}
                            className="h-4 w-4 text-primary-600 border-gray-300" />
                          <span className="ml-2 text-sm text-gray-700">Individ</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="create_order_assignment_type" value="team"
                            checked={formData.assignment_type === 'team'}
                            onChange={e => setFormData(p => ({ ...p, assignment_type: e.target.value as AssignmentType, assigned_to_team_id: '', assigned_to_user_id: '' }))}
                            className="h-4 w-4 text-primary-600 border-gray-300" />
                          <span className="ml-2 text-sm text-gray-700">Team</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.assignment_type === 'individual' ? 'Tilldela till person' : 'Tilldela till team'} <span className="text-red-500">*</span>
                      </label>
                      {formData.assignment_type === 'individual' ? (
                        <select value={formData.assigned_to_user_id}
                          onChange={e => setFormData(p => ({ ...p, assigned_to_user_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
                          <option value="">Välj person...</option>
                          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                        </select>
                      ) : (
                        <select value={formData.assigned_to_team_id}
                          onChange={e => setFormData(p => ({ ...p, assigned_to_team_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
                          <option value="">Välj team...</option>
                          {teams
                            .filter(t => t.specialty === formData.job_type || t.specialty === 'allmänt')
                            .map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({TEAM_SPECIALTY_LABELS[t.specialty as keyof typeof TEAM_SPECIALTY_LABELS] ?? t.specialty})
                              </option>
                            ))}
                        </select>
                      )}
                      {formData.assignment_type === 'team' && formData.job_type !== 'allmänt' && (
                        <p className="text-xs text-blue-600 mt-1">
                          Visar team som matchar jobbtypen "{JOB_TYPE_LABELS[formData.job_type]}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ════ TAB: Avdrag ════ */}
                {activeTab === 'avdrag' && (
                  <div className="space-y-3">
                    <ROTFields
                      data={{
                        include_rot: formData.include_rot,
                        rot_personnummer: formData.rot_personnummer,
                        rot_organisationsnummer: formData.rot_organisationsnummer,
                        rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                        rot_amount: formData.rot_amount,
                      }}
                      onChange={rotData => {
                        const reset = rotData.include_rot ? { include_rut: false, rut_personnummer: null, rut_amount: 0 } : {};
                        setFormData(p => ({ ...p, ...rotData, ...reset }));
                      }}
                      totalAmount={totalValue}
                    />
                    <RUTFields
                      data={{
                        include_rut: formData.include_rut,
                        rut_personnummer: formData.rut_personnummer,
                        rut_amount: formData.rut_amount,
                      }}
                      onChange={rutData => {
                        const reset = rutData.include_rut ? { include_rot: false, rot_personnummer: null, rot_organisationsnummer: null, rot_fastighetsbeteckning: null, rot_amount: 0 } : {};
                        setFormData(p => ({ ...p, ...rutData, ...reset }));
                      }}
                      totalAmount={totalValue}
                    />
                  </div>
                )}
              </>
            )}
          </div>{/* end scrollable content */}

          {/* ── Footer ──────────────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              {validLineItemCount > 0 && (
                <span>Ordervärde: <strong className="text-gray-800">{formatCurrency(totalValue)}</strong></span>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { onClose(); resetForm(); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Avbryt
              </button>
              <button type="submit" disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Skapar...</>
                ) : (
                  isNewCustomer ? 'Skapa kund & order' : 'Skapa Order'
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Plus, Users, Edit, Trash2, X, User, Calendar, DollarSign,
  FileText, Search, List, Archive, RefreshCw, Loader2, ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getOrders, updateOrder, createOrder, createOrderWithQuote, updateOrderAndQuote, deleteOrder, type OrderWithRelations } from '../lib/orders';
import { getUserProfiles, getCustomers, updateCustomer, getLeads } from '../lib/database';
import type { UserProfile, Customer, OrderStatus, Lead } from '../types/database';
import LineItemsEditor, { type LineItem } from './LineItemsEditor';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../hooks/useToast';
import OrderStatusBadge from './OrderStatusBadge';
import { getTeams, type TeamWithRelations } from '../lib/teams';
import { Button } from './ui';

// ==================================
// TYPES & CONSTANTS
// ==================================

type ViewMode = 'list' | 'archive';

const STATUS_OPTIONS: OrderStatus[] = [
  'öppen_order', 'bokad_bekräftad', 'ej_slutfört', 'redo_fakturera', 'fakturerad', 'avbokad_kund'
];

type OrderFiltersState = {
  searchTerm: string;
  status: OrderStatus | 'all';
  customer: string | 'all';
  user: string | 'all';
  team: string | 'all';
  dateFrom: string;
  dateTo: string;
};

// ==================================
// MAIN COMPONENT
// ==================================

export function Ordermanagement() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Data state
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teams, setTeams] = useState<TeamWithRelations[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);

  // Filtering and Sorting
  const [filters, setFilters] = useState<OrderFiltersState>({
    searchTerm: '',
    status: 'all',
    customer: 'all',
    user: 'all',
    team: 'all',
    dateFrom: '',
    dateTo: '',
  });



  // Fetch initial data
  const fetchData = useCallback(async (profile: UserProfile) => {
    try {
      setLoading(true);
      setError(null);
      if (!profile.organisation_id) throw new Error("Organisation not found");

      const [ordersResult, usersResult, customersResult, teamsResult, leadsResult] = await Promise.all([
        getOrders(profile.organisation_id),
        getUserProfiles(profile.organisation_id),
        getCustomers(profile.organisation_id),
        getTeams(profile.organisation_id),
        getLeads(profile.organisation_id),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (usersResult.error) throw usersResult.error;
      if (customersResult.error) throw customersResult.error;
      if (teamsResult.error) throw teamsResult.error;

      setOrders(ordersResult.data || []);
      setUsers(usersResult.data || []);
      setCustomers(customersResult.data || []);
      setTeams(teamsResult.data || []);
      setLeads(leadsResult.data || []);

    } catch (err: any) {
      setError(`Kunde inte ladda orderdata: ${err.message}`);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (user) {
      getUserProfiles('', { userId: user.id }).then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else if (data && data[0]) {
          setCurrentUserProfile(data[0]);
          fetchData(data[0]);
        }
      });
    }
  }, [user, fetchData]);

  // Memoized filtering logic
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (viewMode === 'archive') {
      result = result.filter(order => order.status === 'arkiverad');
    } else {
      result = result.filter(order => order.status !== 'arkiverad');
    }

    if (filters.searchTerm) {
      const lowercasedTerm = filters.searchTerm.toLowerCase();
      result = result.filter(order =>
        order.title.toLowerCase().includes(lowercasedTerm) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(lowercasedTerm)) ||
        `#${order.id}`.includes(lowercasedTerm)
      );
    }

    if (filters.status !== 'all' && viewMode !== 'archive') {
      result = result.filter(order => order.status === filters.status);
    }

    if (filters.customer !== 'all') {
      result = result.filter(order => order.customer_id === filters.customer);
    }

    if (filters.user !== 'all') {
      result = result.filter(order => order.assigned_to_user_id === filters.user);
    }

    if (filters.team !== 'all') {
      result = result.filter(order => order.assigned_to_team_id === filters.team);
    }

    if (filters.dateFrom) {
      result = result.filter(order => new Date(order.created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999); // Include the whole day
      result = result.filter(order => new Date(order.created_at) <= endDate);
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, filters, viewMode]);

  const orderStats = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(new Date().setDate(now.getDate() - 30));
    const last6Months = new Date(new Date().setDate(now.getDate() - 180));

    const activeOrders = orders.filter(o => o.status !== 'arkiverad');

    const totalFilteredValue = filteredOrders.reduce((sum, order) => sum + (order.value || 0), 0);
    const totalAllTimeValue = activeOrders.reduce((sum, order) => sum + (order.value || 0), 0);

    const totalLastMonthValue = activeOrders
      .filter(o => new Date(o.created_at) > lastMonth)
      .reduce((sum, order) => sum + (order.value || 0), 0);

    const totalLast6MonthsValue = activeOrders
      .filter(o => new Date(o.created_at) > last6Months)
      .reduce((sum, order) => sum + (order.value || 0), 0);

    return { totalFilteredValue, totalAllTimeValue, totalLastMonthValue, totalLast6MonthsValue };
  }, [orders, filteredOrders]);

  // Handlers
  const handleOpenDetailModal = (order: OrderWithRelations) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleOpenEditModal = (order: OrderWithRelations | null) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleOpenDeleteConfirm = (order: OrderWithRelations) => {
    setSelectedOrder(order);
    setIsConfirmDeleteOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleSaveOrder = async (formData: any) => {
    if (!currentUserProfile?.organisation_id) return;

    const { line_items, notes, ...orderData } = formData;

    // FIX: Convert empty strings to null for foreign key fields
    if (orderData.assigned_to_user_id === '') {
      orderData.assigned_to_user_id = null;
    }
    if (orderData.assigned_team_id === '') {
      orderData.assigned_team_id = null;
    }

    try {
      if (selectedOrder) { // Update
        // FIX: Call the new, safer function
        const { data, error } = await updateOrderAndQuote(selectedOrder.id, orderData, line_items);
        if (error) throw error;
        setOrders(prev => prev.map(o => (o.id === selectedOrder.id ? data! : o)));
        addToast("Order uppdaterad!", 'success');
      } else { // Create
        // This part is already correct from our previous fixes
        const { data, error } = await createOrderWithQuote(orderData, line_items, currentUserProfile.organisation_id);
        if (error) throw error;
        setOrders(prev => [data!, ...prev]);
        addToast("Ny order skapad!", 'success');
      }
      setIsEditModalOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      addToast(`Kunde inte spara order: ${error.message}`, 'error');
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    const { error } = await deleteOrder(selectedOrder.id);
    if (error) {
      addToast(`Kunde inte ta bort order: ${error.message}`, 'error');
    } else {
      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
      addToast("Order borttagen.", 'success');
    }
    setIsConfirmDeleteOpen(false);
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Orderhantering</h1>
              <p className="text-indigo-100">Hantera alla ordrar</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Laddar ordrar...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Orderhantering</h1>
              <p className="text-indigo-100">{filteredOrders.length} av {orders.length} ordrar visas</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchData(currentUserProfile!)}
              className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Uppdatera
            </Button>
            <button
              type="button"
              onClick={() => handleOpenEditModal(null)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Skapa ny order
            </button>
          </div>
        </div>
      </div>

      <OrderStats stats={orderStats} />

      <OrderFilters
        filters={filters}
        onFiltersChange={setFilters}
        customers={customers}
        users={users}
        teams={teams}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Inga ordrar hittades"
          message={Object.values(filters).some(v => v && v !== 'all') ? "Prova att justera dina filter." : "Skapa en ny order för att komma igång."}
        />
      ) : (
        <OrderListView orders={filteredOrders} onOpenDetail={handleOpenDetailModal} onOpenEdit={handleOpenEditModal} />
      )}

      {isDetailModalOpen && selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setIsDetailModalOpen(false)} onOpenEdit={handleOpenEditModal} onOpenDelete={handleOpenDeleteConfirm} />}
      {isEditModalOpen && <OrderEditModal order={selectedOrder} customers={customers} users={users} teams={teams} leads={leads} onClose={() => { setIsEditModalOpen(false); setSelectedOrder(null); }} onSave={handleSaveOrder} />}
      {isConfirmDeleteOpen && selectedOrder && <ConfirmDialog isOpen={true} title="Ta bort order?" message={`Är du säker på att du vill ta bort ordern "${selectedOrder.title}"? Denna åtgärd kan inte ångras.`} onConfirm={handleDeleteOrder} onClose={() => setIsConfirmDeleteOpen(false)} confirmText="Ja, ta bort" />}
    </div>
  );
}

// ==================================
// SUB-COMPONENTS
// ==================================

function OrderFilters({ filters, onFiltersChange, customers, users, teams, viewMode, onViewModeChange }: {
  filters: OrderFiltersState;
  onFiltersChange: React.Dispatch<React.SetStateAction<OrderFiltersState>>;
  customers: Customer[];
  users: UserProfile[];
  teams: TeamWithRelations[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFiltersChange(prev => ({ ...prev, [name]: value }));
  };

  const statusOptions = STATUS_OPTIONS.filter(s => s !== 'arkiverad');

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center bg-gray-100 rounded-lg p-1 space-x-1">
          {(['list', 'archive'] as const).map(mode => (
            <button key={mode} onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 capitalize flex items-center gap-2 ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-white/60'}`}
            >
              {mode === 'list' ? <List size={16} /> : <Archive size={16} />}
              {mode === 'list' ? 'Aktiva' : 'Arkiv'}
            </button>
          ))}
        </div>
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" name="searchTerm" placeholder="Sök på titel, kund eller ID..." value={filters.searchTerm} onChange={handleInputChange}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <select name="status" value={filters.status} onChange={handleInputChange} disabled={viewMode === 'archive'} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100">
          <option value="all">Alla Statusar</option>
          {statusOptions.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select name="customer" value={filters.customer} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
          <option value="all">Alla Kunder</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="user" value={filters.user} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
          <option value="all">Alla Användare</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <select name="team" value={filters.team} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
          <option value="all">Alla Team</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
          <input type="date" name="dateTo" value={filters.dateTo} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
    </div>
  );
}

function OrderListView({ orders, onOpenDetail, onOpenEdit }: {
  orders: OrderWithRelations[];
  onOpenDetail: (order: OrderWithRelations) => void;
  onOpenEdit: (order: OrderWithRelations) => void;
}) {
  const navigate = useNavigate();
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    return `${value.toLocaleString('sv-SE')} SEK`;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Kund</th>
            <th>Status</th>
            <th>Ansvarig</th>
            <th>Ordervärde</th>
            <th>Skapad</th>
            <th className="text-right">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id} onClick={() => onOpenDetail(order)} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{order.title}</div>
                <div className="text-sm text-gray-500">#{order.id}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.customer?.name || 'Okänd kund'}</td>
              <td className="px-6 py-4 whitespace-nowrap"><OrderStatusBadge status={order.status} /></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {order.assigned_to ? (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    {order.assigned_to.full_name}
                  </div>
                ) : order.assigned_team ? (
                  <div className="flex items-center font-medium text-purple-700">
                    <Users className="w-4 h-4 mr-2 text-purple-400" />
                    {order.assigned_team.name}
                  </div>
                ) : (
                  'Ej tilldelad'
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{formatCurrency(order.value)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(order.created_at).toLocaleDateString('sv-SE')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/app/order/${order.id}`); }}
                  className="text-gray-400 hover:text-indigo-600 p-2 rounded-md hover:bg-indigo-50 mr-1"
                  title="Öppna fullständig ordersida"
                >
                  <ExternalLink className="h-5 w-5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpenEdit(order); }} className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-gray-100">
                  <Edit className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onOpenEdit, onOpenDelete }: {
  order: OrderWithRelations;
  onClose: () => void;
  onOpenEdit: (order: OrderWithRelations) => void;
  onOpenDelete: (order: OrderWithRelations) => void;
}) {
  const navigate = useNavigate();
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    return `${value.toLocaleString('sv-SE')} SEK`;
  }

  // FINAL FIX: Safely access the first quote if it's an array.
  const quote = Array.isArray(order.quote) ? order.quote[0] : order.quote;
  const lineItems = quote?.quote_line_items || [];


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <Package className="text-blue-600" />
            {order.title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <OrderStatusBadge status={order.status} large />
            <div className="text-sm text-gray-500">ID: #{order.id}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem icon={User} label="Kund" value={order.customer?.name || 'N/A'} />
            <InfoItem icon={User} label="Ansvarig" value={order.assigned_to?.full_name || 'Ej tilldelad'} />
            {order.primary_salesperson && (
              <InfoItem
                icon={DollarSign}
                label="Primär Säljare"
                value={order.primary_salesperson.full_name}
              />
            )}
            {order.secondary_salesperson && (
              <InfoItem
                icon={DollarSign}
                label="Sekundär Säljare"
                value={order.secondary_salesperson.full_name}
              />
            )}
            <InfoItem icon={Calendar} label="Skapad" value={new Date(order.created_at).toLocaleString('sv-SE')} />
            <InfoItem icon={DollarSign} label="Totalt Ordervärde" value={formatCurrency(order.value)} />
          </div>

          {order.description && <InfoItem icon={FileText} label="Beskrivning" value={<p className="whitespace-pre-wrap">{order.description}</p>} />}

          <div>
            <h4 className="font-medium text-gray-800 mb-2">Orderrader</h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produkt/Tjänst</th>
                    <th className="text-right">Antal</th>
                    <th className="text-right">Pris</th>
                    <th className="text-right">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {/*
                                    ADJUSTMENT: We now map over the safe 'lineItems' variable.
                                    This correctly points to the quote's line items.
                                  */}
                  {lineItems.length > 0 ? (
                    lineItems.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm">{item.description || 'Ingen produkt'}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 p-4">Inga orderrader tillagda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50 mt-auto">
          <button
            onClick={() => navigate(`/app/order/${order.id}`)}
            className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-md text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Gå till ordersida
          </button>
          <div className="flex items-center space-x-3">
            <button onClick={() => onOpenEdit(order)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"><Edit className="w-4 h-4 mr-2" />Redigera</button>
            <button onClick={() => onOpenDelete(order)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"><Trash2 className="w-4 h-4 mr-2" />Ta bort</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) {
  return (
    <div className="flex items-start">
      <Icon className="w-5 h-5 mr-3 mt-1 text-gray-400 flex-shrink-0" />
      <div>
        <h4 className="font-medium text-gray-800">{label}</h4>
        <div className="text-gray-600">{value}</div>
      </div>
    </div>
  );
}

export function OrderEditModal({ order, customers, users, teams, leads, onClose, onSave }: {
  order: OrderWithRelations | null;
  customers: Customer[];
  users: UserProfile[];
  teams: TeamWithRelations[];
  leads: Lead[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const { addToast } = useToast();
  const quote = order ? (Array.isArray(order.quote) ? order.quote[0] : order.quote) : null;

  type TabId = 'info' | 'kund' | 'rader' | 'avdrag';
  const [activeTab, setActiveTab] = useState<TabId>('info');

  const [formData, setFormData] = useState({
    title: order?.title || '',
    customer_id: order?.customer_id || '',
    lead_id: order?.lead_id || '',
    assigned_to_user_id: order?.assigned_to_user_id || '',
    assigned_to_team_id: order?.assigned_to_team_id || '',
    status: order?.status || ('öppen_order' as OrderStatus),
    description: order?.description || '',
    job_description: order?.job_description || '',
    job_type: order?.job_type || '',
    estimated_hours: order?.estimated_hours?.toString() || '',
    complexity_level: order?.complexity_level?.toString() || '3',
    region: order?.region || '',
    source: order?.source || '',
    primary_salesperson_id: order?.primary_salesperson_id || '',
    secondary_salesperson_id: order?.secondary_salesperson_id || '',
    include_rot: order?.include_rot || false,
    rot_personnummer: order?.rot_personnummer || '',
    rot_organisationsnummer: order?.rot_organisationsnummer || '',
    rot_fastighetsbeteckning: order?.rot_fastighetsbeteckning || '',
    rot_amount: order?.rot_amount || 0,
    include_rut: (order as any)?.include_rut || false,
    rut_personnummer: (order as any)?.rut_personnummer || '',
    rut_amount: (order as any)?.rut_amount || 0,
  });

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    quote?.quote_line_items?.map((item: any) => ({
      id: item.id,
      name: item.name || item.description || '',
      description: item.description || '',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total: (item.quantity || 1) * (item.unit_price || 0),
      unit: item.unit || '',
      is_library_item: item.is_library_item || false,
    })) || []
  );

  // Inline customer editing
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerEditForm, setCustomerEditForm] = useState({
    name: '', email: '', phone_number: '', org_number: '',
    address: '', postal_code: '', city: '',
    vat_handling: '25%', invoice_delivery_method: 'e-post',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const totalValue = useMemo(() =>
    lineItems.reduce((sum, item) => sum + (item.total || 0), 0),
    [lineItems]);

  const startEditCustomer = () => {
    const sel = customers.find(c => c.id === formData.customer_id);
    if (!sel) return;
    setCustomerEditForm({
      name: sel.name || '',
      email: (sel as any).email || '',
      phone_number: (sel as any).phone_number || '',
      org_number: (sel as any).org_number || '',
      address: (sel as any).address || '',
      postal_code: (sel as any).postal_code || '',
      city: (sel as any).city || '',
      vat_handling: (sel as any).vat_handling || '25%',
      invoice_delivery_method: (sel as any).invoice_delivery_method || 'e-post',
    });
    setIsEditingCustomer(true);
  };

  const handleSaveCustomer = async () => {
    const sel = customers.find(c => c.id === formData.customer_id);
    if (!sel) return;
    setSavingCustomer(true);
    try {
      const { error } = await updateCustomer(sel.id, {
        name: customerEditForm.name || undefined,
        email: customerEditForm.email || null,
        phone_number: customerEditForm.phone_number || null,
        org_number: customerEditForm.org_number || null,
        address: customerEditForm.address || null,
        postal_code: customerEditForm.postal_code || null,
        city: customerEditForm.city || null,
        vat_handling: customerEditForm.vat_handling as any,
        invoice_delivery_method: customerEditForm.invoice_delivery_method as any,
      } as any);
      if (error) { addToast(`Kunde inte spara kund: ${error.message}`, 'error'); return; }
      addToast('Kunduppgifter sparade', 'success');
      setIsEditingCustomer(false);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Manual validation — native `required` doesn't fire for unmounted tab content
    if (!formData.title.trim()) {
      addToast('Titel är obligatoriskt', 'error');
      setActiveTab('info');
      return;
    }
    if (!formData.customer_id) {
      addToast('Välj en kund', 'error');
      setActiveTab('kund');
      return;
    }
    const validLineItems = lineItems.filter(item => item.description.trim() !== '');
    const finalTotalValue = validLineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    onSave({
      ...formData,
      value: finalTotalValue,
      lead_id: formData.lead_id || null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      complexity_level: parseInt(formData.complexity_level) || 3,
      rot_personnummer: formData.rot_personnummer || null,
      rot_organisationsnummer: formData.rot_organisationsnummer || null,
      rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning || null,
      rut_personnummer: formData.rut_personnummer || null,
      source: formData.source || null,
      region: formData.region || null,
      line_items: validLineItems.map(item => ({
        name: item.name || item.description,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit || '',
        is_library_item: item.is_library_item || false,
        total: item.total,
      })),
      notes: [],
    });
  };

  const formatCurrency = (value: number) => `${value.toLocaleString('sv-SE')} SEK`;
  const selectedCustomer = customers.find(c => c.id === formData.customer_id);
  const validLineItemCount = lineItems.filter(i => i.description.trim() !== '').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">

          {/* ── Header ──────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">
              {order ? 'Redigera Order' : 'Skapa Ny Order'}
            </h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Tab bar ─────────────────────────────────────── */}
          <div className="border-b flex-shrink-0 bg-gray-50">
            <nav className="flex px-4">
              {([
                { id: 'info' as const, label: 'Grundinfo' },
                { id: 'kund' as const, label: 'Kund & Uppdrag' },
                { id: 'rader' as const, label: validLineItemCount > 0 ? `Orderrader (${validLineItemCount})` : 'Orderrader' },
                { id: 'avdrag' as const, label: 'Avdrag' },
              ]).map(tab => (
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

            {/* ════ TAB: Grundinfo ════ */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Titel" required>
                    <input type="text" name="title" value={formData.title} onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </FormField>
                  <FormField label="Status">
                    <select name="status" value={formData.status} onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Jobbtyp">
                    <select name="job_type" value={formData.job_type} onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Välj typ</option>
                      <option value="el">El</option>
                      <option value="rör">Rör</option>
                      <option value="bygg">Bygg</option>
                      <option value="målning">Målning</option>
                      <option value="mark">Mark</option>
                      <option value="ventilation">Ventilation</option>
                      <option value="allmänt">Allmänt</option>
                    </select>
                  </FormField>
                  <FormField label="Källa">
                    <input type="text" name="source" value={formData.source} onChange={handleFormChange}
                      placeholder="t.ex. Offert, Kundkontakt, Hemsida"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </FormField>
                </div>
                <FormField label="Beskrivning">
                  <textarea name="description" value={formData.description} onChange={handleFormChange} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </FormField>
                <FormField label="Jobbdetaljer">
                  <textarea name="job_description" value={formData.job_description} onChange={handleFormChange} rows={3}
                    placeholder="Beskriv arbetet som ska utföras…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </FormField>
                {/* Linked quote read-only info */}
                {quote && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm space-y-1">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Kopplad offert</p>
                    <p className="text-indigo-900 font-medium">
                      {(quote as any).title || `Offert #${(quote as any).quote_number || quote.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-indigo-500">Redigera rader under fliken "Orderrader"</p>
                  </div>
                )}
              </div>
            )}

            {/* ════ TAB: Kund & Uppdrag ════ */}
            {activeTab === 'kund' && (
              <div className="space-y-5">
                {/* Lead picker */}
                {leads.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Kopplad lead <span className="text-gray-400 text-xs font-normal">(valfri)</span></label>
                    <select
                      value={formData.lead_id}
                      onChange={e => {
                        const leadId = e.target.value;
                        setFormData(prev => {
                          const updated = { ...prev, lead_id: leadId };
                          // Only auto-fill when creating a new order (not editing)
                          if (!order && leadId) {
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
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Ingen lead kopplad</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Customer card */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Kund <span className="text-red-500">*</span></label>
                    {formData.customer_id && !isEditingCustomer && (
                      <button type="button" onClick={startEditCustomer}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <Edit className="w-3 h-3" /> Redigera kunduppgifter
                      </button>
                    )}
                  </div>
                  <select name="customer_id" value={formData.customer_id}
                    onChange={e => { handleFormChange(e); setIsEditingCustomer(false); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="" disabled>Välj kund</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {selectedCustomer && !isEditingCustomer && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md space-y-0.5 text-xs text-gray-600">
                      <p className="font-medium text-gray-800">{selectedCustomer.name}</p>
                      {(selectedCustomer as any).customer_type && <p>{(selectedCustomer as any).customer_type === 'company' ? 'Företag' : 'Privatperson'}</p>}
                      {(selectedCustomer as any).email && <p>{(selectedCustomer as any).email}</p>}
                      {(selectedCustomer as any).phone_number && <p>{(selectedCustomer as any).phone_number}</p>}
                      {(selectedCustomer as any).org_number && <p>{(selectedCustomer as any).customer_type === 'company' ? 'Org.nr' : 'Personnr'}: {(selectedCustomer as any).org_number}</p>}
                      {[(selectedCustomer as any).address, (selectedCustomer as any).postal_code, (selectedCustomer as any).city].filter(Boolean).length > 0 && (
                        <p>{[(selectedCustomer as any).address, (selectedCustomer as any).postal_code, (selectedCustomer as any).city].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                  )}
                  {isEditingCustomer && (
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Redigera kund</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="px-2 py-1.5 text-xs border border-gray-300 rounded-md" placeholder="Namn"
                          value={customerEditForm.name} onChange={e => setCustomerEditForm(p => ({ ...p, name: e.target.value }))} />
                        <input className="px-2 py-1.5 text-xs border border-gray-300 rounded-md" placeholder="E-post" type="email"
                          value={customerEditForm.email} onChange={e => setCustomerEditForm(p => ({ ...p, email: e.target.value }))} />
                        <input className="px-2 py-1.5 text-xs border border-gray-300 rounded-md" placeholder="Telefon"
                          value={customerEditForm.phone_number} onChange={e => setCustomerEditForm(p => ({ ...p, phone_number: e.target.value }))} />
                        <input className="px-2 py-1.5 text-xs border border-gray-300 rounded-md" placeholder="Org./Personnummer"
                          value={customerEditForm.org_number} onChange={e => setCustomerEditForm(p => ({ ...p, org_number: e.target.value }))} />
                        <input className="px-2 py-1.5 text-xs border border-gray-300 rounded-md col-span-2" placeholder="Adress"
                          value={customerEditForm.address} onChange={e => setCustomerEditForm(p => ({ ...p, address: e.target.value }))} />
                        <input className="px-2 py-1.5 text-xs border border-gray-300 rounded-md" placeholder="Postnr"
                          value={customerEditForm.postal_code} onChange={e => setCustomerEditForm(p => ({ ...p, postal_code: e.target.value }))} />
                        <input className="px-2 py-1.5 text-xs border border-gray-300 rounded-md" placeholder="Stad"
                          value={customerEditForm.city} onChange={e => setCustomerEditForm(p => ({ ...p, city: e.target.value }))} />
                        <select className="px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                          value={customerEditForm.vat_handling} onChange={e => setCustomerEditForm(p => ({ ...p, vat_handling: e.target.value }))}>
                          <option value="25%">25% moms</option>
                          <option value="12%">12% moms</option>
                          <option value="6%">6% moms</option>
                          <option value="0%">Momsfri (0%)</option>
                        </select>
                        <select className="px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                          value={customerEditForm.invoice_delivery_method} onChange={e => setCustomerEditForm(p => ({ ...p, invoice_delivery_method: e.target.value }))}>
                          <option value="e-post">E-post</option>
                          <option value="e-faktura">E-faktura</option>
                          <option value="post">Post</option>
                        </select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setIsEditingCustomer(false)}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-md">Avbryt</button>
                        <button type="button" onClick={handleSaveCustomer} disabled={savingCustomer}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                          {savingCustomer ? 'Sparar…' : 'Spara kund'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Salespeople & assignment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Primär säljare">
                    <select name="primary_salesperson_id" value={formData.primary_salesperson_id} onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Ingen säljare</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Sekundär säljare">
                    <select name="secondary_salesperson_id" value={formData.secondary_salesperson_id} onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Ingen säljare</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Ansvarig person">
                    <select name="assigned_to_user_id" value={formData.assigned_to_user_id}
                      onChange={e => { handleFormChange(e); setFormData(p => ({ ...p, assigned_to_team_id: '' })); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Välj Användare</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Ansvarigt team">
                    <select name="assigned_to_team_id" value={formData.assigned_to_team_id}
                      onChange={e => { handleFormChange(e); setFormData(p => ({ ...p, assigned_to_user_id: '' })); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Välj Team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </FormField>
                </div>

                {/* Details */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Uppskattad tid (tim)">
                    <input type="number" name="estimated_hours" value={formData.estimated_hours} onChange={handleFormChange}
                      min={0} step={0.5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </FormField>
                  <FormField label="Komplexitet">
                    <select name="complexity_level" value={formData.complexity_level} onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option value="1">1 – Mycket enkelt</option>
                      <option value="2">2 – Enkelt</option>
                      <option value="3">3 – Medel</option>
                      <option value="4">4 – Svårt</option>
                      <option value="5">5 – Mycket svårt</option>
                    </select>
                  </FormField>
                  <FormField label="Område">
                    <input type="text" name="region" value={formData.region} onChange={handleFormChange}
                      placeholder="t.ex. Stockholm"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </FormField>
                </div>
              </div>
            )}

            {/* ════ TAB: Orderrader ════ */}
            {activeTab === 'rader' && (
              <div className="space-y-4">
                <LineItemsEditor
                  lineItems={lineItems}
                  onChange={setLineItems}
                />
              </div>
            )}

            {/* ════ TAB: Avdrag ════ */}
            {activeTab === 'avdrag' && (
              <div className="space-y-4">
                {/* ROT */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="include_rot" checked={formData.include_rot}
                      onChange={e => setFormData(p => ({ ...p, include_rot: e.target.checked, ...(e.target.checked ? { include_rut: false } : {}) }))}
                      className="rounded" />
                    <span className="text-sm font-medium text-gray-700">Inkludera ROT-avdrag</span>
                  </label>
                  {formData.include_rot && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Personnummer</label>
                        <input type="text" name="rot_personnummer" value={formData.rot_personnummer} onChange={handleFormChange}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Org.nummer</label>
                        <input type="text" name="rot_organisationsnummer" value={formData.rot_organisationsnummer} onChange={handleFormChange}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fastighetsbeteckning</label>
                        <input type="text" name="rot_fastighetsbeteckning" value={formData.rot_fastighetsbeteckning} onChange={handleFormChange}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ROT-belopp (kr)</label>
                        <input type="number" name="rot_amount" value={formData.rot_amount} onChange={handleFormChange}
                          min={0} step={0.01} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                      </div>
                    </div>
                  )}
                </div>
                {/* RUT */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="include_rut" checked={formData.include_rut}
                      onChange={e => setFormData(p => ({ ...p, include_rut: e.target.checked, ...(e.target.checked ? { include_rot: false } : {}) }))}
                      className="rounded" />
                    <span className="text-sm font-medium text-gray-700">Inkludera RUT-avdrag</span>
                  </label>
                  {formData.include_rut && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Personnummer</label>
                        <input type="text" name="rut_personnummer" value={formData.rut_personnummer} onChange={handleFormChange}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">RUT-belopp (kr)</label>
                        <input type="number" name="rut_amount" value={formData.rut_amount} onChange={handleFormChange}
                          min={0} step={0.01} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
              <button type="button" onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Avbryt
              </button>
              <button type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                {order ? 'Uppdatera Order' : 'Skapa Order'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

const FormField = ({ label, children, required = false }: { label: string, children: React.ReactNode, required?: boolean }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
    {children}
  </div>
);

function OrderStats({ stats }: { stats: { totalFilteredValue: number, totalAllTimeValue: number, totalLastMonthValue: number, totalLast6MonthsValue: number } }) {
  const formatCurrency = (value: number) => `${Math.round(value).toLocaleString('sv-SE')} SEK`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Totalt Värde (Filtrerat)" value={formatCurrency(stats.totalFilteredValue)} />
      <StatCard title="Senaste Månaden" value={formatCurrency(stats.totalLastMonthValue)} />
      <StatCard title="Senaste 6 Månaderna" value={formatCurrency(stats.totalLast6MonthsValue)} />
      <StatCard title="Totalt Värde (Alla)" value={formatCurrency(stats.totalAllTimeValue)} />
    </div>
  );
}

function StatCard({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default Ordermanagement
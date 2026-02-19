import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Plus,
  Search,
  Filter,
  Users,
  Users2,
  Calendar,
  User,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Activity,
  Trash2,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Package,
  Target,
  Clock,
  Star,
  Crown,
  Briefcase,
  Loader2,
  Edit,
  Send
} from 'lucide-react';
import { Button } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import CommunicationPanel from './CommunicationPanel';
import {
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderNotes,
  createOrderNote,
  getOrderActivities,
  type OrderWithRelations,
  type OrderFilters
} from '../lib/orders';
import { type LeadWithRelations } from '../lib/leads';
import { createQuote, type QuoteWithRelations } from '../lib/quotes';
// Teams now fetched by useKanbanData hook
import { formatCurrency, formatDate } from '../lib/database';
import {
  ORDER_STATUS_LABELS,
  getOrderStatusColor,
  JOB_TYPE_LABELS,
  TEAM_SPECIALTY_LABELS,
  getTeamSpecialtyColor,
  getJobTypeColor,
  type OrderStatus,
  type JobType,
  type AssignmentType,
  type QuoteStatus
} from '../types/database';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import OrderStatusDropdown from './OrderStatusDropdown';
import OrderStatusBadge from './OrderStatusBadge';
import StatusChangeHistory from './StatusChangeHistory';
import { useNavigate } from 'react-router-dom'; // Add this line
import { getOrderCommunications } from "../lib/communications";

// Lazy load heavy modal components to reduce initial bundle size
const EmailComposer = lazy(() => import("./EmailComposer"));
const SMSComposer = lazy(() => import("./SMSComposer"));
import ROTFields from '../components/ROTFields';
import ROTInformation from '../components/ROTInformation';
import CommissionAssignmentForm from './CommissionAssignmentForm';
import { acceptQuoteAndCreateOrder } from '../lib/quotes';
import { useTranslation } from '../locales/sv';
import { useKanbanData } from '../hooks/useKanbanData';
import { useMoveCard } from '../hooks/useMoveCard';

import { SkeletonColumn } from './ui';
import QuoteCreationModal from './QuoteCreationModal';
import QuoteDetailModal from './QuoteDetailModal';



const getInitialEditFormData = (order: OrderWithRelations | null) => {
  if (!order) {
    return {
      id: '',
      title: '',
      description: '',
      job_description: '',
      job_type: 'allmänt' as JobType,
      value: '',
      estimated_hours: '',
      complexity_level: '3',
      assignment_type: 'individual' as AssignmentType,
      assigned_to_user_id: '',
      assigned_to_team_id: '',
      include_rot: false,
      rot_personnummer: null,
      rot_organisationsnummer: null,
      rot_fastighetsbeteckning: null,
      rot_amount: 0
    };
  }

  return {
    id: order.id,
    title: order.title || '',
    description: order.description || '',
    job_description: order.job_description || '',
    job_type: order.job_type || 'allmänt',
    value: order.value?.toString() || '',
    estimated_hours: order.estimated_hours?.toString() || '',
    complexity_level: order.complexity_level?.toString() || '3',
    assignment_type: order.assignment_type || 'individual',
    assigned_to_user_id: order.assigned_to_user_id || '',
    assigned_to_team_id: order.assigned_to_team_id || '',
    include_rot: order.include_rot || false,
    rot_personnummer: order.rot_personnummer || null,
    rot_organisationsnummer: order.rot_organisationsnummer || null,
    rot_fastighetsbeteckning: order.rot_fastighetsbeteckning || null,
    rot_amount: order.rot_amount || 0
  };
};

// ====== COMPACT KANBAN ROW COMPONENTS ====== //

const OrderKanbanRow = ({
  order, borderColor, onDragStart, onClick, onEdit, onDelete,
}: {
  order: OrderWithRelations;
  borderColor: string;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div
    className="group flex flex-col gap-1 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
    style={{ borderLeft: `3px solid ${borderColor}` }}
    draggable
    onDragStart={onDragStart}
    onClick={onClick}
  >
    {/* Row 1: Title + Value */}
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-gray-900 truncate leading-tight">{order.title}</p>
      <div className="flex items-center gap-1 flex-shrink-0">
        {order.value ? (
          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            {formatCurrency(order.value)}
          </span>
        ) : null}
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-blue-600 transition-all"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(); }}
          title="Redigera"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    {/* Row 2: Customer */}
    {order.customer && (
      <p className="text-xs text-gray-500 truncate">{order.customer.name}</p>
    )}
    {/* Row 3: Metadata chips */}
    <div className="flex items-center gap-2 flex-wrap">
      {order.job_type && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
          <Briefcase className="w-3 h-3" />
          {JOB_TYPE_LABELS[order.job_type as keyof typeof JOB_TYPE_LABELS] ?? order.job_type}
        </span>
      )}
      {order.assigned_to && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
          <User className="w-3 h-3" />
          {order.assigned_to.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
        </span>
      )}
      {order.assigned_team && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
          <Users2 className="w-3 h-3" />
          {order.assigned_team.name}
        </span>
      )}
      {order.created_at && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
          <Calendar className="w-3 h-3" />
          {formatDate(order.created_at)}
        </span>
      )}
    </div>
  </div>
);

const LeadKanbanRow = ({
  lead, borderColor, onDragStart, onClick, onCreateQuote,
}: {
  lead: LeadWithRelations;
  borderColor: string;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  onCreateQuote: () => void;
}) => (
  <div
    className="group flex flex-col gap-1 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
    style={{ borderLeft: `3px solid ${borderColor}` }}
    draggable
    onDragStart={onDragStart}
    onClick={onClick}
  >
    {/* Row 1: Title + Value */}
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-gray-900 truncate leading-tight">{lead.title}</p>
      <div className="flex items-center gap-1 flex-shrink-0">
        {lead.estimated_value ? (
          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            {formatCurrency(lead.estimated_value)}
          </span>
        ) : null}
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-blue-600 transition-all"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCreateQuote(); }}
          title="Skapa offert"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    {/* Row 2: Customer */}
    {lead.customer && (
      <p className="text-xs text-gray-500 truncate">{lead.customer.name}</p>
    )}
    {/* Row 3: Metadata chips */}
    <div className="flex items-center gap-2 flex-wrap">
      {lead.source && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 truncate max-w-[100px]">
          <Activity className="w-3 h-3 flex-shrink-0" />
          {lead.source}
        </span>
      )}
      {lead.assigned_to && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
          <User className="w-3 h-3" />
          {lead.assigned_to.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
        </span>
      )}
      {typeof lead.lead_score === 'number' && (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded px-1.5 py-0.5 ${lead.lead_score >= 70 ? 'bg-green-100 text-green-700' :
          lead.lead_score >= 40 ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-500'
          }`}>
          <Star className="w-3 h-3" />
          {lead.lead_score}
        </span>
      )}
      {lead.last_activity_at && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
          <Clock className="w-3 h-3" />
          {formatDate(lead.last_activity_at)}
        </span>
      )}
    </div>
  </div>
);

const QuoteKanbanRow = ({
  quote, borderColor, onDragStart, onClick,
}: {
  quote: QuoteWithRelations;
  borderColor: string;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}) => (
  <div
    className="group flex flex-col gap-1 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
    style={{ borderLeft: `3px solid ${borderColor}` }}
    draggable
    onDragStart={onDragStart}
    onClick={onClick}
  >
    {/* Row 1: Title + Amount */}
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-gray-900 truncate leading-tight">{quote.title}</p>
      {quote.total_amount ? (
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap flex-shrink-0">
          {formatCurrency(quote.total_amount)}
        </span>
      ) : null}
    </div>
    {/* Row 2: Customer */}
    {quote.customer && (
      <p className="text-xs text-gray-500 truncate">{quote.customer.name}</p>
    )}
    {/* Row 3: Metadata chips */}
    <div className="flex items-center gap-2 flex-wrap">
      {quote.line_items && quote.line_items.length > 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
          <Package className="w-3 h-3" />
          {quote.line_items.length} {quote.line_items.length === 1 ? 'rad' : 'rader'}
        </span>
      )}
      {quote.lead && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">
          <Target className="w-3 h-3" />
          Lead
        </span>
      )}
      {(quote as any).created_at && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
          <Calendar className="w-3 h-3" />
          {formatDate((quote as any).created_at)}
        </span>
      )}
    </div>
  </div>
);

function OrderKanban() {
  const { user, organisationId } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const { kanban, actions, forms, tabs } = useTranslation();

  // Use the new React Query hook for data fetching
  const [filters, setFilters] = useState<OrderFilters>({});
  const {
    orders,
    leads,
    quotes,
    customers,
    teamMembers,
    teams,
    orderCountsByStatus,
    isLoading: loading,
    error: dataError,
    refetch: loadData,
    loadMoreOrders,
  } = useKanbanData(filters);

  // Track which column is currently loading more items
  const [loadingMoreColumn, setLoadingMoreColumn] = useState<string | null>(null);

  // Convert error to string for display
  const error = dataError?.message || null;

  // Optimistic update hook for drag-and-drop
  const { moveCard, isMoving } = useMoveCard();

  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'history' | 'communication'>('details');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithRelations | null>(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isSmsComposerOpen, setIsSmsComposerOpen] = useState(false);
  const [communications, setCommunications] = useState<any[]>([]);
  const [loadingCommunications, setLoadingCommunications] = useState(false);
  const [showLeadEditModal, setShowLeadEditModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [showQuoteEditModal, setShowQuoteEditModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithRelations | null>(null);
  const [showQuoteCreationModal, setShowQuoteCreationModal] = useState(false);
  const [leadForQuote, setLeadForQuote] = useState<LeadWithRelations | null>(null);

  const fetchCommunications = async (orderId: string) => {
    setLoadingCommunications(true);
    try {
      // getOrderCommunications returns an object with a data property
      const { data: comms, error } = await getOrderCommunications(orderId);
      if (error) {
        throw error;
      }
      setCommunications(comms || []); // Set the fetched communications to state
    } catch (error) {
      console.error("Error fetching communications:", error);
      showError('Fel', 'Kunde inte ladda kommunikationshistorik.');
    } finally {
      setLoadingCommunications(false);
    }
  };

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    job_description: '',
    job_type: 'allmänt' as JobType,
    customer_id: '',
    value: '',
    estimated_hours: '',
    complexity_level: '3',
    assignment_type: 'individual' as AssignmentType,
    assigned_to_user_id: '',
    assigned_to_team_id: '',
    source: '',
    include_rot: false,
    rot_personnummer: null,
    rot_organisationsnummer: null,
    rot_fastighetsbeteckning: null,
    rot_amount: 0
  });
  const [formLoading, setFormLoading] = useState(false);

  const [editFormData, setEditFormData] = useState(getInitialEditFormData(null));

  // Filter states - now passed to useKanbanData hook above
  const [showFilters, setShowFilters] = useState(false);

  // Notes and activities
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [orderActivities, setOrderActivities] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Render capping: track how many items to show per column (prevents DOM overload)
  const ITEMS_PER_PAGE = 20;
  const [columnVisibleCounts, setColumnVisibleCounts] = useState<Record<string, number>>({});

  const kanbanColumns = [
    { status: 'förfrågan', title: kanban.COLUMNS.INQUIRIES, bgColor: 'bg-slate-50', headerColor: 'bg-emerald-600', badgeColor: 'bg-emerald-100 text-emerald-800', type: 'lead', navigateTo: '/app/leads' },
    { status: 'offert_utkast', title: kanban.COLUMNS.QUOTES_DRAFT, bgColor: 'bg-slate-50', headerColor: 'bg-amber-500', badgeColor: 'bg-amber-100 text-amber-800', type: 'quote', navigateTo: '/app/offerter' },
    { status: 'öppen_order', title: kanban.COLUMNS.OPEN_ORDERS, bgColor: 'bg-slate-50', headerColor: 'bg-blue-600', badgeColor: 'bg-blue-100 text-blue-800', type: 'order', navigateTo: '/app/Orderhantering' },
    { status: 'bokad_bekräftad', title: kanban.COLUMNS.BOOKED_ORDERS, bgColor: 'bg-slate-50', headerColor: 'bg-teal-600', badgeColor: 'bg-teal-100 text-teal-800', type: 'order', navigateTo: '/app/Orderhantering' },
    { status: 'ej_slutfört', title: kanban.COLUMNS.NOT_COMPLETED, bgColor: 'bg-slate-50', headerColor: 'bg-orange-500', badgeColor: 'bg-orange-100 text-orange-800', type: 'order', navigateTo: '/app/Orderhantering' },
    { status: 'redo_fakturera', title: kanban.COLUMNS.READY_TO_INVOICE, bgColor: 'bg-slate-50', headerColor: 'bg-indigo-600', badgeColor: 'bg-indigo-100 text-indigo-800', type: 'order', navigateTo: '/app/fakturor' },
    { status: 'avbokad_kund', title: kanban.COLUMNS.CANCELLED, bgColor: 'bg-slate-50', headerColor: 'bg-rose-600', badgeColor: 'bg-rose-100 text-rose-800', type: 'order', navigateTo: '/app/Orderhantering' }
  ];

  const COLUMN_BORDER_COLORS: Record<string, string> = {
    'bg-emerald-600': '#16a34a',
    'bg-amber-500': '#f59e0b',
    'bg-blue-600': '#2563eb',
    'bg-teal-600': '#0d9488',
    'bg-orange-500': '#f97316',
    'bg-indigo-600': '#4f46e5',
    'bg-rose-600': '#e11d48',
  };

  // Removed manual useEffect for data fetching - now handled by useKanbanData hook

  useEffect(() => {
    if (selectedOrder && showEditModal) {
      setEditFormData(getInitialEditFormData(selectedOrder));
    }
  }, [selectedOrder, showEditModal]);

  // loadData is now provided by useKanbanData hook as refetch

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.customer_id || !formData.job_description.trim()) {
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.MISSING_FIELDS);
      return;
    }

    // Validate assignment
    if (formData.assignment_type === 'individual' && !formData.assigned_to_user_id) {
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.MISSING_INDIVIDUAL);
      return;
    }

    if (formData.assignment_type === 'team' && !formData.assigned_to_team_id) {
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.MISSING_TEAM);
      return;
    }

    try {
      setFormLoading(true);

      const orderData = {
        organisation_id: organisationId!,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        job_description: formData.job_description.trim(),
        job_type: formData.job_type,
        customer_id: formData.customer_id,
        value: formData.value ? parseFloat(formData.value) : null,
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
        rot_amount: formData.rot_amount
      };

      const result = await createOrder(orderData);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.ORDER_CREATED);
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error creating order:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_CREATE);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData.title.trim() || !editFormData.job_description.trim()) {
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.MISSING_FIELDS);
      return;
    }

    try {
      setFormLoading(true);

      const orderUpdates = {
        title: editFormData.title.trim(),
        description: editFormData.description.trim() || null,
        job_description: editFormData.job_description.trim(),
        job_type: editFormData.job_type,
        value: editFormData.value ? parseFloat(editFormData.value) : null,
        estimated_hours: editFormData.estimated_hours ? parseFloat(editFormData.estimated_hours) : null,
        complexity_level: parseInt(editFormData.complexity_level),
        assignment_type: editFormData.assignment_type,
        assigned_to_user_id: editFormData.assignment_type === 'individual' ? editFormData.assigned_to_user_id : null,
        assigned_to_team_id: editFormData.assignment_type === 'team' ? editFormData.assigned_to_team_id : null,
        include_rot: editFormData.include_rot,
        rot_personnummer: editFormData.rot_personnummer,
        rot_organisationsnummer: editFormData.rot_organisationsnummer,
        rot_fastighetsbeteckning: editFormData.rot_fastighetsbeteckning,
        rot_amount: editFormData.rot_amount
      };

      const result = await updateOrder(editFormData.id, orderUpdates);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.ORDER_UPDATED);
      setShowEditModal(false);
      setSelectedOrder(null);
      await loadData();
    } catch (err) {
      console.error('Error updating order:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_UPDATE);
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Show confirmation dialog for certain status changes
    // Using Partial to avoid needing all keys
    const confirmationMessages: Partial<Record<OrderStatus, string>> = {
      öppen_order: kanban.CONFIRM.OPEN_ORDER,
      bokad_bekräftad: kanban.CONFIRM.BOOKED(order.title),
      avbokad_kund: kanban.CONFIRM.CANCELLED(order.title),
      ej_slutfört: kanban.CONFIRM.NOT_COMPLETED(order.title),
      redo_fakturera: kanban.CONFIRM.READY_TO_INVOICE(order.title)
    };

    if (!confirm(confirmationMessages[newStatus])) {
      return;
    }

    try {
      // Note: Loading state is handled by React Query
      const result = await updateOrder(orderId, { status: newStatus });

      if (result.error) {
        showError(kanban.MESSAGES.ERROR_TITLE, result.error.message);
      } else {
        success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.STATUS_UPDATED);
        // Cache is automatically updated by useMoveCard hook
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_STATUS);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      const result = await deleteOrder(orderToDelete.id);

      if (result.error) {
        showError(kanban.MESSAGES.ERROR_TITLE, result.error.message);
        return;
      }

      success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.ORDER_DELETED);
      setShowDeleteDialog(false);
      setOrderToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting order:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_DELETE);
    }
  };

  const handleCreateQuote = (lead: LeadWithRelations) => {
    if (!lead || !lead.customer_id) {
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.MISSING_CUSTOMER_QUOTE);
      return;
    }

    // Open the quote creation modal instead of directly creating
    setLeadForQuote(lead);
    setShowQuoteCreationModal(true);
  };

  const handleQuoteCreated = async () => {
    setShowQuoteCreationModal(false);
    setLeadForQuote(null);
    await loadData(); // Reload all data
  };

  const handleCommissionSaved = async (commissionData: {
    primary_salesperson_id?: string;
    secondary_salesperson_id?: string;
    commission_split_percentage: number;
  }) => {
    if (!selectedOrder) return;

    try {
      const { error } = await updateOrder(selectedOrder.id, {
        primary_salesperson_id: commissionData.primary_salesperson_id || null,
        secondary_salesperson_id: commissionData.secondary_salesperson_id || null,
        commission_split_percentage: commissionData.commission_split_percentage
      });

      if (error) throw error;

      setShowCommissionModal(false);
      await loadData(); // Reload to show updated data
    } catch (err: any) {
      console.error('Error saving commission:', err);
    }
  };

  const handleOrderClick = async (order: OrderWithRelations) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    setActiveTab('details');

    // Load notes and activities
    try {
      const [notesResult, activitiesResult] = await Promise.all([
        getOrderNotes(order.id),
        getOrderActivities(order.id),
        fetchCommunications(order.id)
      ]);

      if (notesResult.data) setOrderNotes(notesResult.data);
      if (activitiesResult.data) setOrderActivities(activitiesResult.data);
    } catch (err) {
      console.error('Error loading order details:', err);
    }
  };

  const handleAddNote = async () => {
    if (!selectedOrder || !newNote.trim() || !user) return;

    try {
      setAddingNote(true);

      const result = await createOrderNote({
        order_id: selectedOrder.id,
        user_id: user.id,
        content: newNote.trim(),
        include_in_invoice: false
      });

      if (result.error) {
        showError(kanban.MESSAGES.ERROR_TITLE, result.error.message);
        return;
      }

      setNewNote('');
      // Reload notes
      const notesResult = await getOrderNotes(selectedOrder.id);
      if (notesResult.data) setOrderNotes(notesResult.data);
    } catch (err) {
      console.error('Error adding note:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_NOTE);
    } finally {
      setAddingNote(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      job_description: '',
      job_type: 'allmänt',
      customer_id: '',
      value: '',
      estimated_hours: '',
      complexity_level: '3',
      assignment_type: 'individual',
      assigned_to_user_id: '',
      assigned_to_team_id: '',
      source: '',
      include_rot: false,
      rot_personnummer: null,
      rot_organisationsnummer: null,
      rot_fastighetsbeteckning: null,
      rot_amount: 0
    });
  };

  const getOrdersForStatus = (status: string) => {
    return orders.filter(order => order.status === status);
  };

  const handleDragStart = (e: React.DragEvent, item: OrderWithRelations | LeadWithRelations | QuoteWithRelations, type: 'order' | 'lead' | 'quote') => {
    e.dataTransfer.setData('application/json', JSON.stringify({ ...item, type }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string, targetType: 'order' | 'quote' | 'lead') => {
    e.preventDefault();
    const itemData = JSON.parse(e.dataTransfer.getData('application/json'));
    const { id, type, status: previousStatus } = itemData;

    // Order drag-and-drop with optimistic updates
    if (type === 'order' && targetType === 'order') {
      const order = orders.find(o => o.id === id);
      if (order && order.status !== targetStatus) {
        // Use optimistic update via useMoveCard hook
        moveCard({
          cardId: id,
          cardType: 'order',
          newStatus: targetStatus,
          previousStatus: previousStatus || order.status,
        });
      }
    }
    // Quote to Order conversion (accepting a quote)
    else if (type === 'quote' && targetStatus === 'öppen_order') {
      const quoteId = itemData.id;
      const { data: newOrder, error: acceptError } = await acceptQuoteAndCreateOrder(quoteId);

      if (acceptError) {
        showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_ACCEPT_QUOTE(acceptError.message));
      } else {
        success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.QUOTE_ACCEPTED);
        await loadData(); // Reload all data to reflect the changes
      }
    }
    // Lead to Quote conversion
    else if (type === 'lead' && targetType === 'quote' && targetStatus === 'offert_utkast') {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        // Create a new quote from the lead
        const quoteData = {
          organisation_id: organisationId!,
          customer_id: lead.customer_id,
          lead_id: lead.id,
          title: lead.title,
          description: lead.description,
          total_amount: lead.estimated_value || 0,
          status: 'draft' as QuoteStatus,
          quote_number: `QT-${Math.floor(Date.now() / 1000)}`
        };

        const result = await createQuote(quoteData, []);
        if (result.error) {
          showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_QUOTE);
        } else {
          success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.QUOTE_CREATED);
          // Use moveCard for lead status update with optimistic UI
          moveCard({
            cardId: lead.id,
            cardType: 'lead',
            newStatus: 'qualified',
            previousStatus: lead.status,
          });
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center mr-4 shadow-lg shadow-accent-500/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{kanban.TITLE}</h1>
              <p className="text-sm text-gray-500">{kanban.LOADING}</p>
            </div>
          </div>
        </div>

        {/* Kanban Board Skeleton */}
        <div className="flex h-full overflow-x-auto pb-4 gap-6">
          {/* Render 8 skeleton columns matching the actual board structure */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-none w-[85vw] sm:w-80 flex flex-col bg-gray-50 rounded-lg h-[calc(100vh-200px)] border border-gray-200">
              {/* Column Header Skeleton */}
              <div className="p-3 border-b flex items-center justify-between bg-white rounded-t-lg">
                <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded-full w-8 animate-pulse"></div>
              </div>

              {/* Column Content Skeleton */}
              <div className="p-3 flex-1 overflow-y-auto">
                <SkeletonColumn count={3} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">{kanban.TITLE}</h1>
        <div className="bg-error-50 border border-error-100 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-10 h-10 text-error-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-error-900">{kanban.ERROR_LOADING}</h3>
              <p className="text-error-700 mt-1">{error}</p>
            </div>
            <button
              onClick={loadData}
              className="ml-auto inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-error-600 hover:bg-error-700"
            >
              {kanban.TRY_AGAIN}
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center mr-4 shadow-lg shadow-accent-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{kanban.TITLE}</h1>
            <p className="text-sm text-gray-500">
              {kanban.SUBTITLE(orders.length, leads.length, quotes.length)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="w-4 h-4" />}
          >
            {actions.FILTER}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            {kanban.ADD_ORDER}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{actions.SEARCH}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder={kanban.SEARCH_PLACEHOLDER}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{kanban.ASSIGNED_TO}</label>
              <select
                value={filters.assignedTo || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">{kanban.ALL}</option>
                <option value="unassigned">{kanban.UNASSIGNED}</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{kanban.CUSTOMER}</label>
              <select
                value={filters.customer || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">{kanban.ALL_CUSTOMERS}</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {kanban.CLEAR_FILTERS}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex overflow-x-auto snap-x snap-mandatory pb-4 lg:grid lg:grid-cols-3 xl:grid-cols-7 gap-4 transition-all">
        {kanbanColumns.map((column) => {
          const columnOrders = column.type === 'order' ? getOrdersForStatus(column.status) : [];
          const columnLeads = column.type === 'lead' ? leads.filter(lead => lead.status === 'new') : [];
          const columnQuotes = column.type === 'quote' ? quotes.filter(quote => quote.status === 'draft') : [];

          const items = [...columnOrders, ...columnLeads, ...columnQuotes];

          // Calculate values separately for each type to avoid union type issues
          const ordersValue = columnOrders.reduce((sum, order) => sum + (order.value || 0), 0);
          const leadsValue = columnLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
          const quotesValue = columnQuotes.reduce((sum, quote) => sum + (quote.total_amount || 0), 0);
          const totalValue = ordersValue + leadsValue + quotesValue;

          return (
            <div
              key={column.status}
              className={`kanban-column rounded-xl border border-slate-200 shadow-sm ${column.bgColor} min-h-[calc(100vh-200px)] w-[85vw] sm:w-80 flex-none snap-center lg:min-h-96 lg:w-auto transition-all hover:shadow-md`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => e.currentTarget.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2')}
              onDragLeave={(e) => e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2')}
              onDrop={(e) => {
                e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
                handleDrop(e, column.status, column.type as 'order' | 'quote' | 'lead');
              }}
            >
              {/* Column Header */}
              <div className={`${column.headerColor} rounded-t-xl px-4 py-3`}>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate(column.navigateTo)}
                    className="text-white font-semibold text-sm truncate hover:underline transition-colors"
                    title={`Gå till ${column.title}`}
                  >
                    {column.title}
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                </div>
                <div className="text-white/80 text-xs font-medium mt-1">
                  {formatCurrency(totalValue)}
                </div>
              </div>

              {/* Column Content */}
              <div className="p-3">
                <div className="space-y-1.5">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">{kanban.NO_ITEMS}</p>
                    </div>
                  ) : (() => {
                    // Render capping: limit items to prevent DOM overload
                    const visibleCount = columnVisibleCounts[column.status] || ITEMS_PER_PAGE;
                    const visibleLeads = columnLeads.slice(0, visibleCount);
                    const remainingAfterLeads = Math.max(0, visibleCount - columnLeads.length);
                    const visibleQuotes = columnQuotes.slice(0, remainingAfterLeads);
                    const remainingAfterQuotes = Math.max(0, remainingAfterLeads - columnQuotes.length);
                    const visibleOrders = columnOrders.slice(0, remainingAfterQuotes);

                    const totalVisible = visibleLeads.length + visibleQuotes.length + visibleOrders.length;

                    return (
                      <>
                        {/* Render Leads */}
                        {visibleLeads.map((lead) => (
                          <LeadKanbanRow
                            key={lead.id}
                            lead={lead}
                            borderColor={COLUMN_BORDER_COLORS[column.headerColor] || '#6b7280'}
                            onDragStart={(e) => handleDragStart(e, lead, 'lead')}
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowLeadEditModal(true);
                            }}
                            onCreateQuote={() => handleCreateQuote(lead)}
                          />
                        ))}

                        {/* Render Quotes */}
                        {visibleQuotes.map((quote) => (
                          <QuoteKanbanRow
                            key={quote.id}
                            quote={quote}
                            borderColor={COLUMN_BORDER_COLORS[column.headerColor] || '#6b7280'}
                            onDragStart={(e) => handleDragStart(e, quote, 'quote')}
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowQuoteEditModal(true);
                            }}
                          />
                        ))}

                        {/* Render Orders */}
                        {visibleOrders.map((order) => (
                          <OrderKanbanRow
                            key={order.id}
                            order={order}
                            borderColor={COLUMN_BORDER_COLORS[column.headerColor] || '#6b7280'}
                            onDragStart={(e) => handleDragStart(e, order, 'order')}
                            onClick={() => handleOrderClick(order)}
                            onEdit={() => {
                              setSelectedOrder(order);
                              setShowEditModal(true);
                            }}
                            onDelete={() => {
                              setOrderToDelete(order);
                              setShowDeleteDialog(true);
                            }}
                          />
                        ))}

                        {/* Load More button */}
                        {(() => {
                          // For order columns, check if there are more in the database
                          const totalInDb = column.type === 'order'
                            ? (orderCountsByStatus[column.status] || 0)
                            : items.length;
                          const hasMoreLocal = totalVisible < items.length;
                          const hasMoreInDb = column.type === 'order' && columnOrders.length < totalInDb;
                          const showLoadMore = hasMoreLocal || hasMoreInDb;
                          const remainingCount = column.type === 'order'
                            ? totalInDb - visibleOrders.length
                            : items.length - totalVisible;
                          const isColumnLoading = loadingMoreColumn === column.status;

                          if (!showLoadMore) return null;

                          return (
                            <button
                              onClick={async () => {
                                if (column.type === 'order' && hasMoreInDb) {
                                  // Fetch more orders from the database
                                  setLoadingMoreColumn(column.status);
                                  try {
                                    await loadMoreOrders(column.status as import('../types/database').OrderStatus, columnOrders.length);
                                    // Also increase visible count to show the new items
                                    setColumnVisibleCounts((prev: Record<string, number>) => ({
                                      ...prev,
                                      [column.status]: (prev[column.status] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE
                                    }));
                                  } finally {
                                    setLoadingMoreColumn(null);
                                  }
                                } else {
                                  // Just show more of already-loaded items
                                  setColumnVisibleCounts(prev => ({
                                    ...prev,
                                    [column.status]: (prev[column.status] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE
                                  }));
                                }
                              }}
                              disabled={isColumnLoading}
                              className="w-full py-2.5 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {isColumnLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Laddar...
                                </>
                              ) : (
                                `Visa fler (${remainingCount} kvar)`
                              )}
                            </button>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{forms.EDIT_ORDER}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateOrder} className="p-6 space-y-4">
              {/* Most form fields are the same as the create modal, but bound to `editFormData` */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{forms.TITLE} *</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{forms.JOB_DESCRIPTION} *</label>
                <textarea
                  required
                  value={editFormData.job_description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, job_description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <ROTFields
                  data={{
                    include_rot: editFormData.include_rot,
                    rot_personnummer: editFormData.rot_personnummer,
                    rot_organisationsnummer: editFormData.rot_organisationsnummer,
                    rot_fastighetsbeteckning: editFormData.rot_fastighetsbeteckning,
                    rot_amount: editFormData.rot_amount,
                  }}
                  onChange={(rotData) =>
                    setEditFormData(prev => ({ ...prev, ...rotData }))
                  }
                  totalAmount={parseFloat(editFormData.value) || 0}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{forms.ESTIMATED_HOURS}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editFormData.estimated_hours}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{forms.COMPLEXITY}</label>
                  <select
                    value={editFormData.complexity_level}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, complexity_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="1">1 - Mycket enkelt</option>
                    <option value="2">2 - Enkelt</option>
                    <option value="3">3 - Medel</option>
                    <option value="4">4 - Svårt</option>
                    <option value="5">5 - Mycket svårt</option>
                  </select>
                </div>
              </div>

              {/* Assignment Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-4">{forms.ASSIGNMENT}</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{forms.ASSIGNMENT_TYPE}</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="individual"
                          checked={editFormData.assignment_type === 'individual'}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, assignment_type: e.target.value as AssignmentType, assigned_to_team_id: '' }))}
                          className="h-4 w-4 text-primary-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">{forms.INDIVIDUAL}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="team"
                          checked={editFormData.assignment_type === 'team'}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, assignment_type: e.target.value as AssignmentType, assigned_to_user_id: '' }))}
                          className="h-4 w-4 text-primary-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">{forms.TEAM}</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    {editFormData.assignment_type === 'individual' ? (
                      <select
                        value={editFormData.assigned_to_user_id || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, assigned_to_user_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">{forms.SELECT_PERSON}</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>{member.full_name}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={editFormData.assigned_to_team_id || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, assigned_to_team_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">{forms.SELECT_TEAM}</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>


              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"
                >
                  {actions.CANCEL}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 mr-2" />}
                  {forms.SAVE_CHANGES}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{forms.ADD_NEW}</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {forms.TITLE} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder={forms.GENERAL_DESC_PLACEHOLDER}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {forms.CUSTOMER} *
                </label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{forms.SELECT_CUSTOMER}</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {forms.GENERAL_DESCRIPTION}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder={forms.GENERAL_DESC_PLACEHOLDER}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {forms.JOB_DESCRIPTION} *
                </label>
                <textarea
                  required
                  value={formData.job_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder={forms.JOB_DESC_PLACEHOLDER}
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <ROTFields
                  data={{
                    include_rot: formData.include_rot,
                    rot_personnummer: formData.rot_personnummer,
                    rot_organisationsnummer: formData.rot_organisationsnummer,
                    rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                    rot_amount: formData.rot_amount,
                  }}
                  onChange={(rotData) =>
                    setFormData(prev => ({ ...prev, ...rotData }))
                  }
                  totalAmount={parseFloat(formData.value) || 0}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {forms.JOB_TYPE} *
                  </label>
                  <select
                    required
                    value={formData.job_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_type: e.target.value as JobType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    {Object.entries(JOB_TYPE_LABELS).map(([jobType, label]) => (
                      <option key={jobType} value={jobType}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {forms.ESTIMATED_HOURS}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="8.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {forms.COMPLEXITY}
                  </label>
                  <select
                    value={formData.complexity_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, complexity_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {forms.VALUE}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {forms.SOURCE}
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder={forms.SOURCE_PLACEHOLDER}
                  />
                </div>
              </div>

              {/* Assignment Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-4">Tilldelning</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {forms.ASSIGNMENT_TYPE} *
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="assignment_type"
                          value="individual"
                          checked={formData.assignment_type === 'individual'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            assignment_type: e.target.value as AssignmentType,
                            assigned_to_team_id: '',
                            assigned_to_user_id: ''
                          }))}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{forms.ASSIGN_INDIVIDUAL}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="assignment_type"
                          value="team"
                          checked={formData.assignment_type === 'team'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            assignment_type: e.target.value as AssignmentType,
                            assigned_to_team_id: '',
                            assigned_to_user_id: ''
                          }))}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{forms.ASSIGN_TEAM}</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.assignment_type === 'individual' ? forms.ASSIGN_TO_PERSON : forms.ASSIGN_TO_TEAM}
                    </label>
                    {formData.assignment_type === 'individual' ? (
                      <select
                        value={formData.assigned_to_user_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, assigned_to_user_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">{forms.SELECT_PERSON}</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>{member.full_name}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={formData.assigned_to_team_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, assigned_to_team_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">{forms.SELECT_TEAM}</option>
                        {teams
                          .filter(team => team.specialty === formData.job_type || team.specialty === 'allmänt')
                          .map(team => (
                            <option key={team.id} value={team.id}>
                              {team.name} ({TEAM_SPECIALTY_LABELS[team.specialty]})
                            </option>
                          ))}
                      </select>
                    )}

                    {formData.assignment_type === 'team' && formData.job_type !== 'allmänt' && (
                      <p className="text-xs text-blue-600 mt-1">
                        {forms.SHOWING_TEAMS(JOB_TYPE_LABELS[formData.job_type])}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {actions.CANCEL}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span className="ml-2">{forms.CREATING}</span>
                    </div>
                  ) : (
                    forms.CREATE_ORDER
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLeadEditModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold">{forms.EDIT_LEAD} {selectedLead.title}</h3>
            {/* Lead Edit Form would go here */}
            <button onClick={() => setShowLeadEditModal(false)} className="mt-4 px-4 py-2 bg-gray-200 rounded-md">{actions.CLOSE}</button>
          </div>
        </div>
      )}

      {/* Quote Detail Modal */}
      {showQuoteEditModal && selectedQuote && (
        <QuoteDetailModal
          isOpen={showQuoteEditModal}
          onClose={() => {
            setShowQuoteEditModal(false);
            setSelectedQuote(null);
          }}
          onQuoteUpdated={loadData}
          quoteId={selectedQuote.id}
        />
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedOrder.title}</h3>
                <OrderStatusBadge status={selectedOrder.status} size="md" className="mt-2" />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setOrderToDelete(selectedOrder);
                    setShowDeleteDialog(true);
                  }}
                  className="text-gray-400 hover:text-error-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>


            {/* === ADD TAB BUTTONS HERE === */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tabs.DETAILS}
                </button>
                <button
                  onClick={() => setActiveTab('communication')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'communication'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tabs.COMMUNICATION}
                </button>
              </nav>
            </div>


            {/* === END OF TAB BUTTONS === */}


            {activeTab === 'details' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Information */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">{forms.ORDER_INFO}</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {selectedOrder.description && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">{forms.DESCRIPTION}:</span>
                            <p className="text-sm text-gray-900">{selectedOrder.description}</p>
                          </div>
                        )}

                        {/* ROT INFORMATION DISPLAY */}
                        {selectedOrder && selectedOrder.include_rot && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">{forms.ROT_INFO}</h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                              <ROTInformation
                                data={selectedOrder}
                                totalAmount={selectedOrder.value || 0}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">{forms.COMMISSION}</h4>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            {selectedOrder.primary_salesperson_id ? (
                              <div>
                                <span className="text-sm font-medium text-gray-500">{forms.PRIMARY_SALESPERSON}:</span>
                                <p className="text-sm text-gray-900">{selectedOrder.assigned_to?.full_name || forms.NOT_SPECIFIED}</p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">{forms.NO_SALESPERSON}</p>
                            )}
                            <button
                              onClick={() => setShowCommissionModal(true)}
                              className="w-full mt-2 px-4 py-2 bg-primary-100 text-primary-700 text-sm font-semibold rounded-md hover:bg-primary-200"
                            >
                              {forms.MANAGE_COMMISSION}
                            </button>
                          </div>
                        </div>

                        {selectedOrder.job_description && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">{forms.JOB_DESCRIPTION}:</span>
                            <p className="text-sm text-gray-900">{selectedOrder.job_description}</p>
                          </div>
                        )}

                        {selectedOrder.job_type && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">{forms.JOB_TYPE}:</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${getJobTypeColor(selectedOrder.job_type)}`}>
                              {JOB_TYPE_LABELS[selectedOrder.job_type]}
                            </span>
                          </div>
                        )}

                        {selectedOrder.value && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">{forms.VALUE}:</span>
                            <p className="text-sm text-gray-900">{formatCurrency(selectedOrder.value)}</p>
                          </div>
                        )}

                        {selectedOrder.estimated_hours && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">{forms.ESTIMATED_HOURS}:</span>
                            <p className="text-sm text-gray-900">{selectedOrder.estimated_hours} tim</p>
                          </div>
                        )}

                        {selectedOrder.complexity_level && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">{forms.COMPLEXITY}:</span>
                            <div className="flex items-center mt-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < selectedOrder.complexity_level! ? 'text-warning-400 fill-current' : 'text-gray-300'
                                    }`}
                                />
                              ))}
                              <span className="ml-2 text-sm text-gray-600">
                                {selectedOrder.complexity_level}/5
                              </span>
                            </div>
                          </div>
                        )}

                        {selectedOrder.source && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Källa:</span>
                            <p className="text-sm text-gray-900">{selectedOrder.source}</p>
                          </div>
                        )}

                        <div>
                          <span className="text-sm font-medium text-gray-500">Skapad:</span>
                          <p className="text-sm text-gray-900">{formatDate(selectedOrder.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Information */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tilldelning</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Typ:</span>
                          <p className="text-sm text-gray-900 capitalize">
                            {selectedOrder.assignment_type === 'individual' ? 'Individ' : 'Team'}
                          </p>
                        </div>

                        {selectedOrder.assignment_type === 'individual' && selectedOrder.assigned_to && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Tilldelad till:</span>
                            <div className="flex items-center mt-1">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm text-gray-900">{selectedOrder.assigned_to.full_name}</span>
                            </div>
                          </div>
                        )}

                        {selectedOrder.assignment_type === 'team' && selectedOrder.assigned_team && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Tilldelat team:</span>
                            <div className="mt-1">
                              <div className="flex items-center mb-2">
                                <Users2 className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-sm text-gray-900">{selectedOrder.assigned_team.name}</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${getTeamSpecialtyColor(selectedOrder.assigned_team.specialty)}`}>
                                  {TEAM_SPECIALTY_LABELS[selectedOrder.assigned_team.specialty]}
                                </span>
                              </div>
                              {selectedOrder.assigned_team.team_leader && (
                                <div className="flex items-center text-xs text-gray-600">
                                  <Crown className="w-3 h-3 mr-1 text-warning-600" />
                                  Ledare: {selectedOrder.assigned_team.team_leader.full_name}
                                </div>
                              )}
                              {selectedOrder.assigned_team.members && selectedOrder.assigned_team.members.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500">Medlemmar:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {selectedOrder.assigned_team.members.map(member => (
                                      <span key={member.id} className="text-xs bg-white px-2 py-1 rounded border">
                                        {member.user?.full_name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Information */}
                    {selectedOrder.customer && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Kundinformation</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-900">{selectedOrder.customer.name}</span>
                          </div>
                          {selectedOrder.customer.email && (
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm text-gray-900">{selectedOrder.customer.email}</span>
                            </div>
                          )}
                          {selectedOrder.customer.phone_number && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm text-gray-900">{selectedOrder.customer.phone_number}</span>
                            </div>
                          )}
                          {selectedOrder.customer.city && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm text-gray-900">{selectedOrder.customer.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Actions */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Ändra status</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nuvarande status
                          </label>
                          <OrderStatusDropdown
                            currentStatus={selectedOrder.status}
                            onStatusChange={(newStatus) => handleStatusChange(selectedOrder.id, newStatus)}
                          />
                        </div>

                        <div className="bg-primary-50 p-3 rounded-lg">
                          <h5 className="text-sm font-medium text-primary-900 mb-2">Statusbeskrivningar:</h5>
                          <div className="space-y-1 text-xs text-primary-800">
                            <p><strong>Öppen Order:</strong> Ny order som väntar på bekräftelse</p>
                            <p><strong>Bokad och Bekräftad:</strong> Order bekräftad och schemalagd</p>
                            <p><strong>Ej Slutfört:</strong> Arbetet kunde inte slutföras</p>
                            <p><strong>Redo att Fakturera:</strong> Arbetet är klart för fakturering</p>
                            <p><strong>Avbokad av Kund:</strong> Kunden har avbokat ordern</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes and Activities */}
                  <div className="space-y-4">
                    {/* Status Change History */}
                    <StatusChangeHistory orderId={selectedOrder.id} />

                    {/* Add Note */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Lägg till anteckning</h4>
                      <div className="space-y-2">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Skriv en anteckning..."
                        />
                        <button
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || addingNote}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingNote ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <MessageSquare className="w-4 h-4 mr-2" />
                          )}
                          Lägg till
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    {orderNotes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Anteckningar</h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {orderNotes.map((note) => (
                            <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {note.user?.full_name || 'Okänd användare'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(note.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activities */}
                    {orderActivities.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Aktiviteter</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {orderActivities.map((activity) => (
                            <div key={activity.id} className="flex items-start space-x-3 text-sm">
                              <Activity className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-gray-900">{activity.description}</p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(activity.created_at)}
                                  {activity.user && ` • ${activity.user.full_name}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {activeTab === 'communication' && (
              <div className="p-6">
                <CommunicationPanel
                  order={selectedOrder}
                  communications={communications}
                  loading={loadingCommunications}
                  onSendEmail={() => setIsEmailComposerOpen(true)}
                  onSendSms={() => setIsSmsComposerOpen(true)}
                />
              </div>
            )}

          </div>
        </div>
      )}




      {isEmailComposerOpen && selectedOrder && selectedOrder.customer && (
        <EmailComposer
          order={selectedOrder}
          customer={selectedOrder.customer}
          onClose={() => setIsEmailComposerOpen(false)}
          onSend={() => {
            setIsEmailComposerOpen(false);
            fetchCommunications(selectedOrder.id); // Refresh the timeline!
            success('E-post skickat!', 'Meddelandet har lagts i kö för att skickas.');
          }}
        />
      )}

      {isSmsComposerOpen && selectedOrder && selectedOrder.customer && (
        <SMSComposer
          order={selectedOrder}
          customer={selectedOrder.customer}
          onClose={() => setIsSmsComposerOpen(false)}
          onSend={() => {
            setIsSmsComposerOpen(false);
            fetchCommunications(selectedOrder.id); // Refresh the timeline!
            success('SMS skickat!', 'Meddelandet har lagts i kö för att skickas.');
          }}
        />
      )}

      {showCommissionModal && selectedOrder && (
        <CommissionAssignmentForm
          order={selectedOrder}
          onClose={() => setShowCommissionModal(false)}
          onSave={() => {
            setShowCommissionModal(false);
            loadData(); // Reload orders to show updated info
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setOrderToDelete(null);
        }}
        onConfirm={handleDeleteOrder}
        title="Ta bort order"
        message={`Är du säker på att du vill ta bort ordern "${orderToDelete?.title}"? Denna åtgärd kan inte ångras.`}
        confirmText="Ta bort"
        cancelText="Avbryt"
        type="danger"
      />

      {/* Empty State */}
      {orders.length === 0 && !loading && (
        <EmptyState
          type="general"
          title="Inga ordrar ännu"
          description="Kom igång genom att lägga till din första order eller vänta på att accepterade offerter automatiskt skapar ordrar."
          actionText="Lägg till Order"
          onAction={() => setShowCreateModal(true)}
        />
      )}

      {/* Quote Detail Modal - for clicking on quotes in the kanban */}
      {showQuoteEditModal && selectedQuote && (
        <QuoteDetailModal
          isOpen={showQuoteEditModal}
          onClose={() => {
            setShowQuoteEditModal(false);
            setSelectedQuote(null);
          }}
          onQuoteUpdated={() => {
            loadData();
            setShowQuoteEditModal(false);
            setSelectedQuote(null);
          }}
          quoteId={selectedQuote.id}
        />
      )}

      {/* Quote Creation Modal */}
      {showQuoteCreationModal && leadForQuote && (
        <QuoteCreationModal
          isOpen={showQuoteCreationModal}
          onClose={() => {
            setShowQuoteCreationModal(false);
            setLeadForQuote(null);
          }}
          onQuoteCreated={handleQuoteCreated}
          lead={leadForQuote}
        />
      )}

      {/* Commission Assignment Modal */}
      {showCommissionModal && selectedOrder && (
        <CommissionAssignmentForm
          isOpen={showCommissionModal}
          onClose={() => setShowCommissionModal(false)}
          order={selectedOrder}
          onSaved={handleCommissionSaved}
        />
      )}
    </div>
  );
}

export default OrderKanban;
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
  Eye
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
import { updateLead, type LeadWithRelations } from '../lib/leads';
import { createQuote, updateQuote, type QuoteWithRelations } from '../lib/quotes';
// Teams now fetched by useKanbanData hook
import { formatCurrency, formatDate, formatDateTime, updateCustomer } from '../lib/database';
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
  type QuoteStatus,
  type UserProfile,
  type Team,
} from '../types/database';
import type { TeamWithRelations } from '../lib/teams';
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
import QuoteEditModal from './QuoteEditModal';
import QuotePreviewModal from './QuotePreviewModal';
import SendQuoteModal from './SendQuoteModal';
import LeadEditModal from './LeadEditModal';
import OrderDetailModal from './OrderDetailModal';
import CreateOrderModal from './CreateOrderModal';
import { supabase } from '../lib/supabase';
import { getQuoteTemplates, type QuoteTemplate } from '../lib/quoteTemplates';



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
  order, borderColor, onDragStart, onClick, onEdit, onDelete, teamMembers, onQuickAssign,
}: {
  order: OrderWithRelations;
  borderColor: string;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  teamMembers: UserProfile[];
  onQuickAssign: (updates: { region?: string; assigned_to_user_id?: string }) => void;
}) => {
  const [showPopover, setShowPopover] = React.useState(false);
  const [assignUser, setAssignUser] = React.useState(order.assigned_to_user_id || '');
  const [assignRegion, setAssignRegion] = React.useState(order.region || '');

  const handleAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAssign({ region: assignRegion || undefined, assigned_to_user_id: assignUser || undefined });
    setShowPopover(false);
  };

  return (
    <div className="relative">
      <div
        className="group flex flex-col gap-1 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
        style={{ borderLeft: `3px solid ${borderColor}` }}
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
      >
        {/* Row 1: Title + Value */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 leading-tight break-words min-w-0">{order.title}</p>
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
          {order.region && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 truncate max-w-[80px]">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {order.region}
            </span>
          )}
          {order.created_at && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
              <Calendar className="w-3 h-3" />
              {formatDate(order.created_at)}
            </span>
          )}
        </div>
        {/* Quick-assign button */}
        <div className="flex justify-end pt-0.5">
          <button
            className="opacity-0 group-hover:opacity-100 text-xs font-medium text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-all"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowPopover(v => !v); }}
            title="Tilldela"
          >
            Tilldela
          </button>
        </div>
      </div>
      {/* Quick-assign popover */}
      {showPopover && (
        <div
          className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-gray-700">Snabbtilldela</p>
          <select
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            value={assignUser}
            onChange={(e) => setAssignUser(e.target.value)}
          >
            <option value="">-- Välj säljare --</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <input
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="Säljområde (region)"
            value={assignRegion}
            onChange={(e) => setAssignRegion(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
              onClick={(e) => { e.stopPropagation(); setShowPopover(false); }}
            >
              Avbryt
            </button>
            <button
              className="text-xs font-medium bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
              onClick={handleAssign}
            >
              Spara
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LeadKanbanRow = ({
  lead, borderColor, onDragStart, onClick, onCreateQuote, teamMembers, onQuickAssign,
}: {
  lead: LeadWithRelations;
  borderColor: string;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  onCreateQuote: () => void;
  teamMembers: UserProfile[];
  onQuickAssign: (updates: { city?: string; assigned_to_user_id?: string }) => void;
}) => {
  const [showPopover, setShowPopover] = React.useState(false);
  const [assignUser, setAssignUser] = React.useState(lead.assigned_to_user_id || '');
  const [assignCity, setAssignCity] = React.useState(lead.city || '');

  const handleAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAssign({ city: assignCity || undefined, assigned_to_user_id: assignUser || undefined });
    setShowPopover(false);
  };

  return (
    <div className="relative">
      <div
        className="group flex flex-col gap-1.5 px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
        style={{ borderLeft: `3px solid ${borderColor}` }}
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
      >
        {/* Row 1: Title + Value */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 leading-tight break-words min-w-0">{lead.title}</p>
          {lead.estimated_value ? (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
              {formatCurrency(lead.estimated_value)}
            </span>
          ) : null}
        </div>
        {/* Row 2: Customer info */}
        {lead.customer && (
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-gray-700 truncate">{lead.customer.name}</p>
            {(lead.customer.email || lead.customer.city) && (
              <p className="text-xs text-gray-400 truncate">
                {[lead.customer.email, lead.customer.city].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}
        {/* Row 3: Metadata chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.source && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 truncate max-w-[100px]">
              <Activity className="w-3 h-3 flex-shrink-0" />
              {lead.source}
            </span>
          )}
          {lead.city && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 truncate max-w-[80px]">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {lead.city}
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
        {/* Row 4: Action buttons */}
        <div className="flex justify-between items-center pt-0.5">
          <button
            className="opacity-0 group-hover:opacity-100 text-xs font-medium text-emerald-600 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded transition-all"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowPopover(v => !v); }}
            title="Tilldela"
          >
            Tilldela
          </button>
          <button
            className="opacity-0 group-hover:opacity-100 text-xs font-medium text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-all"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCreateQuote(); }}
            title="Skapa offert från lead"
          >
            Skapa offert
          </button>
        </div>
      </div>
      {/* Quick-assign popover */}
      {showPopover && (
        <div
          className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-gray-700">Snabbtilldela</p>
          <select
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            value={assignUser}
            onChange={(e) => setAssignUser(e.target.value)}
          >
            <option value="">-- Välj säljare --</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <input
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            placeholder="Säljområde (stad)"
            value={assignCity}
            onChange={(e) => setAssignCity(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
              onClick={(e) => { e.stopPropagation(); setShowPopover(false); }}
            >
              Avbryt
            </button>
            <button
              className="text-xs font-medium bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700"
              onClick={handleAssign}
            >
              Spara
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const QuoteKanbanRow = ({
  quote, borderColor, onDragStart, onClick, onPreview, onSend, teamMembers, teams, onQuickAssign,
}: {
  quote: QuoteWithRelations;
  borderColor: string;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  onPreview?: () => void;
  onSend?: () => void;
  teamMembers: UserProfile[];
  teams: TeamWithRelations[];
  onQuickAssign: (updates: { city?: string; assigned_to_user_id?: string; assigned_to_team_id?: string }) => void;
}) => {
  const [showPopover, setShowPopover] = React.useState(false);
  const [assignUser, setAssignUser] = React.useState(quote.assigned_to_user_id || '');
  const [assignTeam, setAssignTeam] = React.useState(quote.assigned_to_team_id || '');
  const [assignCity, setAssignCity] = React.useState(quote.city || '');

  const handleAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAssign({
      city: assignCity || undefined,
      assigned_to_user_id: assignUser || undefined,
      assigned_to_team_id: assignTeam || undefined,
    });
    setShowPopover(false);
  };

  return (
    <div className="relative">
      <div
        className="group flex flex-col gap-1 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
        style={{ borderLeft: `3px solid ${borderColor}` }}
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
      >
        {/* Row 1: Title + Amount */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 leading-tight break-words min-w-0">{quote.title}</p>
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {quote.line_items && quote.line_items.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              <Package className="w-3 h-3" />
              {quote.line_items.length} {quote.line_items.length === 1 ? 'rad' : 'rader'}
            </span>
          )}
          {quote.assigned_to && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              <User className="w-3 h-3" />
              {quote.assigned_to.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
            </span>
          )}
          {quote.assigned_team && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              <Users2 className="w-3 h-3" />
              {quote.assigned_team.name}
            </span>
          )}
          {quote.city && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 truncate max-w-[80px]">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {quote.city}
            </span>
          )}
          {quote.lead && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">
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
        {/* Row 4: Action buttons (visible on hover) */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="hidden group-hover:flex items-center gap-2">
            {onPreview && (
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(); }}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors"
              >
                <Eye className="w-3 h-3" />
                Förhandsgranska
              </button>
            )}
            {onSend && (
              <button
                onClick={(e) => { e.stopPropagation(); onSend(); }}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium px-2 py-0.5 rounded hover:bg-green-50 transition-colors"
              >
                <Mail className="w-3 h-3" />
                Skicka
              </button>
            )}
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 text-xs font-medium text-amber-600 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded transition-all ml-auto"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowPopover(v => !v); }}
            title="Tilldela"
          >
            Tilldela
          </button>
        </div>
      </div>

      {/* Quick-assign popover */}
      {showPopover && (
        <div
          className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-gray-700">Snabbtilldela offert</p>
          <select
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
            value={assignUser}
            onChange={(e) => { setAssignUser(e.target.value); if (e.target.value) setAssignTeam(''); }}
          >
            <option value="">-- Välj säljare --</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <select
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
            value={assignTeam}
            onChange={(e) => { setAssignTeam(e.target.value); if (e.target.value) setAssignUser(''); }}
          >
            <option value="">-- Välj team --</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Stad / Område"
            value={assignCity}
            onChange={(e) => setAssignCity(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
              onClick={(e) => { e.stopPropagation(); setShowPopover(false); }}
            >
              Avbryt
            </button>
            <button
              className="text-xs font-medium bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700"
              onClick={handleAssign}
            >
              Spara
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithRelations | null>(null);
  const [showRevertToQuoteDialog, setShowRevertToQuoteDialog] = useState(false);
  const [orderToRevert, setOrderToRevert] = useState<OrderWithRelations | null>(null);
  const [isEditingCreateCustomer, setIsEditingCreateCustomer] = useState(false);
  const [createCustomerEditForm, setCreateCustomerEditForm] = useState({ name: '', email: '', phone_number: '', org_number: '', address: '', postal_code: '', city: '' });
  const [savingCreateCustomer, setSavingCreateCustomer] = useState(false);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isSmsComposerOpen, setIsSmsComposerOpen] = useState(false);
  const [communications, setCommunications] = useState<any[]>([]);
  const [loadingCommunications, setLoadingCommunications] = useState(false);
  const [showLeadEditModal, setShowLeadEditModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [showQuoteEditModal, setShowQuoteEditModal] = useState(false);
  const [showQuotePreviewModal, setShowQuotePreviewModal] = useState(false);
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithRelations | null>(null);
  const [showQuoteCreateFromLead, setShowQuoteCreateFromLead] = useState(false);
  const [leadForQuote, setLeadForQuote] = useState<LeadWithRelations | null>(null);
  const [quoteTemplates, setQuoteTemplates] = useState<QuoteTemplate[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

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
      setShowDetailsModal(false);
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

  // Load quote templates + company info for QuoteEditModal
  useEffect(() => {
    if (!organisationId) return;
    const loadExtras = async () => {
      const [templatesRes, orgRes] = await Promise.all([
        getQuoteTemplates(organisationId),
        supabase.from('organisations').select('*').eq('id', organisationId).single()
      ]);
      if (templatesRes.data) setQuoteTemplates(templatesRes.data);
      if (orgRes.data) setCompanyInfo(orgRes.data);
    };
    loadExtras();
  }, [organisationId]);

  const handleCreateQuote = (lead: LeadWithRelations) => {
    if (!lead || !lead.customer_id) {
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.MISSING_CUSTOMER_QUOTE);
      return;
    }

    // Open QuoteEditModal with pre-filled data from the lead
    setLeadForQuote(lead);
    setShowQuoteCreateFromLead(true);
  };

  const handleQuoteCreated = async () => {
    setShowQuoteCreateFromLead(false);
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

  const handleSaveCreateModalCustomer = async () => {
    if (!formData.customer_id) return;
    setSavingCreateCustomer(true);
    try {
      await updateCustomer(formData.customer_id, {
        name: createCustomerEditForm.name || undefined,
        email: createCustomerEditForm.email || null,
        phone_number: createCustomerEditForm.phone_number || null,
        org_number: createCustomerEditForm.org_number || null,
        address: createCustomerEditForm.address || null,
        postal_code: createCustomerEditForm.postal_code || null,
        city: createCustomerEditForm.city || null,
      } as any);
      success('Sparat', 'Kunduppgifter uppdaterade.');
      setIsEditingCreateCustomer(false);
      loadData();
    } catch {
      showError('Fel', 'Kunde inte spara kunduppgifter.');
    } finally {
      setSavingCreateCustomer(false);
    }
  };

  const handleQuickAssignLead = async (lead: LeadWithRelations, updates: { city?: string; assigned_to_user_id?: string }) => {
    try {
      const patch: Record<string, any> = {};
      if (updates.city !== undefined) patch.city = updates.city || null;
      if (updates.assigned_to_user_id !== undefined) patch.assigned_to_user_id = updates.assigned_to_user_id || null;
      await updateLead(lead.id, patch, user?.id);
      loadData();
    } catch (err) {
      console.error('Error quick-assigning lead:', err);
      showError('Fel', 'Kunde inte tilldela förfrågan.');
    }
  };

  const handleRevertOrderToQuote = async () => {
    if (!orderToRevert) return;
    try {
      // Find the linked quote (quotes have order_id pointing to this order)
      const linkedQuote = quotes.find(q => (q as any).order_id === orderToRevert.id);
      if (linkedQuote) {
        await updateQuote(linkedQuote.id, { status: 'draft', order_id: null } as any);
      }
      await updateOrder(orderToRevert.id, { status: 'avbokad_kund' });
      success('Återställd', 'Ordern har återställts till offert-status.');
      setShowRevertToQuoteDialog(false);
      setOrderToRevert(null);
      loadData();
    } catch (err) {
      console.error('Error reverting order to quote:', err);
      showError('Fel', 'Kunde inte återställa ordern.');
    }
  };

  const handleQuickAssignOrder = async (order: OrderWithRelations, updates: { region?: string; assigned_to_user_id?: string }) => {
    try {
      const patch: Record<string, any> = {};
      if (updates.region !== undefined) patch.region = updates.region || null;
      if (updates.assigned_to_user_id !== undefined) patch.assigned_to_user_id = updates.assigned_to_user_id || null;
      await updateOrder(order.id, patch);
      loadData();
    } catch (err) {
      console.error('Error quick-assigning order:', err);
      showError('Fel', 'Kunde inte tilldela ordern.');
    }
  };

  const handleQuickAssignQuote = async (
    quote: QuoteWithRelations,
    updates: { city?: string; assigned_to_user_id?: string; assigned_to_team_id?: string }
  ) => {
    try {
      const patch: Record<string, any> = {};
      if (updates.city !== undefined) patch.city = updates.city || null;
      if (updates.assigned_to_user_id !== undefined) {
        patch.assigned_to_user_id = updates.assigned_to_user_id || null;
        patch.assignment_type = updates.assigned_to_user_id ? 'individual' : null;
        patch.assigned_to_team_id = null;
      }
      if (updates.assigned_to_team_id !== undefined && !updates.assigned_to_user_id) {
        patch.assigned_to_team_id = updates.assigned_to_team_id || null;
        patch.assignment_type = updates.assigned_to_team_id ? 'team' : null;
        patch.assigned_to_user_id = null;
      }
      await updateQuote(quote.id, patch);
      loadData();
    } catch (err) {
      console.error('Error quick-assigning quote:', err);
      showError('Fel', 'Kunde inte tilldela offerten.');
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

    // Order dragged to quote column — revert to quote with confirmation
    if (type === 'order' && targetType === 'quote' && targetStatus === 'offert_utkast') {
      const order = orders.find(o => o.id === id);
      if (order) {
        setOrderToRevert(order);
        setShowRevertToQuoteDialog(true);
      }
      return;
    }

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
          quote_number: `QT-${Math.floor(Date.now() / 1000)}`,
          created_by_user_id: user?.id ?? null,
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
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory h-[calc(100vh-200px)] min-h-[400px]">
          {/* Render 8 skeleton columns matching the actual board structure */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-none snap-center w-[85vw] sm:w-72 flex flex-col bg-gray-50 rounded-xl h-full border border-gray-200">
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
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory h-[calc(100vh-200px)] min-h-[400px]">
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
              className={`kanban-column rounded-xl border border-slate-200 shadow-sm ${column.bgColor} flex-none snap-center w-[85vw] sm:w-72 flex flex-col h-full transition-all hover:shadow-md`}
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
              <div className="p-3 flex-1 overflow-y-auto">
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
                            teamMembers={teamMembers}
                            onQuickAssign={(updates) => handleQuickAssignLead(lead, updates)}
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
                            onPreview={() => {
                              setSelectedQuote(quote);
                              setShowQuotePreviewModal(true);
                            }}
                            onSend={() => {
                              setSelectedQuote(quote);
                              setShowSendQuoteModal(true);
                            }}
                            teamMembers={teamMembers}
                            teams={teams}
                            onQuickAssign={(updates) => handleQuickAssignQuote(quote, updates)}
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
                              setShowDetailsModal(true);
                            }}
                            onDelete={() => {
                              setOrderToDelete(order);
                              setShowDeleteDialog(true);
                            }}
                            teamMembers={teamMembers}
                            onQuickAssign={(updates) => handleQuickAssignOrder(order, updates)}
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

      {/* Create Order Modal — uses global CreateOrderModal for full RUT/RUT parity */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onOrderCreated={() => { loadData(); }}
      />

      {showLeadEditModal && selectedLead && (
        <LeadEditModal
          lead={selectedLead}
          teamMembers={teamMembers}
          onClose={() => { setShowLeadEditModal(false); setSelectedLead(null); }}
          onUpdated={() => { loadData(); }}
          onCreateQuote={(lead) => { handleCreateQuote(lead); }}
        />
      )}

      {/* Quote Edit Modal — full edit when clicking a quote card */}
      {showQuoteEditModal && selectedQuote && (
        <QuoteEditModal
          isOpen={showQuoteEditModal}
          onClose={() => {
            setShowQuoteEditModal(false);
            setSelectedQuote(null);
          }}
          quote={selectedQuote}
          customers={customers}
          leads={leads as any}
          templates={quoteTemplates}
          companyInfo={companyInfo}
          organisationId={organisationId!}
          teamMembers={teamMembers}
          teams={teams}
          onSave={async () => {
            await loadData();
            setShowQuoteEditModal(false);
            setSelectedQuote(null);
          }}
        />
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailModal
          isOpen={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); setSelectedOrder(null); }}
          order={selectedOrder}
          onOrderUpdated={() => { loadData(); }}
        />
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

      {/* Revert Order to Quote Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRevertToQuoteDialog}
        onClose={() => {
          setShowRevertToQuoteDialog(false);
          setOrderToRevert(null);
        }}
        onConfirm={handleRevertOrderToQuote}
        title="Återställ till offert"
        message={`Vill du återställa "${orderToRevert?.title}" till offert-status? Den kopplade offerten återöppnas som utkast och ordern markeras som avbokad.`}
        confirmText="Återställ"
        cancelText="Avbryt"
        type="warning"
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

      {/* Quote Preview Modal — opened via hover preview button */}
      {showQuotePreviewModal && selectedQuote && (
        <QuotePreviewModal
          isOpen={showQuotePreviewModal}
          onClose={() => {
            setShowQuotePreviewModal(false);
            setSelectedQuote(null);
          }}
          quote={selectedQuote}
          templates={quoteTemplates}
          companyInfo={companyInfo}
        />
      )}

      {/* Send Quote Modal — opened via hover send button */}
      {showSendQuoteModal && selectedQuote && (
        <SendQuoteModal
          isOpen={showSendQuoteModal}
          onClose={() => {
            setShowSendQuoteModal(false);
            setSelectedQuote(null);
          }}
          quote={selectedQuote}
          templates={quoteTemplates}
          onSent={() => {
            loadData();
            setShowSendQuoteModal(false);
            setSelectedQuote(null);
          }}
        />
      )}

      {/* Quote Create from Lead Modal (using QuoteEditModal) */}
      {showQuoteCreateFromLead && leadForQuote && (
        <QuoteEditModal
          isOpen={showQuoteCreateFromLead}
          onClose={() => {
            setShowQuoteCreateFromLead(false);
            setLeadForQuote(null);
          }}
          quote={null}
          customers={customers}
          leads={leads as any}
          templates={quoteTemplates}
          companyInfo={companyInfo}
          organisationId={organisationId!}
          teamMembers={teamMembers}
          teams={teams}
          onSave={handleQuoteCreated}
          initialData={{
            customer_id: leadForQuote.customer_id || '',
            lead_id: leadForQuote.id,
            title: leadForQuote.title,
            description: leadForQuote.description || '',
          }}
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
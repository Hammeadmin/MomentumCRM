/**
 * OrderDetailModal Component
 *
 * Standalone, fully-featured modal for viewing and editing an order.
 * Extracted from OrderKanban.tsx so that it can be re-used from CalendarView
 * (and elsewhere) without duplicating the rich details / edit UI.
 *
 * Tabs: Details, Communication, History, Attachments
 * Capabilities: view, edit, status change, add notes, upload/delete attachments,
 *               manage commission, delete order.
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  X,
  Save,
  Trash2,
  Edit,
  User,
  Users,
  Users2,
  Mail,
  Phone,
  MapPin,
  Star,
  Crown,
  MessageSquare,
  Activity,
  Paperclip,
  Download,
  Plus,
  Loader2,
  Clock,
  FileText,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useTranslation } from '../locales/sv';
import { formatCurrency, formatDate, getTeamMembers } from '../lib/database';
import { getTeams } from '../lib/teams';
import {
  getOrder,
  updateOrder,
  deleteOrder,
  getOrderNotes,
  createOrderNote,
  getOrderActivities,
  getAttachmentsForOrder,
  addAttachmentToOrder,
  deleteOrderAttachment,
  getAttachmentPublicUrl,
  type OrderWithRelations,
  type OrderAttachment,
} from '../lib/orders';
import {
  JOB_TYPE_LABELS,
  TEAM_SPECIALTY_LABELS,
  getTeamSpecialtyColor,
  getJobTypeColor,
  type OrderStatus,
  type JobType,
  type AssignmentType,
  type UserProfile,
} from '../types/database';
import type { TeamWithRelations } from '../lib/teams';

import ROTFields from './ROTFields';
import ROTInformation from './ROTInformation';
import OrderStatusBadge from './OrderStatusBadge';
import OrderStatusDropdown from './OrderStatusDropdown';
import StatusChangeHistory from './StatusChangeHistory';
import CommunicationPanel from './CommunicationPanel';
import CommissionAssignmentForm from './CommissionAssignmentForm';
import ConfirmDialog from './ConfirmDialog';

// Lazy load heavy composer modals
const EmailComposer = lazy(() => import('./EmailComposer'));
const SMSComposer = lazy(() => import('./SMSComposer'));

// ============================================================================
// Types
// ============================================================================

export interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Either pass an orderId (modal fetches it) or a full order object. */
  orderId?: string;
  order?: OrderWithRelations | null;
  /** Called after any successful mutation (edit, status, delete, note, attachment). */
  onOrderUpdated?: () => void;
}

type TabType = 'details' | 'communication' | 'history' | 'attachments';

interface EditFormState {
  id: string;
  title: string;
  description: string;
  job_description: string;
  job_type: JobType;
  value: string;
  estimated_hours: string;
  complexity_level: string;
  assignment_type: AssignmentType;
  assigned_to_user_id: string;
  assigned_to_team_id: string;
  include_rot: boolean;
  rot_personnummer: string | null;
  rot_organisationsnummer: string | null;
  rot_fastighetsbeteckning: string | null;
  rot_amount: number;
}

const buildEditForm = (o: OrderWithRelations | null): EditFormState => ({
  id: o?.id || '',
  title: o?.title || '',
  description: o?.description || '',
  job_description: o?.job_description || '',
  job_type: (o?.job_type || 'allmänt') as JobType,
  value: o?.value?.toString() || '',
  estimated_hours: o?.estimated_hours?.toString() || '',
  complexity_level: o?.complexity_level?.toString() || '3',
  assignment_type: (o?.assignment_type || 'individual') as AssignmentType,
  assigned_to_user_id: o?.assigned_to_user_id || '',
  assigned_to_team_id: o?.assigned_to_team_id || '',
  include_rot: o?.include_rot || false,
  rot_personnummer: o?.rot_personnummer || null,
  rot_organisationsnummer: o?.rot_organisationsnummer || null,
  rot_fastighetsbeteckning: o?.rot_fastighetsbeteckning || null,
  rot_amount: o?.rot_amount || 0,
});

// ============================================================================
// Component
// ============================================================================

function OrderDetailModal({
  isOpen,
  onClose,
  orderId,
  order: orderProp,
  onOrderUpdated,
}: OrderDetailModalProps) {
  const { user, organisationId } = useAuth();
  const { success, error: showError } = useToast();
  const { forms, actions, tabs, kanban } = useTranslation();

  // Order data
  const [order, setOrder] = useState<OrderWithRelations | null>(orderProp || null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Related data
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [orderActivities, setOrderActivities] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);

  // Team members / teams for assignment dropdowns in edit mode
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<TeamWithRelations[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormState>(buildEditForm(null));
  const [formLoading, setFormLoading] = useState(false);

  // Notes
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Attachments
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Modals
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isSmsComposerOpen, setIsSmsComposerOpen] = useState(false);

  // ---------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------

  const effectiveOrderId = orderId || orderProp?.id || '';

  const loadOrder = async () => {
    if (!effectiveOrderId) return;
    setLoadingOrder(true);
    try {
      const { data, error } = await getOrder(effectiveOrderId);
      if (error) {
        showError('Fel', error.message);
        return;
      }
      setOrder(data);
    } catch (err: any) {
      console.error('Error loading order:', err);
      showError('Fel', 'Kunde inte ladda order.');
    } finally {
      setLoadingOrder(false);
    }
  };

  const loadRelated = async (oid: string) => {
    try {
      const [notesRes, activitiesRes, attachmentsRes] = await Promise.all([
        getOrderNotes(oid),
        getOrderActivities(oid),
        getAttachmentsForOrder(oid),
      ]);
      if (notesRes.data) setOrderNotes(notesRes.data);
      if (activitiesRes.data) setOrderActivities(activitiesRes.data);
      if (attachmentsRes.data) setAttachments(attachmentsRes.data as OrderAttachment[]);
    } catch (err) {
      console.error('Error loading order details:', err);
    }
  };

  // Initial load when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // If full order was passed, use it directly but still refresh related data
    if (orderProp) {
      setOrder(orderProp);
      loadRelated(orderProp.id);
    } else if (orderId) {
      loadOrder();
    }
    // Reset UI state when (re)opening
    setActiveTab('details');
    setIsEditing(false);
    setNewNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderId, orderProp?.id]);

  // Whenever the underlying order changes, refresh related data & edit form
  useEffect(() => {
    if (order?.id) {
      loadRelated(order.id);
      setEditFormData(buildEditForm(order));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // Load team members/teams once (needed for edit dropdowns)
  useEffect(() => {
    if (!isOpen || !organisationId) return;
    let cancelled = false;
    (async () => {
      try {
        const [membersRes, teamsRes] = await Promise.all([
          getTeamMembers(organisationId),
          getTeams(organisationId),
        ]);
        if (cancelled) return;
        if (membersRes.data) setTeamMembers(membersRes.data);
        if (teamsRes.data) setTeams(teamsRes.data);
      } catch (err) {
        console.error('Error loading team data:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, organisationId]);

  // ---------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!editFormData.title.trim() || !editFormData.job_description.trim()) {
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.MISSING_FIELDS);
      return;
    }

    try {
      setFormLoading(true);
      const updates = {
        title: editFormData.title.trim(),
        description: editFormData.description.trim() || null,
        job_description: editFormData.job_description.trim(),
        job_type: editFormData.job_type,
        value: editFormData.value ? parseFloat(editFormData.value) : null,
        estimated_hours: editFormData.estimated_hours
          ? parseFloat(editFormData.estimated_hours)
          : null,
        complexity_level: parseInt(editFormData.complexity_level),
        assignment_type: editFormData.assignment_type,
        assigned_to_user_id:
          editFormData.assignment_type === 'individual'
            ? editFormData.assigned_to_user_id
            : null,
        assigned_to_team_id:
          editFormData.assignment_type === 'team'
            ? editFormData.assigned_to_team_id
            : null,
        include_rot: editFormData.include_rot,
        rot_personnummer: editFormData.rot_personnummer,
        rot_organisationsnummer: editFormData.rot_organisationsnummer,
        rot_fastighetsbeteckning: editFormData.rot_fastighetsbeteckning,
        rot_amount: editFormData.rot_amount,
      };

      const result = await updateOrder(order.id, updates);
      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.ORDER_UPDATED);
      setIsEditing(false);
      await loadOrder();
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error updating order:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_UPDATE);
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    try {
      const result = await updateOrder(order.id, { status: newStatus });
      if (result.error) {
        showError(kanban.MESSAGES.ERROR_TITLE, result.error.message);
        return;
      }
      success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.STATUS_UPDATED);
      await loadOrder();
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error updating status:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_STATUS);
    }
  };

  const handleAddNote = async () => {
    if (!order || !newNote.trim() || !user) return;
    try {
      setAddingNote(true);
      const result = await createOrderNote({
        order_id: order.id,
        user_id: user.id,
        content: newNote.trim(),
        include_in_invoice: false,
      });
      if (result.error) {
        showError(kanban.MESSAGES.ERROR_TITLE, result.error.message);
        return;
      }
      setNewNote('');
      const notesResult = await getOrderNotes(order.id);
      if (notesResult.data) setOrderNotes(notesResult.data);
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error adding note:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_NOTE);
    } finally {
      setAddingNote(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order || !user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAttachment(true);
      const { error } = await addAttachmentToOrder(order.id, user.id, file);
      if (error) {
        showError('Fel', 'Kunde inte ladda upp bilaga.');
        return;
      }
      success('Klart', 'Bilaga uppladdad.');
      const res = await getAttachmentsForOrder(order.id);
      if (res.data) setAttachments(res.data as OrderAttachment[]);
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error uploading attachment:', err);
      showError('Fel', 'Kunde inte ladda upp bilaga.');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachment: OrderAttachment) => {
    if (!order) return;
    if (!confirm(`Ta bort bilagan "${attachment.file_name}"?`)) return;
    try {
      const { error } = await deleteOrderAttachment(attachment);
      if (error) {
        showError('Fel', 'Kunde inte ta bort bilaga.');
        return;
      }
      const res = await getAttachmentsForOrder(order.id);
      if (res.data) setAttachments(res.data as OrderAttachment[]);
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    try {
      const result = await deleteOrder(order.id);
      if (result.error) {
        showError(kanban.MESSAGES.ERROR_TITLE, result.error.message);
        return;
      }
      success(kanban.MESSAGES.SUCCESS_TITLE, kanban.MESSAGES.ORDER_DELETED);
      setShowDeleteDialog(false);
      onOrderUpdated?.();
      onClose();
    } catch (err) {
      console.error('Error deleting order:', err);
      showError(kanban.MESSAGES.ERROR_TITLE, kanban.MESSAGES.ERROR_DELETE);
    }
  };

  const handleCommissionSaved = async (commissionData: {
    primary_salesperson_id?: string;
    secondary_salesperson_id?: string;
    commission_split_percentage: number;
  }) => {
    if (!order) return;
    try {
      const { error } = await updateOrder(order.id, {
        primary_salesperson_id: commissionData.primary_salesperson_id || null,
        secondary_salesperson_id: commissionData.secondary_salesperson_id || null,
        commission_split_percentage: commissionData.commission_split_percentage,
      });
      if (error) throw error;
      setShowCommissionModal(false);
      await loadOrder();
      onOrderUpdated?.();
    } catch (err: any) {
      console.error('Error saving commission:', err);
    }
  };

  // ---------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------

  if (!isOpen) return null;

  if (loadingOrder || !order) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
          <span className="text-gray-700">Laddar order...</span>
          <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{order.title}</h3>
              <OrderStatusBadge status={order.status} size="md" className="mt-2" />
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-primary-600"
                  title="Redigera"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="text-gray-400 hover:text-error-600"
                title="Ta bort"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ============ EDIT MODE ============ */}
          {isEditing ? (
            <form onSubmit={handleUpdateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {forms.TITLE} *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {forms.DESCRIPTION}
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {forms.JOB_DESCRIPTION} *
                </label>
                <textarea
                  required
                  value={editFormData.job_description}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      job_description: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
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
                    value={editFormData.value}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, value: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {forms.JOB_TYPE}
                  </label>
                  <select
                    value={editFormData.job_type}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        job_type: e.target.value as JobType,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {Object.entries(JOB_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {forms.ESTIMATED_HOURS}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editFormData.estimated_hours}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        estimated_hours: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {forms.COMPLEXITY}
                  </label>
                  <select
                    value={editFormData.complexity_level}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        complexity_level: e.target.value,
                      }))
                    }
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

              {/* ROT Fields */}
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
                    setEditFormData((prev) => ({ ...prev, ...rotData }))
                  }
                  totalAmount={parseFloat(editFormData.value) || 0}
                />
              </div>

              {/* Assignment */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-4">{forms.ASSIGNMENT}</h4>
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="individual"
                        checked={editFormData.assignment_type === 'individual'}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            assignment_type: e.target.value as AssignmentType,
                            assigned_to_team_id: '',
                          }))
                        }
                        className="h-4 w-4 text-primary-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">{forms.INDIVIDUAL}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="team"
                        checked={editFormData.assignment_type === 'team'}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            assignment_type: e.target.value as AssignmentType,
                            assigned_to_user_id: '',
                          }))
                        }
                        className="h-4 w-4 text-primary-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">{forms.TEAM}</span>
                    </label>
                  </div>
                  <div>
                    {editFormData.assignment_type === 'individual' ? (
                      <select
                        value={editFormData.assigned_to_user_id || ''}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            assigned_to_user_id: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">{forms.SELECT_PERSON}</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={editFormData.assigned_to_team_id || ''}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            assigned_to_team_id: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">{forms.SELECT_TEAM}</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditFormData(buildEditForm(order));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"
                >
                  {actions.CANCEL}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {forms.SAVE_CHANGES}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                  {(
                    [
                      { id: 'details', label: tabs.DETAILS, icon: FileText },
                      { id: 'communication', label: tabs.COMMUNICATION, icon: MessageSquare },
                      { id: 'history', label: 'Historik', icon: Clock },
                      { id: 'attachments', label: 'Bilagor', icon: Paperclip },
                    ] as { id: TabType; label: string; icon: any }[]
                  ).map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                          activeTab === tab.id
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {tab.id === 'attachments' && attachments.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 rounded-full">
                            {attachments.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* ============ DETAILS TAB ============ */}
              {activeTab === 'details' && (
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="space-y-4">
                      {/* Order Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">{forms.ORDER_INFO}</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          {order.description && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                {forms.DESCRIPTION}:
                              </span>
                              <p className="text-sm text-gray-900">{order.description}</p>
                            </div>
                          )}

                          {/* ROT */}
                          {order.include_rot && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">{forms.ROT_INFO}</h4>
                              <div className="bg-white rounded-lg p-4 space-y-3">
                                <ROTInformation
                                  data={order}
                                  totalAmount={order.value || 0}
                                />
                              </div>
                            </div>
                          )}

                          {/* Commission */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              {forms.COMMISSION}
                            </h4>
                            <div className="bg-white rounded-lg p-4 space-y-3">
                              {order.primary_salesperson_id ? (
                                <div>
                                  <span className="text-sm font-medium text-gray-500">
                                    {forms.PRIMARY_SALESPERSON}:
                                  </span>
                                  <p className="text-sm text-gray-900">
                                    {order.assigned_to?.full_name || forms.NOT_SPECIFIED}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  {forms.NO_SALESPERSON}
                                </p>
                              )}
                              <button
                                onClick={() => setShowCommissionModal(true)}
                                className="w-full mt-2 px-4 py-2 bg-primary-100 text-primary-700 text-sm font-semibold rounded-md hover:bg-primary-200"
                              >
                                {forms.MANAGE_COMMISSION}
                              </button>
                            </div>
                          </div>

                          {order.job_description && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                {forms.JOB_DESCRIPTION}:
                              </span>
                              <p className="text-sm text-gray-900">{order.job_description}</p>
                            </div>
                          )}

                          {order.job_type && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                {forms.JOB_TYPE}:
                              </span>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${getJobTypeColor(
                                  order.job_type
                                )}`}
                              >
                                {JOB_TYPE_LABELS[order.job_type]}
                              </span>
                            </div>
                          )}

                          {order.value && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                {forms.VALUE}:
                              </span>
                              <p className="text-sm text-gray-900">
                                {formatCurrency(order.value)}
                              </p>
                            </div>
                          )}

                          {order.estimated_hours && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                {forms.ESTIMATED_HOURS}:
                              </span>
                              <p className="text-sm text-gray-900">
                                {order.estimated_hours} tim
                              </p>
                            </div>
                          )}

                          {order.complexity_level && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                {forms.COMPLEXITY}:
                              </span>
                              <div className="flex items-center mt-1">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < (order.complexity_level || 0)
                                        ? 'text-warning-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="ml-2 text-sm text-gray-600">
                                  {order.complexity_level}/5
                                </span>
                              </div>
                            </div>
                          )}

                          {order.source && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Källa:</span>
                              <p className="text-sm text-gray-900">{order.source}</p>
                            </div>
                          )}

                          {order.created_at && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Skapad:</span>
                              <p className="text-sm text-gray-900">
                                {formatDate(order.created_at)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assignment Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Tilldelning</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div>
                            <span className="text-sm font-medium text-gray-500">Typ:</span>
                            <p className="text-sm text-gray-900 capitalize">
                              {order.assignment_type === 'individual' ? 'Individ' : 'Team'}
                            </p>
                          </div>

                          {order.assignment_type === 'individual' && order.assigned_to && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                Tilldelad till:
                              </span>
                              <div className="flex items-center mt-1">
                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {order.assigned_to.full_name}
                                </span>
                              </div>
                            </div>
                          )}

                          {order.assignment_type === 'team' && order.assigned_team && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                Tilldelat team:
                              </span>
                              <div className="mt-1">
                                <div className="flex items-center mb-2">
                                  <Users2 className="w-4 h-4 mr-2 text-gray-400" />
                                  <span className="text-sm text-gray-900">
                                    {order.assigned_team.name}
                                  </span>
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${getTeamSpecialtyColor(
                                      order.assigned_team.specialty
                                    )}`}
                                  >
                                    {TEAM_SPECIALTY_LABELS[order.assigned_team.specialty]}
                                  </span>
                                </div>
                                {order.assigned_team.team_leader && (
                                  <div className="flex items-center text-xs text-gray-600">
                                    <Crown className="w-3 h-3 mr-1 text-warning-600" />
                                    Ledare: {order.assigned_team.team_leader.full_name}
                                  </div>
                                )}
                                {order.assigned_team.members &&
                                  order.assigned_team.members.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-xs text-gray-500">
                                        Medlemmar:
                                      </span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {order.assigned_team.members.map((m) => (
                                          <span
                                            key={m.id}
                                            className="text-xs bg-white px-2 py-1 rounded border"
                                          >
                                            {m.user?.full_name}
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

                      {/* Customer Info */}
                      {order.customer && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Kundinformation</h4>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {order.customer.name}
                              </span>
                            </div>
                            {order.customer.email && (
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {order.customer.email}
                                </span>
                              </div>
                            )}
                            {order.customer.phone_number && (
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {order.customer.phone_number}
                                </span>
                              </div>
                            )}
                            {order.customer.city && (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {order.customer.city}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Ändra status</h4>
                        <OrderStatusDropdown
                          currentStatus={order.status}
                          onStatusChange={handleStatusChange}
                        />
                      </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">
                      {/* Status history */}
                      <StatusChangeHistory orderId={order.id} />

                      {/* Add Note */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Lägg till anteckning
                        </h4>
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

                      {/* Notes list */}
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

                      {/* Activities list */}
                      {orderActivities.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Aktiviteter</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {orderActivities.map((activity) => (
                              <div
                                key={activity.id}
                                className="flex items-start space-x-3 text-sm"
                              >
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

              {/* ============ COMMUNICATION TAB ============ */}
              {activeTab === 'communication' && (
                <div className="p-6">
                  <CommunicationPanel order={order} />
                </div>
              )}

              {/* ============ HISTORY TAB ============ */}
              {activeTab === 'history' && (
                <div className="p-6 space-y-4">
                  <StatusChangeHistory orderId={order.id} />
                  {orderActivities.length > 0 ? (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Aktivitetslogg</h4>
                      <div className="space-y-2">
                        {orderActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start space-x-3 text-sm bg-gray-50 rounded-lg p-3"
                          >
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
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Ingen aktivitetshistorik ännu
                    </p>
                  )}
                </div>
              )}

              {/* ============ ATTACHMENTS TAB ============ */}
              {activeTab === 'attachments' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Bilagor</h4>
                    <label
                      className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 cursor-pointer ${
                        uploadingAttachment ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Ladda upp
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingAttachment}
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>

                  {attachments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Inga bilagor uppladdade
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attachments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Paperclip className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {a.file_name}
                            </p>
                            {a.file_type && (
                              <p className="text-xs text-gray-500">{a.file_type}</p>
                            )}
                          </div>
                          <a
                            href={getAttachmentPublicUrl(a.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Ladda ner"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(a)}
                            className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded"
                            title="Ta bort"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =========== SUB-MODALS =========== */}
      {isEmailComposerOpen && order.customer && (
        <Suspense fallback={null}>
          <EmailComposer
            order={order}
            customer={order.customer}
            onClose={() => setIsEmailComposerOpen(false)}
            onSend={() => {
              setIsEmailComposerOpen(false);
              success('E-post skickat!', 'Meddelandet har lagts i kö för att skickas.');
            }}
          />
        </Suspense>
      )}

      {isSmsComposerOpen && order.customer && (
        <Suspense fallback={null}>
          <SMSComposer
            order={order}
            customer={order.customer}
            onClose={() => setIsSmsComposerOpen(false)}
            onSend={() => {
              setIsSmsComposerOpen(false);
              success('SMS skickat!', 'Meddelandet har lagts i kö för att skickas.');
            }}
          />
        </Suspense>
      )}

      {showCommissionModal && (
        <CommissionAssignmentForm
          isOpen={showCommissionModal}
          order={order}
          onClose={() => setShowCommissionModal(false)}
          onSaved={handleCommissionSaved}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteOrder}
        title="Ta bort order"
        message={`Är du säker på att du vill ta bort ordern "${order.title}"? Denna åtgärd kan inte ångras.`}
        confirmText="Ta bort"
        cancelText="Avbryt"
        type="danger"
      />
    </>
  );
}

export default OrderDetailModal;

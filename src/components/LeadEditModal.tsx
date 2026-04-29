import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Save,
  Loader2,
  Users,
  Mail,
  Phone,
  MapPin,
  User,
  Activity,
  Clock,
  Calendar,
  Star,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { updateLead, type LeadWithRelations } from '../lib/leads';
import { getLeadNotes, createLeadNote, formatDate, formatCurrency } from '../lib/database';
import { LEAD_STATUS_LABELS, type LeadStatus, type UserProfile, type LeadNote } from '../types/database';

interface LeadEditModalProps {
  lead: LeadWithRelations;
  teamMembers: UserProfile[];
  onClose: () => void;
  onUpdated: () => void;
  onCreateQuote?: (lead: LeadWithRelations) => void;
}

const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Ny' },
  { value: 'contacted', label: 'Kontaktad' },
  { value: 'qualified', label: 'Kvalificerad' },
  { value: 'proposal', label: 'Offert skickad' },
  { value: 'won', label: 'Vunnen' },
  { value: 'lost', label: 'Förlorad' },
];

interface EditFormState {
  title: string;
  description: string;
  status: LeadStatus;
  estimated_value: string;
  source: string;
  city: string;
  assigned_to_user_id: string;
}

function buildForm(lead: LeadWithRelations): EditFormState {
  return {
    title: lead.title || '',
    description: lead.description || '',
    status: lead.status,
    estimated_value: lead.estimated_value?.toString() || '',
    source: lead.source || '',
    city: lead.city || '',
    assigned_to_user_id: lead.assigned_to_user_id || '',
  };
}

export default function LeadEditModal({
  lead,
  teamMembers,
  onClose,
  onUpdated,
  onCreateQuote,
}: LeadEditModalProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EditFormState>(buildForm(lead));
  const [saving, setSaving] = useState(false);

  const [notes, setNotes] = useState<(LeadNote & { user?: UserProfile })[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    setFormData(buildForm(lead));
    loadNotes();
  }, [lead.id]);

  const loadNotes = async () => {
    setLoadingNotes(true);
    try {
      const { data } = await getLeadNotes(lead.id);
      if (data) setNotes(data as (LeadNote & { user?: UserProfile })[]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { showError('Fel', 'Titel krävs.'); return; }
    setSaving(true);
    try {
      const { error } = await updateLead(
        lead.id,
        {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
          source: formData.source.trim() || null,
          city: formData.city.trim() || null,
          assigned_to_user_id: formData.assigned_to_user_id || null,
        },
        user?.id
      );
      if (error) { showError('Fel', error.message); return; }
      success('Klart', 'Förfrågan uppdaterad.');
      setIsEditing(false);
      onUpdated();
    } catch (err: any) {
      showError('Fel', 'Kunde inte spara ändringar.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setAddingNote(true);
    try {
      const { error } = await createLeadNote(lead.id, user.id, newNote.trim());
      if (error) { showError('Fel', error.message); return; }
      setNewNote('');
      await loadNotes();
    } catch {
      showError('Fel', 'Kunde inte spara anteckning.');
    } finally {
      setAddingNote(false);
    }
  };

  const statusColor = (s: LeadStatus) => {
    switch (s) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'contacted': return 'bg-amber-100 text-amber-700';
      case 'qualified': return 'bg-green-100 text-green-700';
      case 'proposal': return 'bg-purple-100 text-purple-700';
      case 'won': return 'bg-emerald-100 text-emerald-700';
      case 'lost': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Redigera förfrågan' : lead.title}
            </h3>
            {!isEditing && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(lead.status)}`}>
                  {LEAD_STATUS_LABELS[lead.status]}
                </span>
                {typeof lead.lead_score === 'number' && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    lead.lead_score >= 70 ? 'bg-green-100 text-green-700' :
                    lead.lead_score >= 40 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    <Star className="w-3 h-3" />
                    Poäng: {lead.lead_score}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Redigera
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* ======== EDIT MODE ======== */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value as LeadStatus }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {LEAD_STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uppskattat värde (kr)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.estimated_value}
                    onChange={e => setFormData(p => ({ ...p, estimated_value: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Källa</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={e => setFormData(p => ({ ...p, source: e.target.value }))}
                    placeholder="t.ex. hemsida, telefon"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Säljområde / Stad</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                    placeholder="t.ex. Stockholm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tilldelad</label>
                <select
                  value={formData.assigned_to_user_id}
                  onChange={e => setFormData(p => ({ ...p, assigned_to_user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">— Ingen tilldelning —</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setFormData(buildForm(lead)); setIsEditing(false); }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Spara
                </button>
              </div>
            </form>
          ) : (
            /* ======== READ MODE ======== */
            <>
              {lead.estimated_value && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-800">Uppskattat värde</span>
                  <span className="text-lg font-bold text-emerald-700">{formatCurrency(lead.estimated_value)}</span>
                </div>
              )}

              {lead.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Beskrivning</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{lead.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-gray-400" />
                    Kundinformation
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
                    {lead.customer ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">{lead.customer.name}</span>
                        </div>
                        {lead.customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <a href={`mailto:${lead.customer.email}`} className="text-sm text-blue-600 hover:underline">{lead.customer.email}</a>
                          </div>
                        )}
                        {lead.customer.phone_number && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <a href={`tel:${lead.customer.phone_number}`} className="text-sm text-blue-600 hover:underline">{lead.customer.phone_number}</a>
                          </div>
                        )}
                        {(lead.customer.address || lead.customer.city) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700">
                              {[lead.customer.address, lead.customer.city].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        {lead.customer.org_number && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500">
                              {lead.customer.customer_type === 'company' ? 'Org.nummer:' : 'Personnummer:'}
                            </span>
                            <span className="text-sm text-gray-700">{lead.customer.org_number}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Ingen kund kopplad</p>
                    )}
                  </div>
                </div>

                {/* Lead metadata */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-gray-400" />
                    Leadinformation
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
                    {lead.source && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Källa</span>
                        <p className="text-sm text-gray-900">{lead.source}</p>
                      </div>
                    )}
                    {lead.city && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Säljområde</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-900">{lead.city}</span>
                        </div>
                      </div>
                    )}
                    {lead.assigned_to && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Tilldelad</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-900">{lead.assigned_to.full_name}</span>
                        </div>
                      </div>
                    )}
                    {lead.last_activity_at && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Senaste aktivitet</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-900">{formatDate(lead.last_activity_at)}</span>
                        </div>
                      </div>
                    )}
                    {lead.created_at && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Skapad</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-900">{formatDate(lead.created_at)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ======== NOTES (always visible) ======== */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              Anteckningar
            </h4>

            {/* Add note */}
            <div className="space-y-2 mb-4">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={2}
                placeholder="Skriv en anteckning..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Lägg till
              </button>
            </div>

            {/* Notes list */}
            {loadingNotes ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notes.map(note => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {note.user?.full_name || 'Okänd användare'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Inga anteckningar ännu.</p>
            )}
          </div>

          {/* Action buttons */}
          {!isEditing && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Stäng
              </button>
              {lead.customer_id && onCreateQuote && (
                <button
                  onClick={() => { onClose(); onCreateQuote(lead); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Skapa offert från lead
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

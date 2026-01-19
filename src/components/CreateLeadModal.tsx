import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, DollarSign, Type, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createLead } from '../lib/leads';
import { getCustomers, getTeamMembers } from '../lib/database';
import type { Customer, UserProfile, LeadStatus } from '../types/database';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: () => void;
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose, onLeadCreated }) => {
  const { user, organisationId } = useAuth();
  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: '',
    status: 'new' as LeadStatus,
    estimated_value: '',
    customer_id: '',
    assigned_to_user_id: '',
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch initial data for dropdowns
      const loadModalData = async () => {
        const [customersResult, teamMembersResult] = await Promise.all([
          getCustomers(organisationId!),
          getTeamMembers(organisationId!),
        ]);
        if (customersResult.data) setCustomers(customersResult.data);
        if (teamMembersResult.data) setTeamMembers(teamMembersResult.data);
      };
      loadModalData();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showError('Fel', 'Du måste vara inloggad för att skapa ett lead.');
      return
    };

    setLoading(true);

    const leadData = {
      organisation_id: organisationId!,
      ...formData,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      assigned_to_user_id: formData.assigned_to_user_id || null,
      customer_id: formData.customer_id || null,
    };

    const { error } = await createLead(leadData);

    if (error) {
      showError('Fel', `Kunde inte skapa lead: ${error.message}`);
    } else {
      success('Framgång', 'Nytt lead har skapats!');
      onLeadCreated();
      onClose();
      // Reset form
      setFormData({
        title: '', description: '', source: '', status: 'new',
        estimated_value: '', customer_id: '', assigned_to_user_id: ''
      });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Skapa Ny Förfrågan (Lead)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Form fields */}
          {/* Title, Description, Source, etc. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="T.ex. Takrengöring villa..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Källa</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="T.ex. Hemsidan, Rekommendation..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ange så mycket detaljer som möjligt..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uppskattat Värde (SEK)</label>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="25000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="new">Ny</option>
                <option value="contacted">Kontaktad</option>
                <option value="qualified">Kvalificerad</option>
                <option value="won">Vunnen</option>
                <option value="lost">Förlorad</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Befintlig Kund</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Välj kund (om befintlig)...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tilldela till Säljare</label>
              <select
                value={formData.assigned_to_user_id}
                onChange={(e) => setFormData({ ...formData, assigned_to_user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Välj säljare...</option>
                {teamMembers.filter(tm => tm.role === 'sales' || tm.role === 'admin').map(tm => <option key={tm.id} value={tm.id}>{tm.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Skapa Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLeadModal;
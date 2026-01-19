import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  User,
  Users,
  Percent,
  DollarSign,
  Save,
  X,
  AlertCircle,
  Calculator,
  Info
} from 'lucide-react';
import { getUserProfiles } from '../lib/database';
import { formatCurrency } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import type { OrderWithRelations } from '../lib/orders';
import type { PayrollEmployee } from '../lib/payroll';

interface CommissionAssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithRelations;
  onSaved: (commissionData: {
    primary_salesperson_id?: string;
    secondary_salesperson_id?: string;
    commission_split_percentage: number;
  }) => void;
}

function CommissionAssignmentForm({ 
  isOpen, 
  onClose, 
  order, 
  onSaved 
}: CommissionAssignmentFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salespeople, setSalespeople] = useState<PayrollEmployee[]>([]);
  const [formData, setFormData] = useState({
    primary_salesperson_id: order.primary_salesperson_id || '',
    secondary_salesperson_id: order.secondary_salesperson_id || '',
    commission_split_percentage: order.commission_split_percentage || 0
  });

  useEffect(() => {
    if (isOpen) {
      loadSalespeople();
    }
  }, [isOpen]);

  const loadSalespeople = async () => {
    try {
      setLoading(true);

      if (!user) return;

      // Get user profile to get organisation_id
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];
      
      if (!profile?.organisation_id) return;

      // Get all users with commission enabled
      const { data: allProfiles } = await getUserProfiles(profile.organisation_id);
      const commissionUsers = (allProfiles || []).filter(p => p.has_commission);
      
      setSalespeople(commissionUsers as PayrollEmployee[]);
    } catch (err) {
      console.error('Error loading salespeople:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSaved(formData);
    onClose();
  };

  const getPrimarySalesperson = () => {
    return salespeople.find(sp => sp.id === formData.primary_salesperson_id);
  };

  const getSecondarySalesperson = () => {
    return salespeople.find(sp => sp.id === formData.secondary_salesperson_id);
  };

  const calculateCommission = () => {
    const primarySalesperson = getPrimarySalesperson();
    const secondarySalesperson = getSecondarySalesperson();
    const orderValue = order.value || 0;

    if (!primarySalesperson) return { primary: 0, secondary: 0, total: 0 };

    const fullCommission = orderValue * (primarySalesperson.commission_rate || 0) / 100;
    const splitAmount = fullCommission * (formData.commission_split_percentage / 100);
    const primaryCommission = fullCommission - splitAmount;
    const secondaryCommission = secondarySalesperson ? splitAmount : 0;

    return {
      primary: primaryCommission,
      secondary: secondaryCommission,
      total: primaryCommission + secondaryCommission
    };
  };

  const commission = calculateCommission();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Provisionstilldelning</h3>
              <p className="text-sm text-gray-600">
                Order: {order.title} • Värde: {formatCurrency(order.value || 0)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Laddar säljare...</p>
            </div>
          ) : (
            <>
              {/* Primary Salesperson */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primär säljare *
                </label>
                <select
                  value={formData.primary_salesperson_id}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    primary_salesperson_id: e.target.value,
                    // Reset secondary if same as primary
                    secondary_salesperson_id: e.target.value === prev.secondary_salesperson_id ? '' : prev.secondary_salesperson_id
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Välj primär säljare...</option>
                  {salespeople.map(salesperson => (
                    <option key={salesperson.id} value={salesperson.id}>
                      {salesperson.full_name} ({salesperson.commission_rate}% provision)
                    </option>
                  ))}
                </select>
              </div>

              {/* Secondary Salesperson */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sekundär säljare (valfritt)
                </label>
                <select
                  value={formData.secondary_salesperson_id}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    secondary_salesperson_id: e.target.value,
                    // Reset split if no secondary
                    commission_split_percentage: e.target.value ? prev.commission_split_percentage : 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={!formData.primary_salesperson_id}
                >
                  <option value="">Ingen sekundär säljare</option>
                  {salespeople
                    .filter(sp => sp.id !== formData.primary_salesperson_id)
                    .map(salesperson => (
                      <option key={salesperson.id} value={salesperson.id}>
                        {salesperson.full_name} ({salesperson.commission_rate}% provision)
                      </option>
                    ))}
                </select>
              </div>

              {/* Commission Split */}
              {formData.secondary_salesperson_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provisionsdelning till sekundär säljare (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      value={formData.commission_split_percentage}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        commission_split_percentage: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="25"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Procent av total provision som går till sekundär säljare
                  </p>
                </div>
              )}

              {/* Commission Preview */}
              {formData.primary_salesperson_id && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3 flex items-center">
                    <Calculator className="w-4 h-4 mr-2" />
                    Provisionsberäkning
                  </h4>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Ordervärde:</span>
                      <span className="font-medium text-green-900">{formatCurrency(order.value || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-green-700">
                        {getPrimarySalesperson()?.full_name} ({getPrimarySalesperson()?.commission_rate}%):
                      </span>
                      <span className="font-medium text-green-900">{formatCurrency(commission.primary)}</span>
                    </div>
                    
                    {formData.secondary_salesperson_id && commission.secondary > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          {getSecondarySalesperson()?.full_name} ({formData.commission_split_percentage}%):
                        </span>
                        <span className="font-medium text-green-900">{formatCurrency(commission.secondary)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between border-t border-green-300 pt-2 font-bold">
                      <span className="text-green-800">Total provision:</span>
                      <span className="text-green-900">{formatCurrency(commission.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Om provisionstilldelning</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Primär säljare får huvuddelen av provisionen</li>
                      <li>• Sekundär säljare kan tilldelas en del av provisionen</li>
                      <li>• Provision beräknas automatiskt baserat på ordervärde</li>
                      <li>• Provision betalas ut när ordern är fakturerad</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Provision betalas ut när ordern är slutförd och fakturerad
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.primary_salesperson_id}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              Spara provisionstilldelning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommissionAssignmentForm;
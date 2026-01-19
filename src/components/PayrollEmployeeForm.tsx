import React, { useState, useEffect } from 'react';
import {
  User,
  DollarSign,
  Percent,
  CreditCard,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Calculator,
  Building
} from 'lucide-react';
import {
  updateEmployeePayroll,
  validateSwedishPersonnummer,
  formatSwedishPersonnummer,
  type PayrollEmployee
} from '../lib/payroll';
import { formatCurrency } from '../lib/database';
import { useToast } from '../hooks/useToast';

interface PayrollEmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollEmployee;
  onSaved: () => void;
}

function PayrollEmployeeForm({ isOpen, onClose, employee, onSaved }: PayrollEmployeeFormProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<PayrollEmployee>>({});

  useEffect(() => {
    if (isOpen && employee) {
      setFormData({
        base_hourly_rate: employee.base_hourly_rate,
        base_monthly_salary: employee.base_monthly_salary,
        commission_rate: employee.commission_rate,
        employment_type: employee.employment_type,
        has_commission: employee.has_commission,
        personnummer: employee.personnummer,
        bank_account_number: employee.bank_account_number
      });
    }
  }, [isOpen, employee]);

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validate personnummer if provided
      if (formData.personnummer && !validateSwedishPersonnummer(formData.personnummer)) {
        showError('Ogiltigt personnummer format');
        return;
      }

      // Validate employment type requirements
      if (formData.employment_type === 'hourly' && !formData.base_hourly_rate) {
        showError('Timlön krävs för timanställda');
        return;
      }

      if (formData.employment_type === 'salary' && !formData.base_monthly_salary) {
        showError('Månadslön krävs för månadsanställda');
        return;
      }

      const result = await updateEmployeePayroll(employee.id, formData);
      if (result.error) {
        showError('Kunde inte spara löneuppgifter', result.error.message);
        return;
      }

      success('Löneuppgifter sparade!');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving payroll data:', err);
      showError('Ett oväntat fel inträffade');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonnummerChange = (value: string) => {
    const formatted = value.length >= 10 ? formatSwedishPersonnummer(value) : value;
    setFormData(prev => ({ ...prev, personnummer: formatted }));
  };

  const calculateMonthlySalaryFromHourly = () => {
    if (formData.base_hourly_rate) {
      return formData.base_hourly_rate * 160; // 160 hours per month
    }
    return 0;
  };

  const calculateHourlyFromMonthlySalary = () => {
    if (formData.base_monthly_salary) {
      return formData.base_monthly_salary / 160; // 160 hours per month
    }
    return 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <User className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Löneuppgifter</h3>
              <p className="text-sm text-gray-600">{employee.full_name}</p>
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
          {/* Employment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Anställningstyp *
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="employment_type"
                  value="hourly"
                  checked={formData.employment_type === 'hourly'}
                  onChange={(e) => setFormData(prev => ({ ...prev, employment_type: e.target.value as 'hourly' }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">Timanställd</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Lön baserad på arbetade timmar
                  </p>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="employment_type"
                  value="salary"
                  checked={formData.employment_type === 'salary'}
                  onChange={(e) => setFormData(prev => ({ ...prev, employment_type: e.target.value as 'salary' }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">Månadslön</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Fast månadslön oavsett arbetade timmar
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Salary Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.employment_type === 'hourly' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timlön (SEK) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={formData.base_hourly_rate || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      base_hourly_rate: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="650"
                    min="0"
                    step="0.01"
                  />
                </div>
                {formData.base_hourly_rate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Motsvarar ca {formatCurrency(calculateMonthlySalaryFromHourly())} per månad (160h)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Månadslön (SEK) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={formData.base_monthly_salary || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      base_monthly_salary: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="35000"
                    min="0"
                    step="0.01"
                  />
                </div>
                {formData.base_monthly_salary && (
                  <p className="text-xs text-gray-500 mt-1">
                    Motsvarar ca {formatCurrency(calculateHourlyFromMonthlySalary())}/tim (160h)
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={formData.has_commission || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, has_commission: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">Har provision</span>
              </label>
              
              {formData.has_commission && (
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={formData.commission_rate || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      commission_rate: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="5.0"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personnummer
              </label>
              <input
                type="text"
                value={formData.personnummer || ''}
                onChange={(e) => handlePersonnummerChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  formData.personnummer && !validateSwedishPersonnummer(formData.personnummer)
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="YYYYMMDD-XXXX"
              />
              {formData.personnummer && !validateSwedishPersonnummer(formData.personnummer) && (
                <p className="text-xs text-red-600 mt-1">
                  Ogiltigt personnummer format
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kontonummer
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={formData.bank_account_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_account_number: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1234 12 34567"
                />
              </div>
            </div>
          </div>

          {/* Salary Preview */}
          {(formData.base_hourly_rate || formData.base_monthly_salary) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Löneberäkning (160 timmar/månad)
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Grundlön:</span>
                  <p className="font-bold text-blue-900">
                    {formData.employment_type === 'hourly' 
                      ? formatCurrency(calculateMonthlySalaryFromHourly())
                      : formatCurrency(formData.base_monthly_salary || 0)
                    }
                  </p>
                </div>
                {formData.has_commission && formData.commission_rate && (
                  <div>
                    <span className="text-blue-700">Provision (på 100k order):</span>
                    <p className="font-bold text-blue-900">
                      {formatCurrency(100000 * (formData.commission_rate / 100))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            * Obligatoriska fält
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
              disabled={loading || !formData.employment_type || 
                (formData.employment_type === 'hourly' && !formData.base_hourly_rate) ||
                (formData.employment_type === 'salary' && !formData.base_monthly_salary)
              }
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Spara löneuppgifter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayrollEmployeeForm;
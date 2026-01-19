import React, { useState } from 'react';
import {
  X,
  User,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  Calculator,
  Banknote,
  TrendingUp,
  Package,
  Edit,
  Save,
  Printer
} from 'lucide-react';
import {
  type EmployeePayrollSummary,
  calculateSwedishTax,
  formatPayrollPeriod
} from '../lib/payroll';
import { formatCurrency, formatDate, formatTime } from '../lib/database';
import { ORDER_STATUS_LABELS } from '../types/database';
import { updateTimeLog } from '../lib/timeLogs';
import { useToast } from '../hooks/useToast';

interface EmployeePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeSummary: EmployeePayrollSummary;
  onApprove: () => void;
  onDataRefresh?: () => void;
}

function EmployeePayrollModal({
  isOpen,
  onClose,
  employeeSummary,
  onApprove,
  onDataRefresh
}: EmployeePayrollModalProps) {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeLogs' | 'commission' | 'tax'>('overview');
  const [editingHours, setEditingHours] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const { employee, period, totalHours, basePay, overtimePay, commissionEarnings, totalGrossPay } = employeeSummary;
  const taxCalculation = calculateSwedishTax(totalGrossPay);

  const handleTimeAdjustment = async (timeLogId: string, newHours: number) => {
    try {
      setSaving(true);
      // Calculate new end_time based on adjusted hours
      const timeLog = employeeSummary.timeLogs.find(t => t.id === timeLogId);
      if (!timeLog) return;

      const startTime = new Date(timeLog.start_time);
      const breakMinutes = timeLog.break_duration || 0;
      const totalMinutes = (newHours * 60) + breakMinutes;
      const newEndTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);

      const { error } = await updateTimeLog(timeLogId, {
        end_time: newEndTime.toISOString(),
        notes: timeLog.notes ? `${timeLog.notes} [Justerad: ${newHours}h]` : `[Justerad till: ${newHours}h]`
      });

      if (error) throw error;

      success('Tidrapport uppdaterad', `Arbetstid justerad till ${newHours} timmar`);
      setEditingHours(null);
      onDataRefresh?.();
    } catch (err: any) {
      showError('Kunde inte uppdatera', err.message);
    } finally {
      setSaving(false);
    }
  };

  const generatePayrollPDF = () => {
    // Use browser print functionality
    window.print();
  };

  const getEmploymentTypeLabel = (type?: string) => {
    switch (type) {
      case 'hourly': return 'Timanställd';
      case 'salary': return 'Månadslön';
      default: return 'Okänd';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
              <span className="text-white font-bold text-lg">
                {employee.full_name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{employee.full_name}</h3>
              <p className="text-sm text-gray-600">
                Löneunderlag för {formatPayrollPeriod(period)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={generatePayrollPDF}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Ladda ner PDF
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Översikt', icon: Calculator },
              { id: 'timeLogs', label: 'Tidrapporter', icon: Clock },
              { id: 'commission', label: 'Provision', icon: TrendingUp },
              { id: 'tax', label: 'Skatter', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">Anställningsdetaljer</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Anställningstyp:</span>
                      <span className="font-medium text-blue-900">
                        {getEmploymentTypeLabel(employee.employment_type)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Grundlön:</span>
                      <span className="font-medium text-blue-900">
                        {employee.employment_type === 'hourly'
                          ? `${formatCurrency(employee.base_hourly_rate || 0)}/tim`
                          : formatCurrency(employee.base_monthly_salary || 0)
                        }
                      </span>
                    </div>
                    {employee.has_commission && (
                      <div className="flex justify-between">
                        <span className="text-blue-700">Provision:</span>
                        <span className="font-medium text-blue-900">
                          {employee.commission_rate}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-blue-700">Personnummer:</span>
                      <span className="font-medium text-blue-900">
                        {employee.personnummer || 'Ej angivet'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3">Lönesammanfattning</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Ordinarie timmar:</span>
                      <span className="font-medium text-green-900">{employeeSummary.regularHours}h</span>
                    </div>
                    {employeeSummary.overtimeHours > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-700">Övertid:</span>
                        <span className="font-medium text-green-900">{employeeSummary.overtimeHours}h</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-green-700">Grundlön:</span>
                      <span className="font-medium text-green-900">{formatCurrency(basePay)}</span>
                    </div>
                    {overtimePay > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-700">Övertidsersättning:</span>
                        <span className="font-medium text-green-900">{formatCurrency(overtimePay)}</span>
                      </div>
                    )}
                    {commissionEarnings > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-700">Provision:</span>
                        <span className="font-medium text-green-900">{formatCurrency(commissionEarnings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-green-200 pt-2 font-bold">
                      <span className="text-green-800">Bruttolön:</span>
                      <span className="text-green-900">{formatCurrency(totalGrossPay)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{totalHours}h</div>
                  <p className="text-sm text-gray-600">Totala timmar</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{employeeSummary.timeLogs.length}</div>
                  <p className="text-sm text-gray-600">Arbetsdagar</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{employeeSummary.commissionOrders.length}</div>
                  <p className="text-sm text-gray-600">Provisionsordrar</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(employeeSummary.estimatedNetPay)}</div>
                  <p className="text-sm text-gray-600">Beräknad nettolön</p>
                </div>
              </div>
            </div>
          )}

          {/* Time Logs Tab */}
          {activeTab === 'timeLogs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Tidrapporter</h4>
                <span className="text-sm text-gray-500">{employeeSummary.timeLogs.length} poster</span>
              </div>

              {employeeSummary.timeLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Inga tidrapporter för denna period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employeeSummary.timeLogs.map((timeLog) => {
                    const duration = timeLog.end_time
                      ? new Date(timeLog.end_time).getTime() - new Date(timeLog.start_time).getTime()
                      : 0;
                    const workMinutes = Math.floor(duration / (1000 * 60)) - (timeLog.break_duration || 0);
                    const workHours = workMinutes / 60;

                    return (
                      <div key={timeLog.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Package className="w-4 h-4 text-blue-600" />
                              <h5 className="font-medium text-gray-900">{timeLog.order?.title}</h5>
                              {timeLog.is_approved ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Datum:</span>
                                <p>{formatDate(timeLog.start_time)}</p>
                              </div>
                              <div>
                                <span className="font-medium">Tid:</span>
                                <p>
                                  {formatTime(timeLog.start_time)} -
                                  {timeLog.end_time ? formatTime(timeLog.end_time) : 'Pågår'}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">Arbetstid:</span>
                                <p className="font-bold text-gray-900">
                                  {editingHours === timeLog.id ? (
                                    <input
                                      type="number"
                                      step="0.1"
                                      defaultValue={workHours.toFixed(1)}
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                      onBlur={(e) => {
                                        handleTimeAdjustment(timeLog.id, parseFloat(e.target.value));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleTimeAdjustment(timeLog.id, parseFloat(e.currentTarget.value));
                                        }
                                      }}
                                      autoFocus
                                    />
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:bg-gray-100 px-1 rounded"
                                      onClick={() => setEditingHours(timeLog.id)}
                                    >
                                      {workHours.toFixed(1)}h
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">Belopp:</span>
                                <p className="font-bold text-green-600">{formatCurrency(timeLog.total_amount)}</p>
                              </div>
                            </div>

                            {timeLog.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">{timeLog.notes}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingHours(timeLog.id)}
                              className="text-gray-400 hover:text-blue-600"
                              title="Justera timmar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Commission Tab */}
          {activeTab === 'commission' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Provisionsordrar</h4>
                <span className="text-sm text-gray-500">{employeeSummary.commissionOrders.length} ordrar</span>
              </div>

              {employeeSummary.commissionOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Inga provisionsordrar för denna period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employeeSummary.commissionOrders.map((commissionOrder, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Package className="w-4 h-4 text-purple-600" />
                            <h5 className="font-medium text-gray-900">{commissionOrder.order.title}</h5>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${commissionOrder.isPrimary
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                              }`}>
                              {commissionOrder.isPrimary ? 'Primär säljare' : 'Sekundär säljare'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Kund:</span>
                              <p>{commissionOrder.order.customer?.name}</p>
                            </div>
                            <div>
                              <span className="font-medium">Ordervärde:</span>
                              <p className="font-bold text-gray-900">{formatCurrency(commissionOrder.order.value || 0)}</p>
                            </div>
                            <div>
                              <span className="font-medium">Provisionsgrad:</span>
                              <p>
                                {commissionOrder.isPrimary
                                  ? `${employee.commission_rate}%${commissionOrder.splitPercentage ? ` (delad)` : ''}`
                                  : `${commissionOrder.splitPercentage}% (delad)`
                                }
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">Provision:</span>
                              <p className="font-bold text-green-600">{formatCurrency(commissionOrder.commissionAmount)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-900">Total provision:</span>
                      <span className="text-xl font-bold text-green-900">
                        {formatCurrency(commissionEarnings)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tax Tab */}
          {activeTab === 'tax' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Skatteberäkning (Uppskattning)
                </h4>
                <p className="text-sm text-yellow-700">
                  Detta är en förenklad skatteberäkning. Konsultera alltid en revisor för exakta beräkningar.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-4">Bruttolön uppdelning</h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Grundlön:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(basePay)}</span>
                    </div>
                    {overtimePay > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Övertidsersättning:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(overtimePay)}</span>
                      </div>
                    )}
                    {commissionEarnings > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Provision:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(commissionEarnings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                      <span className="text-gray-800">Total bruttolön:</span>
                      <span className="text-gray-900">{formatCurrency(totalGrossPay)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-4">Skatteavdrag</h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kommunalskatt (~32%):</span>
                      <span className="font-medium text-red-600">{formatCurrency(taxCalculation.municipalTax)}</span>
                    </div>
                    {taxCalculation.stateTax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Statlig skatt (20%):</span>
                        <span className="font-medium text-red-600">{formatCurrency(taxCalculation.stateTax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-600">Total skatt:</span>
                      <span className="font-medium text-red-600">{formatCurrency(taxCalculation.totalTax)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                      <span className="text-gray-800">Nettolön:</span>
                      <span className="text-green-600">{formatCurrency(taxCalculation.netPay)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-3">Arbetsgivaravgifter</h5>
                <div className="text-sm text-blue-700">
                  <div className="flex justify-between">
                    <span>Sociala avgifter (31,42%):</span>
                    <span className="font-medium">{formatCurrency(taxCalculation.socialFees)}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-blue-200 font-bold">
                    <span>Total kostnad för arbetsgivare:</span>
                    <span>{formatCurrency(totalGrossPay + taxCalculation.socialFees)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Status: <span className={`font-medium ${employeeSummary.status === 'approved' ? 'text-green-600' :
                employeeSummary.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
              }`}>
              {employeeSummary.status === 'approved' ? 'Godkänd' :
                employeeSummary.status === 'pending' ? 'Väntande godkännande' : 'Ej behandlad'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Stäng
            </button>
            {employeeSummary.status === 'pending' && (
              <button
                onClick={onApprove}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Godkänn tidrapport
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeePayrollModal;
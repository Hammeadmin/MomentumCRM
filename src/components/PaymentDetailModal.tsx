import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Receipt,
  User,
  Calendar,
  Clock,
  Mail,
  Send,
  CheckCircle,
  AlertTriangle,
  Copy,
  Bell,
  CreditCard,
  FileText,
  History,
  ExternalLink,
  Loader2,
  DollarSign,
  Phone,
  MapPin,
  Building
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS } from '../types/database';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { StatusBadge } from './ui';

interface InvoiceHistory {
  id: string;
  action_type: string;
  performed_by_user_id: string | null;
  details: Record<string, any>;
  created_at: string;
  performed_by?: { full_name: string } | null;
}

interface PaymentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onMarkPaid?: (invoiceId: string) => void;
  onSendReminder?: (invoiceId: string) => void;
  onSendAgain?: (invoiceId: string) => void;
  onDuplicate?: (invoiceId: string) => void;
  onNavigateToInvoice?: (invoiceId: string) => void;
  onRefresh?: () => void;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  created: 'Skapad',
  sent: 'Skickad',
  reminder_sent: 'Påminnelse skickad',
  viewed: 'Visad av kund',
  paid: 'Betald',
  status_changed: 'Status ändrad',
  updated: 'Uppdaterad',
  duplicated: 'Duplicerad'
};

const ACTION_TYPE_ICONS: Record<string, typeof Receipt> = {
  created: FileText,
  sent: Send,
  reminder_sent: Bell,
  viewed: CheckCircle,
  paid: DollarSign,
  status_changed: History,
  updated: FileText,
  duplicated: Copy
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  created: 'bg-blue-100 text-blue-600',
  sent: 'bg-cyan-100 text-cyan-600',
  reminder_sent: 'bg-amber-100 text-amber-600',
  viewed: 'bg-emerald-100 text-emerald-600',
  paid: 'bg-green-100 text-green-600',
  status_changed: 'bg-purple-100 text-purple-600',
  updated: 'bg-gray-100 text-gray-600',
  duplicated: 'bg-indigo-100 text-indigo-600'
};

export function PaymentDetailModal({
  isOpen,
  onClose,
  invoice,
  onMarkPaid,
  onSendReminder,
  onSendAgain,
  onDuplicate,
  onNavigateToInvoice,
  onRefresh
}: PaymentDetailModalProps) {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [history, setHistory] = useState<InvoiceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  useEffect(() => {
    if (isOpen && invoice) {
      fetchHistory();
    }
  }, [isOpen, invoice?.id]);

  const fetchHistory = async () => {
    if (!invoice) return;

    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('invoice_history')
        .select(`
          id,
          action_type,
          performed_by_user_id,
          details,
          created_at,
          performed_by:user_profiles!invoice_history_performed_by_user_id_fkey(full_name)
        `)
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching invoice history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen || !invoice) return null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: sv });
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: sv });
  };

  const getDaysOverdue = () => {
    if (!invoice.due_date) return null;
    const due = new Date(invoice.due_date);
    if (!isPast(due)) return null;
    return differenceInDays(new Date(), due);
  };

  const getPaymentStatus = (): string => {
    if (invoice.status === 'paid') return 'paid';
    if (invoice.status === 'overdue') return 'overdue';
    if (invoice.due_date && isPast(new Date(invoice.due_date))) return 'overdue';
    if (invoice.status === 'sent') return 'pending';
    return 'draft';
  };

  const daysOverdue = getDaysOverdue();
  const paymentStatus = getPaymentStatus();

  const handleGoToInvoice = () => {
    if (onNavigateToInvoice) {
      onNavigateToInvoice(invoice.id);
    } else {
      navigate('/app/fakturor', { state: { openInvoiceId: invoice.id } });
    }
    onClose();
  };

  const ActionCard = ({
    icon: Icon,
    label,
    description,
    onClick,
    disabled = false,
    variant = 'default'
  }: {
    icon: typeof Receipt;
    label: string;
    description: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'success' | 'warning' | 'danger';
  }) => {
    const variantStyles = {
      default: 'hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
      success: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
      warning: 'hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      danger: 'hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800'
    };

    const iconStyles = {
      default: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600',
      success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
      warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
      danger: 'bg-red-100 dark:bg-red-900/30 text-red-600'
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full p-4 rounded-xl border ${variantStyles[variant]} transition-colors text-left ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconStyles[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">{label}</p>
            <p className="text-sm text-zinc-500">{description}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Faktura #{invoice.invoice_number}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge
                    status={paymentStatus}
                    customLabel={INVOICE_STATUS_LABELS[invoice.status]}
                    size="sm"
                  />
                  {daysOverdue && daysOverdue > 0 && (
                    <span className="text-xs text-red-500 font-medium">
                      {daysOverdue} dagar försenad
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'details'
                  ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Detaljer
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <History className="w-4 h-4" />
              Historik
              {history.length > 0 && (
                <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs px-1.5 py-0.5 rounded">
                  {history.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'details' ? (
              <div className="space-y-6">
                {/* Invoice Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Belopp</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {formatCurrency(invoice.amount)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Förfallodatum</p>
                    <p className={`text-lg font-semibold ${daysOverdue ? 'text-red-600' : 'text-zinc-900 dark:text-white'}`}>
                      {formatDate(invoice.due_date)}
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                {invoice.customer && (
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Kundinformation
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-900 dark:text-white">{invoice.customer.name}</span>
                      </div>
                      {invoice.customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-600 dark:text-zinc-400">{invoice.customer.email}</span>
                        </div>
                      )}
                      {invoice.customer.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-600 dark:text-zinc-400">{invoice.customer.phone_number}</span>
                        </div>
                      )}
                      {invoice.customer.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-600 dark:text-zinc-400">{invoice.customer.city}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sending Stats */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Utskicksinformation
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <p className="text-2xl font-bold text-cyan-600">{(invoice as any).sent_count || 0}</p>
                      <p className="text-xs text-zinc-500">Gånger skickad</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <p className="text-2xl font-bold text-amber-600">{(invoice as any).reminder_count || 0}</p>
                      <p className="text-xs text-zinc-500">Påminnelser</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {(invoice as any).last_sent_at ? formatDateTime((invoice as any).last_sent_at) : '-'}
                      </p>
                      <p className="text-xs text-zinc-500">Senast skickad</p>
                    </div>
                  </div>
                </div>

                {/* Action Cards */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Snabbåtgärder</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionCard
                      icon={ExternalLink}
                      label="Gå till faktura"
                      description="Öppna fakturadetaljer"
                      onClick={handleGoToInvoice}
                    />

                    {paymentStatus !== 'paid' && onMarkPaid && (
                      <ActionCard
                        icon={CheckCircle}
                        label="Markera betald"
                        description="Registrera betalning"
                        onClick={() => {
                          onMarkPaid(invoice.id);
                          onClose();
                        }}
                        variant="success"
                      />
                    )}

                    {paymentStatus !== 'paid' && onSendReminder && (
                      <ActionCard
                        icon={Bell}
                        label="Skicka påminnelse"
                        description="Påminn kunden"
                        onClick={() => {
                          onSendReminder(invoice.id);
                          onClose();
                        }}
                        variant="warning"
                      />
                    )}

                    {onSendAgain && (
                      <ActionCard
                        icon={Send}
                        label="Skicka igen"
                        description="Skicka fakturan på nytt"
                        onClick={() => {
                          onSendAgain(invoice.id);
                          onClose();
                        }}
                      />
                    )}

                    {onDuplicate && (
                      <ActionCard
                        icon={Copy}
                        label="Duplicera"
                        description="Skapa en kopia"
                        onClick={() => {
                          onDuplicate(invoice.id);
                          onClose();
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Dates Info */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Skapad</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{formatDateTime(invoice.created_at)}</p>
                    </div>
                    {invoice.email_sent_at && (
                      <div>
                        <p className="text-zinc-500">Först skickad</p>
                        <p className="font-medium text-zinc-900 dark:text-white">{formatDateTime(invoice.email_sent_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* History Tab */
              <div className="space-y-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                    <p className="text-zinc-500">Ingen historik tillgänglig</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-6 bottom-6 w-px bg-zinc-200 dark:bg-zinc-700" />

                    {history.map((entry, index) => {
                      const Icon = ACTION_TYPE_ICONS[entry.action_type] || History;
                      const colorClass = ACTION_TYPE_COLORS[entry.action_type] || 'bg-gray-100 text-gray-600';

                      return (
                        <div key={entry.id} className="relative flex gap-4 pb-6">
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-zinc-900 dark:text-white">
                                {ACTION_TYPE_LABELS[entry.action_type] || entry.action_type}
                              </p>
                              <span className="text-xs text-zinc-500">
                                {formatDateTime(entry.created_at)}
                              </span>
                            </div>

                            {entry.performed_by?.full_name && (
                              <p className="text-sm text-zinc-500 mt-0.5">
                                av {entry.performed_by.full_name}
                              </p>
                            )}

                            {/* Details */}
                            {entry.details && Object.keys(entry.details).length > 0 && (
                              <div className="mt-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                                {entry.details.recipient && (
                                  <p className="text-zinc-600 dark:text-zinc-400">
                                    Mottagare: {entry.details.recipient}
                                  </p>
                                )}
                                {entry.details.previous_status && entry.details.new_status && (
                                  <p className="text-zinc-600 dark:text-zinc-400">
                                    {INVOICE_STATUS_LABELS[entry.details.previous_status as InvoiceStatus] || entry.details.previous_status}
                                    {' '}&rarr;{' '}
                                    {INVOICE_STATUS_LABELS[entry.details.new_status as InvoiceStatus] || entry.details.new_status}
                                  </p>
                                )}
                                {entry.details.amount && (
                                  <p className="text-zinc-600 dark:text-zinc-400">
                                    Belopp: {formatCurrency(entry.details.amount)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentDetailModal;

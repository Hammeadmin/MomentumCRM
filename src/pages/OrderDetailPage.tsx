/**
 * OrderDetailPage - Comprehensive order detail view
 * 
 * Based on reference CRM design with:
 * - Status workflow tabs
 * - Customer info sidebar
 * - Schedule & location with map
 * - Team assignment section
 * - Attachments
 * - Activity timeline
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MapPin,
    User,
    Users,
    FileText,
    Paperclip,
    Phone,
    Mail,
    Building,
    Clock,
    Edit,
    CheckCircle,
    AlertCircle,
    Send,
    Download,
    ExternalLink,
    MessageSquare,
    Plus,
    ChevronRight,
    Loader2,
    ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import {
    getOrder,
    getOrderNotes,
    getOrderActivities,
    getAttachmentsForOrder,
    updateOrder,
    createOrderNote,
    type OrderWithRelations
} from '../lib/orders';
import { formatDate } from '../lib/database';
import { ORDER_STATUS_LABELS, type OrderStatus, type OrderNote, type OrderActivity } from '../types/database';
import { Button } from '../components/ui';

// Status options matching Kanban columns - same as Säljtunnel/OrderKanban
const ORDER_STATUS_OPTIONS: { status: OrderStatus; label: string; color: string }[] = [
    { status: 'öppen_order', label: 'Öppen order', color: 'bg-blue-500' },
    { status: 'bokad_bekräftad', label: 'Bokad/Bekräftad', color: 'bg-green-500' },
    { status: 'ej_slutfört', label: 'Ej slutfört', color: 'bg-amber-500' },
    { status: 'redo_fakturera', label: 'Redo att fakturera', color: 'bg-purple-500' },
    { status: 'fakturerad', label: 'Fakturerad', color: 'bg-teal-500' },
    { status: 'avbokad_kund', label: 'Avbokad (kund)', color: 'bg-red-500' },
];

// Status dropdown component for free editing (like drag-drop in Kanban)
function StatusDropdown({
    currentStatus,
    onStatusChange,
    loading
}: {
    currentStatus: OrderStatus;
    onStatusChange: (newStatus: OrderStatus) => void;
    loading: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);

    const currentOption = ORDER_STATUS_OPTIONS.find(o => o.status === currentStatus);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
                <div className={`w-3 h-3 rounded-full ${currentOption?.color || 'bg-gray-400'}`} />
                <span className="font-medium text-gray-900">
                    {currentOption?.label || ORDER_STATUS_LABELS[currentStatus] || currentStatus}
                </span>
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                )}
            </button>

            {isOpen && !loading && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg border border-gray-200 shadow-xl z-50 py-1">
                        <div className="px-3 py-2 border-b border-gray-100">
                            <p className="text-xs font-medium text-gray-500 uppercase">Ändra status</p>
                        </div>
                        {ORDER_STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.status}
                                onClick={() => {
                                    if (option.status !== currentStatus) {
                                        onStatusChange(option.status);
                                    }
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${option.status === currentStatus ? 'bg-blue-50' : ''
                                    }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${option.color}`} />
                                <span className={`text-sm ${option.status === currentStatus ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                                    {option.label}
                                </span>
                                {option.status === currentStatus && (
                                    <CheckCircle className="w-4 h-4 text-blue-500 ml-auto" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Confirmation dialog component
function ConfirmStatusDialog({
    isOpen,
    onClose,
    onConfirm,
    currentStatus,
    newStatus,
    loading
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    currentStatus: string;
    newStatus: string;
    loading: boolean;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bekräfta statusändring</h3>
                <p className="text-gray-600 mb-6">
                    Är du säker på att du vill ändra status från <strong>"{currentStatus}"</strong> till <strong>"{newStatus}"</strong>?
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Avbryt
                    </Button>
                    <Button variant="primary" onClick={onConfirm} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                        Bekräfta
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: showError } = useToast();

    const [order, setOrder] = useState<OrderWithRelations | null>(null);
    const [notes, setNotes] = useState<OrderNote[]>([]);
    const [activities, setActivities] = useState<OrderActivity[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'attachments'>('details');

    // Status change confirmation
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
    const [statusChangeLoading, setStatusChangeLoading] = useState(false);

    useEffect(() => {
        if (id) {
            loadOrderData();
        }
    }, [id]);

    const loadOrderData = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const [orderRes, notesRes, activitiesRes, attachmentsRes] = await Promise.all([
                getOrder(id),
                getOrderNotes(id),
                getOrderActivities(id),
                getAttachmentsForOrder(id)
            ]);

            if (orderRes.error) throw orderRes.error;
            setOrder(orderRes.data);
            setNotes(notesRes.data || []);
            setActivities(activitiesRes.data || []);
            setAttachments(attachmentsRes.data || []);
        } catch (err: any) {
            showError('Kunde inte ladda order', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initiate status change - allows any status (like drag-drop in Kanban)
    const initiateStatusChange = (newStatus: OrderStatus) => {
        if (!order || newStatus === order.status) return;

        setPendingStatus(newStatus);
        setShowStatusConfirm(true);
    };

    // Confirm and execute status change
    const confirmStatusChange = async () => {
        if (!order || !id || !pendingStatus) return;

        setStatusChangeLoading(true);
        try {
            const { error } = await updateOrder(id, { status: pendingStatus });
            if (error) throw error;

            setOrder(prev => prev ? { ...prev, status: pendingStatus } : null);
            success('Status uppdaterad', `Ordern ändrades till "${ORDER_STATUS_LABELS[pendingStatus]}"`);
            loadOrderData(); // Refresh to get new activity
        } catch (err: any) {
            showError('Kunde inte uppdatera status', err.message);
        } finally {
            setStatusChangeLoading(false);
            setShowStatusConfirm(false);
            setPendingStatus(null);
        }
    };

    // Handle edit button - navigate to order management page
    const handleEdit = () => {
        navigate('/app/Orderhantering');
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !id || !user) return;

        setSubmittingNote(true);
        try {
            const { error } = await createOrderNote({
                order_id: id,
                user_id: user.id,
                content: newNote.trim(),
                include_in_invoice: false
            });

            if (error) throw error;

            setNewNote('');
            success('Anteckning tillagd');
            loadOrderData();
        } catch (err: any) {
            showError('Kunde inte lägga till anteckning', err.message);
        } finally {
            setSubmittingNote(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Laddar orderinformation...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Order hittades inte</h2>
                <p className="text-gray-600 mb-4">Ordern du letar efter finns inte eller har tagits bort.</p>
                <Button onClick={() => navigate('/app/Säljtunnel')}>Tillbaka till ordrar</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Status Change Confirmation Dialog */}
            <ConfirmStatusDialog
                isOpen={showStatusConfirm}
                onClose={() => { setShowStatusConfirm(false); setPendingStatus(null); }}
                onConfirm={confirmStatusChange}
                currentStatus={ORDER_STATUS_LABELS[order.status]}
                newStatus={pendingStatus ? ORDER_STATUS_LABELS[pendingStatus] : ''}
                loading={statusChangeLoading}
            />

            {/* Header with back button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
                        <p className="text-gray-500 text-sm">Order #{id?.substring(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" icon={<Edit className="w-4 h-4" />} onClick={handleEdit}>
                        Redigera
                    </Button>
                    <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />}>
                        Skicka faktura
                    </Button>
                </div>
            </div>

            {/* Status Section - Dropdown like Kanban drag-drop */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">Orderstatus</h3>
                        <p className="text-xs text-gray-500">Klicka för att ändra status (som dra-och-släpp i Säljtunnel)</p>
                    </div>
                    <StatusDropdown
                        currentStatus={order.status}
                        onStatusChange={initiateStatusChange}
                        loading={statusChangeLoading}
                    />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Customer Info */}
                <div className="space-y-6">
                    {/* Customer Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Kund</h3>
                        {order.customer ? (
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold text-sm">
                                            {order.customer.name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{order.customer.name}</p>
                                        <p className="text-sm text-gray-500">{order.customer.customer_type === 'company' ? 'Företag' : 'Privatperson'}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-3 border-t border-gray-100">
                                    {order.customer.email && (
                                        <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                                            <Mail className="w-4 h-4" />
                                            {order.customer.email}
                                        </a>
                                    )}
                                    {order.customer.phone_number && (
                                        <a href={`tel:${order.customer.phone_number}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                                            <Phone className="w-4 h-4" />
                                            {order.customer.phone_number}
                                        </a>
                                    )}
                                    {order.customer.address && (
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>
                                                {order.customer.address}
                                                {order.customer.postal_code && `, ${order.customer.postal_code}`}
                                                {order.customer.city && ` ${order.customer.city}`}
                                            </span>
                                        </div>
                                    )}
                                    {order.customer.org_number && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Building className="w-4 h-4" />
                                            Org.nr: {order.customer.org_number}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Ingen kund kopplad</p>
                        )}
                    </div>

                    {/* Assignment Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Tilldelning</h3>
                        <div className="space-y-3">
                            {order.assigned_to && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{order.assigned_to.full_name}</p>
                                        <p className="text-xs text-gray-500">Ansvarig</p>
                                    </div>
                                </div>
                            )}
                            {order.assigned_team && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <Users className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{order.assigned_team.name}</p>
                                        <p className="text-xs text-gray-500">Team</p>
                                    </div>
                                </div>
                            )}
                            {!order.assigned_to && !order.assigned_team && (
                                <p className="text-gray-500 text-sm">Ingen tilldelad</p>
                            )}
                        </div>
                    </div>

                    {/* Order Value */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Värde</h3>
                        <p className="text-3xl font-bold text-gray-900">
                            {order.value?.toLocaleString('sv-SE')} kr
                        </p>
                        {order.include_rot && (
                            <p className="text-sm text-green-600 mt-1">Inkl. ROT-avdrag</p>
                        )}
                        {(order as any).include_rut && (
                            <p className="text-sm text-purple-600 mt-1">Inkl. RUT-avdrag</p>
                        )}
                    </div>
                </div>

                {/* Right Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Content Tabs */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="flex border-b border-gray-200">
                            {[
                                { id: 'details', label: 'Detaljer', icon: FileText },
                                { id: 'timeline', label: 'Historik', icon: Clock },
                                { id: 'attachments', label: 'Bilagor', icon: Paperclip }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    {tab.id === 'attachments' && attachments.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 rounded-full">
                                            {attachments.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-5">
                            {activeTab === 'details' && (
                                <div className="space-y-6">
                                    {/* Description */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Beskrivning</h4>
                                        <p className="text-gray-600">{order.description || 'Ingen beskrivning angiven.'}</p>
                                    </div>

                                    {/* Job Details */}
                                    {order.job_description && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Jobbdetaljer</h4>
                                            <p className="text-gray-600 whitespace-pre-wrap">{order.job_description}</p>
                                        </div>
                                    )}

                                    {/* Meta Info Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {order.job_type && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 mb-1">Jobbtyp</p>
                                                <p className="font-medium text-gray-900">{order.job_type}</p>
                                            </div>
                                        )}
                                        {order.estimated_hours && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 mb-1">Uppskattad tid</p>
                                                <p className="font-medium text-gray-900">{order.estimated_hours} timmar</p>
                                            </div>
                                        )}
                                        {order.source && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 mb-1">Källa</p>
                                                <p className="font-medium text-gray-900">{order.source}</p>
                                            </div>
                                        )}
                                        {order.created_at && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 mb-1">Skapad</p>
                                                <p className="font-medium text-gray-900">{formatDate(order.created_at)}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes Section */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" />
                                            Anteckningar ({notes.length})
                                        </h4>

                                        {/* Add Note Form */}
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Lägg till anteckning..."
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                            />
                                            <Button
                                                onClick={handleAddNote}
                                                disabled={!newNote.trim() || submittingNote}
                                                size="sm"
                                                icon={submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            >
                                                Lägg till
                                            </Button>
                                        </div>

                                        {/* Notes List */}
                                        <div className="space-y-3">
                                            {notes.length === 0 ? (
                                                <p className="text-sm text-gray-500 text-center py-4">
                                                    Inga anteckningar ännu
                                                </p>
                                            ) : (
                                                notes.map(note => (
                                                    <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                                                        <p className="text-sm text-gray-700">{note.content}</p>
                                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                            <span>{note.user?.full_name || 'Okänd'}</span>
                                                            <span>•</span>
                                                            <span>{note.created_at ? formatDate(note.created_at) : ''}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'timeline' && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Aktivitetslogg</h4>
                                    {activities.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-8">
                                            Ingen aktivitetshistorik ännu
                                        </p>
                                    ) : (
                                        <div className="relative">
                                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                                            {activities.map((activity, _index) => (
                                                <div key={activity.id} className="relative pl-10 pb-6">
                                                    <div className="absolute left-2.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <p className="text-sm text-gray-700">{activity.description}</p>
                                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                            <span>{activity.user?.full_name || 'System'}</span>
                                                            <span>•</span>
                                                            <span>{activity.created_at ? formatDate(activity.created_at) : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'attachments' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-gray-700">Bilagor</h4>
                                        <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}>
                                            Ladda upp
                                        </Button>
                                    </div>
                                    {attachments.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-8">
                                            Inga bilagor uppladdade
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            {attachments.map(attachment => (
                                                <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                    <Paperclip className="w-5 h-5 text-gray-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
                                                        <p className="text-xs text-gray-500">{attachment.file_type}</p>
                                                    </div>
                                                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Map Placeholder (if customer has address) */}
                    {order.customer?.address && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    Plats
                                </h3>
                            </div>
                            <div className="h-64 bg-gray-100 flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <MapPin className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm">{order.customer.address}</p>
                                    <p className="text-sm">{order.customer.postal_code} {order.customer.city}</p>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                            `${order.customer.address}, ${order.customer.postal_code} ${order.customer.city}`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        Öppna i Google Maps
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

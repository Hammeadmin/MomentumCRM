/**
 * OrderTable Component
 * 
 * Dense table view for orders matching AddHub's table layout.
 * Features:
 * - Filter tabs (All | Active | Booked | Invoiced | Cancelled)
 * - Sortable columns
 * - Status badges
 * - Click to open order detail
 * - 3-dots menu for status changes (matching Kanban functionality)
 */

import { useState, useMemo } from 'react';
import {
    Search,
    ChevronUp,
    ChevronDown,
    MoreHorizontal,
    User,
    Users,
    Calendar,
    MapPin,
    CheckCircle,
    Eye,
    Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { OrderStatus, ORDER_STATUS_LABELS } from '../types/database';
import { OrderWithRelations } from '../lib/orders';
import { FilterTabs, useFilterTabs, StatusBadge } from './ui';
import type { FilterTab } from './ui/FilterTabs';

interface OrderTableProps {
    orders: OrderWithRelations[];
    loading?: boolean;
    onOrderClick: (order: OrderWithRelations) => void;
    onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
    onDelete?: (order: OrderWithRelations) => void;
}

type SortField = 'created_at' | 'title' | 'value' | 'customer' | 'status';
type SortDirection = 'asc' | 'desc';

// Status options matching Kanban columns - same as Säljtunnel/OrderKanban
const ORDER_STATUS_OPTIONS: { status: OrderStatus; label: string; color: string }[] = [
    { status: 'öppen_order', label: 'Öppen order', color: 'bg-blue-500' },
    { status: 'bokad_bekräftad', label: 'Bokad/Bekräftad', color: 'bg-green-500' },
    { status: 'ej_slutfört', label: 'Ej slutfört', color: 'bg-amber-500' },
    { status: 'redo_fakturera', label: 'Redo att fakturera', color: 'bg-purple-500' },
    { status: 'fakturerad', label: 'Fakturerad', color: 'bg-teal-500' },
    { status: 'avbokad_kund', label: 'Avbokad (kund)', color: 'bg-red-500' },
];

// Map order statuses to filter categories
const STATUS_FILTER_MAP: Record<string, OrderStatus[]> = {
    all: [],
    active: ['öppen_order', 'bokad_bekräftad', 'förfrågan', 'offert_skapad'],
    booked: ['bokad_bekräftad'],
    invoiced: ['fakturerad', 'redo_fakturera'],
    cancelled: ['avbokad_kund', 'ej_slutfört']
};

export function OrderTable({ orders, loading, onOrderClick, onStatusChange, onDelete }: OrderTableProps) {
    const { activeTab, setActiveTab } = useFilterTabs('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Dropdown menu state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Calculate counts for tabs
    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = { all: orders.length };
        Object.entries(STATUS_FILTER_MAP).forEach(([key, statuses]) => {
            if (key !== 'all') {
                counts[key] = orders.filter(o => statuses.includes(o.status)).length;
            }
        });
        return counts;
    }, [orders]);

    const filterTabs: FilterTab[] = [
        { key: 'all', label: 'Alla ordrar', count: tabCounts.all },
        { key: 'active', label: 'Aktiva', count: tabCounts.active },
        { key: 'booked', label: 'Bokade', count: tabCounts.booked },
        { key: 'invoiced', label: 'Fakturerade', count: tabCounts.invoiced },
        { key: 'cancelled', label: 'Avbokade', count: tabCounts.cancelled }
    ];

    // Filter and sort orders
    const filteredOrders = useMemo(() => {
        let result = [...orders];

        // Apply status filter
        if (activeTab !== 'all') {
            const allowedStatuses = STATUS_FILTER_MAP[activeTab] || [];
            result = result.filter(o => allowedStatuses.includes(o.status));
        }

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(o =>
                o.title.toLowerCase().includes(query) ||
                o.customer?.name?.toLowerCase().includes(query) ||
                o.description?.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let aVal: any, bVal: any;

            switch (sortField) {
                case 'title':
                    aVal = a.title.toLowerCase();
                    bVal = b.title.toLowerCase();
                    break;
                case 'value':
                    aVal = a.value || 0;
                    bVal = b.value || 0;
                    break;
                case 'customer':
                    aVal = a.customer?.name?.toLowerCase() || '';
                    bVal = b.customer?.name?.toLowerCase() || '';
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                default:
                    aVal = new Date(a.created_at || 0).getTime();
                    bVal = new Date(b.created_at || 0).getTime();
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [orders, activeTab, searchQuery, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />;
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('sv-SE', {
            style: 'currency',
            currency: 'SEK',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        return format(new Date(dateStr), 'd MMM yyyy', { locale: sv });
    };

    // Map order status to StatusBadge status prop
    const getStatusBadgeType = (status: OrderStatus): 'lead' | 'booked' | 'pending' | 'overdue' | 'draft' | 'accepted' | 'paid' => {
        switch (status) {
            case 'bokad_bekräftad': return 'booked';
            case 'fakturerad': return 'paid';
            case 'redo_fakturera': return 'accepted';
            case 'förfrågan': return 'lead';
            case 'offert_skapad': return 'pending';
            case 'avbokad_kund':
            case 'ej_slutfört': return 'overdue';
            default: return 'draft';
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div>
                    <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header with Filter Tabs and Search */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <FilterTabs
                        tabs={filterTabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        variant="pills"
                        size="sm"
                    />

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Sök ordrar..."
                            className="pl-9 pr-4 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500 w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                            <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('title')} className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300">
                                    Order
                                    <SortIcon field="title" />
                                </button>
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300">
                                    Status
                                    <SortIcon field="status" />
                                </button>
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('customer')} className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300">
                                    Kund
                                    <SortIcon field="customer" />
                                </button>
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('value')} className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300">
                                    Värde
                                    <SortIcon field="value" />
                                </button>
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Tilldelad
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300">
                                    Skapad
                                    <SortIcon field="created_at" />
                                </button>
                            </th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                                    {searchQuery ? 'Inga ordrar matchar sökningen' : 'Inga ordrar att visa'}
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    onClick={() => onOrderClick(order)}
                                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                >
                                    {/* Order Title */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[200px]">
                                                    {order.title}
                                                </p>
                                                {order.description && (
                                                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                                                        {order.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            status={getStatusBadgeType(order.status)}
                                            customLabel={ORDER_STATUS_LABELS[order.status]}
                                            size="sm"
                                        />
                                    </td>

                                    {/* Customer */}
                                    <td className="px-4 py-3">
                                        {order.customer ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-3 h-3 text-zinc-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-zinc-900 dark:text-white truncate max-w-[150px]">
                                                        {order.customer.name}
                                                    </p>
                                                    {order.customer.city && (
                                                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {order.customer.city}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-zinc-400">-</span>
                                        )}
                                    </td>

                                    {/* Value */}
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                            {formatCurrency(order.value)}
                                        </span>
                                    </td>

                                    {/* Assigned */}
                                    <td className="px-4 py-3">
                                        {order.assigned_to ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-cyan-600" />
                                                </div>
                                                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">
                                                    {order.assigned_to.full_name}
                                                </span>
                                            </div>
                                        ) : order.assigned_team ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                    <Users className="w-3 h-3 text-purple-600" />
                                                </div>
                                                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">
                                                    {order.assigned_team.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-zinc-400">Ej tilldelad</span>
                                        )}
                                    </td>

                                    {/* Created Date */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(order.created_at)}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === order.id ? null : order.id);
                                                }}
                                                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>

                                            {openMenuId === order.id && (
                                                <>
                                                    {/* Backdrop to close menu */}
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                        }}
                                                    />

                                                    {/* Dropdown Menu */}
                                                    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 py-1">
                                                        {/* View Details */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onOrderClick(order);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Visa detaljer
                                                        </button>

                                                        {/* Status Change Section */}
                                                        <div className="border-t border-zinc-100 dark:border-zinc-700 my-1" />
                                                        <div className="px-3 py-1.5">
                                                            <p className="text-xs font-medium text-zinc-500 uppercase">Ändra status</p>
                                                        </div>

                                                        {ORDER_STATUS_OPTIONS.map((option) => (
                                                            <button
                                                                key={option.status}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (option.status !== order.status && onStatusChange) {
                                                                        onStatusChange(order.id, option.status);
                                                                    }
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 ${option.status === order.status
                                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                                    : 'text-zinc-700 dark:text-zinc-300'
                                                                    }`}
                                                            >
                                                                <div className={`w-2.5 h-2.5 rounded-full ${option.color}`} />
                                                                {option.label}
                                                                {option.status === order.status && (
                                                                    <CheckCircle className="w-4 h-4 text-blue-500 ml-auto" />
                                                                )}
                                                            </button>
                                                        ))}

                                                        {/* Delete Section */}
                                                        {onDelete && (
                                                            <>
                                                                <div className="border-t border-zinc-100 dark:border-zinc-700 my-1" />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDelete(order);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Ta bort order
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer with count */}
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-500">
                    Visar {filteredOrders.length} av {orders.length} ordrar
                </p>
            </div>
        </div>
    );
}

export default OrderTable;

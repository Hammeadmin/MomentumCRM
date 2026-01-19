import React, { memo } from 'react';
import {
    Users,
    Users2,
    DollarSign,
    User,
    Clock,
    Edit,
    FileText,
    Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/database';
import {
    JOB_TYPE_LABELS,
    getJobTypeColor,
} from '../../types/database';
import OrderStatusBadge from '../OrderStatusBadge';
import type { OrderWithRelations } from '../../lib/orders';
import type { LeadWithRelations } from '../../lib/leads';
import type { QuoteWithRelations } from '../../lib/quotes';

// ============================================================================
// Types - Discriminated Union for type-safe card rendering
// ============================================================================

interface BaseCardProps {
    onDragStart: (e: React.DragEvent) => void;
    onClick: () => void;
}

interface OrderCardProps extends BaseCardProps {
    type: 'order';
    data: OrderWithRelations;
    onEdit?: () => void;
    onDelete?: () => void;
}

interface LeadCardProps extends BaseCardProps {
    type: 'lead';
    data: LeadWithRelations;
    onCreateQuote?: () => void;
}

interface QuoteCardProps extends BaseCardProps {
    type: 'quote';
    data: QuoteWithRelations;
}

export type KanbanCardProps = OrderCardProps | LeadCardProps | QuoteCardProps;

// ============================================================================
// Sub-components for shared UI elements
// ============================================================================

interface CardFieldProps {
    icon: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

const CardField = memo(({ icon, children, className = 'text-gray-600' }: CardFieldProps) => (
    <div className={`flex items-center text-sm ${className}`}>
        <span className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0">{icon}</span>
        <span className="truncate">{children}</span>
    </div>
));
CardField.displayName = 'CardField';

// ============================================================================
// Individual Card Components
// ============================================================================

const LeadCard = memo(({ data, onDragStart, onClick, onCreateQuote }: Omit<LeadCardProps, 'type'>) => (
    <div
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        className="kanban-card bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-gray-300 group"
    >
        <div className="flex items-start justify-between mb-3">
            <h4 className="font-medium text-gray-900 truncate">{data.title}</h4>
        </div>

        {data.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-1 sm:line-clamp-2 break-words">{data.description}</p>
        )}

        <div className="space-y-2">
            {data.customer && (
                <CardField icon={<Users className="w-4 h-4" />}>
                    {data.customer.name}
                </CardField>
            )}

            {data.estimated_value && (
                <CardField icon={<DollarSign className="w-4 h-4" />}>
                    {formatCurrency(data.estimated_value)}
                </CardField>
            )}

            <CardField icon={<Clock className="w-4 h-4" />} className="text-gray-500 hidden sm:flex">
                {formatDate(data.created_at || '')}
            </CardField>

            {onCreateQuote && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCreateQuote();
                    }}
                    className="mt-3 w-full flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                    <FileText className="w-3 h-3 mr-1.5" />
                    Skapa Offert
                </button>
            )}
        </div>
    </div>
));
LeadCard.displayName = 'LeadCard';

const QuoteCard = memo(({ data, onDragStart, onClick }: Omit<QuoteCardProps, 'type'>) => (
    <div
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-yellow-300 group"
    >
        <div className="flex items-start justify-between mb-3">
            <h4 className="font-medium text-gray-900 truncate">{data.title}</h4>
        </div>

        {data.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-1 sm:line-clamp-2 break-words">{data.description}</p>
        )}

        <div className="space-y-2">
            {data.customer && (
                <CardField icon={<Users className="w-4 h-4" />}>
                    {data.customer.name}
                </CardField>
            )}

            {data.total_amount && (
                <CardField icon={<DollarSign className="w-4 h-4" />}>
                    {formatCurrency(data.total_amount)}
                </CardField>
            )}

            <CardField icon={<Clock className="w-4 h-4" />} className="text-gray-500 hidden sm:flex">
                {formatDate(data.created_at || '')}
            </CardField>
        </div>
    </div>
));
QuoteCard.displayName = 'QuoteCard';

const OrderCard = memo(({ data, onDragStart, onClick, onEdit, onDelete }: Omit<OrderCardProps, 'type'>) => (
    <div
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-300 group"
    >
        <div className="flex items-start justify-between mb-3">
            <h4 className="font-medium text-gray-900 truncate flex-1">{data.title}</h4>
            <OrderStatusBadge status={data.status} size="sm" />
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="ml-2 p-1 text-gray-400 hover:text-blue-600"
                        title="Redigera Order"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="ml-1 p-1 text-gray-400 hover:text-red-600"
                        title="Ta bort Order"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>

        {data.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-1 sm:line-clamp-2 break-words">{data.description}</p>
        )}

        <div className="space-y-2">
            {data.customer && (
                <CardField icon={<Users className="w-4 h-4" />}>
                    {data.customer.name}
                </CardField>
            )}

            {data.value && (
                <CardField icon={<DollarSign className="w-4 h-4" />}>
                    {formatCurrency(data.value)}
                </CardField>
            )}

            {data.job_type && (
                <div className="flex items-center text-sm text-gray-600">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getJobTypeColor(data.job_type)}`}>
                        {JOB_TYPE_LABELS[data.job_type]}
                    </span>
                </div>
            )}

            {data.assignment_type === 'individual' && data.assigned_to && (
                <CardField icon={<User className="w-4 h-4" />}>
                    {data.assigned_to.full_name}
                </CardField>
            )}

            {data.assignment_type === 'team' && data.assigned_team && (
                <CardField icon={<Users2 className="w-4 h-4" />}>
                    {data.assigned_team.name}
                </CardField>
            )}

            <CardField icon={<Clock className="w-4 h-4" />} className="text-gray-500 hidden sm:flex">
                {formatDate(data.created_at || '')}
            </CardField>
        </div>

        {/* Hover hint */}
        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Dra för att ändra status</span>
                <span>Klicka för detaljer</span>
            </div>
        </div>
    </div>
));
OrderCard.displayName = 'OrderCard';

// ============================================================================
// Main KanbanCard Component - Discriminated Union Router
// ============================================================================

/**
 * KanbanCard - A polymorphic card component for the Kanban board.
 *
 * Uses a discriminated union type to render the correct card variant
 * based on the `type` prop. Wrapped in React.memo for performance.
 *
 * @example
 * // Lead card
 * <KanbanCard
 *   type="lead"
 *   data={lead}
 *   onDragStart={handleDragStart}
 *   onClick={() => openLeadModal(lead)}
 *   onCreateQuote={() => createQuoteFromLead(lead)}
 * />
 *
 * // Order card
 * <KanbanCard
 *   type="order"
 *   data={order}
 *   onDragStart={handleDragStart}
 *   onClick={() => openOrderDetails(order)}
 *   onEdit={() => openEditModal(order)}
 * />
 */
const KanbanCard = memo((props: KanbanCardProps) => {
    switch (props.type) {
        case 'lead':
            return (
                <LeadCard
                    data={props.data}
                    onDragStart={props.onDragStart}
                    onClick={props.onClick}
                    onCreateQuote={props.onCreateQuote}
                />
            );
        case 'quote':
            return (
                <QuoteCard
                    data={props.data}
                    onDragStart={props.onDragStart}
                    onClick={props.onClick}
                />
            );
        case 'order':
            return (
                <OrderCard
                    data={props.data}
                    onDragStart={props.onDragStart}
                    onClick={props.onClick}
                    onEdit={props.onEdit}
                    onDelete={props.onDelete}
                />
            );
        default:
            // TypeScript exhaustiveness check
            const _exhaustive: never = props;
            return null;
    }
});
KanbanCard.displayName = 'KanbanCard';

export default KanbanCard;

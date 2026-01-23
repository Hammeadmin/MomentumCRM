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
    GripVertical,
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

const CardField = memo(({ icon, children, className = 'text-slate-600' }: CardFieldProps) => (
    <div className={`flex items-center text-sm gap-2 ${className}`}>
        <span className="w-4 h-4 text-slate-400 flex-shrink-0">{icon}</span>
        <span className="truncate font-medium">{children}</span>
    </div>
));
CardField.displayName = 'CardField';

// ============================================================================
// Shared Card Wrapper - Cleaner base styling
// ============================================================================

interface CardWrapperProps {
    children: React.ReactNode;
    onDragStart: (e: React.DragEvent) => void;
    onClick: () => void;
    accentColor: string; // Tailwind color class for left border
    hoverAccentColor: string;
}

const CardWrapper = memo(({ children, onDragStart, onClick, accentColor, hoverAccentColor }: CardWrapperProps) => (
    <div
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        className={`
            group relative
            bg-white rounded-lg
            border border-slate-200 
            shadow-sm hover:shadow-lg
            transition-all duration-200 ease-out
            cursor-pointer
            hover:border-slate-300
            overflow-hidden
        `}
    >
        {/* Left accent bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor} group-hover:${hoverAccentColor} transition-colors`} />

        {/* Drag handle indicator */}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-40 transition-opacity">
            <GripVertical className="w-4 h-4 text-slate-400" />
        </div>

        <div className="p-4 pl-5">
            {children}
        </div>
    </div>
));
CardWrapper.displayName = 'CardWrapper';

// ============================================================================
// Individual Card Components
// ============================================================================

const LeadCard = memo(({ data, onDragStart, onClick, onCreateQuote }: Omit<LeadCardProps, 'type'>) => (
    <CardWrapper
        onDragStart={onDragStart}
        onClick={onClick}
        accentColor="bg-emerald-500"
        hoverAccentColor="bg-emerald-600"
    >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{data.title}</h4>
        </div>

        {data.description && (
            <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{data.description}</p>
        )}

        <div className="space-y-1.5">
            {data.customer && (
                <CardField icon={<Users className="w-4 h-4" />}>
                    {data.customer.name}
                </CardField>
            )}

            {data.estimated_value && (
                <CardField icon={<DollarSign className="w-4 h-4" />} className="text-emerald-700 font-semibold">
                    {formatCurrency(data.estimated_value)}
                </CardField>
            )}

            <CardField icon={<Clock className="w-4 h-4" />} className="text-slate-400 text-xs">
                {formatDate(data.created_at || '')}
            </CardField>

            {onCreateQuote && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCreateQuote();
                    }}
                    className="mt-3 w-full flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm"
                >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Skapa Offert
                </button>
            )}
        </div>
    </CardWrapper>
));
LeadCard.displayName = 'LeadCard';

const QuoteCard = memo(({ data, onDragStart, onClick }: Omit<QuoteCardProps, 'type'>) => (
    <CardWrapper
        onDragStart={onDragStart}
        onClick={onClick}
        accentColor="bg-amber-500"
        hoverAccentColor="bg-amber-600"
    >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{data.title}</h4>
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded">
                Offert
            </span>
        </div>

        {data.description && (
            <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{data.description}</p>
        )}

        <div className="space-y-1.5">
            {data.customer && (
                <CardField icon={<Users className="w-4 h-4" />}>
                    {data.customer.name}
                </CardField>
            )}

            {data.total_amount && (
                <CardField icon={<DollarSign className="w-4 h-4" />} className="text-amber-700 font-semibold">
                    {formatCurrency(data.total_amount)}
                </CardField>
            )}

            <CardField icon={<Clock className="w-4 h-4" />} className="text-slate-400 text-xs">
                {formatDate(data.created_at || '')}
            </CardField>
        </div>
    </CardWrapper>
));
QuoteCard.displayName = 'QuoteCard';

const OrderCard = memo(({ data, onDragStart, onClick, onEdit, onDelete }: Omit<OrderCardProps, 'type'>) => (
    <CardWrapper
        onDragStart={onDragStart}
        onClick={onClick}
        accentColor="bg-blue-500"
        hoverAccentColor="bg-blue-600"
    >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 flex-1">{data.title}</h4>
            <div className="flex items-center gap-1 flex-shrink-0">
                <OrderStatusBadge status={data.status} size="sm" />
                {/* Action buttons - visible on hover */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Redigera Order"
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Ta bort Order"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>

        {data.description && (
            <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{data.description}</p>
        )}

        <div className="space-y-1.5">
            {data.customer && (
                <CardField icon={<Users className="w-4 h-4" />}>
                    {data.customer.name}
                </CardField>
            )}

            {data.value && (
                <CardField icon={<DollarSign className="w-4 h-4" />} className="text-blue-700 font-semibold">
                    {formatCurrency(data.value)}
                </CardField>
            )}

            {data.job_type && (
                <div className="flex items-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getJobTypeColor(data.job_type)}`}>
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

            <CardField icon={<Clock className="w-4 h-4" />} className="text-slate-400 text-xs">
                {formatDate(data.created_at || '')}
            </CardField>
        </div>
    </CardWrapper>
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
export { KanbanCard };

import React from 'react';
import { Plus, Upload, Download, Trash2, Check, MoreHorizontal } from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
}

interface QuickActionsProps {
    actions: QuickAction[];
    selectedCount?: number;
    className?: string;
}

const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100'
};

function QuickActions({ actions, selectedCount = 0, className = '' }: QuickActionsProps) {
    // Show "with selection" actions if items are selected
    const showSelectionActions = selectedCount > 0;

    if (actions.length === 0) return null;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {showSelectionActions && (
                <span className="text-sm text-gray-600 mr-2">
                    <Check className="w-4 h-4 inline mr-1" />
                    {selectedCount} vald{selectedCount !== 1 ? 'a' : ''}
                </span>
            )}

            {actions.slice(0, 3).map(action => {
                const Icon = action.icon;
                return (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[action.variant || 'secondary']
                            }`}
                    >
                        <Icon className="w-4 h-4 mr-2" />
                        {action.label}
                    </button>
                );
            })}

            {/* Overflow menu for additional actions */}
            {actions.length > 3 && (
                <div className="relative group">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        {actions.slice(3).map(action => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.id}
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <Icon className="w-4 h-4 mr-3" />
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Common quick actions factory
export const createCommonActions = {
    create: (label: string, onClick: () => void): QuickAction => ({
        id: 'create',
        label,
        icon: Plus,
        onClick,
        variant: 'primary'
    }),
    import: (onClick: () => void): QuickAction => ({
        id: 'import',
        label: 'Importera',
        icon: Upload,
        onClick,
        variant: 'secondary'
    }),
    export: (onClick: () => void): QuickAction => ({
        id: 'export',
        label: 'Exportera',
        icon: Download,
        onClick,
        variant: 'secondary'
    }),
    delete: (onClick: () => void, disabled?: boolean): QuickAction => ({
        id: 'delete',
        label: 'Radera',
        icon: Trash2,
        onClick,
        variant: 'danger',
        disabled
    })
};

export default QuickActions;

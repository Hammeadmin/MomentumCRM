import React, { useState } from 'react';
import { Filter, ChevronDown, X, Check } from 'lucide-react';

export interface FilterOption {
    value: string;
    label: string;
    count?: number;
}

export interface FilterGroup {
    id: string;
    label: string;
    options: FilterOption[];
    multiple?: boolean;
}

interface FilterBarProps {
    filters: FilterGroup[];
    activeFilters: Record<string, string[]>;
    onFilterChange: (filterId: string, values: string[]) => void;
    onClearAll: () => void;
    className?: string;
}

function FilterBar({
    filters,
    activeFilters,
    onFilterChange,
    onClearAll,
    className = ''
}: FilterBarProps) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const activeCount = Object.values(activeFilters).flat().length;

    const handleToggle = (filterId: string, value: string, multiple: boolean) => {
        const current = activeFilters[filterId] || [];
        let newValues: string[];

        if (multiple) {
            newValues = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
        } else {
            newValues = current.includes(value) ? [] : [value];
        }

        onFilterChange(filterId, newValues);
        if (!multiple) setOpenDropdown(null);
    };

    return (
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
            {/* Filter icon with count */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filter</span>
                {activeCount > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {activeCount}
                    </span>
                )}
            </div>

            {/* Filter dropdowns */}
            {filters.map(filter => {
                const activeValues = activeFilters[filter.id] || [];
                const isOpen = openDropdown === filter.id;

                return (
                    <div key={filter.id} className="relative">
                        <button
                            onClick={() => setOpenDropdown(isOpen ? null : filter.id)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${activeValues.length > 0
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {filter.label}
                            {activeValues.length > 0 && (
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                                    {activeValues.length}
                                </span>
                            )}
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenDropdown(null)}
                                />
                                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                                    {filter.options.map(option => {
                                        const isSelected = activeValues.includes(option.value);
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => handleToggle(filter.id, option.value, filter.multiple || false)}
                                                className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50"
                                            >
                                                <span className={isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}>
                                                    {option.label}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {option.count !== undefined && (
                                                        <span className="text-xs text-gray-400">{option.count}</span>
                                                    )}
                                                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}

            {/* Clear all */}
            {activeCount > 0 && (
                <button
                    onClick={onClearAll}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <X className="w-4 h-4" />
                    Rensa alla
                </button>
            )}
        </div>
    );
}

export default FilterBar;

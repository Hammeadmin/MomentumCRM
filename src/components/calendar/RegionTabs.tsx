/**
 * RegionTabs Component
 * 
 * AddHub-style tab bar for filtering calendar/schedule by region.
 * Clicking a tab filters resources and jobs to that specific area.
 */

import React from 'react';
import { MapPin } from 'lucide-react';

export interface Region {
    id: string;
    name: string;
    shortName?: string;
}

// Default regions for Swedish service companies
export const DEFAULT_REGIONS: Region[] = [
    { id: 'all', name: 'Alla', shortName: 'Alla' },
    { id: 'stockholm', name: 'Stockholm', shortName: 'Sthlm' },
    { id: 'uppsala', name: 'Uppsala', shortName: 'Upps' },
    { id: 'malardalen', name: 'Mälardalen', shortName: 'Mälar' },
    { id: 'goteborg', name: 'Göteborg', shortName: 'Gbg' },
    { id: 'skane', name: 'Skåne', shortName: 'Skåne' },
];

interface RegionTabsProps {
    regions?: Region[];
    selectedRegion: string;
    onRegionChange: (regionId: string) => void;
    className?: string;
    showIcon?: boolean;
    counts?: Record<string, number>; // Optional job counts per region
}

export function RegionTabs({
    regions = DEFAULT_REGIONS,
    selectedRegion,
    onRegionChange,
    className = '',
    showIcon = true,
    counts
}: RegionTabsProps) {
    return (
        <div className={`flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg ${className}`}>
            {showIcon && (
                <div className="px-2 text-zinc-400">
                    <MapPin className="w-4 h-4" />
                </div>
            )}

            {regions.map((region) => {
                const isSelected = selectedRegion === region.id;
                const count = counts?.[region.id];

                return (
                    <button
                        key={region.id}
                        onClick={() => onRegionChange(region.id)}
                        className={`
              relative px-3 py-1.5 text-sm font-medium rounded-md transition-all
              ${isSelected
                                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }
            `}
                    >
                        <span className="hidden sm:inline">{region.name}</span>
                        <span className="sm:hidden">{region.shortName || region.name}</span>

                        {count !== undefined && count > 0 && (
                            <span className={`
                ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                ${isSelected
                                    ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                                }
              `}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// Compact variant for smaller spaces
interface RegionDropdownProps {
    regions?: Region[];
    selectedRegion: string;
    onRegionChange: (regionId: string) => void;
    className?: string;
}

export function RegionDropdown({
    regions = DEFAULT_REGIONS,
    selectedRegion,
    onRegionChange,
    className = ''
}: RegionDropdownProps) {
    const selected = regions.find(r => r.id === selectedRegion) || regions[0];

    return (
        <div className={`relative ${className}`}>
            <select
                value={selectedRegion}
                onChange={(e) => onRegionChange(e.target.value)}
                className="appearance-none w-full pl-8 pr-8 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
                {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                        {region.name}
                    </option>
                ))}
            </select>
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    );
}

export default RegionTabs;

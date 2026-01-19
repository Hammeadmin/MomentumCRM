import React, { useState, useEffect } from 'react';
import { X, Command, Search } from 'lucide-react';

interface Shortcut {
    keys: string[];
    description: string;
    category: string;
}

const shortcuts: Shortcut[] = [
    // Global
    { keys: ['Ctrl', 'K'], description: 'Öppna global sökning', category: 'Global' },
    { keys: ['Ctrl', '/'], description: 'Visa/dölj tangentbordsgenvägar', category: 'Global' },
    { keys: ['Esc'], description: 'Stäng modal/meny', category: 'Global' },

    // Navigation
    { keys: ['G', 'H'], description: 'Gå till Dashboard', category: 'Navigation' },
    { keys: ['G', 'C'], description: 'Gå till Kunder', category: 'Navigation' },
    { keys: ['G', 'O'], description: 'Gå till Ordrar', category: 'Navigation' },
    { keys: ['G', 'Q'], description: 'Gå till Offerter', category: 'Navigation' },
    { keys: ['G', 'I'], description: 'Gå till Fakturor', category: 'Navigation' },
    { keys: ['G', 'K'], description: 'Gå till Kalender', category: 'Navigation' },

    // Actions
    { keys: ['N'], description: 'Skapa ny (i aktuellt sammanhang)', category: 'Åtgärder' },
    { keys: ['E'], description: 'Redigera vald post', category: 'Åtgärder' },
    { keys: ['D'], description: 'Radera vald post', category: 'Åtgärder' },
    { keys: ['S'], description: 'Spara ändringar', category: 'Åtgärder' },
];

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
    // Group shortcuts by category
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) acc[shortcut.category] = [];
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, Shortcut[]>);

    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden modal-animate-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Command className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Tangentbordsgenvägar</h3>
                            <p className="text-sm text-gray-500">Snabba kommandon för effektivare arbete</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                    <div className="grid gap-6">
                        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                            <div key={category}>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    {category}
                                </h4>
                                <div className="space-y-2">
                                    {categoryShortcuts.map((shortcut, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="text-sm text-gray-700">{shortcut.description}</span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, keyIndex) => (
                                                    <React.Fragment key={keyIndex}>
                                                        {keyIndex > 0 && <span className="text-gray-400 text-xs">+</span>}
                                                        <kbd className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded shadow-sm">
                                                            {key}
                                                        </kbd>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer tip */}
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2 text-sm text-gray-500">
                    <Search className="w-4 h-4" />
                    <span>Tryck <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border rounded">/</kbd> för att visa/dölja</span>
                </div>
            </div>
        </div>
    );
}

export default KeyboardShortcutsHelp;

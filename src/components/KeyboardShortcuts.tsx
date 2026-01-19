import React, { useEffect, useState, useMemo } from 'react';
import { Command, X, Search, ArrowUp } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const shortcuts: Shortcut[] = [
    // Navigation
    { keys: ['G', 'D'], description: 'Gå till Dashboard', category: 'Navigation' },
    { keys: ['G', 'L'], description: 'Gå till Leads', category: 'Navigation' },
    { keys: ['G', 'O'], description: 'Gå till Ordrar', category: 'Navigation' },
    { keys: ['G', 'K'], description: 'Gå till Kunder', category: 'Navigation' },
    { keys: ['G', 'Q'], description: 'Gå till Offerter', category: 'Navigation' },
    { keys: ['G', 'C'], description: 'Gå till Kalender', category: 'Navigation' },
    { keys: ['G', 'F'], description: 'Gå till Fakturor', category: 'Navigation' },
    { keys: ['G', 'T'], description: 'Gå till Team', category: 'Navigation' },
    { keys: ['G', 'A'], description: 'Gå till Analys', category: 'Navigation' },
    { keys: ['G', 'I'], description: 'Gå till Inställningar', category: 'Navigation' },

    // Actions
    { keys: ['N'], description: 'Skapa ny (beroende på sida)', category: 'Åtgärder' },
    { keys: ['E'], description: 'Redigera valt objekt', category: 'Åtgärder' },
    { keys: ['Ctrl', 'S'], description: 'Spara', category: 'Åtgärder' },
    { keys: ['Delete'], description: 'Ta bort valt objekt', category: 'Åtgärder' },
    { keys: ['Esc'], description: 'Stäng modal/dialog', category: 'Åtgärder' },
    { keys: ['Enter'], description: 'Bekräfta/Skicka', category: 'Åtgärder' },

    // Search
    { keys: ['Ctrl', 'K'], description: 'Öppna snabbsökning', category: 'Sök' },
    { keys: ['/'], description: 'Fokusera sökfält', category: 'Sök' },

    // Help
    { keys: ['?'], description: 'Visa denna hjälp', category: 'Hjälp' },
    { keys: ['Shift', '?'], description: 'Öppna användarguide', category: 'Hjälp' }
  ];

  // Filter shortcuts based on search
  const filteredShortcuts = useMemo(() => {
    if (searchQuery.trim() === '') return shortcuts;

    const query = searchQuery.toLowerCase();
    return shortcuts.filter(
      s =>
        s.description.toLowerCase().includes(query) ||
        s.keys.some(k => k.toLowerCase().includes(query)) ||
        s.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    return filteredShortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    }, {} as Record<string, Shortcut[]>);
  }, [filteredShortcuts]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl modal-animate-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Command className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Tangentbordsgenvägar
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Navigera snabbare med tangentbordet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Sök genvägar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-240px)] p-6 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && <span className="text-gray-400 text-xs mx-0.5">+</span>}
                          <kbd className="min-w-[28px] h-7 px-2 flex items-center justify-center bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm">
                            {key === 'Ctrl' ? '⌘/Ctrl' :
                              key === 'Shift' ? <ArrowUp className="w-3 h-3" /> :
                                key === 'Esc' ? 'Esc' : key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                Inga genvägar matchade "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tryck <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium">?</kbd> för att visa/dölja
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcuts;
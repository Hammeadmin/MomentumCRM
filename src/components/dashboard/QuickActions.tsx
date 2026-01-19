import React from 'react';
import { TrendingUp, FileText, Receipt, Calendar } from 'lucide-react';

const quickActions = [
    {
        name: 'Lägg till Lead',
        description: 'Skapa en ny försäljningsmöjlighet',
        icon: TrendingUp,
        color: 'from-blue-500 to-blue-600',
        href: '/leads',
        shortcut: 'G + L'
    },
    {
        name: 'Skapa Offert',
        description: 'Generera en ny offert för kund',
        icon: FileText,
        color: 'from-purple-500 to-purple-600',
        href: '/offerter',
        shortcut: 'G + O'
    },
    {
        name: 'Ny Faktura',
        description: 'Skapa och skicka en faktura',
        icon: Receipt,
        color: 'from-green-500 to-green-600',
        href: '/fakturor',
        shortcut: 'G + F'
    },
    {
        name: 'Boka Möte',
        description: 'Schemalägg ett möte eller uppgift',
        icon: Calendar,
        color: 'from-orange-500 to-orange-600',
        href: '/kalender',
        shortcut: 'G + C'
    }
];

export default function QuickActions() {
    return (
        <div className="premium-card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-primary">Snabbåtgärder</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-secondary mt-1">Vanliga uppgifter och genvägar</p>
            </div>

            <div className="p-4">
                <div className="grid grid-cols-1 gap-3">
                    {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.name}
                                onClick={() => window.location.href = action.href}
                                className="group w-full text-left bg-card-background-light dark:bg-card-background-dark border border-card-border-light dark:border-card-border-dark rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-800 dark:text-gray-200 font-secondary">{action.name}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-secondary">{action.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <kbd className="px-2 py-1 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/50 rounded border border-gray-300 dark:border-gray-600">
                                            {action.shortcut}
                                        </kbd>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

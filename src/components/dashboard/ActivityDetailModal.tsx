import React from 'react';
import {
    X,
    Clock,
    TrendingUp,
    FileText,
    Briefcase,
    Receipt,
    Activity
} from 'lucide-react';
import { ActivityDetailModalProps } from '../../types/dashboard';
import {
    getStatusLabel,
    getStatusColorClass,
    getActivityTypeLabel,
    getActivityGradient,
    getActivityRoute
} from '../../utils/statusMaps';

// Helper functions
const getActivityIcon = (type: string) => {
    switch (type) {
        case 'lead': return TrendingUp;
        case 'quote': return FileText;
        case 'job': return Briefcase;
        case 'invoice': return Receipt;
        default: return Activity;
    }
};

const getFullSwedishTime = (timeString: string) => {
    const date = new Date(timeString);
    return new Intl.DateTimeFormat('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Stockholm'
    }).format(date);
};

// Re-export for backwards compatibility
export { getActivityGradient as getActivityColor } from '../../utils/statusMaps';
export { getStatusLabel as getSwedishStatusLabel } from '../../utils/statusMaps';

export default function ActivityDetailModal({ activity, isOpen, onClose }: ActivityDetailModalProps) {
    if (!isOpen || !activity) return null;

    const Icon = getActivityIcon(activity.type);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card-background-light dark:bg-card-background-dark rounded-2xl max-w-2xl w-full shadow-2xl border border-card-border-light dark:border-card-border-dark animate-scale-in">
                {/* Header */}
                <div className={`bg-gradient-to-r ${getActivityGradient(activity.type)} p-6 rounded-t-2xl relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                                <Icon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white font-primary">{activity.title}</h2>
                                <p className="text-white/80 font-secondary">{getActivityTypeLabel(activity.type)}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-white hover:bg-white/20 transition-colors duration-200"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status and Time Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Status</label>
                                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColorClass(activity.status)}`}>
                                    {getStatusLabel(activity.status)}
                                </div>
                            </div>

                            {activity.user && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Ansvarig</label>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                                            {activity.user.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </div>
                                        <span className="text-gray-900 dark:text-white font-medium">{activity.user}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Tidpunkt</label>
                                <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-900 dark:text-white">{getFullSwedishTime(activity.time)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Aktivitets-ID</label>
                                <code className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {activity.id}
                                </code>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-3">Beskrivning</label>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{activity.subtitle}</p>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Relaterad information</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-blue-700 dark:text-blue-400">Prioritet:</span>
                                    <span className="text-blue-900 dark:text-blue-300 font-medium">Hög</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700 dark:text-blue-400">Kategori:</span>
                                    <span className="text-blue-900 dark:text-blue-300 font-medium">Försäljning</span>
                                </div>
                                {activity.type === 'job' && (
                                    <div className="flex justify-between">
                                        <span className="text-blue-700 dark:text-blue-400">Framsteg:</span>
                                        <span className="text-blue-900 dark:text-blue-300 font-medium">65%</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                            <h4 className="font-medium text-gray-900 dark:text-gray-300 mb-2">Snabbåtgärder</h4>
                            <div className="space-y-2">
                                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200">
                                    Visa fullständiga detaljer
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200">
                                    Redigera {getActivityTypeLabel(activity.type).toLowerCase()}
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200">
                                    Lägg till anteckning
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-b-2xl">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Senast uppdaterad: {getFullSwedishTime(activity.time)}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-card-border-light dark:border-card-border-dark rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-card-background-light dark:bg-card-background-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                            Stäng
                        </button>
                        <button
                            onClick={() => {
                                window.location.href = getActivityRoute(activity.type);
                            }}
                            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                        >
                            Visa i {getActivityTypeLabel(activity.type)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

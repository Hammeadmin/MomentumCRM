import { Briefcase } from 'lucide-react';
import { JobStatusItem } from '../../../types/dashboard';
import { getJobStatusColor, JOB_STATUS_LABELS } from '../../../types/database';

interface JobStatusWidgetProps {
    data: JobStatusItem[];
}

export default function JobStatusWidget({ data }: JobStatusWidgetProps) {
    const total = data.reduce((sum, item) => sum + item.antal, 0);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
                    Jobbstatus
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {total} totalt
                </span>
            </div>

            <div className="space-y-4">
                {data.map((item) => (
                    <div key={item.name} className="flex flex-col">
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {JOB_STATUS_LABELS[item.name as keyof typeof JOB_STATUS_LABELS] || item.name}
                            </span>
                            <span className="text-gray-900 dark:text-white font-bold">
                                {item.antal}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full ${getJobStatusColor(item.name as any)?.replace('text-', 'bg-').split(' ')[0] || 'bg-gray-500'}`}
                                style={{ width: `${(item.antal / total) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
                {data.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">Inga jobb att visa</p>
                )}
            </div>
        </div>
    );
}

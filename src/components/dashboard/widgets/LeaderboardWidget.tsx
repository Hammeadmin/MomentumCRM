import React, { useEffect, useState } from 'react';
import { Trophy, Medal, User } from 'lucide-react';
import { formatSEK } from '../../../utils/formatting';
import { getSalesLeaderboard, LeaderboardUser } from '../../../lib/dashboard-widgets';

export default function LeaderboardWidget() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const data = await getSalesLeaderboard();
            setLeaderboard(data);
            setLoading(false);
        }
        load();
    }, []);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy className="w-5 h-5 text-yellow-500" />;
            case 1: return <Medal className="w-5 h-5 text-gray-400" />;
            case 2: return <Medal className="w-5 h-5 text-amber-700" />;
            default: return <span className="w-5 h-5 flex items-center justify-center font-bold text-gray-400 text-sm">{index + 1}</span>;
        }
    };

    if (loading) {
        return <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center mb-6">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Topplista (Månad)
            </h3>

            <div className="space-y-4">
                {leaderboard.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Ingen försäljning denna månad</p>
                ) : (
                    leaderboard.map((user, index) => (
                        <div key={user.user_id} className="flex items-center justify-between group">
                            <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0 w-8 flex justify-center">
                                    {getRankIcon(index)}
                                </div>
                                <div className="relative">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-primary-500 transition-colors" />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-gray-500" />
                                        </div>
                                    )}
                                    {index === 0 && (
                                        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border-2 border-white dark:border-gray-800">
                                            <Trophy className="w-2 h-2 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Säljare</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                                    {formatSEK(user.total_sales)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

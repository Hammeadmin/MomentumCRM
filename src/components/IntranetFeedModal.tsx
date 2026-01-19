import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, Newspaper, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    getIntranetPosts,
    type IntranetPostWithRelations,
    type IntranetCategory,
    getCategoryIcon,
    formatRelativeTime
} from '../lib/intranet';

const POSTS_PER_PAGE = 15;

interface IntranetFeedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function IntranetFeedModal({ isOpen, onClose }: IntranetFeedModalProps) {
    const { organisationId } = useAuth();
    const [posts, setPosts] = useState<IntranetPostWithRelations[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('Alla');
    const [selectedPost, setSelectedPost] = useState<IntranetPostWithRelations | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');


    const fetchPosts = useCallback(async (currentCategory: string, currentPage: number) => {
        setLoading(true);
        setError(null);

        const options = {
            category: currentCategory === 'Alla' ? undefined : currentCategory as IntranetCategory,
            searchTerm: searchTerm || undefined,
        };

        const { data, error } = await getIntranetPosts(organisationId!, options, POSTS_PER_PAGE, currentPage);

        if (error) {
            console.error(error);
            setError('Kunde inte hämta inlägg.');
        } else if (data) {
            setPosts(prev => currentPage === 0 ? data : [...prev, ...data]);
            if (data.length < POSTS_PER_PAGE) {
                setHasMore(false);
            }
        }
        setLoading(false);
    }, [searchTerm]);


    useEffect(() => {
        if (isOpen) {
            setPosts([]);
            setPage(0);
            setHasMore(true);
            fetchPosts(activeCategory, 0);
        }
    }, [isOpen, activeCategory, searchTerm, fetchPosts]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(activeCategory, nextPage);
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
                {/* Header */}
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Företagsnyheter & Information</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                </header>

                <div className="flex flex-1 min-h-0">
                    {/* Left Pane: Filters & Post List */}
                    <aside className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Sök inlägg..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                                />
                            </div>
                        </div>

                        <div className="p-4">
                            <h3 className="text-sm font-semibold text-gray-500 mb-3">Kategorier</h3>
                        </div>

                        <nav className="flex-1 overflow-y-auto px-4 space-y-2">
                            {posts.map(post => (
                                <button
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedPost?.id === post.id
                                        ? 'bg-blue-100 dark:bg-blue-900/50'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{post.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Av {post.author?.full_name || 'Okänd'}
                                    </p>
                                </button>
                            ))}
                            {loading && <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto" /></div>}
                            {hasMore && !loading && (
                                <div className="text-center py-2">
                                    <button onClick={handleLoadMore} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                        Ladda fler...
                                    </button>
                                </div>
                            )}
                        </nav>
                    </aside>

                    {/* Right Pane: Post Detail View */}
                    <main className="w-2/3 overflow-y-auto p-8">
                        {selectedPost ? (
                            <article>
                                <div className="mb-4">

                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{selectedPost.title}</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    Publicerad av {selectedPost.author?.full_name || 'Okänd'} • {formatRelativeTime(selectedPost.created_at)}
                                </p>
                                {selectedPost.featured_image_url && (
                                    <img
                                        src={selectedPost.featured_image_url}
                                        alt={selectedPost.title}
                                        className="w-full h-64 object-cover rounded-lg mb-6"
                                    />
                                )}
                                <div
                                    className="prose dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                                />
                            </article>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                <Newspaper className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                                <h3 className="text-lg font-semibold">Välj ett inlägg</h3>
                                <p className="max-w-xs">Välj ett inlägg från listan till vänster för att läsa hela innehållet.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  MessageSquare,
  GraduationCap,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Pin,
  AlertTriangle,
  ArrowRight,
  User,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getIntranetPosts,
  getIntranetStats,
  recordPostView,
  togglePostLike,
  getCategoryColor,
  getCategoryIcon,
  formatRelativeTime,
  type IntranetPostWithRelations,
  type IntranetCategory
} from '../lib/intranet';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/database';
import { supabase } from '../lib/supabase';
import { getUserProfiles } from '../lib/database';
import { useToast } from '../hooks/useToast';
import IntranetPostView from './IntranetPostView';
import IntranetFeedModal from './IntranetFeedModal';

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_profiles: {
    full_name: string;
  } | null;
}


interface IntranetDashboardProps {
  className?: string;
}

function IntranetDashboard({ className = '' }: IntranetDashboardProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<IntranetPostWithRelations[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [viewingPost, setViewingPost] = useState<IntranetPostWithRelations | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (data) setUserRole(data.role as UserRole);
      }
    };
    fetchUserRole();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Get user profile
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];

      if (!profile?.organisation_id) {
        setError('Ingen organisation hittades för användaren');
        return;
      }

      setUserProfile(profile);

      // Load recent posts and stats
      const [postsResult, statsResult] = await Promise.all([
        getIntranetPosts(profile.organisation_id, {}, 5), // Get 5 most recent posts
        getIntranetStats(profile.organisation_id)
      ]);

      if (postsResult.error) {
        setError(postsResult.error.message);
        return;
      }

      if (statsResult.error) {
        setError(statsResult.error.message);
        return;
      }

      setPosts(postsResult.data || []);
      setStats(statsResult.data);
    } catch (err) {
      console.error('Error loading intranet data:', err);
      setError('Ett oväntat fel inträffade vid laddning av intranätdata.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostView = async (post: IntranetPostWithRelations) => {
    if (!user) return;

    // Set the post to be viewed, which opens the modal
    setViewingPost(post);

    try {
      // Record the view in the background if it hasn't been viewed before
      if (!post.user_has_viewed) {
        await recordPostView(post.id, user.id);
        // Update local state to reflect the new view count
        setPosts(prev => prev.map(p =>
          p.id === post.id
            ? { ...p, view_count: p.view_count + 1, user_has_viewed: true }
            : p
        ));
      }
    } catch (err) {
      console.error('Error recording post view:', err);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) return;

    try {
      const result = await togglePostLike(postId, user.id);
      if (result.error) {
        showError('Kunde inte uppdatera gillning');
        return;
      }

      // Update local state
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
            ...post,
            like_count: result.data!.liked ? post.like_count + 1 : post.like_count - 1,
            user_has_liked: result.data!.liked
          }
          : post
      ));
    } catch (err) {
      console.error('Error toggling like:', err);
      showError('Ett fel inträffade vid gillning');
    }
  };

  const getCategoryStats = () => {
    if (!stats) return [];

    return Object.entries(stats.categoryBreakdown).map(([category, count]) => ({
      category: category as IntranetCategory,
      count,
      icon: getCategoryIcon(category as IntranetCategory),
      color: getCategoryColor(category as IntranetCategory)
    }));
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Newspaper className="w-6 h-6 mr-3 text-blue-600" />
            Intranät
          </h2>
        </div>
        <div className="flex justify-center items-center h-32">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Laddar inlägg...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Newspaper className="w-6 h-6 mr-3 text-blue-600" />
            Intranät
          </h2>
          <Link
            to="/intranat"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            Visa alla inlägg
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.totalPosts}</div>
              <p className="text-xs text-blue-700">Inlägg</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{stats.totalViews}</div>
              <p className="text-xs text-green-700">Visningar</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{stats.totalLikes}</div>
              <p className="text-xs text-purple-700">Gillningar</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{stats.totalComments}</div>
              <p className="text-xs text-orange-700">Kommentarer</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="p-6">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Newspaper className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Inga inlägg ännu</p>
            <p className="text-sm mt-1">Nya inlägg kommer att visas här</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => handlePostView(post)}
              >
                <div className="flex items-start space-x-4">
                  {/* Featured Image */}
                  {post.featured_image_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(post.category)}`}>
                          {getCategoryIcon(post.category)} {post.category}
                        </span>
                        {post.is_pinned && (
                          <Pin className="w-4 h-4 text-yellow-600" title="Fastnålat inlägg" />
                        )}
                        {post.is_urgent && (
                          <AlertTriangle className="w-4 h-4 text-red-600" title="Brådskande" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatRelativeTime(post.created_at)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    {post.excerpt && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {post.author?.full_name}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {post.view_count}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLike(post.id);
                          }}
                          className={`flex items-center hover:text-red-600 transition-colors ${post.user_has_liked ? 'text-red-600' : ''
                            }`}
                        >
                          <Heart className={`w-3 h-3 mr-1 ${post.user_has_liked ? 'fill-current' : ''}`} />
                          {post.like_count}
                        </button>
                        <div className="flex items-center">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          {post.comment_count}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* View All Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              {userRole === 'admin' ? (
                <Link
                  to="/intranat"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Newspaper className="w-4 h-4 mr-2" />
                  Hantera alla inlägg
                </Link>
              ) : (
                <button
                  onClick={() => setIsFeedModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Newspaper className="w-4 h-4 mr-2" />
                  Visa alla inlägg
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {viewingPost && (
        <IntranetPostView
          isOpen={!!viewingPost}
          onClose={() => setViewingPost(null)}
          post={viewingPost}
          currentUser={userProfile}
          onPostUpdated={loadData}
        />
      )}
      <IntranetFeedModal
        isOpen={isFeedModalOpen}
        onClose={() => setIsFeedModalOpen(false)}
      />
    </div>
  );
}

export default IntranetDashboard;
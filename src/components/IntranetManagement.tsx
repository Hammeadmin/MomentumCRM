import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  Pin,
  AlertTriangle,
  Calendar,
  User,
  RefreshCw,
  Send,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Globe
} from 'lucide-react';
import {
  getIntranetPosts,
  getIntranetPostsForAdmin,
  createIntranetPost,
  updateIntranetPost,
  deleteIntranetPost,
  publishPost,
  recordPostView,
  togglePostLike,
  getCategoryColor,
  getCategoryIcon,
  formatRelativeTime,
  canUserCreatePost,
  canUserEditPost,
  canUserDeletePost,
  validatePostContent,
  type IntranetPostWithRelations,
  type IntranetPost,
  type IntranetCategory,
  type IntranetFilters
} from '../lib/intranet';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import { useToast } from '../hooks/useToast';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import IntranetPostView from './IntranetPostView';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { Button } from './ui';

function IntranetManagement() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<IntranetPostWithRelations[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [filters, setFilters] = useState<IntranetFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<IntranetPostWithRelations | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPostView, setShowPostView] = useState<IntranetPostWithRelations | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const POSTS_PER_PAGE = 10;
  const categories: IntranetCategory[] = ['Nyheter', 'Meddelanden', 'Utbildning', 'Evenemang'];

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filters, searchTerm, currentPage]);

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

      // Load posts and users
      const [postsResult, usersResult] = await Promise.all([
        profile.role === 'admin'
          ? getIntranetPostsForAdmin(profile.organisation_id, { ...filters, search: searchTerm, includeUnpublished: true })
          : getIntranetPosts(profile.organisation_id, { ...filters, search: searchTerm }),
        getUserProfiles(profile.organisation_id)
      ]);

      if (postsResult.error) {
        setError(postsResult.error.message);
        return;
      }

      if (usersResult.error) {
        setError(usersResult.error.message);
        return;
      }

      const allPosts = postsResult.data || [];
      setTotalPages(Math.ceil(allPosts.length / POSTS_PER_PAGE));

      // Paginate posts
      const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
      const paginatedPosts = allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

      setPosts(paginatedPosts);
      setUsers(usersResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = () => {
    if (!canUserCreatePost(userProfile?.role)) {
      showError('Du har inte behörighet att skapa inlägg');
      return;
    }
    setShowCreateModal(true);
  };

  const handleEditPost = (post: IntranetPostWithRelations) => {
    if (!canUserEditPost(post, user!.id, userProfile?.role)) {
      showError('Du har inte behörighet att redigera detta inlägg');
      return;
    }
    setShowEditModal(post);
  };

  const handleDeletePost = async (postId: string) => {
    if (!canUserDeletePost(userProfile?.role)) {
      showError('Du har inte behörighet att ta bort inlägg');
      return;
    }

    try {
      const result = await deleteIntranetPost(postId);
      if (result.error) {
        showError('Kunde inte ta bort inlägg', result.error.message);
        return;
      }

      success('Inlägg borttaget!');
      setShowDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting post:', err);
      showError('Ett fel inträffade vid borttagning');
    }
  };

  const handlePublishPost = async (postId: string) => {
    try {
      const result = await publishPost(postId);
      if (result.error) {
        showError('Kunde inte publicera inlägg', result.error.message);
        return;
      }

      success('Inlägg publicerat!');
      await loadData();
    } catch (err) {
      console.error('Error publishing post:', err);
      showError('Ett fel inträffade vid publicering');
    }
  };

  const handlePostClick = async (post: IntranetPostWithRelations) => {
    setShowPostView(post);

    // Record view if not already viewed
    if (!post.user_has_viewed && user) {
      await recordPostView(post.id, user.id);
    }
  };

  const handleFilterChange = (key: keyof IntranetFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Intranät</h1>
              <p className="text-purple-100">Företagets anslagstavla</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Laddar inlägg...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-8 text-center animate-fade-in rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-100 dark:from-gray-800 dark:to-blue-900/50 opacity-50"></div>
        <div className="relative z-10">
          <div className="inline-block bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md mb-4">
            <Newspaper className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-primary">
            Företagets Anslagstavla
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Håll dig uppdaterad med de senaste nyheterna, meddelandena och händelserna.
          </p>
          <div className="mt-6 flex items-center justify-center space-x-3">
            {canUserCreatePost(userProfile?.role) && (
              <button
                onClick={handleCreatePost}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Skapa Nytt Inlägg
              </button>
            )}
            <button
              onClick={loadData}
              className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Uppdatera
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => handleFilterChange('category', 'all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center space-x-2 ${!filters.category ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
          >
            <Globe className="w-4 h-4" />
            <span>Alla</span>
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => handleFilterChange('category', category)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center space-x-2 ${filters.category === category ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <span>{getCategoryIcon(category)}</span>
              <span>{category}</span>
            </button>
          ))}
        </div>

        {/* Search and other filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Sök efter titel, innehåll eller författare..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filters.author || 'all'}
            onChange={(e) => handleFilterChange('author', e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Alla författare</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.full_name}</option>
            ))}
          </select>
          {getActiveFiltersCount() > 0 && (
            <button
              onClick={clearFilters}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Rensa filter ({getActiveFiltersCount()})
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Inlägg</h3>
            <span className="text-sm text-gray-500">
              Sida {currentPage} av {totalPages}
            </span>
          </div>
        </div>

        {posts.length === 0 ? (
          <EmptyState
            type="general"
            title="Inga inlägg hittades"
            description={
              getActiveFiltersCount() > 0
                ? "Inga inlägg matchar dina filter. Prova att ändra filtren."
                : "Inga inlägg har skapats ännu. Skapa ditt första inlägg för att komma igång."
            }
            actionText={getActiveFiltersCount() > 0 ? "Rensa filter" : canUserCreatePost(userProfile?.role) ? "Skapa inlägg" : undefined}
            onAction={getActiveFiltersCount() > 0 ? clearFilters : canUserCreatePost(userProfile?.role) ? handleCreatePost : undefined}
          />
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                  onClick={() => handlePostClick(post)}
                >
                  {/* Featured Image */}
                  {post.featured_image_url && (
                    <div className="aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getCategoryColor(post.category)}`}>
                        {getCategoryIcon(post.category)} {post.category}
                      </span>
                      {post.is_pinned && <Pin className="w-4 h-4 text-yellow-500" title="Fastnålat" />}
                      {post.is_urgent && <AlertTriangle className="w-4 h-4 text-red-500" title="Brådskande" />}
                      {!post.is_published && userProfile?.role === 'admin' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-100 text-gray-800 border-gray-200">
                          <Clock className="w-3 h-3 mr-1.5" /> Utkast
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{post.author?.full_name}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(post.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center"><Eye className="w-4 h-4 mr-1" /> {post.view_count}</span>
                        <span className="flex items-center"><Heart className="w-4 h-4 mr-1" /> {post.like_count}</span>
                        <span className="flex items-center"><MessageCircle className="w-4 h-4 mr-1" /> {post.comment_count}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin actions floating on hover */}
                  {userProfile?.role === 'admin' && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={(e) => e.stopPropagation()}>
                      {!post.is_published && (
                        <button onClick={() => handlePublishPost(post.id)} className="p-2 rounded-full bg-green-500/80 text-white hover:bg-green-600" title="Publicera"><Globe className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => handleEditPost(post)} className="p-2 rounded-full bg-blue-500/80 text-white hover:bg-blue-600" title="Redigera"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setShowDeleteConfirm(post.id)} className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-600" title="Ta bort"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Föregående
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Nästa
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Post Modal */}
      {(showCreateModal || showEditModal) && (
        <IntranetPostEditor
          isOpen={true}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(null);
          }}
          post={showEditModal}
          organisationId={userProfile?.organisation_id}
          authorId={user!.id}
          onSaved={loadData}
        />
      )}

      {/* Post View Modal */}
      {showPostView && (
        <IntranetPostView
          isOpen={true}
          onClose={() => setShowPostView(null)}
          post={showPostView}
          currentUser={userProfile}
          onPostUpdated={loadData}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeletePost(showDeleteConfirm)}
        title="Ta bort inlägg"
        message="Är du säker på att du vill ta bort detta inlägg? Denna åtgärd kan inte ångras."
        confirmText="Ta bort"
        type="danger"
      />
    </div>
  );
}

// Post Editor Component
interface IntranetPostEditorProps {
  isOpen: boolean;
  onClose: () => void;
  post?: IntranetPostWithRelations | null;
  organisationId: string;
  authorId: string;
  onSaved: () => void;
}

function IntranetPostEditor({
  isOpen,
  onClose,
  post,
  organisationId,
  authorId,
  onSaved
}: IntranetPostEditorProps) {
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'Nyheter' as IntranetCategory,
    featured_image_url: '',
    is_pinned: false,
    is_urgent: false,
    is_published: false,
    scheduled_publish_at: ''
  });

  const categories: IntranetCategory[] = ['Nyheter', 'Meddelanden', 'Utbildning', 'Evenemang'];

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        category: post.category,
        featured_image_url: post.featured_image_url || '',
        is_pinned: post.is_pinned,
        is_urgent: post.is_urgent,
        is_published: post.is_published,
        scheduled_publish_at: post.scheduled_publish_at || ''
      });
    }
  }, [post]);

  const handleSave = async (publish = false) => {
    try {
      setSaving(true);

      const postData = {
        ...formData,
        organisation_id: organisationId,
        author_user_id: authorId,
        is_published: publish || formData.is_published
      };

      const validation = validatePostContent(postData);
      if (!validation.isValid) {
        showError('Valideringsfel', validation.errors.join(', '));
        return;
      }

      if (post) {
        // Update existing post
        const result = await updateIntranetPost(post.id, postData);
        if (result.error) {
          showError('Kunde inte uppdatera inlägg', result.error.message);
          return;
        }
      } else {
        // Create new post
        const result = await createIntranetPost(postData);
        if (result.error) {
          showError('Kunde inte skapa inlägg', result.error.message);
          return;
        }
      }

      success(publish ? 'Inlägg publicerat!' : 'Inlägg sparat!');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving post:', err);
      showError('Ett oväntat fel inträffade vid sparning');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Vänligen välj en bildfil');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Bilden är för stor. Maximal storlek är 5MB.');
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `intranet-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('intranet-images')
        .upload(fileName, file);

      if (error) {
        showError('Kunde inte ladda upp bild', error.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('intranet-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, featured_image_url: publicUrl }));
      success('Bild uppladdad!');
    } catch (err) {
      console.error('Error uploading image:', err);
      showError('Ett fel inträffade vid bilduppladdning');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {post ? 'Redigera inlägg' : 'Skapa nytt inlägg'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ange en beskrivande titel..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as IntranetCategory }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryIcon(category)} {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Innehåll *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Skriv ditt inlägg här..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.content.length} tecken
            </p>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sammanfattning (valfritt)
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Kort sammanfattning som visas i förhandsvisningen..."
            />
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utvald bild (valfritt)
            </label>
            <div className="space-y-3">
              {formData.featured_image_url && (
                <div className="relative">
                  <img
                    src={formData.featured_image_url}
                    alt="Utvald bild"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, featured_image_url: '' }))}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  {uploading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Laddar upp...
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Klicka för att ladda upp bild (max 5MB)
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Inställningar</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">Fäst inlägg överst</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_urgent}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_urgent: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">Markera som brådskande</span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Publicering</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">Publicera direkt</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schemalägg publicering (valfritt)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_publish_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_publish_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            * Obligatoriska fält
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Avbryt
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !formData.title || !formData.content}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              Spara utkast
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !formData.title || !formData.content}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sparar...
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publicera
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntranetManagement;
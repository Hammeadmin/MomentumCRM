import { supabase } from './supabase';
import type { UserProfile } from '../types/database';

export type IntranetCategory = 'Nyheter' | 'Meddelanden' | 'Utbildning' | 'Evenemang';

export interface IntranetPost {
  id: string;
  organisation_id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  author_user_id: string;
  featured_image_url?: string | null;
  category: IntranetCategory;
  is_pinned: boolean;
  is_published: boolean;
  is_urgent: boolean;
  scheduled_publish_at?: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface IntranetPostWithRelations extends IntranetPost {
  author?: UserProfile;
  comments?: IntranetComment[];
  user_has_liked?: boolean;
  user_has_viewed?: boolean;
}

export interface IntranetComment {
  id: string;
  post_id: string;
  author_user_id: string;
  content: string;
  parent_comment_id?: string | null;
  is_approved: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  author?: UserProfile;
  replies?: IntranetComment[];
}

export interface IntranetPostView {
  id: string;
  post_id: string;
  user_id: string;
  viewed_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface IntranetPostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at?: string | null;
}

export interface IntranetFilters {
  category?: IntranetCategory | 'all';
  search?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  pinned?: boolean;
  urgent?: boolean;
}

export interface IntranetStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  categoryBreakdown: Record<IntranetCategory, number>;
  topPosts: IntranetPostWithRelations[];
  recentActivity: any[];
}

// Database operations
export const getIntranetPosts = async (
  organisationId: string,
  filters: IntranetFilters = {},
  limit?: number,
  offset?: number
): Promise<{ data: IntranetPostWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('intranet_posts')
      .select(`
        *,
        author:user_profiles(id, full_name, email, avatar_url, role)
      `)
      .eq('organisation_id', organisationId)
      .eq('is_published', true);

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
    }

    if (filters.author && filters.author !== 'all') {
      query = query.eq('author_user_id', filters.author);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.pinned !== undefined) {
      query = query.eq('is_pinned', filters.pinned);
    }

    if (filters.urgent !== undefined) {
      query = query.eq('is_urgent', filters.urgent);
    }

    // Order by pinned first, then urgent, then by creation date
    query = query.order('is_pinned', { ascending: false })
                 .order('is_urgent', { ascending: false })
                 .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching intranet posts:', err);
    return { data: null, error: err as Error };
  }
};

export const getIntranetPost = async (
  id: string,
  userId?: string
): Promise<{ data: IntranetPostWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('intranet_posts')
      .select(`
        *,
        author:user_profiles(id, full_name, email, avatar_url, role)
      `)
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Check if user has liked and viewed this post
    if (userId) {
      const [likeResult, viewResult] = await Promise.all([
        supabase
          .from('intranet_post_likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('intranet_post_views')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      data.user_has_liked = !likeResult.error;
      data.user_has_viewed = !viewResult.error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching intranet post:', err);
    return { data: null, error: err as Error };
  }
};

export const createIntranetPost = async (
  post: Omit<IntranetPost, 'id' | 'view_count' | 'like_count' | 'comment_count' | 'created_at' | 'updated_at'>
): Promise<{ data: IntranetPost | null; error: Error | null }> => {
  try {

    if (post.scheduled_publish_at === '') {
      post.scheduled_publish_at = null;
    }
    // Generate excerpt if not provided
    const excerpt = post.excerpt || generateExcerpt(post.content);

    const { data, error } = await supabase
      .from('intranet_posts')
      .insert([{ ...post, excerpt }])
      .select(`
        *,
        author:user_profiles(id, full_name, email, avatar_url, role)
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Send notifications for published posts
    if (data.is_published) {
      await createPostNotifications(data);
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating intranet post:', err);
    return { data: null, error: err as Error };
  }
};

export const updateIntranetPost = async (
  id: string,
  updates: Partial<IntranetPost>
): Promise<{ data: IntranetPost | null; error: Error | null }> => {
  try {
    // Generate excerpt if content is updated
    if (updates.content && !updates.excerpt) {
      updates.excerpt = generateExcerpt(updates.content);
    }

    const { data, error } = await supabase
      .from('intranet_posts')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        author:user_profiles(id, full_name, email, avatar_url, role)
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating intranet post:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteIntranetPost = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('intranet_posts')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting intranet post:', err);
    return { error: err as Error };
  }
};

// Comments operations
export const getPostComments = async (
  postId: string
): Promise<{ data: IntranetComment[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('intranet_comments')
      .select(`
        *,
        author:user_profiles(id, full_name, email, avatar_url, role)
      `)
      .eq('post_id', postId)
      .eq('is_approved', true)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('intranet_comments')
          .select(`
            *,
            author:user_profiles(id, full_name, email, avatar_url, role)
          `)
          .eq('parent_comment_id', comment.id)
          .eq('is_approved', true)
          .order('created_at', { ascending: true });

        return { ...comment, replies: replies || [] };
      })
    );

    return { data: commentsWithReplies, error: null };
  } catch (err) {
    console.error('Error fetching post comments:', err);
    return { data: null, error: err as Error };
  }
};

export const createComment = async (
  comment: Omit<IntranetComment, 'id' | 'is_approved' | 'created_at' | 'updated_at'>
): Promise<{ data: IntranetComment | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('intranet_comments')
      .insert([comment])
      .select(`
        *,
        author:user_profiles(id, full_name, email, avatar_url, role)
      `)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating comment:', err);
    return { data: null, error: err as Error };
  }
};

// Engagement operations
export const recordPostView = async (
  postId: string,
  userId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('intranet_post_views')
      .upsert({
        post_id: postId,
        user_id: userId,
        ip_address: 'unknown', // Would be populated by edge function in real implementation
        user_agent: navigator.userAgent
      }, {
        onConflict: 'post_id,user_id'
      });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error recording post view:', err);
    return { error: err as Error };
  }
};

export const togglePostLike = async (
  postId: string,
  userId: string
): Promise<{ data: { liked: boolean } | null; error: Error | null }> => {
  try {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('intranet_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLike) {
      // Remove like
      const { error } = await supabase
        .from('intranet_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: { liked: false }, error: null };
    } else {
      // Add like
      const { error } = await supabase
        .from('intranet_post_likes')
        .insert({
          post_id: postId,
          user_id: userId
        });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: { liked: true }, error: null };
    }
  } catch (err) {
    console.error('Error toggling post like:', err);
    return { data: null, error: err as Error };
  }
};

// Analytics and statistics
export const getIntranetStats = async (
  organisationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ data: IntranetStats | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('intranet_posts')
      .select(`
        *,
        author:user_profiles(id, full_name, email, avatar_url)
      `)
      .eq('organisation_id', organisationId)
      .eq('is_published', true);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const posts = data || [];
    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, post) => sum + post.view_count, 0);
    const totalLikes = posts.reduce((sum, post) => sum + post.like_count, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comment_count, 0);

    const categoryBreakdown = posts.reduce((acc, post) => {
      acc[post.category] = (acc[post.category] || 0) + 1;
      return acc;
    }, {} as Record<IntranetCategory, number>);

    const topPosts = [...posts]
      .sort((a, b) => (b.view_count + b.like_count * 2) - (a.view_count + a.like_count * 2))
      .slice(0, 5);

    // Get recent activity (views, likes, comments)
    const recentActivity = await getRecentActivity(organisationId);

    return {
      data: {
        totalPosts,
        totalViews,
        totalLikes,
        totalComments,
        categoryBreakdown,
        topPosts,
        recentActivity: recentActivity.data || []
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching intranet stats:', err);
    return { data: null, error: err as Error };
  }
};

export const getRecentActivity = async (
  organisationId: string,
  limit = 10
): Promise<{ data: any[] | null; error: Error | null }> => {
  try {
    // Get recent views, likes, and comments
    const [viewsResult, likesResult, commentsResult] = await Promise.all([
      supabase
        .from('intranet_post_views')
        .select(`
          *,
          post:intranet_posts(title, organisation_id),
          user:user_profiles(full_name)
        `)
        .eq('post.organisation_id', organisationId)
        .order('viewed_at', { ascending: false })
        .limit(limit),
      
      supabase
        .from('intranet_post_likes')
        .select(`
          *,
          post:intranet_posts(title, organisation_id),
          user:user_profiles(full_name)
        `)
        .eq('post.organisation_id', organisationId)
        .order('created_at', { ascending: false })
        .limit(limit),
      
      supabase
        .from('intranet_comments')
        .select(`
          *,
          post:intranet_posts(title, organisation_id),
          author:user_profiles(full_name)
        `)
        .eq('post.organisation_id', organisationId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(limit)
    ]);

    // Combine and sort all activities
    const activities = [
      ...(viewsResult.data || []).map(view => ({
        type: 'view',
        user: view.user?.full_name,
        post: view.post?.title,
        timestamp: view.viewed_at
      })),
      ...(likesResult.data || []).map(like => ({
        type: 'like',
        user: like.user?.full_name,
        post: like.post?.title,
        timestamp: like.created_at
      })),
      ...(commentsResult.data || []).map(comment => ({
        type: 'comment',
        user: comment.author?.full_name,
        post: comment.post?.title,
        timestamp: comment.created_at
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, limit);

    return { data: activities, error: null };
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    return { data: null, error: err as Error };
  }
};

// Admin operations
export const getIntranetPostsForAdmin = async (
  organisationId: string,
  filters: IntranetFilters & { includeUnpublished?: boolean } = {}
): Promise<{ data: IntranetPostWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('intranet_posts')
      .select(`
        *,
        author:user_profiles(id, full_name, email, avatar_url, role)
      `)
      .eq('organisation_id', organisationId);

    // Include unpublished posts for admin view
    if (!filters.includeUnpublished) {
      query = query.eq('is_published', true);
    }

    // Apply other filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    const { data, error } = await query
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching admin posts:', err);
    return { data: null, error: err as Error };
  }
};

export const publishPost = async (postId: string): Promise<{ error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('intranet_posts')
      .update({ is_published: true })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      return { error: new Error(error.message) };
    }

    // Send notifications
    if (data) {
      await createPostNotifications(data);
    }

    return { error: null };
  } catch (err) {
    console.error('Error publishing post:', err);
    return { error: err as Error };
  }
};

// Utility functions
export const generateExcerpt = (content: string, maxLength = 150): string => {
  // Remove HTML tags and get plain text
  const plainText = content.replace(/<[^>]*>/g, '').trim();
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  return plainText.substring(0, maxLength).trim() + '...';
};

export const getCategoryColor = (category: IntranetCategory): string => {
  switch (category) {
    case 'Nyheter': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Meddelanden': return 'bg-green-100 text-green-800 border-green-200';
    case 'Utbildning': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Evenemang': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getCategoryIcon = (category: IntranetCategory): string => {
  switch (category) {
    case 'Nyheter': return '📰';
    case 'Meddelanden': return '📢';
    case 'Utbildning': return '🎓';
    case 'Evenemang': return '📅';
    default: return '📄';
  }
};

export const formatRelativeTime = (timestamp?: string): string => {
  if (!timestamp) return '';
  
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just nu';
  if (diffInMinutes < 60) return `${diffInMinutes}m sedan`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h sedan`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d sedan`;
  
  return time.toLocaleDateString('sv-SE', { 
    day: 'numeric', 
    month: 'short',
    year: time.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

export const canUserCreatePost = (userRole: string): boolean => {
  return userRole === 'admin';
};

export const canUserEditPost = (post: IntranetPost, userId: string, userRole: string): boolean => {
  return userRole === 'admin' || post.author_user_id === userId;
};

export const canUserDeletePost = (userRole: string): boolean => {
  return userRole === 'admin';
};

export const canUserModerateComments = (userRole: string): boolean => {
  return userRole === 'admin';
};

// Notification helper
const createPostNotifications = async (post: IntranetPost): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('intranet-post-notification', {
      body: { post },
    });

    if (error) {
      throw error;
    }
    console.log(`Successfully triggered notifications for post: ${post.title}`);
  } catch (err) {
    console.error('Error creating post notifications:', err);
  }
};

// Search and filtering utilities
export const searchPosts = (posts: IntranetPostWithRelations[], searchTerm: string): IntranetPostWithRelations[] => {
  if (!searchTerm.trim()) return posts;

  const term = searchTerm.toLowerCase();
  return posts.filter(post =>
    post.title.toLowerCase().includes(term) ||
    post.content.toLowerCase().includes(term) ||
    post.excerpt?.toLowerCase().includes(term) ||
    post.author?.full_name.toLowerCase().includes(term)
  );
};

export const filterPostsByCategory = (posts: IntranetPostWithRelations[], category: IntranetCategory | 'all'): IntranetPostWithRelations[] => {
  if (category === 'all') return posts;
  return posts.filter(post => post.category === category);
};

export const getPinnedPosts = (posts: IntranetPostWithRelations[]): IntranetPostWithRelations[] => {
  return posts.filter(post => post.is_pinned);
};

export const getUrgentPosts = (posts: IntranetPostWithRelations[]): IntranetPostWithRelations[] => {
  return posts.filter(post => post.is_urgent);
};

export const getPostsByAuthor = (posts: IntranetPostWithRelations[], authorId: string): IntranetPostWithRelations[] => {
  return posts.filter(post => post.author_user_id === authorId);
};

// Content validation
export const validatePostContent = (post: Partial<IntranetPost>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!post.title?.trim()) {
    errors.push('Titel är obligatorisk');
  }

  if (!post.content?.trim()) {
    errors.push('Innehåll är obligatoriskt');
  }

  if (!post.category) {
    errors.push('Kategori måste väljas');
  }

  if (post.title && post.title.length > 200) {
    errors.push('Titel får inte vara längre än 200 tecken');
  }

  if (post.content && post.content.length > 50000) {
    errors.push('Innehåll får inte vara längre än 50 000 tecken');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
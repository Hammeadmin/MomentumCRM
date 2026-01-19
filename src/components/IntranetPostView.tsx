import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  Eye,
  User,
  Calendar,
  Pin,
  AlertTriangle,
  Send,
  Reply,
  MoreHorizontal,
  Flag,
  Share2,
  Printer,
  Loader2
} from 'lucide-react';
import {
  getPostComments,
  createComment,
  togglePostLike,
  recordPostView,
  getCategoryColor,
  getCategoryIcon,
  formatRelativeTime,
  type IntranetPostWithRelations,
  type IntranetComment
} from '../lib/intranet';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { formatDateTime } from '../lib/database';

interface IntranetPostViewProps {
  isOpen: boolean;
  onClose: () => void;
  post: IntranetPostWithRelations;
  currentUser: any;
  onPostUpdated: () => void;
}

function IntranetPostView({
  isOpen,
  onClose,
  post,
  currentUser,
  onPostUpdated
}: IntranetPostViewProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [comments, setComments] = useState<IntranetComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [postState, setPostState] = useState(post);

  useEffect(() => {
    if (isOpen) {
      loadComments();
      // Record view
      if (user && !post.user_has_viewed) {
        recordPostView(post.id, user.id);
      }
    }
  }, [isOpen, post.id, user]);

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const result = await getPostComments(post.id);

      if (result.error) {
        showError('Kunde inte ladda kommentarer');
        return;
      }

      setComments(result.data || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user) return;

    try {
      const result = await togglePostLike(post.id, user.id);
      if (result.error) {
        showError('Kunde inte uppdatera gillning');
        return;
      }

      setPostState(prev => ({
        ...prev,
        like_count: result.data!.liked ? prev.like_count + 1 : prev.like_count - 1,
        user_has_liked: result.data!.liked
      }));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      setSubmittingComment(true);

      const result = await createComment({
        post_id: post.id,
        author_user_id: user.id,
        content: newComment.trim(),
        parent_comment_id: null
      });

      if (result.error) {
        showError('Kunde inte skapa kommentar', result.error.message);
        return;
      }

      success('Kommentar tillagd!');
      setNewComment('');
      await loadComments();

      // Update comment count
      setPostState(prev => ({
        ...prev,
        comment_count: prev.comment_count + 1
      }));
    } catch (err) {
      console.error('Error submitting comment:', err);
      showError('Ett fel inträffade vid kommentering');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user || !replyContent.trim()) return;

    try {
      setSubmittingComment(true);

      const result = await createComment({
        post_id: post.id,
        author_user_id: user.id,
        content: replyContent.trim(),
        parent_comment_id: parentCommentId
      });

      if (result.error) {
        showError('Kunde inte skapa svar', result.error.message);
        return;
      }

      success('Svar tillagt!');
      setReplyContent('');
      setReplyingTo(null);
      await loadComments();
    } catch (err) {
      console.error('Error submitting reply:', err);
      showError('Ett fel inträffade vid svar');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.title,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      success('Länk kopierad till urklipp!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(post.category)}`}>
              {getCategoryIcon(post.category)} {post.category}
            </span>
            {post.is_pinned && (
              <Pin className="w-5 h-5 text-yellow-600" title="Fastnålat inlägg" />
            )}
            {post.is_urgent && (
              <AlertTriangle className="w-5 h-5 text-red-600" title="Brådskande" />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="text-gray-400 hover:text-blue-600"
              title="Dela"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="text-gray-400 hover:text-gray-600"
              title="Skriv ut"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-6">
          {/* Featured Image */}
          {post.featured_image_url && (
            <div className="mb-6">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>

          {/* Meta Information */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                {post.author?.full_name}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDateTime(post.created_at)}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {postState.view_count}
                </div>
                <button
                  onClick={handleToggleLike}
                  className={`flex items-center hover:text-red-600 transition-colors ${postState.user_has_liked ? 'text-red-600' : ''
                    }`}
                >
                  <Heart className={`w-4 h-4 mr-1 ${postState.user_has_liked ? 'fill-current' : ''}`} />
                  {postState.like_count}
                </button>
                <div className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {postState.comment_count}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="prose max-w-none mb-8">
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Kommentarer ({postState.comment_count})
            </h3>

            {/* New Comment Form */}
            <div className="mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {currentUser?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Skriv en kommentar..."
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSubmitComment}
                      disabled={submittingComment || !newComment.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submittingComment ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Kommentera
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            {loadingComments ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <span className="text-gray-500 text-sm">Laddar kommentarer...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Inga kommentarer ännu</p>
                <p className="text-sm">Bli den första att kommentera!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {comment.author?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {comment.author?.full_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3 mt-2">
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-xs text-gray-500 hover:text-blue-600 flex items-center"
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          Svara
                        </button>
                      </div>

                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <div className="mt-3 ml-4">
                          <div className="flex items-start space-x-2">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-xs">
                                {currentUser?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Skriv ditt svar..."
                              />
                              <div className="flex justify-end space-x-2 mt-2">
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyContent('');
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Avbryt
                                </button>
                                <button
                                  onClick={() => handleSubmitReply(comment.id)}
                                  disabled={submittingComment || !replyContent.trim()}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                                >
                                  Svara
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-6 mt-3 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start space-x-2">
                              <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-xs">
                                  {reply.author?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-100 rounded-lg p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900 text-xs">
                                      {reply.author?.full_name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatRelativeTime(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 text-xs whitespace-pre-wrap">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntranetPostView;
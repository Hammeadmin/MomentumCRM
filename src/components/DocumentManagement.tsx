import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Calendar,
  User,
  BarChart3,
  FolderOpen,
  File,
  Image,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { Button } from './ui';
import {
  getDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentStats,
  formatFileSize,
  getFileIcon,
  getCategoryColor,
  getCategoryIcon,
  canUserEditDocument,
  canUserDeleteDocument,
  isPreviewableFile,
  getDocumentPreviewUrl,
  type Document,
  type DocumentWithRelations,
  type DocumentFilters,
  type DocumentCategory,
  type UserRole
} from '../lib/documents';
import { getUserProfiles } from '../lib/database';
import { formatDateTime } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';

function DocumentManagement() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentWithRelations[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<DocumentWithRelations | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<DocumentWithRelations | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState({
    category: 'Övrigt' as DocumentCategory,
    description: '',
    view_permissions: ['admin', 'sales', 'worker'] as UserRole[]
  });

  const categories: DocumentCategory[] = ['Policys', 'Mallar', 'Utbildning', 'Rutiner', 'Övrigt'];

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filters]);

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

      // Load documents, stats, and users
      const [documentsResult, statsResult, usersResult] = await Promise.all([
        getDocuments(profile.organisation_id, { ...filters, search: searchTerm }),
        getDocumentStats(profile.organisation_id),
        getUserProfiles(profile.organisation_id)
      ]);

      if (documentsResult.error) {
        setError(documentsResult.error.message);
        return;
      }

      if (statsResult.error) {
        setError(statsResult.error.message);
        return;
      }

      if (usersResult.error) {
        setError(usersResult.error.message);
        return;
      }

      setDocuments(documentsResult.data || []);
      setStats(statsResult.data);
      setUsers(usersResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!userProfile?.organisation_id || files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of Array.from(files)) {
      try {
        const result = await uploadDocument(file, {
          organisation_id: userProfile.organisation_id,
          filename: file.name,
          category: uploadData.category,
          description: uploadData.description,
          uploaded_by_user_id: user!.id,
          view_permissions: uploadData.view_permissions,
          is_active: true
        });

        if (result.error) {
          showError(`Kunde inte ladda upp ${file.name}`, result.error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        showError(`Fel vid uppladdning av ${file.name}`);
        errorCount++;
      }
    }

    setUploading(false);
    setShowUploadModal(false);

    if (successCount > 0) {
      success(`${successCount} fil(er) uppladdade framgångsrikt!`);
      await loadData();
    }

    // Reset upload data
    setUploadData({
      category: 'Övrigt',
      description: '',
      view_permissions: ['admin', 'sales', 'worker']
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files) {
      setShowUploadModal(true);
      // Auto-upload if single file
      if (e.dataTransfer.files.length === 1) {
        handleFileUpload(e.dataTransfer.files);
      }
    }
  };

  const handleDownload = async (document: DocumentWithRelations) => {
    try {
      const result = await downloadDocument(document.id, user!.id);
      if (result.error) {
        showError('Kunde inte ladda ner dokument', result.error.message);
        return;
      }

      // Open download URL
      window.open(result.data!.url, '_blank');

      // Reload to update download count
      await loadData();
    } catch (err) {
      showError('Ett fel inträffade vid nedladdning');
    }
  };

  const handlePreview = async (document: DocumentWithRelations) => {
    if (!isPreviewableFile(document.file_type)) {
      showError('Förhandsvisning stöds inte för denna filtyp');
      return;
    }

    setShowPreview(document);
  };

  const handleEdit = async (document: DocumentWithRelations, updates: Partial<Document>) => {
    try {
      const result = await updateDocument(document.id, updates);
      if (result.error) {
        showError('Kunde inte uppdatera dokument', result.error.message);
        return;
      }

      success('Dokument uppdaterat!');
      setShowEditModal(null);
      await loadData();
    } catch (err) {
      showError('Ett fel inträffade vid uppdatering');
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const result = await deleteDocument(documentId);
      if (result.error) {
        showError('Kunde inte ta bort dokument', result.error.message);
        return;
      }

      success('Dokument borttaget!');
      setShowDeleteConfirm(null);
      await loadData();
    } catch (err) {
      showError('Ett fel inträffade vid borttagning');
    }
  };

  const handleFilterChange = (key: keyof DocumentFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mr-4 shadow-lg shadow-cyan-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dokument</h1>
              <p className="text-sm text-gray-500">Laddar...</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Laddar dokument...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mr-4 shadow-lg shadow-cyan-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dokument</h1>
            <p className="text-sm text-gray-500">
              Hantera dokument, mallar och policys
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={loadData}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Uppdatera
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowUploadModal(true)}
            icon={<Upload className="w-4 h-4" />}
          >
            Ladda upp dokument
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt dokument</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt nedladdningar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDownloads}</p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Kategorier</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.categoryBreakdown).length}
                </p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Genomsnitt nedladdningar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalDocuments > 0 ? Math.round(stats.totalDownloads / stats.totalDocuments) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag and Drop Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
          }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-blue-600' : 'text-gray-400'}`} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Dra och släpp filer här
        </h3>
        <p className="text-gray-600 mb-4">
          eller klicka för att välja filer att ladda upp
        </p>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Välj filer
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Stödda format: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, TXT (max 10MB)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Sök dokument..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => handleFilterChange('category', 'all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${!filters.category || filters.category === 'all'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Alla
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleFilterChange('category', category)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${filters.category === category
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {getCategoryIcon(category)} {category}
                  </button>
                ))}
              </div>

              <select
                value={filters.uploadedBy || 'all'}
                onChange={(e) => handleFilterChange('uploadedBy', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla användare</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Rensa filter ({getActiveFiltersCount()})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Dokument</h3>
            <span className="text-sm text-gray-500">{documents.length} dokument</span>
          </div>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            type="general"
            title="Inga dokument hittades"
            description={
              getActiveFiltersCount() > 0
                ? "Inga dokument matchar dina filter. Prova att ändra filtren."
                : "Inga dokument har laddats upp ännu. Börja genom att ladda upp ditt första dokument."
            }
            actionText={getActiveFiltersCount() > 0 ? "Rensa filter" : "Ladda upp dokument"}
            onAction={getActiveFiltersCount() > 0 ? clearFilters : () => setShowUploadModal(true)}
          />
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((document) => (
                <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="text-2xl">
                        {getFileIcon(document.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate min-w-0">{document.filename}</h4>
                        <p className="text-sm text-gray-600">{formatFileSize(document.file_size)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(document.category)}`}>
                      {document.category}
                    </span>
                  </div>

                  {document.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{document.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {document.uploaded_by?.full_name}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDateTime(document.created_at)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <Download className="w-3 h-3 mr-1" />
                      {document.download_count} nedladdningar
                    </div>

                    <div className="flex items-center space-x-1">
                      {isPreviewableFile(document.file_type) && (
                        <button
                          onClick={() => handlePreview(document)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Förhandsgranska"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(document)}
                        className="text-gray-400 hover:text-green-600"
                        title="Ladda ner"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {canUserEditDocument(document, user!.id, userProfile?.role) && (
                        <button
                          onClick={() => setShowEditModal(document)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Redigera"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canUserDeleteDocument(userProfile?.role) && (
                        <button
                          onClick={() => setShowDeleteConfirm(document.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Ladda upp dokument</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value as DocumentCategory }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {getCategoryIcon(category)} {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivning
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beskriv dokumentet..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Synlighet för roller
                </label>
                <div className="space-y-2">
                  {[
                    { role: 'admin', label: 'Administratörer' },
                    { role: 'sales', label: 'Säljare' },
                    { role: 'worker', label: 'Medarbetare' }
                  ].map(({ role, label }) => (
                    <label key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={uploadData.view_permissions.includes(role as UserRole)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUploadData(prev => ({
                              ...prev,
                              view_permissions: [...prev.view_permissions, role as UserRole]
                            }));
                          } else {
                            setUploadData(prev => ({
                              ...prev,
                              view_permissions: prev.view_permissions.filter(r => r !== role)
                            }));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Välj filer
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Laddar upp...
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Välj och ladda upp
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Redigera dokument</h3>
              <button
                onClick={() => setShowEditModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <select
                  value={showEditModal.category}
                  onChange={(e) => setShowEditModal(prev => prev ? { ...prev, category: e.target.value as DocumentCategory } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {getCategoryIcon(category)} {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivning
                </label>
                <textarea
                  value={showEditModal.description || ''}
                  onChange={(e) => setShowEditModal(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beskriv dokumentet..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Synlighet för roller
                </label>
                <div className="space-y-2">
                  {[
                    { role: 'admin', label: 'Administratörer' },
                    { role: 'sales', label: 'Säljare' },
                    { role: 'worker', label: 'Medarbetare' }
                  ].map(({ role, label }) => (
                    <label key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showEditModal.view_permissions.includes(role as UserRole)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setShowEditModal(prev => prev ? {
                              ...prev,
                              view_permissions: [...prev.view_permissions, role as UserRole]
                            } : null);
                          } else {
                            setShowEditModal(prev => prev ? {
                              ...prev,
                              view_permissions: prev.view_permissions.filter(r => r !== role)
                            } : null);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowEditModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={() => handleEdit(showEditModal, {
                  category: showEditModal.category,
                  description: showEditModal.description,
                  view_permissions: showEditModal.view_permissions
                })}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Spara ändringar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <DocumentPreviewModal
          document={showPreview}
          onClose={() => setShowPreview(null)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        title="Ta bort dokument"
        message="Är du säker på att du vill ta bort detta dokument? Denna åtgärd kan inte ångras."
        confirmText="Ta bort"
        type="danger"
      />
    </div>
  );
}

// Document Preview Modal Component
function DocumentPreviewModal({
  document,
  onClose
}: {
  document: DocumentWithRelations;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreview();
  }, [document]);

  const loadPreview = async () => {
    try {
      const url = await getDocumentPreviewUrl(document.file_path);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Error loading preview:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{document.filename}</h3>
            <p className="text-sm text-gray-600">
              {getCategoryIcon(document.category)} {document.category} • {formatFileSize(document.file_size)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <span className="text-gray-600">Laddar förhandsvisning...</span>
            </div>
          ) : previewUrl ? (
            <div className="text-center">
              {document.file_type?.includes('image') ? (
                <img
                  src={previewUrl}
                  alt={document.filename}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              ) : document.file_type?.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-96 border border-gray-300 rounded-lg"
                  title={document.filename}
                />
              ) : (
                <div className="text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>Förhandsvisning inte tillgänglig för denna filtyp</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Kunde inte ladda förhandsvisning</p>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Stäng
          </button>
        </div>
      </div>
    </div >
  );
}

export default DocumentManagement;
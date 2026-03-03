import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Check,
  X,
  Tag,
  ShoppingCart,
  Save,
  AlertCircle,
  Loader2,
  Calculator,
} from 'lucide-react';
import {
  getSavedLineItems,
  createSavedLineItem,
  formatCurrency,
} from '../lib/database';
import type { RichSavedLineItem } from '../types/database';
import { ProductConfigurator } from './ProductConfigurator';

interface ProductLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProducts: (products: Array<{ name: string; description: string; unit_price: number; quantity: number; category?: string; unit?: string; is_library_item?: boolean }>) => void;
  organisationId: string;
  multiSelect?: boolean;
}

function ProductLibraryModal({
  isOpen,
  onClose,
  onSelectProducts,
  organisationId,
  multiSelect = true
}: ProductLibraryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<RichSavedLineItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [configuringItem, setConfiguringItem] = useState<RichSavedLineItem | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    unit_price: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await getSavedLineItems(organisationId);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setAllProducts(data || []);
    } catch (err) {
      console.error('Error loading product library:', err);
      setError('Ett oväntat fel inträffade vid laddning av artikelbiblioteket.');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach(p => {
      if (p.metadata?.category) cats.add(p.metadata.category);
    });
    return Array.from(cats).sort();
  }, [allProducts]);

  const products = useMemo(() => {
    let filtered = allProducts;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.metadata?.category === selectedCategory);
    }
    return filtered;
  }, [allProducts, searchTerm, selectedCategory]);

  const handleProductToggle = (product: RichSavedLineItem) => {
    const meta = product.metadata;
    const hasCustomFields = (meta?.custom_fields?.length ?? 0) > 0;
    const hasIncludedItems = (meta?.included_items?.length ?? 0) > 0;

    // If product has configurator fields, open configurator instead
    if (hasCustomFields || hasIncludedItems) {
      setConfiguringItem(product);
      return;
    }

    if (!multiSelect) {
      onSelectProducts([{
        name: product.name,
        description: product.description || product.name,
        unit_price: product.unit_price,
        quantity: 1,
        category: product.metadata?.category,
        unit: product.metadata?.unit,
        is_library_item: true,
      }]);
      onClose();
      return;
    }

    const newSelected = new Map(selectedProducts);
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id);
    } else {
      newSelected.set(product.id, 1);
    }
    setSelectedProducts(newSelected);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newSelected = new Map(selectedProducts);
    if (quantity > 0) {
      newSelected.set(productId, quantity);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleAddSelected = () => {
    const selectedProductsWithQuantity = products
      .filter(product => selectedProducts.has(product.id))
      .map(product => ({
        name: product.name,
        description: product.description || product.name,
        unit_price: product.unit_price,
        quantity: selectedProducts.get(product.id) || 1,
        category: product.metadata?.category,
        unit: product.metadata?.unit,
        is_library_item: true,
      }));

    onSelectProducts(selectedProductsWithQuantity);
    onClose();
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Map());
    } else {
      const newSelected = new Map();
      products.forEach(product => {
        newSelected.set(product.id, 1);
      });
      setSelectedProducts(newSelected);
    }
  };

  const handleCreateProduct = async () => {
    try {
      if (!newProduct.name || newProduct.unit_price <= 0) {
        setError('Namn och pris är obligatoriska fält.');
        return;
      }

      const { error: createError } = await createSavedLineItem(organisationId, {
        name: newProduct.name,
        description: newProduct.description,
        unit_price: newProduct.unit_price,
      });
      if (createError) {
        setError(createError.message);
        return;
      }

      setShowCreateForm(false);
      setNewProduct({ name: '', description: '', unit_price: 0 });
      await loadData();
    } catch (err) {
      console.error('Error creating product:', err);
      setError('Ett oväntat fel inträffade vid skapande av artikel.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Package className="w-6 h-6 text-primary-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Artikelbibliotek</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {multiSelect ? 'Välj artiklar att lägga till i offerten' : 'Välj en artikel'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Sök artiklar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            {categories.length > 0 && (
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm"
                >
                  <option value="all">Alla kategorier</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              {multiSelect && products.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {selectedProducts.size === products.length ? 'Avmarkera alla' : 'Markera alla'}
                </button>
              )}
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="inline-flex items-center px-3 py-2 border border-primary-300 dark:border-primary-700 rounded-lg text-sm font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ny artikel
              </button>
            </div>
          </div>

          {/* Quick Create Form */}
          {showCreateForm && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-primary-200 dark:border-primary-800">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Skapa ny artikel</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Artikelnamn"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Beskrivning"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Pris"
                    value={newProduct.unit_price || ''}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={handleCreateProduct}
                    className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Laddar artiklar...</span>
              </div>
            </div>
          ) : error && !showCreateForm ? (
            <div className="p-8 text-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">
                {searchTerm || selectedCategory !== 'all' ? 'Inga artiklar matchar filtren' : 'Inga artiklar i biblioteket'}
              </p>
              <p className="text-sm mt-1">
                {searchTerm || selectedCategory !== 'all' ? 'Prova att ändra sökterm eller filter' : 'Lägg till artiklar i Inställningar → Artikelbibliotek'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {products.map((product) => {
                const isSelected = selectedProducts.has(product.id);
                const quantity = selectedProducts.get(product.id) || 1;
                const hasConfig = (product.metadata?.custom_fields?.length ?? 0) > 0 || (product.metadata?.included_items?.length ?? 0) > 0;

                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-600'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    onClick={() => handleProductToggle(product)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {!hasConfig && (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300 dark:border-gray-500'
                              }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          )}
                          {hasConfig && (
                            <div className="w-5 h-5 rounded bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                              <Calculator className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                            </div>
                          )}
                          <h4 className="font-medium text-gray-900 dark:text-white">{product.name}</h4>
                          {product.metadata?.category && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300">
                              <Tag className="w-3 h-3 mr-1" />
                              {product.metadata.category}
                            </span>
                          )}
                        </div>

                        {product.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          {product.metadata?.unit && (
                            <span>Enhet: {product.metadata.unit}</span>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(product.unit_price)}
                          </span>
                          {hasConfig && (
                            <span className="text-xs text-primary-600 dark:text-primary-400">Klicka för att konfigurera</span>
                          )}
                        </div>
                      </div>

                      {multiSelect && isSelected && !hasConfig && (
                        <div className="ml-4 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Antal:</label>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(product.id, parseFloat(e.target.value) || 1)}
                            className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            min="0.1"
                            step="0.1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {multiSelect && selectedProducts.size > 0 && (
              <span>{selectedProducts.size} artiklar valda</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Avbryt
            </button>
            {multiSelect && (
              <button
                onClick={handleAddSelected}
                disabled={selectedProducts.size === 0}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Lägg till ({selectedProducts.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Configurator */}
      {configuringItem && (
        <ProductConfigurator
          item={configuringItem}
          isOpen={true}
          onClose={() => setConfiguringItem(null)}
          onConfirm={(resolvedItem) => {
            onSelectProducts([{
              name: resolvedItem.name || configuringItem.name,
              description: resolvedItem.description,
              unit_price: resolvedItem.unit_price,
              quantity: resolvedItem.quantity || 1,
              category: resolvedItem.category,
              is_library_item: true,
            }]);
            setConfiguringItem(null);
            onClose();
          }}
        />
      )}
    </div>
  );
}

export default ProductLibraryModal;
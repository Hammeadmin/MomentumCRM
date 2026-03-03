import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Tag,
  Loader2,
  Copy,
  Settings2,
  ListChecks,
  Calculator,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSavedLineItems,
  createSavedLineItem,
  updateSavedLineItem,
  deleteSavedLineItem,
  getUserProfiles,
  formatCurrency,
} from '../../lib/database';
import type {
  RichSavedLineItem,
  ProductMetadata,
  CustomField,
  IncludedItem,
} from '../../types/database';
import ConfirmDialog from '../ConfirmDialog';
import { evaluate } from 'mathjs';

// ============================================================================
// Helpers
// ============================================================================

const generateKey = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 30);
};

const safeEvaluate = (formula: string, scope: Record<string, number>): number => {
  if (!formula?.trim()) return 0;
  try {
    const result = evaluate(formula, scope);
    if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) return 0;
    return Math.max(0, Math.round(result * 100) / 100);
  } catch {
    return 0;
  }
};

const UNIT_OPTIONS = [
  { value: 'st', label: 'Styck (st)' },
  { value: 'kvm', label: 'Kvadratmeter (kvm)' },
  { value: 'tim', label: 'Timmar (tim)' },
  { value: 'lopm', label: 'Löpmeter (löpm)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'liter', label: 'Liter' },
  { value: 'meter', label: 'Meter' },
];

const ITEM_TYPE_OPTIONS = [
  { value: 'produkt', label: 'Produkt' },
  { value: 'tjänst', label: 'Tjänst' },
  { value: 'material', label: 'Material' },
  { value: 'arbete', label: 'Arbete' },
];

const VAT_OPTIONS = [
  { value: 0, label: '0% (momsfritt)' },
  { value: 6, label: '6% (kultur)' },
  { value: 12, label: '12% (livsmedel)' },
  { value: 25, label: '25% (standard)' },
];

// Shared input classes
const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

// ============================================================================
// Tab Components (inline for co-location, lazy-loaded via tab switch)
// ============================================================================

interface TabBaseProps {
  editingItem: Partial<RichSavedLineItem>;
  setEditingItem: React.Dispatch<React.SetStateAction<Partial<RichSavedLineItem> | null>>;
  editingMetadata: ProductMetadata;
  setEditingMetadata: React.Dispatch<React.SetStateAction<ProductMetadata>>;
}

function TabBase({ editingItem, setEditingItem, editingMetadata, setEditingMetadata }: TabBaseProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Namn <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={editingItem.name || ''}
          onChange={e => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
          className={inputClass}
          placeholder="T.ex. Fasadtvätt"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Beskrivning</label>
        <textarea
          value={editingItem.description || ''}
          onChange={e => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
          rows={3}
          className={inputClass}
          placeholder="Detaljerad beskrivning av artikeln..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Grundpris</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={editingItem.unit_price || 0}
            onChange={e => setEditingItem(prev => prev ? { ...prev, unit_price: parseFloat(e.target.value) || 0 } : null)}
            className={inputClass}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Används om inga tilläggsfält fylls i, eller om artikeln inte har tilläggsfält
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Enhet</label>
          <select
            value={editingMetadata.unit || 'st'}
            onChange={e => setEditingMetadata(prev => ({ ...prev, unit: e.target.value }))}
            className={inputClass}
          >
            {UNIT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kategori</label>
          <input
            type="text"
            value={editingMetadata.category || ''}
            onChange={e => setEditingMetadata(prev => ({ ...prev, category: e.target.value }))}
            className={inputClass}
            placeholder="T.ex. Fasad"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Artikeltyp</label>
          <select
            value={editingItem.item_type || 'produkt'}
            onChange={e => setEditingItem(prev => prev ? { ...prev, item_type: e.target.value } : null)}
            className={inputClass}
          >
            {ITEM_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Moms</label>
          <select
            value={editingMetadata.vat_rate ?? 25}
            onChange={e => setEditingMetadata(prev => ({ ...prev, vat_rate: parseInt(e.target.value) }))}
            className={inputClass}
          >
            {VAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function TabFields({ editingMetadata, setEditingMetadata }: Pick<TabBaseProps, 'editingMetadata' | 'setEditingMetadata'>) {
  const fields = editingMetadata.custom_fields || [];

  const updateField = useCallback((index: number, updates: Partial<CustomField>) => {
    setEditingMetadata(prev => {
      const newFields = [...(prev.custom_fields || [])];
      newFields[index] = { ...newFields[index], ...updates };
      // Auto-generate key from label
      if (updates.label !== undefined) {
        newFields[index].key = generateKey(updates.label);
      }
      return { ...prev, custom_fields: newFields };
    });
  }, [setEditingMetadata]);

  const addField = useCallback(() => {
    setEditingMetadata(prev => ({
      ...prev,
      custom_fields: [...(prev.custom_fields || []), { key: '', label: '', type: 'number', unit: '' }],
    }));
  }, [setEditingMetadata]);

  const removeField = useCallback((index: number) => {
    setEditingMetadata(prev => ({
      ...prev,
      custom_fields: (prev.custom_fields || []).filter((_, i) => i !== index),
    }));
  }, [setEditingMetadata]);

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Inga tilläggsfält definierade.</p>
          <p className="text-xs mt-1">Lägg till fält för att aktivera priskalkylatorn.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Etikett</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => updateField(index, { label: e.target.value })}
                    className={inputClass}
                    placeholder="T.ex. Antal m²"
                  />
                  {field.key && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">{field.key}</p>
                  )}
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Typ</label>
                  <select
                    value={field.type}
                    onChange={e => updateField(index, { type: e.target.value as CustomField['type'] })}
                    className={inputClass}
                  >
                    <option value="number">Nummer</option>
                    <option value="select">Välj alternativ</option>
                    <option value="checkbox">Kryssruta</option>
                  </select>
                </div>
                {field.type === 'number' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Enhet</label>
                    <input
                      type="text"
                      value={field.unit || ''}
                      onChange={e => updateField(index, { unit: e.target.value })}
                      className={inputClass}
                      placeholder="m²"
                    />
                  </div>
                )}
                {field.type === 'select' && (
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Alternativ (komma-separerade)</label>
                    <input
                      type="text"
                      value={(field.options || []).join(', ')}
                      onChange={e => updateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className={inputClass}
                      placeholder="Alt 1, Alt 2, Alt 3"
                    />
                  </div>
                )}
                <div className={`${field.type === 'checkbox' ? 'col-span-4' : field.type === 'number' ? 'col-span-2' : 'col-span-1'} flex items-end justify-end`}>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Ta bort fält"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addField}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Lägg till fält
      </button>
    </div>
  );
}

function TabFormula({ editingMetadata, setEditingMetadata }: Pick<TabBaseProps, 'editingMetadata' | 'setEditingMetadata'>) {
  const fields = editingMetadata.custom_fields || [];

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Calculator className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Lägg till tilläggsfält på fliken Tilläggsfält för att kunna skriva formler.</p>
      </div>
    );
  }

  // Preview with all variables = 1
  const previewScope: Record<string, number> = {};
  fields.forEach(f => { if (f.key) previewScope[f.key] = 1; });
  const previewPrice = safeEvaluate(editingMetadata.pricing_formula || '', previewScope) + (editingMetadata.base_price || 0);

  let formulaValid = true;
  if (editingMetadata.pricing_formula?.trim()) {
    try {
      evaluate(editingMetadata.pricing_formula, previewScope);
    } catch {
      formulaValid = false;
    }
  }

  const appendToFormula = (key: string) => {
    const current = editingMetadata.pricing_formula || '';
    const sep = current && !current.endsWith(' ') ? ' ' : '';
    setEditingMetadata(prev => ({ ...prev, pricing_formula: current + sep + key }));
  };

  return (
    <div className="space-y-4">
      {/* Variable chips */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Tillgängliga variabler (klicka för att infoga)</label>
        <div className="flex flex-wrap gap-1.5">
          {fields.filter(f => f.key).map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => appendToFormula(f.key)}
              className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-2 py-0.5 text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors font-mono"
            >
              {f.key}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Prisformel</label>
        <input
          type="text"
          value={editingMetadata.pricing_formula || ''}
          onChange={e => setEditingMetadata(prev => ({ ...prev, pricing_formula: e.target.value }))}
          className={inputClass}
          placeholder="t.ex. area_m2 * 45 + prep_work * 200"
        />
        {editingMetadata.pricing_formula && !formulaValid && (
          <p className="text-xs text-red-500 mt-1">⚠ Ogiltig formel</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fast grundtillägg</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={editingMetadata.base_price || 0}
          onChange={e => setEditingMetadata(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Läggs alltid till formelresultatet</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tidsformel (valfri)</label>
          <input
            type="text"
            value={editingMetadata.time_formula || ''}
            onChange={e => setEditingMetadata(prev => ({ ...prev, time_formula: e.target.value }))}
            className={inputClass}
            placeholder="t.ex. area_m2 * 0.4 + prep_work * 0.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tidsenhet</label>
          <input
            type="text"
            value={editingMetadata.time_unit || 'tim'}
            onChange={e => setEditingMetadata(prev => ({ ...prev, time_unit: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Exempelkalkyl (alla fält = 1): <span className={`font-bold ${formulaValid ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>{formulaValid ? `${previewPrice.toLocaleString('sv-SE')} kr` : 'Ogiltig formel'}</span>
        </p>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Tomma fält räknas som 0. Grundpriset används som reserv om formeln ger 0.
      </p>
    </div>
  );
}

function TabIncluded({ editingMetadata, setEditingMetadata }: Pick<TabBaseProps, 'editingMetadata' | 'setEditingMetadata'>) {
  const items = editingMetadata.included_items || [];
  const [newLabel, setNewLabel] = useState('');

  const updateItem = useCallback((index: number, updates: Partial<IncludedItem>) => {
    setEditingMetadata(prev => {
      const newItems = [...(prev.included_items || [])];
      newItems[index] = { ...newItems[index], ...updates };
      return { ...prev, included_items: newItems };
    });
  }, [setEditingMetadata]);

  const removeItem = useCallback((index: number) => {
    setEditingMetadata(prev => ({
      ...prev,
      included_items: (prev.included_items || []).filter((_, i) => i !== index),
    }));
  }, [setEditingMetadata]);

  const addItem = useCallback(() => {
    if (!newLabel.trim()) return;
    setEditingMetadata(prev => ({
      ...prev,
      included_items: [...(prev.included_items || []), { label: newLabel.trim(), default: true }],
    }));
    setNewLabel('');
  }, [newLabel, setEditingMetadata]);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Inga ingående delar.</p>
          <p className="text-xs mt-1">Lägg till punkter som visas som en checklista när säljaren lägger till denna artikel i en offert.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <input
                type="text"
                value={item.label}
                onChange={e => updateItem(index, { label: e.target.value })}
                className={`flex-1 ${inputClass}`}
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.default}
                  onChange={e => updateItem(index, { default: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                Standard
              </label>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())}
          className={`flex-1 ${inputClass}`}
          placeholder="Ny ingående del..."
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!newLabel.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Lägg till
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

type TabKey = 'base' | 'fields' | 'formula' | 'included';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'base', label: 'Bas', icon: Settings2 },
  { key: 'fields', label: 'Tilläggsfält', icon: ListChecks },
  { key: 'formula', label: 'Formel', icon: Calculator },
  { key: 'included', label: 'Ingår', icon: ClipboardList },
];

function ProductLibrarySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [products, setProducts] = useState<RichSavedLineItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit state
  const [editingItem, setEditingItem] = useState<Partial<RichSavedLineItem> | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<ProductMetadata>({});
  const [activeTab, setActiveTab] = useState<TabKey>('base');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];

      if (!profile?.organisation_id) {
        setError('Ingen organisation hittades för användaren');
        return;
      }

      setUserProfile(profile);

      const { data, error: fetchError } = await getSavedLineItems(profile.organisation_id);
      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setProducts(data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.metadata?.category && p.metadata.category.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  // Unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.metadata?.category) cats.add(p.metadata.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const handleCreateProduct = useCallback(() => {
    setEditingItem({ organisation_id: userProfile?.organisation_id, unit_price: 0 });
    setEditingMetadata({ vat_rate: 25 });
    setActiveTab('base');
    setShowProductModal(true);
  }, [userProfile]);

  const handleEditProduct = useCallback((product: RichSavedLineItem) => {
    setEditingItem({ ...product });
    setEditingMetadata(product.metadata ?? {});
    setActiveTab('base');
    setShowProductModal(true);
  }, []);

  const handleSaveProduct = useCallback(async () => {
    if (!editingItem?.name) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: editingItem.name,
        description: editingItem.description || '',
        unit_price: editingItem.unit_price || 0,
        item_type: editingItem.item_type || 'produkt',
        metadata: {
          ...editingMetadata,
          custom_fields: (editingMetadata.custom_fields || []).filter(f => f.key && f.label),
          included_items: (editingMetadata.included_items || []).filter(i => i.label),
        },
      };

      if (editingItem.id) {
        const { error: updateError } = await updateSavedLineItem(editingItem.id, payload);
        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        const { error: createError } = await createSavedLineItem(
          userProfile.organisation_id,
          payload
        );
        if (createError) {
          setError(createError.message);
          return;
        }
      }

      setSuccess('Artikel sparad framgångsrikt!');
      setShowProductModal(false);
      setEditingItem(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Ett oväntat fel inträffade vid sparning.');
    } finally {
      setSaving(false);
    }
  }, [editingItem, editingMetadata, userProfile]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    try {
      const { error: deleteError } = await deleteSavedLineItem(productId);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setSuccess('Artikel borttagen framgångsrikt!');
      setShowDeleteConfirm(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Ett oväntat fel inträffade vid borttagning.');
    }
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Artikelbibliotek</h2>
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mr-3" />
          <span className="text-gray-600 dark:text-gray-400">Laddar artiklar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="w-7 h-7 mr-3 text-primary-600" />
            Artikelbibliotek
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Hantera ditt bibliotek av produkter och tjänster för snabbare offertframställning
          </p>
        </div>
        <button
          onClick={handleCreateProduct}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ny artikel
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Sök artiklar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`pl-10 ${inputClass}`}
          />
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Artiklar</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{filteredProducts.length} artiklar</span>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {searchTerm ? 'Inga artiklar matchar sökningen' : 'Inga artiklar skapade ännu'}
            </p>
            <p className="text-sm mt-1">
              {searchTerm ? 'Prova att ändra sökterm' : 'Skapa din första artikel för att komma igång'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Artikel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Typ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pris</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">{product.description}</p>
                        )}
                        {(product.metadata?.custom_fields?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center text-xs text-primary-600 dark:text-primary-400 mt-0.5">
                            <Calculator className="w-3 h-3 mr-1" />
                            {product.metadata!.custom_fields!.length} fält
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.metadata?.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                          <Tag className="w-3 h-3 mr-1" />
                          {product.metadata.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300 capitalize">
                      {product.item_type || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(product.unit_price)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setEditingItem({
                              ...product,
                              id: undefined,
                              name: `${product.name} (kopia)`,
                            });
                            setEditingMetadata(product.metadata ?? {});
                            setActiveTab('base');
                            setShowProductModal(true);
                          }}
                          className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Duplicera"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          title="Redigera"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(product.id)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Product Edit Modal — 4-tab editor                                  */}
      {/* ================================================================== */}
      {showProductModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem.id ? 'Redigera artikel' : 'Ny artikel'}
              </h3>
              <button
                onClick={() => { setShowProductModal(false); setEditingItem(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive
                        ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'base' && (
                <TabBase editingItem={editingItem} setEditingItem={setEditingItem} editingMetadata={editingMetadata} setEditingMetadata={setEditingMetadata} />
              )}
              {activeTab === 'fields' && (
                <TabFields editingMetadata={editingMetadata} setEditingMetadata={setEditingMetadata} />
              )}
              {activeTab === 'formula' && (
                <TabFormula editingMetadata={editingMetadata} setEditingMetadata={setEditingMetadata} />
              )}
              {activeTab === 'included' && (
                <TabIncluded editingMetadata={editingMetadata} setEditingMetadata={setEditingMetadata} />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowProductModal(false); setEditingItem(null); }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={saving || !editingItem.name}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Spara artikel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeleteProduct(showDeleteConfirm)}
        title="Ta bort artikel"
        message="Är du säker på att du vill ta bort denna artikel? Denna åtgärd kan inte ångras."
        confirmText="Ta bort"
        type="danger"
      />
    </div>
  );
}

export default ProductLibrarySettings;
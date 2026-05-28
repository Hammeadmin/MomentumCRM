import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ClipboardList,
  Info,
  Zap,
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

const generateKey = (label: string): string =>
  label
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 30);

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

const isFormulaValid = (formula: string, scope: Record<string, number>): boolean => {
  if (!formula?.trim()) return true;
  try { evaluate(formula, scope); return true; } catch { return false; }
};

/** Auto-formula = sum of all field keys, e.g. "lutning + material" */
const computeAutoFormula = (fields: CustomField[]): string =>
  fields.filter(f => f.key).map(f => f.key).join(' + ');

/** Returns true if the current formula is auto-managed (empty or equals auto-formula) */
const checkIsFormulaAuto = (formula: string, fields: CustomField[]): boolean =>
  !formula || formula === computeAutoFormula(fields);

// Select option helpers
interface SelectOption { label: string; value: number; }

const getSelectOptions = (field: CustomField): SelectOption[] =>
  (field.options || []).map(opt => ({ label: opt, value: field.option_values?.[opt] ?? 0 }));

const selectOptionsToField = (opts: SelectOption[]): Pick<CustomField, 'options' | 'option_values'> => ({
  options: opts.map(o => o.label),
  option_values: Object.fromEntries(opts.map(o => [o.label, o.value])),
});

// ============================================================================
// Constants
// ============================================================================

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

const OPERATORS = ['+', '-', '*', '/', '(', ')'];

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const smallInputCls = 'w-full px-2 py-1.5 border border-gray-200 rounded bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400';

// ============================================================================
// Tab: Bas
// ============================================================================

interface TabBaseProps {
  editingItem: Partial<RichSavedLineItem>;
  setEditingItem: React.Dispatch<React.SetStateAction<Partial<RichSavedLineItem> | null>>;
  editingMetadata: ProductMetadata;
  setEditingMetadata: React.Dispatch<React.SetStateAction<ProductMetadata>>;
}

function TabBase({ editingItem, setEditingItem, editingMetadata, setEditingMetadata }: TabBaseProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Namn <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={editingItem.name || ''}
          onChange={e => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
          className={inputCls}
          placeholder="T.ex. Fasadtvätt"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Beskrivning</label>
        <textarea
          value={editingItem.description || ''}
          onChange={e => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
          rows={3}
          className={inputCls}
          placeholder="Detaljerad beskrivning av artikeln..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Grundpris (kr)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={editingItem.unit_price || 0}
            onChange={e => setEditingItem(prev => prev ? { ...prev, unit_price: parseFloat(e.target.value) || 0 } : null)}
            className={inputCls}
          />
          <p className="text-xs text-gray-500 mt-1">
            Baspriset per enhet. Eventuella tillägg läggs ovanpå detta.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Enhet</label>
          <select
            value={editingMetadata.unit || 'st'}
            onChange={e => setEditingMetadata(prev => ({ ...prev, unit: e.target.value }))}
            className={inputCls}
          >
            {UNIT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
          <input
            type="text"
            value={editingMetadata.category || ''}
            onChange={e => setEditingMetadata(prev => ({ ...prev, category: e.target.value }))}
            className={inputCls}
            placeholder="T.ex. Fasad"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Artikeltyp</label>
          <select
            value={editingItem.item_type || 'produkt'}
            onChange={e => setEditingItem(prev => prev ? { ...prev, item_type: e.target.value } : null)}
            className={inputCls}
          >
            {ITEM_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Moms</label>
          <select
            value={editingMetadata.vat_rate ?? 25}
            onChange={e => setEditingMetadata(prev => ({ ...prev, vat_rate: parseInt(e.target.value) }))}
            className={inputCls}
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

// ============================================================================
// Tab: Tilläggsfält
// ============================================================================

interface TabFieldsProps extends Pick<TabBaseProps, 'editingMetadata' | 'setEditingMetadata'> {
  unitPrice: number;
  unit: string;
}

function TabFields({ editingMetadata, setEditingMetadata, unitPrice, unit }: TabFieldsProps) {
  const fields = editingMetadata.custom_fields || [];
  const formula = editingMetadata.pricing_formula || '';
  const autoFormula = computeAutoFormula(fields);
  const isAuto = checkIsFormulaAuto(formula, fields);

  /** Updates both fields and formula (auto-managed unless user customized) */
  const applyFieldsUpdate = useCallback((updater: (prev: CustomField[]) => CustomField[]) => {
    setEditingMetadata(prev => {
      const oldFields = prev.custom_fields || [];
      const newFields = updater(oldFields);
      const oldAuto = computeAutoFormula(oldFields);
      const currFormula = prev.pricing_formula || '';
      const wasAuto = !currFormula || currFormula === oldAuto;
      return {
        ...prev,
        custom_fields: newFields,
        pricing_formula: wasAuto ? computeAutoFormula(newFields) : currFormula,
      };
    });
  }, [setEditingMetadata]);

  const updateField = useCallback((index: number, updates: Partial<CustomField>) => {
    applyFieldsUpdate(old => {
      const next = [...old];
      next[index] = { ...next[index], ...updates };
      if (updates.label !== undefined) next[index].key = generateKey(updates.label);
      return next;
    });
  }, [applyFieldsUpdate]);

  const addField = useCallback(() => {
    applyFieldsUpdate(old => [...old, { key: '', label: '', type: 'number', unit: '' }]);
  }, [applyFieldsUpdate]);

  const removeField = useCallback((index: number) => {
    applyFieldsUpdate(old => old.filter((_, i) => i !== index));
  }, [applyFieldsUpdate]);

  const updateSelectOptions = useCallback((index: number, opts: SelectOption[]) => {
    applyFieldsUpdate(old => {
      const next = [...old];
      next[index] = { ...next[index], ...selectOptionsToField(opts) };
      return next;
    });
  }, [applyFieldsUpdate]);

  return (
    <div className="space-y-4">
      {/* Guidance */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-medium">Tilläggsfält — prisval för säljaren</p>
          <p>Lägg till de val säljaren ska kunna göra när de lägger till artikeln i en offert. Priset räknas ut automatiskt.</p>
        </div>
      </div>

      {/* Base price context */}
      {unitPrice > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
          <span className="font-medium">Grundpris:</span>
          <span className="font-bold text-gray-900">{unitPrice.toLocaleString('sv-SE')} kr/{unit || 'enhet'}</span>
          <span className="text-gray-400">— tillägg nedan läggs ovanpå detta</span>
        </div>
      )}

      {fields.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <ListChecks className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Inga tilläggsfält definierade</p>
          <p className="text-xs mt-1 text-gray-400">
            Lägg till ett fält om artikelns pris beror på välj-alternativ, ett mätvärde, eller ett kryssval
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <FieldCard
              key={index}
              field={field}
              index={index}
              unitPrice={unitPrice}
              unit={unit}
              onUpdate={updateField}
              onRemove={removeField}
              onUpdateSelectOptions={updateSelectOptions}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addField}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Lägg till tilläggsfält
      </button>

      {/* Formula status */}
      {fields.length > 0 && autoFormula && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${isAuto ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
          <Zap className="w-3.5 h-3.5 flex-shrink-0" />
          {isAuto ? (
            <span>Prisformel <strong>hanteras automatiskt</strong>: <code className="bg-green-100 px-1 rounded font-mono">{autoFormula}</code></span>
          ) : (
            <span>Prisformel är <strong>anpassad</strong> — se fliken <em>Prisformel</em> för att ändra</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FieldCard — single field editor
// ============================================================================

interface FieldCardProps {
  field: CustomField;
  index: number;
  unitPrice: number;
  unit: string;
  onUpdate: (i: number, u: Partial<CustomField>) => void;
  onRemove: (i: number) => void;
  onUpdateSelectOptions: (i: number, opts: SelectOption[]) => void;
}

function FieldCard({ field, index, unitPrice, unit, onUpdate, onRemove, onUpdateSelectOptions }: FieldCardProps) {
  const selectOpts = getSelectOptions(field);

  const addOption = () => onUpdateSelectOptions(index, [...selectOpts, { label: '', value: 0 }]);
  const removeOption = (oi: number) => onUpdateSelectOptions(index, selectOpts.filter((_, i) => i !== oi));
  const updateOption = (oi: number, patch: Partial<SelectOption>) => {
    const next = selectOpts.map((o, i) => i === oi ? { ...o, ...patch } : o);
    onUpdateSelectOptions(index, next);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Field header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fältnamn (visas för säljaren)</label>
            <input
              type="text"
              value={field.label}
              onChange={e => onUpdate(index, { label: e.target.value })}
              className={inputCls}
              placeholder="T.ex. Lutning, Antal fönster, Svårtillgänglig yta..."
            />
          </div>
          {field.key && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Variabelnamn:</span>
              <code className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{field.key}</code>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Fälttyp</label>
          <select
            value={field.type}
            onChange={e => onUpdate(index, { type: e.target.value as CustomField['type'] })}
            className={inputCls}
          >
            <option value="select">Välj alternativ</option>
            <option value="number">Ange ett tal</option>
            <option value="checkbox">Ja/Nej (kryssruta)</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="mt-5 p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
          title="Ta bort fält"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Field-type specific settings */}
      <div className="px-4 py-3 space-y-3">

        {/* Select: option editor — the primary use case */}
        {field.type === 'select' && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 items-center text-xs font-medium text-gray-500 px-0.5 mb-1">
              <span>Alternativnamn</span>
              <span className="w-28 text-right">Pristillägg (kr)</span>
              <span className="w-28 text-right pr-5">Totalpris</span>
            </div>

            {selectOpts.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                Lägg till alternativ nedan.
              </p>
            )}

            <div className="space-y-1.5">
              {selectOpts.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={e => updateOption(oi, { label: e.target.value })}
                    className={`flex-1 ${smallInputCls}`}
                    placeholder="T.ex. Brant (> 30°)"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">+</span>
                  <input
                    type="number"
                    value={opt.value}
                    onChange={e => updateOption(oi, { value: parseFloat(e.target.value) || 0 })}
                    className={`w-20 ${smallInputCls} text-right`}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">kr</span>
                  {/* Live total price preview */}
                  {unitPrice > 0 ? (
                    <span className="w-28 text-right text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1 flex-shrink-0">
                      = {(unitPrice + opt.value).toLocaleString('sv-SE')} kr/{unit || 'enhet'}
                    </span>
                  ) : (
                    <span className="w-28" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeOption(oi)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOption}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Lägg till alternativ
            </button>
          </div>
        )}

        {/* Number: unit + explanation */}
        {field.type === 'number' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">Enhet</label>
              <input
                type="text"
                value={field.unit || ''}
                onChange={e => onUpdate(index, { unit: e.target.value })}
                className={`${inputCls} max-w-28`}
                placeholder="m², tim, kg…"
              />
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 rounded px-3 py-2">
              Säljaren matar in ett tal. Variabelnamnet <code className="bg-gray-200 px-1 rounded">{field.key || '...'}</code> används i prisformeln — t.ex. <code className="bg-gray-200 px-1 rounded">{field.key || 'antal'} * 50</code> för 50 kr per enhet.
            </p>
          </div>
        )}

        {/* Checkbox */}
        {field.type === 'checkbox' && (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-3 py-2 space-y-1">
            <p>Säljaren kryssar i eller lämnar tomt.</p>
            <p>I formeln: <code className="bg-gray-200 px-1 rounded">{field.key || 'variabel'} = 1</code> om ikryssad, <code className="bg-gray-200 px-1 rounded">= 0</code> om ej ikryssad.</p>
            <p>Exempel: <code className="bg-gray-200 px-1 rounded">{field.key || 'extra'} * 500</code> ger 500 kr om ikryssad, annars 0.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Tab: Formel (advanced / power users)
// ============================================================================

interface TabFormulaProps extends Pick<TabBaseProps, 'editingMetadata' | 'setEditingMetadata'> {
  unitPrice: number;
  unit: string;
}

function TabFormula({ editingMetadata, setEditingMetadata, unitPrice, unit }: TabFormulaProps) {
  const fields = editingMetadata.custom_fields || [];
  const formula = editingMetadata.pricing_formula || '';
  const autoFormula = computeAutoFormula(fields);
  const isAuto = checkIsFormulaAuto(formula, fields);

  const [testNumbers, setTestNumbers] = useState<Record<string, number>>({});
  const [testSelections, setTestSelections] = useState<Record<string, string>>({});
  const [testChecks, setTestChecks] = useState<Record<string, boolean>>({});

  const testScope = useMemo<Record<string, number>>(() => {
    const scope: Record<string, number> = {};
    fields.forEach(f => {
      if (!f.key) return;
      if (f.type === 'number') scope[f.key] = testNumbers[f.key] ?? 0;
      else if (f.type === 'select') {
        const sel = testSelections[f.key] ?? f.options?.[0] ?? '';
        scope[f.key] = f.option_values?.[sel] ?? 0;
      } else if (f.type === 'checkbox') scope[f.key] = testChecks[f.key] ? 1 : 0;
    });
    return scope;
  }, [fields, testNumbers, testSelections, testChecks]);

  const formulaOk = isFormulaValid(formula, testScope);
  const testResult = formulaOk ? safeEvaluate(formula, testScope) + unitPrice : 0;

  const appendToFormula = (token: string) => {
    const sep = formula && !formula.endsWith(' ') ? ' ' : '';
    setEditingMetadata(prev => ({ ...prev, pricing_formula: formula + sep + token }));
  };

  const resetToAuto = () => {
    setEditingMetadata(prev => ({ ...prev, pricing_formula: autoFormula }));
  };

  if (fields.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium text-gray-600 mb-1">Inga tilläggsfält ännu</p>
        <p className="text-xs">Gå till fliken <strong>Tilläggsfält</strong> och lägg till fält — sedan kan du anpassa formeln här.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status banner */}
      {isAuto ? (
        <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg p-3">
          <Zap className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-700">
            <p className="font-medium">Formeln hanteras automatiskt</p>
            <p>Aktuell formel: <code className="bg-green-100 px-1.5 py-0.5 rounded font-mono">{autoFormula || '(inga fält)'}</code>. Du kan anpassa den nedan om du behöver ett mer komplext uttryck.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700 flex-1">
            <p className="font-medium">Anpassad formel</p>
            <p>Du har skrivit en egen formel. Auto-formeln hade varit: <code className="bg-amber-100 px-1 rounded font-mono">{autoFormula}</code>.</p>
          </div>
          <button
            type="button"
            onClick={resetToAuto}
            className="text-xs text-amber-700 underline hover:no-underline flex-shrink-0"
          >
            Återställ auto
          </button>
        </div>
      )}

      {/* Base price display */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
        <span className="font-medium">Grundpris:</span>
        <span className="font-bold text-gray-900">{unitPrice.toLocaleString('sv-SE')} kr/{unit || 'enhet'}</span>
        <span className="text-gray-400">— inställt på fliken Basinformation</span>
      </div>

      {/* Variable chips */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Variabler (klicka för att infoga)</p>
        <div className="flex flex-wrap gap-1.5">
          {fields.filter(f => f.key).map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => appendToFormula(f.key)}
              className="flex items-center gap-1 bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5 text-xs cursor-pointer hover:bg-blue-200 transition-colors"
              title={f.label}
            >
              <code className="font-mono">{f.key}</code>
              <span className="text-blue-500 text-[10px]">({f.label})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Operator buttons */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Operatorer</p>
        <div className="flex gap-1.5">
          {OPERATORS.map(op => (
            <button
              key={op}
              type="button"
              onClick={() => appendToFormula(op)}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-mono text-sm font-bold transition-colors"
            >
              {op}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEditingMetadata(prev => ({ ...prev, pricing_formula: '' }))}
            className="ml-2 px-3 h-9 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          >
            Rensa
          </button>
        </div>
      </div>

      {/* Formula input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Prisformel (tillägg ovanpå grundpris)</label>
        <input
          type="text"
          value={formula}
          onChange={e => setEditingMetadata(prev => ({ ...prev, pricing_formula: e.target.value }))}
          className={`${inputCls} font-mono`}
          placeholder={`t.ex. ${autoFormula || 'lutning + material'}`}
          spellCheck={false}
        />
        <p className="text-xs text-gray-400 mt-1">Formeln beräknar <em>tillägget</em>. Totalpris = Grundpris + Formelresultat.</p>
        {formula && !formulaOk && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Ogiltig formel — kontrollera variabelnamnen och syntaxen
          </p>
        )}
        {formula && formulaOk && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Formeln är giltig
          </p>
        )}
      </div>

      {/* Live test section */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-700">Testa med riktiga värden</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {fields.filter(f => f.key).map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <div className="w-44 flex-shrink-0">
                <p className="text-xs font-medium text-gray-700 truncate">{f.label}</p>
                <code className="text-[10px] text-gray-400 font-mono">{f.key}</code>
              </div>

              {f.type === 'number' && (
                <>
                  <input
                    type="number"
                    value={testNumbers[f.key] ?? ''}
                    onChange={e => setTestNumbers(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className={`${smallInputCls} w-32`}
                  />
                  {f.unit && <span className="text-xs text-gray-400">{f.unit}</span>}
                </>
              )}

              {f.type === 'select' && (
                <select
                  value={testSelections[f.key] ?? f.options?.[0] ?? ''}
                  onChange={e => setTestSelections(p => ({ ...p, [f.key]: e.target.value }))}
                  className={`${smallInputCls} w-52`}
                >
                  {(f.options || []).map(opt => (
                    <option key={opt} value={opt}>
                      {opt} (+{f.option_values?.[opt] ?? 0} kr)
                    </option>
                  ))}
                </select>
              )}

              {f.type === 'checkbox' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testChecks[f.key] ?? false}
                    onChange={e => setTestChecks(p => ({ ...p, [f.key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-500">Ikryssad</span>
                </label>
              )}

              <span className="ml-auto text-xs text-gray-400 font-mono shrink-0">
                → tillägg <strong className="text-gray-700">{testScope[f.key] ?? 0}</strong> kr
              </span>
            </div>
          ))}

          {/* Result */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Totalpris</p>
                <p className="text-xs text-gray-400">
                  {unitPrice} kr grundpris + {formula && formulaOk ? safeEvaluate(formula, testScope) : 0} kr tillägg
                </p>
              </div>
              <div className="text-right">
                {formula && !formulaOk ? (
                  <p className="text-sm font-bold text-red-500">Ogiltig formel</p>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {testResult.toLocaleString('sv-SE')} <span className="text-base font-normal text-gray-400">kr/{unit || 'enhet'}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time formula */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tidsformel (valfri)</label>
          <input
            type="text"
            value={editingMetadata.time_formula || ''}
            onChange={e => setEditingMetadata(prev => ({ ...prev, time_formula: e.target.value }))}
            className={`${inputCls} font-mono`}
            placeholder="t.ex. yta * 0.4"
          />
          <p className="text-xs text-gray-500 mt-1">Beräknar uppskattad arbetstid</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tidsenhet</label>
          <input
            type="text"
            value={editingMetadata.time_unit || 'tim'}
            onChange={e => setEditingMetadata(prev => ({ ...prev, time_unit: e.target.value }))}
            className={`${inputCls} max-w-28`}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab: Ingår
// ============================================================================

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
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          Ingående delar visas som en checklista för säljaren när de lägger till artikeln i en offert. Markera "Standard" för delar som normalt ingår.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Inga ingående delar definierade</p>
          <p className="text-xs mt-1 text-gray-400">Lägg till delar nedan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="text"
                value={item.label}
                onChange={e => updateItem(index, { label: e.target.value })}
                className={`flex-1 ${inputCls}`}
                placeholder="T.ex. Rengöring av ränndalar"
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.default}
                  onChange={e => updateItem(index, { default: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
          className={`flex-1 ${inputCls}`}
          placeholder="Ny ingående del... (tryck Enter)"
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

const TABS: { key: TabKey; label: string; icon: React.ElementType; hint: string }[] = [
  { key: 'base', label: 'Basinformation', icon: Settings2, hint: 'Namn, pris, typ' },
  { key: 'fields', label: 'Tilläggsfält', icon: ListChecks, hint: 'Prisval säljaren gör vid offert' },
  { key: 'formula', label: 'Prisformel', icon: Calculator, hint: 'Anpassa prisberäkningen (avancerat)' },
  { key: 'included', label: 'Ingår', icon: ClipboardList, hint: 'Checklista vid offert' },
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

  const [editingItem, setEditingItem] = useState<Partial<RichSavedLineItem> | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<ProductMetadata>({});
  const [activeTab, setActiveTab] = useState<TabKey>('base');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) return;
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];
      if (!profile?.organisation_id) { setError('Ingen organisation hittades för användaren'); return; }
      setUserProfile(profile);
      const { data, error: fetchError } = await getSavedLineItems(profile.organisation_id);
      if (fetchError) { setError(fetchError.message); return; }
      setProducts(data || []);
    } catch (err) {
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.metadata?.category && p.metadata.category.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

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
      const fields = (editingMetadata.custom_fields || []).filter(f => f.key && f.label);
      const hasFields = fields.length > 0;
      const payload = {
        name: editingItem.name,
        description: editingItem.description || '',
        unit_price: editingItem.unit_price || 0,
        item_type: editingItem.item_type || 'produkt',
        metadata: {
          ...editingMetadata,
          custom_fields: fields,
          included_items: (editingMetadata.included_items || []).filter(i => i.label),
          // Sync base_price = unit_price so formula evaluator has the right base
          base_price: hasFields ? (editingItem.unit_price || 0) : undefined,
        },
      };
      if (editingItem.id) {
        const { error: updateError } = await updateSavedLineItem(editingItem.id, payload);
        if (updateError) { setError(updateError.message); return; }
      } else {
        const { error: createError } = await createSavedLineItem(userProfile.organisation_id, payload);
        if (createError) { setError(createError.message); return; }
      }
      setSuccess('Artikel sparad framgångsrikt!');
      setShowProductModal(false);
      setEditingItem(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Ett oväntat fel inträffade vid sparning.');
    } finally {
      setSaving(false);
    }
  }, [editingItem, editingMetadata, userProfile]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    try {
      const { error: deleteError } = await deleteSavedLineItem(productId);
      if (deleteError) { setError(deleteError.message); return; }
      setSuccess('Artikel borttagen framgångsrikt!');
      setShowDeleteConfirm(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Ett oväntat fel inträffade vid borttagning.');
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Artikelbibliotek</h2>
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
        </div>
        <div className="bg-white rounded-lg p-12 flex items-center justify-center border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mr-3" />
          <span className="text-gray-500">Laddar artiklar...</span>
        </div>
      </div>
    );
  }

  const hasFields = (editingMetadata.custom_fields?.length ?? 0) > 0;
  const unitPrice = editingItem?.unit_price || 0;
  const unit = editingMetadata.unit || 'st';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-primary-600" />
            Artikelbibliotek
          </h2>
          <p className="mt-1 text-gray-500">Hantera produkter och tjänster för snabbare offertframställning</p>
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Sök artiklar efter namn, beskrivning eller kategori..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`pl-10 ${inputCls}`}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Artiklar</h3>
          <span className="text-sm text-gray-400">{filteredProducts.length} st</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-gray-600">
              {searchTerm ? 'Inga artiklar matchar sökningen' : 'Inga artiklar skapade ännu'}
            </p>
            <p className="text-sm mt-1">
              {searchTerm ? 'Prova att ändra sökterm' : 'Skapa din första artikel för att komma igång'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artikel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grundpris</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{product.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {(product.metadata?.custom_fields?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                            <Calculator className="w-3 h-3 mr-1" />
                            {product.metadata!.custom_fields!.length} tillvalsfält
                          </span>
                        )}
                        {product.metadata?.pricing_formula && (
                          <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            Formel
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.metadata?.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Tag className="w-3 h-3 mr-1" />
                          {product.metadata.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{product.item_type || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(product.unit_price)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem({ ...product, id: undefined, name: `${product.name} (kopia)` });
                            setEditingMetadata(product.metadata ?? {});
                            setActiveTab('base');
                            setShowProductModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-green-600 transition-colors rounded"
                          title="Duplicera"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors rounded"
                          title="Redigera"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(product.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded"
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
      {/* Product Edit Modal                                                  */}
      {/* ================================================================== */}
      {showProductModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem.id ? 'Redigera artikel' : 'Ny artikel'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingItem.id ? 'Ändra artikelns inställningar' : 'Skapa en ny artikel i biblioteket'}
                </p>
              </div>
              <button
                onClick={() => { setShowProductModal(false); setEditingItem(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const isDisabled = (tab.key === 'formula') && !hasFields;
                return (
                  <button
                    key={tab.key}
                    onClick={() => !isDisabled && setActiveTab(tab.key)}
                    title={isDisabled ? 'Lägg till tilläggsfält för att aktivera' : tab.hint}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
                      isActive
                        ? 'border-primary-600 text-primary-600'
                        : isDisabled
                          ? 'border-transparent text-gray-300 cursor-not-allowed'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.key === 'fields' && hasFields && (
                      <span className="ml-1 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">
                        {editingMetadata.custom_fields!.length}
                      </span>
                    )}
                    {tab.key === 'formula' && editingMetadata.pricing_formula && hasFields && (
                      <span className={`ml-1 w-1.5 h-1.5 rounded-full ${checkIsFormulaAuto(editingMetadata.pricing_formula, editingMetadata.custom_fields || []) ? 'bg-green-500' : 'bg-amber-500'}`} />
                    )}
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
                <TabFields editingMetadata={editingMetadata} setEditingMetadata={setEditingMetadata} unitPrice={unitPrice} unit={unit} />
              )}
              {activeTab === 'formula' && (
                <TabFormula editingMetadata={editingMetadata} setEditingMetadata={setEditingMetadata} unitPrice={unitPrice} unit={unit} />
              )}
              {activeTab === 'included' && (
                <TabIncluded editingMetadata={editingMetadata} setEditingMetadata={setEditingMetadata} />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-400">
                {activeTab === 'base' && !hasFields && (
                  <span>Enkel artikel? Fyll i namn och pris och spara. Behöver du prisval? Gå till <strong>Tilläggsfält →</strong></span>
                )}
                {activeTab === 'fields' && hasFields && (
                  <span>Prisformeln hanteras automatiskt. Vill du anpassa? Se fliken <strong>Prisformel</strong>.</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowProductModal(false); setEditingItem(null); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleSaveProduct}
                  disabled={saving || !editingItem.name}
                  className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Spara artikel</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

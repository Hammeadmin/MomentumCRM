import React, { useState, useEffect } from 'react';
import {
  FormInput, Plus, Trash2, GripVertical, Eye, Code, Save, Settings,
  Type, Mail, Phone, Calendar, Hash, ToggleLeft, List, FileText,
  CheckSquare, Star, AlertCircle, CheckCircle, X, Copy,
  Globe, Link, ChevronDown, Loader2, Power, ExternalLink, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getLeadForms, createLeadForm, updateLeadForm, deleteLeadForm,
  getLeadFormPublicUrl, getLeadFormPageUrl, getUserProfiles,
  getSavedLineItems,
  type LeadForm as LeadFormType, type FormField
} from '../../lib/database';
import type { UserProfile, RichSavedLineItem, CustomField } from '../../types/database';

function LeadFormBuilder() {
  const { organisationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'embed' | 'settings'>('builder');
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [forms, setForms] = useState<LeadFormType[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showWebhookSection, setShowWebhookSection] = useState(false);
  const [showSnippet, setShowSnippet] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savedProducts, setSavedProducts] = useState<RichSavedLineItem[]>([]);
  const [autoAppendProductFields, setAutoAppendProductFields] = useState(false);

  const emptyForm: Omit<LeadFormType, 'id' | 'created_at' | 'updated_at' | 'submission_count'> = {
    organisation_id: organisationId || '',
    name: 'Nytt formulär',
    description: '',
    form_config: {
      fields: [
        { id: '1', type: 'text', label: 'Namn', placeholder: 'Ditt fullständiga namn', required: true },
        { id: '2', type: 'email', label: 'E-postadress', placeholder: 'din@email.se', required: true },
        { id: '3', type: 'phone', label: 'Telefonnummer', placeholder: '+46 70 123 45 67', required: false },
        { id: '4', type: 'textarea', label: 'Meddelande', placeholder: 'Berätta om ditt projekt...', required: true },
      ],
      settings: {
        submitButtonText: 'Skicka förfrågan',
        successMessage: 'Tack för din förfrågan! Vi återkommer inom 24 timmar.',
        emailNotification: true,
        leadSource: 'Webbformulär',
      },
    },
    is_active: true,
  };

  const selectedForm = forms.find(f => f.id === selectedFormId) || null;
  const currentFields = selectedForm?.form_config?.fields || [];
  const currentSettings = selectedForm?.form_config?.settings || emptyForm.form_config.settings;

  // Load forms on mount
  useEffect(() => {
    if (!organisationId) return;
    loadForms();
    loadTeamMembers();
    loadProducts();
  }, [organisationId]);

  const loadForms = async () => {
    if (!organisationId) return;
    setFormLoading(true);
    const { data, error: err } = await getLeadForms(organisationId);
    if (err) { setError(err.message); }
    setForms(data || []);
    if (data && data.length > 0 && !selectedFormId) {
      setSelectedFormId(data[0].id);
    }
    setFormLoading(false);
  };

  const loadTeamMembers = async () => {
    if (!organisationId) return;
    const { data } = await getUserProfiles(organisationId);
    setTeamMembers(data || []);
  };

  const loadProducts = async () => {
    if (!organisationId) return;
    const { data } = await getSavedLineItems(organisationId);
    setSavedProducts(data || []);
  };

  const linkedProduct = savedProducts.find(p => p.id === currentSettings.linkedProductId) || null;
  const linkedProductFields: CustomField[] = linkedProduct?.metadata?.custom_fields || [];

  const handleCreateForm = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await createLeadForm({ ...emptyForm, organisation_id: organisationId || '' });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data) {
      setForms(prev => [data, ...prev]);
      setSelectedFormId(data.id);
      setSuccess('Formulär skapat!');
      setTimeout(() => setSuccess(null), 3000);
    }
    setLoading(false);
  };

  const handleSaveForm = async () => {
    if (!selectedForm) return;
    setLoading(true);
    setError(null);

    // Auto-append product custom_fields if toggled on
    let fieldsToSave = selectedForm.form_config.fields;
    if (autoAppendProductFields && linkedProductFields.length > 0) {
      // Remove any previously-appended product fields
      const baseFields = fieldsToSave.filter(f => !f.id.startsWith('product_field_'));
      // Convert CustomField → FormField
      const productFormFields: FormField[] = linkedProductFields.map((cf, i) => ({
        id: `product_field_${cf.key || i}`,
        type: cf.type === 'select' ? 'select' as const : cf.type === 'checkbox' ? 'checkbox' as const : 'number' as const,
        label: cf.label,
        placeholder: cf.placeholder || `Ange ${cf.label.toLowerCase()}${cf.unit ? ` (${cf.unit})` : ''}`,
        required: false,
        ...(cf.type === 'select' && cf.options ? { options: cf.options } : {}),
      }));
      fieldsToSave = [...baseFields, ...productFormFields];
    }

    const { data, error: err } = await updateLeadForm(selectedForm.id, {
      name: selectedForm.name,
      description: selectedForm.description,
      form_config: { ...selectedForm.form_config, fields: fieldsToSave },
      is_active: selectedForm.is_active,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data) {
      setForms(prev => prev.map(f => f.id === data.id ? data : f));
      setSuccess('Formulär sparat!');
      setTimeout(() => setSuccess(null), 3000);
    }
    setLoading(false);
  };

  const handleDeleteForm = async (id: string) => {
    const { error: err } = await deleteLeadForm(id);
    if (err) { setError(err.message); return; }
    setForms(prev => prev.filter(f => f.id !== id));
    if (selectedFormId === id) setSelectedFormId(forms.find(f => f.id !== id)?.id || null);
    setDeleteConfirm(null);
    setSuccess('Formulär borttaget!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { data, error: err } = await updateLeadForm(id, { is_active: !currentActive });
    if (err) { setError(err.message); return; }
    if (data) setForms(prev => prev.map(f => f.id === data.id ? data : f));
  };

  const updateSelectedForm = (updater: (form: LeadFormType) => LeadFormType) => {
    if (!selectedForm) return;
    setForms(prev => prev.map(f => f.id === selectedForm.id ? updater(f) : f));
  };

  const updateFields = (fields: FormField[]) => {
    updateSelectedForm(f => ({ ...f, form_config: { ...f.form_config, fields } }));
  };

  const updateSettings = (settings: Partial<LeadFormType['form_config']['settings']>) => {
    updateSelectedForm(f => ({
      ...f, form_config: { ...f.form_config, settings: { ...f.form_config.settings, ...settings } }
    }));
  };

  const fieldTypes = [
    { type: 'text', label: 'Text', icon: Type },
    { type: 'email', label: 'E-post', icon: Mail },
    { type: 'phone', label: 'Telefon', icon: Phone },
    { type: 'textarea', label: 'Textområde', icon: FileText },
    { type: 'select', label: 'Dropdown', icon: List },
    { type: 'checkbox', label: 'Kryssruta', icon: CheckSquare },
    { type: 'radio', label: 'Radioknappar', icon: ToggleLeft },
    { type: 'number', label: 'Nummer', icon: Hash },
    { type: 'date', label: 'Datum', icon: Calendar },
  ];

  const handleAddField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: `Nytt ${fieldTypes.find(ft => ft.type === type)?.label.toLowerCase()} fält`,
      required: false,
      ...(type === 'select' || type === 'radio' ? { options: ['Alternativ 1', 'Alternativ 2'] } : {}),
    };
    setEditingField(newField);
    setShowFieldModal(true);
  };

  const handleSaveField = () => {
    if (!editingField) return;
    if (!currentFields.find(f => f.id === editingField.id)) {
      const nf = { ...editingField, id: Date.now().toString() };
      updateFields([...currentFields, nf]);
    } else {
      updateFields(currentFields.map(f => f.id === editingField.id ? editingField : f));
    }
    setEditingField(null);
    setShowFieldModal(false);
  };

  const handleDeleteField = (fieldId: string) => {
    if (confirm('Är du säker på att du vill ta bort detta fält?')) {
      updateFields(currentFields.filter(f => f.id !== fieldId));
    }
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const idx = currentFields.findIndex(f => f.id === fieldId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= currentFields.length) return;
    const newFields = [...currentFields];
    [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
    updateFields(newFields);
  };

  const getFieldIcon = (type: string) => fieldTypes.find(ft => ft.type === type)?.icon || Type;

  const endpointUrl = getLeadFormPublicUrl();

  const generateHtmlSnippet = () => {
    if (!selectedForm) return '';
    const fields = selectedForm.form_config.fields;
    const settings = selectedForm.form_config.settings;
    const fieldHtml = fields.map(f => {
      const req = f.required ? ' required' : '';
      const ph = f.placeholder ? ` placeholder="${f.placeholder}"` : '';
      if (f.type === 'textarea') return `    <div style="margin-bottom:12px"><label style="display:block;font-weight:600;margin-bottom:4px">${f.label}${f.required ? ' *' : ''}</label><textarea name="${f.label}"${ph}${req} style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;min-height:80px"></textarea></div>`;
      if (f.type === 'select') return `    <div style="margin-bottom:12px"><label style="display:block;font-weight:600;margin-bottom:4px">${f.label}${f.required ? ' *' : ''}</label><select name="${f.label}"${req} style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px"><option value="">Välj...</option>${(f.options || []).map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
      const inputType = f.type === 'phone' ? 'tel' : f.type;
      return `    <div style="margin-bottom:12px"><label style="display:block;font-weight:600;margin-bottom:4px">${f.label}${f.required ? ' *' : ''}</label><input type="${inputType}" name="${f.label}"${ph}${req} style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px"/></div>`;
    }).join('\n');
    return `<!-- Momentum CRM Lead Form -->
<div id="mcf-${selectedForm.id}">
  <form id="mcf-form-${selectedForm.id}" style="max-width:500px;font-family:sans-serif">
${fieldHtml}
    <button type="submit" style="width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer">${settings.submitButtonText}</button>
    <div id="mcf-msg-${selectedForm.id}" style="margin-top:12px;display:none;padding:10px;border-radius:6px;text-align:center"></div>
  </form>
</div>
<script>
(function(){
  var f=document.getElementById("mcf-form-${selectedForm.id}");
  var m=document.getElementById("mcf-msg-${selectedForm.id}");
  f.addEventListener("submit",function(e){
    e.preventDefault();
    var d={};
    new FormData(f).forEach(function(v,k){d[k]=v});
    m.style.display="block";
    m.style.background="#dbeafe";m.style.color="#1e40af";
    m.textContent="Skickar...";
    fetch("${endpointUrl}",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({form_id:"${selectedForm.id}",fields:d})
    }).then(function(r){return r.json()}).then(function(r){
      if(r.success){m.style.background="#d1fae5";m.style.color="#065f46";m.textContent=r.message||"${settings.successMessage}";f.reset()}
      else{m.style.background="#fee2e2";m.style.color="#991b1b";m.textContent=r.error||"Något gick fel"}
    }).catch(function(){m.style.background="#fee2e2";m.style.color="#991b1b";m.textContent="Kunde inte skicka formuläret"});
  });
})();
</script>`;
  };

  const handleTestSubmission = async () => {
    if (!selectedForm) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const testFields: Record<string, string> = {};
      selectedForm.form_config.fields.forEach(f => {
        if (f.type === 'email') testFields[f.label] = 'test@momentum.se';
        else if (f.type === 'phone') testFields[f.label] = '+46701234567';
        else if (f.type === 'number') testFields[f.label] = '0';
        else testFields[f.label] = `Test - ${f.label}`;
      });
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: selectedForm.id, fields: testFields }),
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.success ? 'Testlead skapades! Kolla Leads-sidan.' : (data.error || 'Något gick fel') });
    } catch {
      setTestResult({ success: false, message: 'Kunde inte nå servern' });
    }
    setTestLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Kopierat till urklipp!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const renderFieldPreview = (field: FormField) => {
    const cls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white";
    switch (field.type) {
      case 'textarea': return <textarea rows={3} className={cls} placeholder={field.placeholder} readOnly />;
      case 'select': return <select className={cls}><option>Välj alternativ...</option>{field.options?.map((o, i) => <option key={i}>{o}</option>)}</select>;
      case 'checkbox': return <div className="space-y-2">{field.options?.map((o, i) => <label key={i} className="flex items-center"><input type="checkbox" className="h-4 w-4 text-primary-600 border-gray-300 rounded" /><span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{o}</span></label>)}</div>;
      case 'radio': return <div className="space-y-2">{field.options?.map((o, i) => <label key={i} className="flex items-center"><input type="radio" name={field.id} className="h-4 w-4 text-primary-600 border-gray-300" /><span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{o}</span></label>)}</div>;
      default: {
        const t = field.type === 'phone' ? 'tel' : field.type;
        return <input type={t} className={cls} placeholder={field.placeholder} readOnly />;
      }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (formLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Laddar formulär...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <FormInput className="w-7 h-7 mr-3 text-primary-600" />
            Lead-formulärbyggare
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Skapa anpassade formulär för att samla in leads från din webbsida
          </p>
        </div>
        {selectedForm && (
          <button onClick={handleSaveForm} disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Spara formulär
          </button>
        )}
      </div>

      {/* Status */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
          <p className="text-green-700 dark:text-green-300 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-2 text-green-400 hover:text-green-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main layout: sidebar + content */}
      <div className="flex gap-6">
        {/* Form list sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <button onClick={handleCreateForm} disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 mb-4">
              <Plus className="w-4 h-4" /> Nytt formulär
            </button>
            {forms.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Inga formulär ännu</p>
            ) : (
              <div className="space-y-1">
                {forms.map(form => (
                  <div key={form.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${selectedFormId === form.id
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    onClick={() => setSelectedFormId(form.id)}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedFormId === form.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {form.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{form.submission_count} svar</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${form.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleActive(form.id, form.is_active); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title={form.is_active ? 'Inaktivera' : 'Aktivera'}>
                      <Power className={`w-3.5 h-3.5 ${form.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(form.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30">
                      <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {!selectedForm ? (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <FormInput className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Välj ett formulär eller skapa ett nytt</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Form name + description */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formulärnamn</label>
                    <input type="text" value={selectedForm.name}
                      onChange={(e) => updateSelectedForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lead-källa</label>
                    <input type="text" value={currentSettings.leadSource}
                      onChange={(e) => updateSettings({ leadSource: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Beskrivning</label>
                  <textarea value={selectedForm.description || ''} rows={2}
                    onChange={(e) => updateSelectedForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8">
                  {([
                    { id: 'builder', label: 'Byggare', icon: FormInput },
                    { id: 'preview', label: 'Förhandsvisning', icon: Eye },
                    { id: 'embed', label: 'Publicera', icon: Code },
                    { id: 'settings', label: 'Inställningar', icon: Settings },
                  ] as const).map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                          }`}>
                        <Icon className="w-4 h-4 mr-2" /> {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Builder Tab */}
              {activeTab === 'builder' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Fälttyper</h3>
                    <div className="space-y-2">
                      {fieldTypes.map((ft) => {
                        const Icon = ft.icon;
                        return (
                          <button key={ft.type} onClick={() => handleAddField(ft.type as FormField['type'])}
                            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700">
                            <Icon className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" /> {ft.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Formulärfält</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{currentFields.length} fält</span>
                    </div>
                    {currentFields.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <FormInput className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                        <p>Inga fält ännu</p>
                        <p className="text-sm">Lägg till fält från panelen till vänster</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentFields.map((field, index) => {
                          const Icon = getFieldIcon(field.type);
                          return (
                            <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                                  <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                  <span className="font-medium text-gray-900 dark:text-white">{field.label}</span>
                                  {field.required && <Star className="w-3 h-3 text-red-500" />}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button onClick={() => handleMoveField(field.id, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">↑</button>
                                  <button onClick={() => handleMoveField(field.id, 'down')} disabled={index === currentFields.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">↓</button>
                                  <button onClick={() => { setEditingField(field); setShowFieldModal(true); }} className="text-gray-400 hover:text-primary-600"><Settings className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteField(field.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Typ: {fieldTypes.find(ft => ft.type === field.type)?.label}
                                {field.placeholder && ` • Placeholder: "${field.placeholder}"`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{selectedForm.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{selectedForm.description}</p>
                    </div>
                    <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                      {currentFields.map(field => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderFieldPreview(field)}
                        </div>
                      ))}
                      <button type="button" className="w-full px-6 py-3 rounded-lg text-base font-medium text-white bg-primary-600 hover:bg-primary-700">
                        {currentSettings.submitButtonText}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Embed Tab */}
              {activeTab === 'embed' && (
                <div className="space-y-6">
                  {/* Section 1: Publicera */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Publicera på din webbsida</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Formulärets endpoint:</p>
                    <div className="flex items-center gap-2 mb-6">
                      <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 truncate">{endpointUrl}</code>
                      <button onClick={() => copyToClipboard(endpointUrl)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Card A: HTML */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Code className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">HTML-snippet</p>
                            <span className="text-[10px] uppercase tracking-wider text-primary-600 dark:text-primary-400 font-semibold">Rekommenderad</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Klistra in denna kod direkt på din webbsida. Fungerar på de flesta plattformar.</p>
                        <button onClick={() => setShowSnippet(showSnippet === 'html' ? null : 'html')}
                          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
                          <ChevronDown className={`w-3 h-3 transition-transform ${showSnippet === 'html' ? 'rotate-180' : ''}`} /> Visa kod
                        </button>
                        {showSnippet === 'html' && (
                          <div className="mt-3 relative">
                            <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs overflow-x-auto border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"><code>{generateHtmlSnippet()}</code></pre>
                            <button onClick={() => copyToClipboard(generateHtmlSnippet())} className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-xs"><Copy className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                      {/* Card B: WordPress */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">WordPress / Elementor</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Använder du WordPress? Lägg till ett HTML-block och klistra in snippet-koden.</p>
                        <button onClick={() => setShowSnippet(showSnippet === 'wp' ? null : 'wp')}
                          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
                          <ChevronDown className={`w-3 h-3 transition-transform ${showSnippet === 'wp' ? 'rotate-180' : ''}`} /> Visa instruktioner
                        </button>
                        {showSnippet === 'wp' && (
                          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300">
                            <p className="font-medium mb-1">Instruktion:</p>
                            <p>Lägg till ett "Anpassad HTML"-block i Elementor eller ett "HTML"-block i Gutenberg och klistra in HTML-snippet-koden ovan.</p>
                          </div>
                        )}
                      </div>
                      {/* Card C: Direct link */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Link className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">Direktlänk</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Dela en länk till ett fristående formulär.</p>
                        {/* Route /forms/:formId is registered in App.tsx */}
                        <div className="flex items-center gap-1 mt-2">
                          <code className="text-xs text-gray-600 dark:text-gray-400 truncate">{getLeadFormPageUrl(selectedForm.id)}</code>
                          <button onClick={() => copyToClipboard(getLeadFormPageUrl(selectedForm.id))} className="flex-shrink-0">
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Testa */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Testa formuläret</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Skicka testdata till din edge function och verifiera att allt fungerar.</p>
                    <button onClick={handleTestSubmission} disabled={testLoading}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                      {testLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                      Skicka testförfrågan
                    </button>
                    {testResult && (
                      <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                        {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                        {testResult.message}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Webhook */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <button onClick={() => setShowWebhookSection(!showWebhookSection)}
                      className="w-full flex items-center justify-between p-6 text-left">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Anslut befintligt formulär (webhook)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Har du redan ett formulär på din webbsida?</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showWebhookSection ? 'rotate-180' : ''}`} />
                    </button>
                    {showWebhookSection && (
                      <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Om du redan använder ett formulärverktyg (t.ex. Typeform, Gravity Forms, Contact Form 7) kan du skicka data till oss via webhook.
                        </p>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">POST endpoint</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm truncate">{endpointUrl}</code>
                            <button onClick={() => copyToClipboard(endpointUrl)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <Copy className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Fältmappning</p>
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead><tr className="bg-gray-50 dark:bg-gray-800">
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Ditt fältnamn</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">CRM-fält</th>
                              </tr></thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {[
                                  ['name, namn, full_name', 'Kundnamn'],
                                  ['email, epost, e-post', 'E-post'],
                                  ['phone, telefon, tel', 'Telefon'],
                                  ['address, adress', 'Adress'],
                                  ['postal_code, postnummer', 'Postnummer'],
                                  ['city, ort, stad', 'Ort'],
                                  ['message, meddelande', 'Beskrivning'],
                                ].map(([keys, label]) => (
                                  <tr key={label}>
                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">{keys}</td>
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{label}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Vi känner automatiskt igen vanliga fältnamn på svenska och engelska.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Formulärinställningar</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Knapptext</label>
                        <input type="text" value={currentSettings.submitButtonText}
                          onChange={(e) => updateSettings({ submitButtonText: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Omdirigerings-URL (valfritt)</label>
                        <input type="url" value={currentSettings.redirectUrl || ''}
                          onChange={(e) => updateSettings({ redirectUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                          placeholder="https://dinsida.se/tack" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bekräftelsemeddelande</label>
                      <textarea value={currentSettings.successMessage} rows={3}
                        onChange={(e) => updateSettings({ successMessage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tilldela automatiskt till</label>
                      <select value={currentSettings.autoAssignUserId || ''}
                        onChange={(e) => updateSettings({ autoAssignUserId: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500">
                        <option value="">Ingen automatisk tilldelning</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" checked={currentSettings.emailNotification}
                          onChange={(e) => updateSettings({ emailNotification: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded" />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Skicka e-postnotifiering när formulär skickas in</span>
                      </label>
                    </div>

                    {/* Product Linking Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Koppla tjänst (valfritt)
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Koppla en produkt/tjänst från produktbiblioteket till detta formulär. Produktens tilläggsfält kan läggas till automatiskt.</p>
                      <select
                        value={currentSettings.linkedProductId || ''}
                        onChange={(e) => {
                          updateSettings({ linkedProductId: e.target.value || undefined });
                          setAutoAppendProductFields(false);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Ingen kopplad tjänst</option>
                        {savedProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name}{p.metadata?.custom_fields?.length ? ` (${p.metadata.custom_fields.length} fält)` : ''}</option>
                        ))}
                      </select>

                      {linkedProduct && linkedProductFields.length > 0 && (
                        <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">Dessa fält läggs till automatiskt i formuläret:</p>
                          <div className="space-y-1">
                            {linkedProductFields.map((cf, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                                <span className="font-medium">{cf.label}</span>
                                <span className="text-amber-500">{cf.type}{cf.unit ? ` (${cf.unit})` : ''}</span>
                              </div>
                            ))}
                          </div>
                          <label className="flex items-center gap-2 mt-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoAppendProductFields}
                              onChange={(e) => setAutoAppendProductFields(e.target.checked)}
                              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                            <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Lägg till produktens fält i formuläret automatiskt</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Field Edit Modal */}
      {showFieldModal && editingField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Redigera fält</h3>
              <button onClick={() => { setEditingField(null); setShowFieldModal(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fältetikett *</label>
                <input type="text" required value={editingField.label} onChange={(e) => setEditingField(prev => prev ? { ...prev, label: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Placeholder-text</label>
                <input type="text" value={editingField.placeholder || ''} onChange={(e) => setEditingField(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
              </div>
              {(editingField.type === 'select' || editingField.type === 'checkbox' || editingField.type === 'radio') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Alternativ (ett per rad)</label>
                  <textarea value={editingField.options?.join('\n') || ''} rows={4}
                    onChange={(e) => setEditingField(prev => prev ? { ...prev, options: e.target.value.split('\n').filter(o => o.trim()) } : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    placeholder={'Alternativ 1\nAlternativ 2\nAlternativ 3'} />
                </div>
              )}
              <label className="flex items-center">
                <input type="checkbox" checked={editingField.required} onChange={(e) => setEditingField(prev => prev ? { ...prev, required: e.target.checked } : null)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded" />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Obligatoriskt fält</span>
              </label>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setEditingField(null); setShowFieldModal(false); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">Avbryt</button>
              <button onClick={handleSaveField} disabled={!editingField.label}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">Spara fält</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ta bort formulär?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Detta kan inte ångras. Alla kopplingar till befintliga leads behålls.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">Avbryt</button>
              <button onClick={() => handleDeleteForm(deleteConfirm)} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700">Ta bort</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadFormBuilder;
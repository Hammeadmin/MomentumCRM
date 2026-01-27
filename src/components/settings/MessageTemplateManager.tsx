import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Info,
  Lock,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  duplicateTemplate,
  renderTemplate,
  extractVariablesFromContent,
  getSmsCharacterInfo,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_VARIABLES,
  type MessageTemplate,
  type TemplateChannel,
  type TemplateType
} from '../../lib/messageTemplates';

interface TemplateModalProps {
  template: MessageTemplate | null;
  channel: TemplateChannel;
  onSave: (template: Partial<MessageTemplate>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function TemplateModal({ template, channel, onSave, onClose, saving }: TemplateModalProps) {
  const [name, setName] = useState(template?.name || '');
  const [type, setType] = useState<TemplateType>(template?.type || 'general');
  const [subject, setSubject] = useState(template?.subject || '');
  const [content, setContent] = useState(template?.content || '');
  const [showPreview, setShowPreview] = useState(false);

  const isNew = !template?.id;
  const isDefault = template?.is_default || false;

  const variables = TEMPLATE_VARIABLES[type] || [];
  const smsInfo = channel === 'sms' ? getSmsCharacterInfo(content) : null;

  const previewVariables: Record<string, string> = {
    customer_name: 'Anna Svensson',
    quote_number: 'O202501-0042',
    invoice_number: 'F202501-0042',
    amount: '12 500',
    valid_until: '2025-02-15',
    due_date: '2025-02-28',
    payment_terms: '30',
    bank_account: '123-4567',
    booking_date: '2025-02-01',
    booking_time: '09:00',
    address: 'Storgatan 1, 111 22 Stockholm',
    assigned_worker: 'Erik Johansson',
    worker_phone: '070-123 45 67',
    eta_minutes: '15',
    company_name: 'Ditt Företag AB',
    company_phone: '08-123 45 67',
    company_email: 'info@dittforetag.se'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name,
      type,
      subject: channel === 'email' ? subject : undefined,
      content,
      variables: extractVariablesFromContent(content)
    });
  };

  const insertVariable = (varName: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + `{${varName}}` + content.slice(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varName.length + 2, start + varName.length + 2);
      }, 0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {channel === 'email' ? (
              <Mail className="w-6 h-6 text-blue-600 mr-3" />
            ) : (
              <MessageSquare className="w-6 h-6 text-green-600 mr-3" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isNew ? `Ny ${channel === 'email' ? 'e-post' : 'SMS'}-mall` : `Redigera ${channel === 'email' ? 'e-post' : 'SMS'}-mall`}
              </h3>
              {isDefault && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center mt-1">
                  <Lock className="w-3 h-3 mr-1" />
                  Standardmall (begränsade ändringar)
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mallnamn *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isDefault}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="T.ex. Offert skickad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Malltyp *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TemplateType)}
                    disabled={isDefault}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {channel === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ämnesrad *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="T.ex. Offert #{quote_number} från {company_name}"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {channel === 'email' ? 'E-postinnehåll' : 'SMS-meddelande'} *
                  </label>
                  {channel === 'sms' && smsInfo && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className={smsInfo.charCount > 160 ? 'text-amber-600' : ''}>
                        {smsInfo.charCount} tecken
                      </span>
                      <span className="mx-1">|</span>
                      <span className={smsInfo.smsCount > 1 ? 'text-amber-600' : ''}>
                        {smsInfo.smsCount} SMS
                      </span>
                      <span className="mx-1">|</span>
                      <span>{smsInfo.encoding}</span>
                    </div>
                  )}
                </div>
                <textarea
                  id="template-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={channel === 'sms' ? 6 : 12}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder={channel === 'sms'
                    ? 'Hej {customer_name}! Din bokning är bekräftad...'
                    : 'Hej {customer_name},\n\nVi vill tacka dig...'
                  }
                />
                {channel === 'sms' && smsInfo && smsInfo.smsCount > 1 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                    <Info className="w-3 h-3 mr-1" />
                    Meddelandet kommer delas upp i {smsInfo.smsCount} SMS och debiteras därefter.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {showPreview ? 'Dölj förhandsgranskning' : 'Visa förhandsgranskning'}
                </button>
              </div>

              {showPreview && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Förhandsgranskning</h4>
                  {channel === 'email' && subject && (
                    <p className="text-sm text-gray-900 dark:text-white font-medium mb-2">
                      Ämne: {renderTemplate(subject, previewVariables)}
                    </p>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {renderTemplate(content, previewVariables)}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  Tillgängliga variabler
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {variables.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      onClick={() => insertVariable(variable.name)}
                      className="w-full text-left p-2 rounded-lg bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                    >
                      <code className="text-xs text-blue-700 dark:text-blue-400 font-mono block group-hover:text-blue-800">
                        {`{${variable.name}}`}
                      </code>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {variable.description}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                  Klicka på en variabel för att infoga den.
                </p>
              </div>

              {channel === 'sms' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium text-amber-900 dark:text-amber-300 mb-2 text-sm">SMS-tips</h4>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    <li>- Håll meddelandet kort och koncist</li>
                    <li>- Undvik specialtecken (ÅÄÖ fungerar)</li>
                    <li>- Max 160 tecken = 1 SMS</li>
                    <li>- Variabler ersätts med verkliga värden</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving || !name || !content || (channel === 'email' && !subject)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isNew ? 'Skapa mall' : 'Spara ändringar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MessageTemplateManager() {
  const { organisationId, user } = useAuth();
  const [activeChannel, setActiveChannel] = useState<TemplateChannel>('email');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedType, setExpandedType] = useState<TemplateType | null>(null);

  useEffect(() => {
    if (organisationId) {
      loadTemplates();
    }
  }, [organisationId, activeChannel]);

  const loadTemplates = async () => {
    if (!organisationId) return;

    try {
      setLoading(true);
      setError(null);
      const { data, error } = await getMessageTemplates(organisationId, activeChannel);

      if (error) {
        setError(error.message);
        return;
      }

      setTemplates(data || []);
    } catch (err) {
      setError('Kunde inte ladda mallar');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: Partial<MessageTemplate>) => {
    if (!organisationId) return;

    try {
      setSaving(true);
      setError(null);

      if (editingTemplate?.id) {
        const { error } = await updateMessageTemplate(editingTemplate.id, templateData);
        if (error) {
          setError(error.message);
          return;
        }
        setSuccess('Mallen har uppdaterats');
      } else {
        const { error } = await createMessageTemplate({
          organisation_id: organisationId,
          name: templateData.name!,
          channel: activeChannel,
          type: templateData.type!,
          subject: templateData.subject,
          content: templateData.content!,
          variables: templateData.variables,
          created_by: user?.id
        });
        if (error) {
          setError(error.message);
          return;
        }
        setSuccess('Mallen har skapats');
      }

      setShowModal(false);
      setEditingTemplate(null);
      loadTemplates();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Kunde inte spara mallen');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: MessageTemplate) => {
    if (template.is_default) {
      setError('Standardmallar kan inte tas bort');
      return;
    }

    if (!confirm(`Är du säker på att du vill ta bort mallen "${template.name}"?`)) {
      return;
    }

    try {
      const { error } = await deleteMessageTemplate(template.id);
      if (error) {
        setError(error.message);
        return;
      }

      setSuccess('Mallen har tagits bort');
      loadTemplates();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Kunde inte ta bort mallen');
    }
  };

  const handleDuplicateTemplate = async (template: MessageTemplate) => {
    try {
      const { error } = await duplicateTemplate(template.id, `${template.name} (kopia)`);
      if (error) {
        setError(error.message);
        return;
      }

      setSuccess('Mallen har duplicerats');
      loadTemplates();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Kunde inte duplicera mallen');
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = [];
    }
    acc[template.type].push(template);
    return acc;
  }, {} as Record<TemplateType, MessageTemplate[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveChannel('email')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChannel === 'email'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Mail className="w-5 h-5 mr-2" />
            E-postmallar
          </button>
          <button
            onClick={() => setActiveChannel('sms')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChannel === 'sms'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            SMS-mallar
          </button>
        </div>

        <button
          onClick={() => {
            setEditingTemplate(null);
            setShowModal(true);
          }}
          className={`flex items-center px-4 py-2 rounded-lg font-medium text-white ${
            activeChannel === 'email' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Ny mall
        </button>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Inga {activeChannel === 'email' ? 'e-post' : 'SMS'}-mallar
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Skapa din första mall för att komma igång.
          </p>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowModal(true);
            }}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-white ${
              activeChannel === 'email' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Plus className="w-5 h-5 mr-2" />
            Skapa mall
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
            <div key={type} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpandedType(expandedType === type ? null : type as TemplateType)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center">
                  <ChevronRight className={`w-5 h-5 mr-2 text-gray-400 transition-transform ${expandedType === type ? 'rotate-90' : ''}`} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {TEMPLATE_TYPE_LABELS[type as TemplateType]}
                  </span>
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                    {typeTemplates.length}
                  </span>
                </div>
              </button>

              {expandedType === type && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {typeTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border-b last:border-b-0 border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {template.name}
                            </h4>
                            {template.is_default && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full flex items-center">
                                <Lock className="w-3 h-3 mr-1" />
                                Standard
                              </span>
                            )}
                          </div>
                          {template.subject && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                              Ämne: {template.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                            {template.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => {
                              setEditingTemplate(template);
                              setShowModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Redigera"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                            title="Duplicera"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {!template.is_default && (
                            <button
                              onClick={() => handleDeleteTemplate(template)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
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
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          template={editingTemplate}
          channel={activeChannel}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Mail, Send, MessageSquare, Video, Copy, Check, AlertCircle, Phone, Loader2 } from 'lucide-react';

type SendMethod = 'email' | 'sms';

interface InvitationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (content: string, method: SendMethod, recipientEmail: string, recipientPhone?: string, subject?: string) => void;
  defaultContent: string;
  recipientEmail: string;
  recipientPhone?: string;
  subject: string;
  meetingLink?: string;
  onGenerateMeetingLink?: () => Promise<string>;
  isSending?: boolean;
}

export default function InvitationPreviewModal({
  isOpen,
  onClose,
  onSend,
  defaultContent,
  recipientEmail: initialEmail,
  recipientPhone: initialPhone,
  subject,
  meetingLink: initialMeetingLink,
  onGenerateMeetingLink,
  isSending = false
}: InvitationPreviewModalProps) {
  const [content, setContent] = useState(defaultContent);
  const [recipientEmail, setRecipientEmail] = useState(initialEmail);
  const [recipientPhone, setRecipientPhone] = useState(initialPhone || '');
  const [sendMethod, setSendMethod] = useState<SendMethod>('email');
  const [meetingLink, setMeetingLink] = useState(initialMeetingLink || '');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editableSubject, setEditableSubject] = useState(subject);

  useEffect(() => {
    setContent(defaultContent);
    setRecipientEmail(initialEmail);
    setRecipientPhone(initialPhone || '');
    setMeetingLink(initialMeetingLink || '');
    setEditableSubject(subject);
    setValidationError(null);
  }, [defaultContent, initialEmail, initialPhone, initialMeetingLink, subject, isOpen]);

  const handleGenerateMeetingLink = async () => {
    if (!onGenerateMeetingLink) {
      const randomId = Math.random().toString(36).substring(2, 12);
      const newLink = `https://meet.google.com/${randomId}`;
      setMeetingLink(newLink);
      const updatedContent = content.replace(
        /Länk till möte: .*/,
        `Länk till möte: ${newLink}`
      );
      setContent(updatedContent);
      return;
    }

    setIsGeneratingLink(true);
    try {
      const newLink = await onGenerateMeetingLink();
      setMeetingLink(newLink);
      const updatedContent = content.replace(
        /Länk till möte: .*/,
        `Länk till möte: ${newLink}`
      );
      setContent(updatedContent);
    } catch (error) {
      console.error('Failed to generate meeting link:', error);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (meetingLink) {
      navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const validateAndSend = () => {
    setValidationError(null);

    if (sendMethod === 'email') {
      if (!recipientEmail || !recipientEmail.includes('@')) {
        setValidationError('Ange en giltig e-postadress');
        return;
      }
      if (!editableSubject.trim()) {
        setValidationError('Ange ett ämne');
        return;
      }
    } else {
      if (!recipientPhone || recipientPhone.length < 8) {
        setValidationError('Ange ett giltigt telefonnummer');
        return;
      }
    }

    if (!content.trim()) {
      setValidationError('Meddelandet kan inte vara tomt');
      return;
    }

    onSend(content, sendMethod, recipientEmail, recipientPhone, editableSubject);
  };

  if (!isOpen) return null;

  const smsContent = content
    .replace(/\n\n/g, '\n')
    .substring(0, 160);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              Skicka Inbjudan
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Bjud in kunden till mötet</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setSendMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                sendMethod === 'email'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              E-post
            </button>
            <button
              onClick={() => setSendMethod('sms')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                sendMethod === 'sms'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              SMS
            </button>
          </div>

          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {validationError}
            </div>
          )}

          {sendMethod === 'email' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mottagare (e-post)
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="kund@example.com"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    !recipientEmail ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                  }`}
                />
                {!recipientEmail && (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Ingen e-post hittades - ange manuellt
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ämne
                </label>
                <input
                  type="text"
                  value={editableSubject}
                  onChange={(e) => setEditableSubject(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Ange ämne..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Meddelande
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm leading-relaxed transition-all"
                  placeholder="Skriv ditt meddelande här..."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mottagare (telefon)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+46701234567"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      !recipientPhone ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                    }`}
                  />
                </div>
                {!recipientPhone && (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Inget telefonnummer hittades - ange manuellt
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SMS-meddelande
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    ({smsContent.length}/160 tecken)
                  </span>
                </label>
                <textarea
                  value={smsContent}
                  onChange={(e) => setContent(e.target.value.substring(0, 160))}
                  rows={4}
                  maxLength={160}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm leading-relaxed transition-all"
                  placeholder="Skriv SMS-meddelande..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  SMS är begränsade till 160 tecken. Längre meddelanden skickas som flera SMS.
                </p>
              </div>
            </>
          )}

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Möteslänk
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <button
                onClick={handleGenerateMeetingLink}
                disabled={isGeneratingLink}
                className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                {isGeneratingLink ? 'Skapar...' : 'Skapa länk'}
              </button>
              {meetingLink && (
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  title="Kopiera länk"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-sm"
          >
            Avbryt
          </button>
          <button
            onClick={validateAndSend}
            disabled={isSending}
            className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSending ? 'Skickar...' : (sendMethod === 'email' ? 'Skicka E-post' : 'Skicka SMS')}
          </button>
        </div>
      </div>
    </div>
  );
}

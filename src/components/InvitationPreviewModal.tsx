import React, { useState, useEffect } from 'react';
import { X, Mail, Send } from 'lucide-react';

interface InvitationPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (content: string) => void;
    defaultContent: string;
    recipientEmail: string;
    subject: string;
}

export default function InvitationPreviewModal({
    isOpen,
    onClose,
    onSend,
    defaultContent,
    recipientEmail,
    subject
}: InvitationPreviewModalProps) {
    const [content, setContent] = useState(defaultContent);

    useEffect(() => {
        setContent(defaultContent);
    }, [defaultContent, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Mail className="w-5 h-5 mr-2 text-blue-600" />
                        Förhandsgranska Inbjudan
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Till
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={recipientEmail}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ämne
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={subject}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600"
                            />
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Meddelande
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={12}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm leading-relaxed"
                                placeholder="Skriv ditt meddelande här..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Avbryt
                    </button>
                    <button
                        onClick={() => onSend(content)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Skicka Inbjudan
                    </button>
                </div>
            </div>
        </div>
    );
}

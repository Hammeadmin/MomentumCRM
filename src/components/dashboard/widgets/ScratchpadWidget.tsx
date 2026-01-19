import React, { useEffect, useState } from 'react';
import { StickyNote, Save } from 'lucide-react';
import { useDashboardPreferences } from '../../../hooks/useDashboardPreferences';

export default function ScratchpadWidget() {
    const { settings, updateSettings } = useDashboardPreferences();
    const [content, setContent] = useState('');

    // Sync with settings on load (only once or when remote changes?)
    // If we type, we don't want remote to overwrite immediately. 
    // We'll init from settings, then rely on local state.
    useEffect(() => {
        if (settings?.scratchpad_content !== undefined) {
            if (content === '' && settings.scratchpad_content !== '') {
                setContent(settings.scratchpad_content);
            }
        }
    }, [settings?.scratchpad_content]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setContent(newVal);
        updateSettings({ scratchpad_content: newVal });
    };

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-2xl shadow-sm border border-yellow-200 dark:border-yellow-700/30 h-full flex flex-col relative group">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-500 flex items-center">
                    <StickyNote className="w-5 h-5 mr-2" />
                    Anteckningar
                </h3>
                <span className="text-xs text-yellow-600/50 dark:text-yellow-500/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <Save className="w-3 h-3 mr-1" /> Sparas automatiskt
                </span>
            </div>

            <textarea
                value={content}
                onChange={handleChange}
                placeholder="Skriv något..."
                className="flex-1 w-full bg-transparent border-none resize-none focus:ring-0 text-gray-800 dark:text-yellow-100 placeholder-yellow-400 dark:placeholder-yellow-800/50 leading-relaxed font-secondary text-sm"
                spellCheck={false}
            />
        </div>
    );
}

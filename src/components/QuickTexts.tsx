/**
 * QuickTexts Component - PRODUCTION VERSION
 * 
 * Quick text templates loaded from database for inserting common responses
 * into emails, chats, and other text fields using /shortcuts.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, FileText, Copy, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getQuickTexts } from '../lib/activityService';

export interface QuickText {
    id: string;
    title: string;
    content: string;
    shortcut?: string;
    category?: string;
}

// Default quick texts (used if database is empty or as fallback)
const DEFAULT_QUICK_TEXTS: QuickText[] = [
    {
        id: 'default-1',
        title: 'Betalningsvillkor',
        shortcut: '/betalning',
        category: 'Faktura',
        content: 'Betalningsvillkor: 30 dagar netto. Vid sen betalning tillkommer dröjsmålsränta enligt räntelagen. Fakturaavgift 50 kr.'
    },
    {
        id: 'default-2',
        title: 'ROT-avdrag information',
        shortcut: '/rot',
        category: 'Offert',
        content: 'Arbetskostnaden är berättigad till ROT-avdrag (30% av arbetskostnaden). För att erhålla avdraget krävs personnummer och att fastigheten ägs av dig.'
    },
    {
        id: 'default-3',
        title: 'Tacka för förfrågan',
        shortcut: '/tack',
        category: 'E-post',
        content: 'Tack för din förfrågan! Vi har tagit emot dina uppgifter och återkommer inom kort med en offert. Tveka inte att höra av dig om du har några frågor.'
    },
    {
        id: 'default-4',
        title: 'Bekräfta bokning',
        shortcut: '/bokad',
        category: 'SMS',
        content: 'Din bokning är bekräftad! Vi kommer [DATUM] kl [TID]. Kontakta oss på [TELEFON] vid frågor. Mvh [FÖRETAG]'
    },
    {
        id: 'default-5',
        title: 'Garanti information',
        shortcut: '/garanti',
        category: 'Offert',
        content: 'Arbetet utförs med 5 års garanti på utfört arbete. Garantin täcker fel som uppstår till följd av felaktigt utförande enligt branschstandard.'
    },
];

interface QuickTextsSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (text: string) => void;
    searchQuery?: string;
}

export function QuickTextsSelector({ isOpen, onClose, onSelect, searchQuery = '' }: QuickTextsSelectorProps) {
    const { organisationId } = useAuth();
    const [query, setQuery] = useState(searchQuery);
    const [quickTexts, setQuickTexts] = useState<QuickText[]>(DEFAULT_QUICK_TEXTS);
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load quick texts from database
    useEffect(() => {
        if (isOpen && organisationId) {
            fetchQuickTexts();
        }
    }, [isOpen, organisationId]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        setQuery(searchQuery);
    }, [isOpen, searchQuery]);

    const fetchQuickTexts = async () => {
        if (!organisationId) return;

        setLoading(true);
        try {
            const { data, error } = await getQuickTexts(organisationId);
            if (error) throw error;

            // Use database texts if available, otherwise use defaults
            if (data && data.length > 0) {
                setQuickTexts(data);
            } else {
                setQuickTexts(DEFAULT_QUICK_TEXTS);
            }
        } catch (err) {
            console.error('Error fetching quick texts:', err);
            setQuickTexts(DEFAULT_QUICK_TEXTS);
        } finally {
            setLoading(false);
        }
    };

    const filteredTexts = quickTexts.filter(qt =>
        qt.title.toLowerCase().includes(query.toLowerCase()) ||
        qt.shortcut?.toLowerCase().includes(query.toLowerCase()) ||
        qt.content.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (qt: QuickText) => {
        onSelect(qt.content);
        onClose();
    };

    const handleCopy = (qt: QuickText, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(qt.content);
        setCopiedId(qt.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-80">
            {/* Header */}
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Sök snabbtexter..."
                    className="flex-1 bg-transparent border-0 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:ring-0 p-0"
                />
                {loading && <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin" />}
                <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded">
                    <X className="w-4 h-4 text-zinc-400" />
                </button>
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto">
                {filteredTexts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                        Inga snabbtexter hittades
                    </div>
                ) : (
                    filteredTexts.map((qt) => (
                        <button
                            key={qt.id}
                            onClick={() => handleSelect(qt)}
                            className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors flex items-start gap-3 group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-zinc-900 dark:text-white">{qt.title}</span>
                                    {qt.shortcut && (
                                        <code className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 rounded">
                                            {qt.shortcut}
                                        </code>
                                    )}
                                    {qt.category && (
                                        <span className="text-[10px] text-zinc-400">{qt.category}</span>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-500 truncate mt-0.5">{qt.content}</p>
                            </div>
                            <button
                                onClick={(e) => handleCopy(qt, e)}
                                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded transition-all"
                                title="Kopiera"
                            >
                                {copiedId === qt.id ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <Copy className="w-4 h-4 text-zinc-400" />
                                )}
                            </button>
                        </button>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                    Tryck <kbd className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded">↵</kbd> för att infoga
                </span>
                <button className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Ny snabbtext
                </button>
            </div>
        </div>
    );
}

export default QuickTextsSelector;

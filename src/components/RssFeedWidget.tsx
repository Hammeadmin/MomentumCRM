// src/components/RssFeedWidget.tsx
import React, { useState, useEffect } from 'react';
import { Rss, PlusCircle, Loader2 } from 'lucide-react';
import { fetchRSSArticles, createLeadFromArticle } from '../lib/leads';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

// This type should be in your types/database.ts file
interface RSSArticle {
  title: string;
  link: string;
  description?: string;
}

export default function RssFeedWidget() {
  const { user, organisationId } = useAuth();
  const { success, error: showError } = useToast();
  const [items, setItems] = useState<RSSArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await fetchRSSArticles(organisationId!);

      if (fetchError || !data) {
        setError('Kunde inte ladda RSS-flöde.');
        console.error(fetchError);
      } else {
        setItems(data.slice(0, 10));
      }
      setLoading(false);
    };
    loadFeed();
  }, []);

  const handleCreateLead = async (article: RSSArticle) => {
    if (!user) {
      showError('Fel', 'Du måste vara inloggad för att skapa ett lead.');
      return;
    }
    // Calls your existing createLeadFromArticle function
    const { data, error } = await createLeadFromArticle(article, organisationId!, user.id);
    if (error) {
      showError('Misslyckades', 'Kunde inte skapa lead från artikeln.');
    } else {
      success('Lead Skapat!', `Leadet "${data?.title}" har lagts till.`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full flex flex-col">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Rss className="w-5 h-5 mr-3 text-orange-500" />
        Nyheter & Möjliga Leads
      </h3>

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3 overflow-y-auto pr-2">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-200 group-hover:text-blue-600">{item.title}</p>
                  {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>}
                </a>
                <button
                  onClick={() => handleCreateLead(item)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 mt-2 flex items-center"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Skapa Lead från artikel
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Inga nya inlägg att visa.</p>
          )}
        </div>
      )}
    </div>
  );
}
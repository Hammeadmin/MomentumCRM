import React from 'react';
import {
  Plus,
  Search,
  FileText,
  Users,
  Calendar,
  Receipt,
  Package,
  Target,
  BookOpen,
  Upload,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface EmptyStateProps {
  type: 'orders' | 'customers' | 'quotes' | 'invoices' | 'calendar' | 'search' | 'leads' | 'general';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  illustration?: React.ReactNode;
  showSecondaryActions?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// SVG Illustration component for more engaging visuals
const EmptyIllustration = ({ type, color }: { type: string; color: string }) => {
  const commonClasses = "transition-all duration-500";

  return (
    <div className="relative w-40 h-40 mx-auto">
      {/* Background blob */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160">
        <defs>
          <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className={`${commonClasses}`} style={{ stopColor: 'currentColor', stopOpacity: 0.1 }} />
            <stop offset="100%" className={`${commonClasses}`} style={{ stopColor: 'currentColor', stopOpacity: 0.05 }} />
          </linearGradient>
        </defs>
        <ellipse
          cx="80" cy="80" rx="70" ry="65"
          fill={`url(#grad-${type})`}
          className={`${color} animate-pulse`}
        />
      </svg>

      {/* Decorative circles */}
      <div className="absolute top-2 right-4 w-4 h-4 rounded-full bg-primary-300/50 dark:bg-primary-600/30 animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-4 left-2 w-3 h-3 rounded-full bg-accent-300/50 dark:bg-accent-600/30 animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 -right-1 w-2 h-2 rounded-full bg-green-300/50 dark:bg-green-600/30 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-8 right-8 w-2.5 h-2.5 rounded-full bg-blue-300/50 dark:bg-blue-600/30 animate-float" style={{ animationDelay: '0.5s' }} />

      {/* Main icon container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-20 h-20 rounded-2xl ${color} bg-opacity-20 dark:bg-opacity-30 flex items-center justify-center shadow-lg backdrop-blur-sm transform hover:scale-110 transition-transform duration-300`}>
          {type === 'orders' && <Package className={`w-10 h-10 ${color.replace('bg-', 'text-').split(' ')[0]}`} />}
          {type === 'customers' && <Users className={`w-10 h-10 ${color.replace('bg-', 'text-').split(' ')[0]}`} />}
          {type === 'quotes' && <FileText className={`w-10 h-10 ${color.replace('bg-', 'text-').split(' ')[0]}`} />}
          {type === 'invoices' && <Receipt className={`w-10 h-10 ${color.replace('bg-', 'text-').split(' ')[0]}`} />}
          {type === 'calendar' && <Calendar className={`w-10 h-10 ${color.replace('bg-', 'text-').split(' ')[0]}`} />}
          {type === 'leads' && <Target className={`w-10 h-10 ${color.replace('bg-', 'text-').split(' ')[0]}`} />}
          {type === 'search' && <Search className={`w-10 h-10 ${color.replace('bg-', 'text-').split(' ')[0]}`} />}
          {type === 'general' && <FileText className={`w-10 h-10 ${color.replace('bg-', 'text-').split(' ')[0]}`} />}
        </div>
      </div>
    </div>
  );
};

function EmptyState({
  type,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  illustration,
  showSecondaryActions = true,
  className = '',
  size = 'md'
}: EmptyStateProps) {
  const getDefaultContent = () => {
    switch (type) {
      case 'orders':
        return {
          title: 'Inga ordrar ännu',
          description: 'Kom igång genom att lägga till din första order. Ordrar hjälper dig att hålla koll på alla kunduppdrag från första kontakt till fakturering.',
          actionText: 'Lägg till Order',
          color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
          guides: ['Så skapar du en order', 'Importera från Excel']
        };
      case 'customers':
        return {
          title: 'Inga kunder ännu',
          description: 'Bygg upp ditt kundregister genom att lägga till kunder. Håll all viktig kundinformation organiserad på ett ställe.',
          actionText: 'Lägg till Kund',
          color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
          guides: ['Kundhantering guide', 'Importera kundlista']
        };
      case 'quotes':
        return {
          title: 'Inga offerter ännu',
          description: 'Skapa professionella offerter för dina kunder. Följ upp status och konvertera accepterade offerter till jobb.',
          actionText: 'Skapa Offert',
          color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
          guides: ['Offertmallar', 'Snabbare offerering']
        };
      case 'invoices':
        return {
          title: 'Inga fakturor ännu',
          description: 'Skapa och skicka fakturor direkt från systemet. Följ betalningsstatus och få automatiska påminnelser.',
          actionText: 'Skapa Faktura',
          color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
          guides: ['Faktureringsinställningar', 'Automatisk påminnelse']
        };
      case 'calendar':
        return {
          title: 'Inga händelser',
          description: 'Schemalägg möten, påminnelser och uppgifter. Håll koll på viktiga datum och deadlines.',
          actionText: 'Boka Möte',
          color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
          guides: ['Kalendersynk', 'Automatiska påminnelser']
        };
      case 'leads':
        return {
          title: 'Inga leads ännu',
          description: 'Fånga potentiella kunder och följ upp leads systematiskt. Konvertera leads till offerter och ordrar.',
          actionText: 'Lägg till Lead',
          color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
          guides: ['Lead-hantering', 'Konverteringstips']
        };
      case 'search':
        return {
          title: 'Inga sökresultat',
          description: 'Vi kunde inte hitta något som matchar din sökning. Försök med andra sökord eller kontrollera stavningen.',
          actionText: 'Rensa sökning',
          color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
          guides: []
        };
      default:
        return {
          title: 'Ingen data tillgänglig',
          description: 'Det finns ingen data att visa för tillfället.',
          actionText: 'Uppdatera',
          color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
          guides: ['Kom igång']
        };
    }
  };

  const defaultContent = getDefaultContent();
  const finalTitle = title || defaultContent.title;
  const finalDescription = description || defaultContent.description;
  const finalActionText = actionText || defaultContent.actionText;

  const sizeClasses = {
    sm: { wrapper: 'py-8 px-4', title: 'text-lg', description: 'text-sm', button: 'px-4 py-2 text-sm' },
    md: { wrapper: 'py-12 px-6', title: 'text-xl', description: 'text-base', button: 'px-6 py-3 text-base' },
    lg: { wrapper: 'py-16 px-8', title: 'text-2xl', description: 'text-lg', button: 'px-8 py-4 text-lg' },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={`text-center ${sizes.wrapper} ${className}`}>
      {/* Illustration */}
      <div className="mb-8">
        {illustration || (
          <EmptyIllustration type={type} color={defaultContent.color} />
        )}
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto">
        <h3 className={`${sizes.title} font-semibold text-gray-900 dark:text-white mb-3`}>
          {finalTitle}
        </h3>

        <p className={`${sizes.description} text-gray-600 dark:text-gray-400 mb-8 leading-relaxed`}>
          {finalDescription}
        </p>

        {/* Primary Action Button */}
        {onAction && (
          <button
            onClick={onAction}
            className={`inline-flex items-center ${sizes.button} border border-transparent rounded-xl shadow-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 hover:shadow-lg group`}
          >
            <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {finalActionText}
            <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
          </button>
        )}

        {/* Secondary Action */}
        {secondaryActionText && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {secondaryActionText}
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        )}

        {/* Secondary Actions (Guides & Import) */}
        {showSecondaryActions && type !== 'search' && defaultContent.guides.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button className="inline-flex items-center px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group">
              <BookOpen className="w-4 h-4 mr-2 text-gray-400 group-hover:text-primary-500 transition-colors" />
              {defaultContent.guides[0] || 'Läs guide'}
            </button>
            {defaultContent.guides[1] && (
              <button className="inline-flex items-center px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group">
                <Upload className="w-4 h-4 mr-2 text-gray-400 group-hover:text-primary-500 transition-colors" />
                {defaultContent.guides[1]}
              </button>
            )}
          </div>
        )}

        {/* Refresh for search */}
        {type === 'search' && onAction && (
          <button
            onClick={onAction}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Rensa och sök igen
          </button>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default EmptyState;
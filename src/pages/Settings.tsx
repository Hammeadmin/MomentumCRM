import React from 'react';
import { Settings as SettingsIcon, User, Users2, Bell, Shield, CreditCard, Mail, Building, Asterisk as System, Zap, FormInput, FileText, Package, Send, MessageSquare, Calculator, Sparkles, ChevronRight } from 'lucide-react';
import ReminderManagement from '../components/ReminderManagement';
import CompanyProfileSettings from '../components/settings/CompanyProfileSettings';
import UserProfileSettings from '../components/settings/UserProfileSettings';
import SystemSettings from '../components/settings/SystemSettings';
import IntegrationSettings from '../components/settings/IntegrationSettings';
import LeadFormBuilder from '../components/settings/LeadFormBuilder';
import TemplateBuilder from '../components/settings/TemplateBuilder';
import ProductLibrarySettings from '../components/settings/ProductLibrarySettings';
import EmailSettings from '../components/settings/EmailSettings';
import SmsSettings from '../components/settings/SmsSettings';
import TeamManagement from '../components/TeamManagement';
import ROTReport from '../components/ROTReport';
import RUTReport from '../components/RUTReport';

function Settings() {
  const [activeTab, setActiveTab] = React.useState<'company' | 'user' | 'system' | 'integrations' | 'email' | 'sms' | 'forms' | 'templates' | 'products' | 'reminders' | 'rot' | 'rut' | 'general'>('company');

  const settingsCategories = [
    {
      title: 'Profil',
      description: 'Hantera din personliga information',
      icon: User,
      items: ['Personuppgifter', 'Lösenord', 'Säkerhet']
    },
    {
      title: 'Notifikationer',
      description: 'Konfigurera dina aviseringar',
      icon: Bell,
      items: ['E-postnotiser', 'Push-notiser', 'SMS-påminnelser']
    },
    {
      title: 'Säkerhet',
      description: 'Säkerhetsinställningar och behörigheter',
      icon: Shield,
      items: ['Tvåfaktorsautentisering', 'Sessionshantering', 'API-nycklar']
    },
    {
      title: 'Fakturering',
      description: 'Hantera betalning och prenumeration',
      icon: CreditCard,
      items: ['Betalningsmetoder', 'Fakturor', 'Prenumerationsplan']
    }
  ];

  const sidebarGroups = [
    {
      label: 'KONTO',
      items: [
        { id: 'company' as const, label: 'Företagsprofil', icon: Building },
        { id: 'user' as const, label: 'Användarprofil', icon: User },
        { id: 'teams' as const, label: 'Team', icon: Users2 },
      ],
    },
    {
      label: 'SYSTEM',
      items: [
        { id: 'system' as const, label: 'Systeminställningar', icon: SettingsIcon },
        { id: 'integrations' as const, label: 'Integrationer', icon: Zap },
      ],
    },
    {
      label: 'KOMMUNIKATION',
      items: [
        { id: 'email' as const, label: 'E-post', icon: Send },
        { id: 'sms' as const, label: 'SMS', icon: MessageSquare },
        { id: 'reminders' as const, label: 'Påminnelser', icon: Bell },
      ],
    },
    {
      label: 'FÖRSÄLJNING',
      items: [
        { id: 'products' as const, label: 'Artiklar', icon: Package },
        { id: 'templates' as const, label: 'Offertmallar', icon: FileText },
        { id: 'forms' as const, label: 'Leadformulär', icon: FormInput },
      ],
    },
    {
      label: 'RAPPORTER',
      items: [
        { id: 'rot' as const, label: 'ROT-rapport', icon: Calculator },
        { id: 'rut' as const, label: 'RUT-rapport', icon: Sparkles },
      ],
    },
  ];

  // Derive breadcrumb from current active tab
  const currentGroup = sidebarGroups.find(g => g.items.some(i => i.id === activeTab));
  const currentItem = currentGroup?.items.find(i => i.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <SettingsIcon className="w-8 h-8 mr-3 text-primary-600" />
          Inställningar
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Hantera dina konto- och systeminställningar</p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 sticky top-6 self-start">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-3">
              {sidebarGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {groupIndex > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 my-2" />
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-3 pt-3 pb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isActive
                                ? 'bg-primary-100 dark:bg-primary-800/50'
                                : 'bg-gray-100 dark:bg-gray-800'
                              }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} />
                          </div>
                          <span className="flex-1 text-left">{item.label}</span>
                          {isActive && (
                            <ChevronRight className="w-4 h-4 text-primary-400 dark:text-primary-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* General link at bottom */}
              <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'general'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${activeTab === 'general'
                        ? 'bg-primary-100 dark:bg-primary-800/50'
                        : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                  >
                    <SettingsIcon className={`w-4 h-4 ${activeTab === 'general' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                  <span className="flex-1 text-left">Allmänt</span>
                  {activeTab === 'general' && (
                    <ChevronRight className="w-4 h-4 text-primary-400 dark:text-primary-500 flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-3">
            <span>Inställningar</span>
            <ChevronRight className="w-3 h-3" />
            <span>{currentGroup?.label ?? 'Allmänt'}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600 dark:text-gray-300">{currentItem?.label ?? 'Allmänt'}</span>
          </div>

          {/* Content panel */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm min-h-[600px] p-6">
            {activeTab === 'company' && <CompanyProfileSettings />}
            {activeTab === 'user' && <UserProfileSettings />}
            {activeTab === 'teams' && <TeamManagement />}
            {activeTab === 'system' && <SystemSettings />}
            {activeTab === 'integrations' && <IntegrationSettings />}
            {activeTab === 'email' && <EmailSettings />}
            {activeTab === 'sms' && <SmsSettings />}
            {activeTab === 'forms' && <LeadFormBuilder />}
            {activeTab === 'templates' && <TemplateBuilder />}
            {activeTab === 'products' && <ProductLibrarySettings />}
            {activeTab === 'reminders' && <ReminderManagement />}
            {activeTab === 'rot' && <ROTReport />}
            {activeTab === 'rut' && <RUTReport />}
            {activeTab === 'general' && (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {settingsCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <div key={category.title} className="bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                        <div className="p-6">
                          <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mr-4">
                              <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{category.title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
                            </div>
                          </div>
                          <ul className="space-y-2">
                            {category.items.map((item) => (
                              <li key={item} className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer">
                                <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mr-3"></div>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Systeminfo</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Version:</span>
                      <p className="text-gray-900 dark:text-white">1.0.0</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Senast uppdaterad:</span>
                      <p className="text-gray-900 dark:text-white">2024-01-15</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Support:</span>
                      <p className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 cursor-pointer">support@momentum.se</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
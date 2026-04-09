/**
 * Global Create Quote Modal
 * Self-contained wrapper around QuoteEditModal for quote creation
 * Can be opened from anywhere in the app via GlobalActionContext
 * Fetches its own data (customers, leads, templates) and passes to QuoteEditModal
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCustomers, getOrganisation } from '../lib/database';
import { supabase } from '../lib/supabase';
import QuoteEditModal from './QuoteEditModal';
import type { Customer, Lead } from '../types/database';
import type { QuoteTemplate } from '../lib/quoteTemplates';

interface CreateQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQuoteCreated: () => void;
}

const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({
    isOpen,
    onClose,
    onQuoteCreated,
}) => {
    const { organisationId } = useAuth();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (isOpen && organisationId) {
            setDataLoading(true);
            Promise.all([
                getCustomers(organisationId),
                supabase.from('leads').select('*, customer:customers(*)').eq('organisation_id', organisationId).order('created_at', { ascending: false }),
                supabase.from('quote_templates').select('*').eq('organisation_id', organisationId).order('name'),
                getOrganisation(organisationId),
            ]).then(([customersResult, leadsResult, templatesResult, orgResult]) => {
                if (customersResult.data) setCustomers(customersResult.data);
                if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
                if (templatesResult.data) setTemplates(templatesResult.data as QuoteTemplate[]);
                if (orgResult.data) setCompanyInfo(orgResult.data);
                setDataLoading(false);
            });
        }
    }, [isOpen, organisationId]);

    if (!isOpen) return null;

    if (dataLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-2xl">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                    <p className="text-sm text-gray-500">Laddar offertdata...</p>
                </div>
            </div>
        );
    }

    return (
        <QuoteEditModal
            isOpen={isOpen}
            onClose={onClose}
            quote={null}
            customers={customers}
            leads={leads}
            templates={templates}
            companyInfo={companyInfo}
            organisationId={organisationId!}
            onSave={async () => {
                onQuoteCreated();
            }}
        />
    );
};

export default CreateQuoteModal;

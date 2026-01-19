/**
 * Global Action Context
 * Provides global access to create modals from anywhere in the app
 * Renders the modals at the root level for consistent behavior
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// Lazy load modal components for better performance
const CreateLeadModal = React.lazy(() => import('../components/CreateLeadModal'));
const CreateCustomerModal = React.lazy(() => import('../components/CreateCustomerModal'));
const CreateOrderModal = React.lazy(() => import('../components/CreateOrderModal'));
const CreateQuoteModal = React.lazy(() => import('../components/CreateQuoteModal'));
const CreateInvoiceModal = React.lazy(() => import('../components/CreateInvoiceModal'));

// ============================================================================
// Types
// ============================================================================

export type GlobalModalType =
    | 'createLead'
    | 'createOrder'
    | 'createCustomer'
    | 'createQuote'
    | 'createInvoice'
    | null;

interface GlobalActionContextType {
    // Current open modal
    activeModal: GlobalModalType;

    // Modal openers
    openCreateLeadModal: () => void;
    openCreateOrderModal: () => void;
    openCreateCustomerModal: () => void;
    openCreateQuoteModal: () => void;
    openCreateInvoiceModal: () => void;

    // Close modal
    closeModal: () => void;

    // Check if any modal is open
    isModalOpen: boolean;
}

const GlobalActionContext = createContext<GlobalActionContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface GlobalActionProviderProps {
    children: React.ReactNode;
}

export function GlobalActionProvider({ children }: GlobalActionProviderProps) {
    const [activeModal, setActiveModal] = useState<GlobalModalType>(null);

    const openCreateLeadModal = useCallback(() => {
        setActiveModal('createLead');
    }, []);

    const openCreateOrderModal = useCallback(() => {
        setActiveModal('createOrder');
    }, []);

    const openCreateCustomerModal = useCallback(() => {
        setActiveModal('createCustomer');
    }, []);

    const openCreateQuoteModal = useCallback(() => {
        setActiveModal('createQuote');
    }, []);

    const openCreateInvoiceModal = useCallback(() => {
        setActiveModal('createInvoice');
    }, []);

    const closeModal = useCallback(() => {
        setActiveModal(null);
    }, []);

    const value: GlobalActionContextType = {
        activeModal,
        openCreateLeadModal,
        openCreateOrderModal,
        openCreateCustomerModal,
        openCreateQuoteModal,
        openCreateInvoiceModal,
        closeModal,
        isModalOpen: activeModal !== null
    };

    return (
        <GlobalActionContext.Provider value={value}>
            {children}

            {/* Global Modals - Rendered at root level */}
            <GlobalModals
                activeModal={activeModal}
                closeModal={closeModal}
            />
        </GlobalActionContext.Provider>
    );
}

// ============================================================================
// Global Modals Component
// ============================================================================

interface GlobalModalsProps {
    activeModal: GlobalModalType;
    closeModal: () => void;
}

function GlobalModals({ activeModal, closeModal }: GlobalModalsProps) {
    // Handle successful creation - just close the modal
    // The individual pages will refresh via their own React Query invalidation
    const handleCreated = () => {
        closeModal();
    };

    if (!activeModal) return null;

    return (
        <React.Suspense fallback={
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Laddar...</p>
                </div>
            </div>
        }>
            {/* Create Lead Modal */}
            {activeModal === 'createLead' && (
                <CreateLeadModal
                    isOpen={true}
                    onClose={closeModal}
                    onLeadCreated={handleCreated}
                />
            )}

            {/* Create Customer Modal */}
            {activeModal === 'createCustomer' && (
                <CreateCustomerModal
                    isOpen={true}
                    onClose={closeModal}
                    onCustomerCreated={handleCreated}
                />
            )}

            {/* Create Order Modal */}
            {activeModal === 'createOrder' && (
                <CreateOrderModal
                    isOpen={true}
                    onClose={closeModal}
                    onOrderCreated={handleCreated}
                />
            )}

            {/* Create Quote Modal */}
            {activeModal === 'createQuote' && (
                <CreateQuoteModal
                    isOpen={true}
                    onClose={closeModal}
                    onQuoteCreated={handleCreated}
                />
            )}

            {/* Create Invoice Modal */}
            {activeModal === 'createInvoice' && (
                <CreateInvoiceModal
                    isOpen={true}
                    onClose={closeModal}
                    onInvoiceCreated={handleCreated}
                />
            )}
        </React.Suspense>
    );
}

// ============================================================================
// Hook
// ============================================================================

export function useGlobalAction() {
    const context = useContext(GlobalActionContext);
    if (context === undefined) {
        throw new Error('useGlobalAction must be used within a GlobalActionProvider');
    }
    return context;
}

export default GlobalActionContext;

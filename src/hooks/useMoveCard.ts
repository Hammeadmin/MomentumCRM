import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { updateOrder, type OrderWithRelations } from '../lib/orders';
import { updateLead, type LeadWithRelations } from '../lib/leads';
import type { OrderStatus, LeadStatus, QuoteStatus } from '../types/database';
import type { QuoteWithRelations } from '../lib/quotes';
import type { KanbanData } from './useKanbanData';

// ============================================================================
// Types
// ============================================================================

export type CardType = 'order' | 'lead' | 'quote';

export interface MoveCardParams {
    cardId: string;
    cardType: CardType;
    newStatus: string;
    previousStatus: string;
}

interface MoveCardContext {
    previousData: KanbanData | undefined;
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Updates an order's status in the cached data
 */
const updateOrderInCache = (
    orders: OrderWithRelations[],
    orderId: string,
    newStatus: OrderStatus
): OrderWithRelations[] => {
    return orders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
    );
};

/**
 * Updates a lead's status in the cached data
 */
const updateLeadInCache = (
    leads: LeadWithRelations[],
    leadId: string,
    newStatus: LeadStatus
): LeadWithRelations[] => {
    return leads.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
    );
};

/**
 * Updates a quote's status in the cached data
 */
const updateQuoteInCache = (
    quotes: QuoteWithRelations[],
    quoteId: string,
    newStatus: QuoteStatus
): QuoteWithRelations[] => {
    return quotes.map((quote) =>
        quote.id === quoteId ? { ...quote, status: newStatus } : quote
    );
};

// ============================================================================
// useMoveCard Hook
// ============================================================================

/**
 * Custom hook for moving cards between Kanban columns with optimistic updates.
 *
 * Uses React Query's useMutation with:
 * - onMutate: Immediately updates the cache for instant UI feedback
 * - onError: Rolls back to previous state if the API call fails
 * - onSettled: Invalidates the cache to ensure data consistency
 *
 * @example
 * const { moveCard, isMoving } = useMoveCard();
 *
 * // In drag handler:
 * moveCard({
 *   cardId: order.id,
 *   cardType: 'order',
 *   newStatus: 'bokad_bekräftad',
 *   previousStatus: 'öppen_order'
 * });
 */
export function useMoveCard() {
    const queryClient = useQueryClient();
    const { organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const mutation = useMutation<void, Error, MoveCardParams, MoveCardContext>({
        mutationFn: async ({ cardId, cardType, newStatus }) => {
            // Call the appropriate API based on card type
            switch (cardType) {
                case 'order': {
                    const result = await updateOrder(cardId, { status: newStatus as OrderStatus });
                    if (result.error) throw result.error;
                    break;
                }
                case 'lead': {
                    const result = await updateLead(cardId, { status: newStatus as LeadStatus });
                    if (result.error) throw result.error;
                    break;
                }
                case 'quote': {
                    // Quote status updates would go here
                    // For now, quotes may not support direct status changes via drag
                    console.warn('Quote status changes via drag not yet implemented');
                    break;
                }
                default:
                    throw new Error(`Unknown card type: ${cardType}`);
            }
        },

        // Optimistic update: immediately update the cache before API call
        onMutate: async ({ cardId, cardType, newStatus }) => {
            // Cancel any outgoing refetches to avoid overwriting our optimistic update
            await queryClient.cancelQueries({ queryKey: ['kanban-data'] });

            // Snapshot the previous data for potential rollback
            const previousData = queryClient.getQueryData<KanbanData>([
                'kanban-data',
                organisationId,
                {}, // filters - may need adjustment based on actual usage
            ]);

            // Optimistically update the cache
            queryClient.setQueriesData<KanbanData>(
                { queryKey: ['kanban-data'] },
                (old) => {
                    if (!old) return old;

                    switch (cardType) {
                        case 'order':
                            return {
                                ...old,
                                orders: updateOrderInCache(old.orders, cardId, newStatus as OrderStatus),
                            };
                        case 'lead':
                            return {
                                ...old,
                                leads: updateLeadInCache(old.leads, cardId, newStatus as LeadStatus),
                            };
                        case 'quote':
                            return {
                                ...old,
                                quotes: updateQuoteInCache(old.quotes, cardId, newStatus as QuoteStatus),
                            };
                        default:
                            return old;
                    }
                }
            );

            // Return context with previous data for rollback
            return { previousData };
        },

        // Rollback on error
        onError: (err, { cardType, previousStatus }, context) => {
            console.error('Error moving card:', err);

            // Rollback to the previous data
            if (context?.previousData) {
                queryClient.setQueriesData<KanbanData>(
                    { queryKey: ['kanban-data'] },
                    context.previousData
                );
            }

            // Show error toast
            showError(
                'Kunde inte flytta kortet',
                err.message || 'Ett oväntat fel inträffade'
            );
        },

        // After success, show confirmation
        onSuccess: (_, { cardType }) => {
            const cardLabel = cardType === 'order' ? 'Order' : cardType === 'lead' ? 'Lead' : 'Offert';
            success('Status uppdaterad', `${cardLabel} flyttades framgångsrikt`);
        },

        // Always refetch after mutation to ensure consistency
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['kanban-data'] });
        },
    });

    return {
        moveCard: mutation.mutate,
        moveCardAsync: mutation.mutateAsync,
        isMoving: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        reset: mutation.reset,
    };
}

export default useMoveCard;

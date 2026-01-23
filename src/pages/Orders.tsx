/**
 * Orders Page
 * 
 * Displays orders with toggle between Kanban and Table views.
 * - Kanban: Drag-and-drop columns by status
 * - Table: Dense sortable rows with filter tabs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Table2 } from 'lucide-react';
import OrderKanban from '../components/OrderKanban';
import OrderTable from '../components/OrderTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { getOrders, OrderWithRelations, updateOrder, deleteOrder } from '../lib/orders';
import { OrderStatus } from '../types/database';

type ViewMode = 'kanban' | 'table';

function Orders() {
  const { organisationId } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load saved preference
    const saved = localStorage.getItem('ordersViewMode');
    return (saved as ViewMode) || 'kanban';
  });
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithRelations | null>(null);

  // Save view preference
  useEffect(() => {
    localStorage.setItem('ordersViewMode', viewMode);
  }, [viewMode]);

  // Fetch orders for table view
  useEffect(() => {
    if (viewMode === 'table' && organisationId) {
      fetchOrders();
    }
  }, [viewMode, organisationId, currentPage]);

  const fetchOrders = async () => {
    if (!organisationId) return;

    setLoading(true);
    try {
      const { data, count, error } = await getOrders(organisationId, {}, currentPage, pageSize);
      if (error) throw error;
      setOrders(data || []);
      setTotalCount(count);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleOrderClick = (order: OrderWithRelations) => {
    // Navigate to order detail page (matches route: /app/order/:id)
    navigate(`/app/order/${order.id}`);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // Update in local state
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
    // Update in database
    try {
      await updateOrder(orderId, { status: newStatus });
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const handleDeleteRequest = (order: OrderWithRelations) => {
    setOrderToDelete(order);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      const { error } = await deleteOrder(orderToDelete.id);
      if (error) throw error;

      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      success('Order borttagen', `"${orderToDelete.title}" har tagits bort.`);
    } catch (err) {
      console.error('Error deleting order:', err);
      showError('Kunde inte ta bort', 'Ett fel uppstod vid borttagning av ordern.');
    } finally {
      setShowDeleteDialog(false);
      setOrderToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Ordrar</h1>

        {/* View Toggle */}
        <div className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'kanban'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'table'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
          >
            <Table2 className="w-4 h-4" />
            Tabell
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <OrderKanban />
      ) : (
        <OrderTable
          orders={orders}
          loading={loading}
          onOrderClick={handleOrderClick}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteRequest}
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setOrderToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        title="Ta bort order"
        message={`Är du säker på att du vill ta bort ordern "${orderToDelete?.title}"? Denna åtgärd kan inte ångras.`}
        confirmText="Ta bort"
        cancelText="Avbryt"
        type="danger"
      />
    </div>
  );
}

export default Orders;
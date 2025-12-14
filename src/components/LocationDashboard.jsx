import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, X } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { generateTransferPackingList } from '../utils/pdfGenerator';
import Toast from './Toast';

const LocationDashboard = () => {
    const { location } = useParams();
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const {
        transferOrders,
        updateTransferOrderStatus,
        deleteTransferOrder,
        updateTransferOrder,
        inventory,
        locationSRPs,
        addStock,
        addLegazpiStock,
        legazpiInventory,
        loading // Add loading
    } = useInventory();
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Preview Modal State
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewTitle, setPreviewTitle] = useState('');

    // Edit Modal State
    const [editingOrder, setEditingOrder] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [processingOrderId, setProcessingOrderId] = useState(null); // Prevent double-clicks

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-gray-500">Loading transactions...</span>
            </div>
        );
    }

    // Filter and sort orders for this location
    const filteredOrders = (transferOrders || []).filter(order => {
        const orderLocation = order.destination;
        return orderLocation === location ||
            orderLocation?.toLowerCase() === location.toLowerCase() ||
            (orderLocation && decodeURIComponent(location) === orderLocation);
    });

    const sortedOrders = [...filteredOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

    const handleStatusChange = async (id, newStatus) => {
        // Prevent double-clicks - if this order is already being processed, ignore
        if (processingOrderId === id) {
            console.log('Already processing this order, ignoring click');
            return;
        }

        // Find the order to get item details
        const order = sortedOrders.find(o => o.id === id);

        if (!order) {
            console.error('Order not found:', id);
            return;
        }

        // Check if status is changing TO "Completed" and wasn't already Completed
        if (newStatus === 'Completed' && order.status !== 'Completed') {
            // Set processing state immediately to prevent double-clicks
            setProcessingOrderId(id);

            // Update status IMMEDIATELY (optimistic update) for instant UI feedback
            updateTransferOrderStatus(id, newStatus);

            try {
                // Process inventory adjustments for each item
                for (const [sku, qty] of Object.entries(order.items || {})) {
                    const fromLocation = order.from_location || 'FTF Manufacturing';
                    const toLocation = order.destination || order.to_location;

                    // Deduct from source location
                    if (fromLocation === 'FTF Manufacturing') {
                        await addStock(sku, -qty);
                        console.log(`Deducted ${qty} of ${sku} from FTF Manufacturing`);
                    } else if (fromLocation === 'Legazpi Storage') {
                        // Support both SKU and Name-Flavor fallback for older records
                        const product = legazpiInventory.find(p => p.sku === sku || `${p.product_name}-${p.flavor || 'Default'}` === sku);
                        if (product) {
                            await addLegazpiStock(product.id, -qty);
                            console.log(`Deducted ${qty} of ${sku} from Legazpi Storage`);
                        }
                    }

                    // Add to destination location (for warehouses)
                    if (toLocation === 'Legazpi Storage') {
                        // Support both SKU and Name-Flavor fallback for older records
                        const product = legazpiInventory.find(p => p.sku === sku || `${p.product_name}-${p.flavor || 'Default'}` === sku);
                        if (product) {
                            await addLegazpiStock(product.id, qty);
                            console.log(`Added ${qty} of ${sku} to Legazpi Storage`);
                        }
                    } else if (toLocation === 'FTF Manufacturing') {
                        await addStock(sku, qty);
                        console.log(`Added ${qty} of ${sku} to FTF Manufacturing`);
                    }
                    // Note: For branch locations (not warehouses), we don't add to inventory
                    // as branches are just transfer destinations, not tracked inventory
                }

                console.log('Transfer completed! Stock has been adjusted.');
                // Show Success Toast
                setToastMessage('Transfer Completed! Stock deducted.');
                setShowToast(true);
            } catch (error) {
                console.error('Error adjusting stock:', error);
                alert('Failed to adjust stock: ' + error.message);
                // Revert status on error
                updateTransferOrderStatus(id, order.status);
            } finally {
                setProcessingOrderId(null);
            }
            return; // Already updated status above
        }

        // Check if status is changing FROM "Completed" (Undo/Reversal)
        if (order.status === 'Completed' && newStatus !== 'Completed') {
            if (!confirm(`Are you sure you want to revert this Completed order? Stock will be RETURNED to ${order.from_location}.`)) {
                return;
            }

            setProcessingOrderId(id);
            updateTransferOrderStatus(id, newStatus); // Optimistic update

            try {
                // Reverse inventory adjustments
                for (const [sku, qty] of Object.entries(order.items || {})) {
                    const fromLocation = order.from_location || 'FTF Manufacturing';
                    const toLocation = order.destination || order.to_location;

                    // RETURN to source location
                    if (fromLocation === 'FTF Manufacturing') {
                        await addStock(sku, qty); // Add back (positive)
                        console.log(`Returned ${qty} of ${sku} to FTF Manufacturing`);
                    } else if (fromLocation === 'Legazpi Storage') {
                        const product = legazpiInventory.find(p => p.sku === sku || `${p.product_name}-${p.flavor || 'Default'}` === sku);
                        if (product) {
                            await addLegazpiStock(product.id, qty); // Add back (positive)
                            console.log(`Returned ${qty} of ${sku} to Legazpi Storage`);
                        }
                    }

                    // REMOVE from destination location
                    if (toLocation === 'Legazpi Storage') {
                        const product = legazpiInventory.find(p => p.sku === sku || `${p.product_name}-${p.flavor || 'Default'}` === sku);
                        if (product) {
                            await addLegazpiStock(product.id, -qty); // Remove (negative)
                            console.log(`Removed ${qty} of ${sku} from Legazpi Storage (Reversal)`);
                        }
                    } else if (toLocation === 'FTF Manufacturing') {
                        await addStock(sku, -qty); // Remove (negative)
                        console.log(`Removed ${qty} of ${sku} from FTF Manufacturing (Reversal)`);
                    }
                }
                console.log('Transfer reversal completed!');
                // Show Success Toast
                setToastMessage('Transfer Reverted! Stock returned.');
                setShowToast(true);
            } catch (error) {
                console.error('Error reversing stock:', error);
                alert('Failed to reverse stock: ' + error.message);
                updateTransferOrderStatus(id, order.status); // Revert on error
            } finally {
                setProcessingOrderId(null);
            }
            return;
        }

        // Update the order status for non-Completed changes
        // Update the order status for non-Completed changes
        updateTransferOrderStatus(id, newStatus);
        setToastMessage(`Status updated to ${newStatus}`);
        setShowToast(true);
    };

    // Packing List Handlers
    const handleCreatePackingList = async (order) => {
        try {
            const prices = locationSRPs[order.destination] || null;
            await generateTransferPackingList(order, inventory, prices);
            // Update DB
            await updateTransferOrder(order.id, { hasPackingList: true });
        } catch (error) {
            console.error("Error creating packing list:", error);
            alert("Failed to create packing list.");
        }
    };

    const handleViewPackingList = async (order) => {
        try {
            const orderWithBlob = {
                ...order,
                returnBlob: true
            };
            const prices = locationSRPs[order.destination] || null;
            const url = await generateTransferPackingList(orderWithBlob, inventory, prices);
            setPreviewUrl(url);
            setPreviewTitle(`Transfer Packing List - ${order.destination}`);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Error viewing packing list:", error);
            alert("Failed to view packing list.");
        }
    };

    const handleEditOrder = (order) => {
        setEditingOrder(order);
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingOrder) return;

        try {
            // Calculate new total amount
            let newTotalAmount = 0;
            const destination = editingOrder.destination;

            // Calculate total using location SRPs if available
            if (locationSRPs[destination]) {
                Object.entries(editingOrder.items).forEach(([sku, qty]) => {
                    const price = locationSRPs[destination][sku] || 0;
                    newTotalAmount += price * qty;
                });
            }

            // Update the order in database
            await updateTransferOrder(editingOrder.id, {
                items: editingOrder.items,
                total_amount: newTotalAmount
            });

            alert('Transfer updated successfully!');
            setShowEditModal(false);
            setEditingOrder(null);
        } catch (error) {
            console.error('Error updating transfer:', error);
            alert('Failed to update transfer: ' + error.message);
        }
    };

    const handleDeleteOrder = async (order) => {
        const confirmMessage = `Are you sure you want to delete this transfer order for ${order.location}?\n\nThis will return the stock to FTF Manufacturing.`;

        if (window.confirm(confirmMessage)) {
            try {
                await deleteTransferOrder(order.id);
                alert('Transfer order deleted successfully. Stock has been returned to inventory.');
            } catch (error) {
                console.error('Error deleting transfer order:', error);
                alert('Failed to delete transfer order.');
            }
        }
    };

    return (
        <div className="fade-in">
            <div className="header-section">
                <h2 className="page-title">{decodeURIComponent(location)} Dashboard</h2>
                <p className="page-subtitle">Transaction History</p>
            </div>

            <div className="table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>FROM Location</th>
                            <th>TO Location</th>
                            <th>Category</th>
                            <th>Total Amount</th>
                            <th className="text-center">Details</th>
                            <th className="text-center">Packing List & Total Bill</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="empty-state">
                                    No transactions found for this location.
                                </td>
                            </tr>
                        ) : (
                            sortedOrders.map(order => (
                                <tr key={order.id}>
                                    <td>{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="font-medium">{order.from_location || 'FTF Manufacturing'}</td>
                                    <td className="font-medium">{order.destination}</td>
                                    <td>Stock Transfer</td>
                                    <td className="font-bold text-primary">₱{order.total_amount?.toLocaleString() || 0}</td>
                                    <td className="text-center">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="std-btn std-btn-primary"
                                        >
                                            Details
                                        </button>
                                    </td>
                                    {/* Packing List Column */}
                                    <td className="text-center">
                                        {order.hasPackingList ? (
                                            <button
                                                onClick={() => handleViewPackingList(order)}
                                                className="std-btn std-btn-primary"
                                            >
                                                View PDF
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleCreatePackingList(order)}
                                                className="std-btn std-btn-primary"
                                            >
                                                Create
                                            </button>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <div className="status-select-wrapper">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                disabled={processingOrderId === order.id}
                                                className={`std-badge-select status-${order.status.toLowerCase().replace(' ', '-')}`}
                                                style={{
                                                    opacity: processingOrderId === order.id ? 0.7 : 1
                                                }}
                                            >
                                                <option value="Unread">Unread</option>
                                                <option value="Processing">Processing</option>
                                                <option value="In Transit">In Transit</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </td>
                                    {/* Actions Column */}
                                    <td className="text-center">
                                        <div className="std-action-wrapper">
                                            <button
                                                onClick={() => handleEditOrder(order)}
                                                className="std-icon-btn"
                                                title="Edit Order"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteOrder(order)}
                                                className="std-icon-btn danger"
                                                title="Delete Order"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Transaction Details</h3>
                            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-gray-500">FROM Location</p>
                                    <p className="font-medium">{selectedOrder.from_location || 'FTF Manufacturing'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">TO Location</p>
                                    <p className="font-medium">{selectedOrder.destination}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Type</p>
                                    <p className="font-medium">Stock Transfer</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Date</p>
                                    <p className="font-medium">{new Date(selectedOrder.date).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Amount</p>
                                    <p className="font-bold text-primary">₱{selectedOrder.total_amount?.toLocaleString() || 0}</p>
                                </div>
                            </div>

                            <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-gray-500">Items</h4>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-200">
                                            <th className="pb-2">Item</th>
                                            <th className="pb-2 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(selectedOrder.items).map(([sku, qty]) => (
                                            <tr key={sku} className="border-b border-gray-100 last:border-0">
                                                <td className="py-2">
                                                    <span className="font-medium text-gray-700">{sku}</span>
                                                    <span className="block text-xs text-gray-500">
                                                        {inventory.find(i => i.sku === sku)?.description}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-right font-medium">{qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPreviewModal && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-content large-modal" style={{ width: '90%', height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{previewTitle}</h3>
                            <div className="flex gap-2">
                                <a
                                    href={previewUrl}
                                    download={`${previewTitle.replace(/\s+/g, '_')}.pdf`}
                                    className="icon-btn text-primary"
                                    title="Download PDF"
                                    style={{ padding: '4px 8px', height: 'auto', fontSize: '0.8rem' }}
                                >
                                    Download PDF
                                </a>
                                <button className="close-btn" onClick={() => setShowPreviewModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="modal-body" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                            <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Preview" />
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transfer Modal */}
            {showEditModal && editingOrder && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Transfer Order</h3>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-gray-500">FROM Location</p>
                                    <p className="font-medium">{editingOrder.from_location || 'FTF Manufacturing'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">TO Location</p>
                                    <p className="font-medium">{editingOrder.destination}</p>
                                </div>
                            </div>

                            <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-gray-500">Edit Items</h4>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-200">
                                            <th className="pb-2">Item</th>
                                            <th className="pb-2 text-right">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(editingOrder.items).map(([sku, qty]) => (
                                            <tr key={sku} className="border-b border-gray-100 last:border-0">
                                                <td className="py-2">
                                                    <span className="font-medium text-gray-700">{sku}</span>
                                                    <span className="block text-xs text-gray-500">
                                                        {inventory.find(i => i.sku === sku)?.description}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={qty}
                                                        onChange={(e) => {
                                                            const newQty = parseInt(e.target.value) || 0;
                                                            setEditingOrder({
                                                                ...editingOrder,
                                                                items: {
                                                                    ...editingOrder.items,
                                                                    [sku]: newQty
                                                                }
                                                            });
                                                        }}
                                                        className="w-20 px-2 py-1 border rounded text-right"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 flex gap-2 justify-end">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 border rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="submit-btn px-4 py-2"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Toast Notification */}
            {showToast && (
                <Toast
                    message={toastMessage}
                    onClose={() => setShowToast(false)}
                    duration={3000}
                />
            )}
        </div>
    );
};

export default LocationDashboard;

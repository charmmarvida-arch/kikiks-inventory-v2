import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { Eye, X, Edit2, Trash2 } from 'lucide-react';
import { generatePackingList } from '../utils/pdfGenerator';

const LocationDashboard = () => {
    const { location } = useParams();
    const {
        transferOrders,
        updateTransferOrderStatus,
        deleteTransferOrder,
        updateTransferOrder,
        inventory,
        locationSRPs
    } = useInventory();
    const [selectedOrder, setSelectedOrder] = useState(null);

    const handleStatusChange = (id, newStatus) => {
        updateTransferOrderStatus(id, newStatus);
    };

    // Packing List Handlers
    const handleCreatePackingList = async (order) => {
        try {
            // Format order to match expected structure (similar to reseller order)
            const formattedOrder = {
                ...order,
                resellerName: order.location, // Use location as "reseller" name
                address: '' // Transfer orders don't have addresses
            };
            await generatePackingList(formattedOrder, inventory, locationSRPs[order.location] || {});
            // Update DB
            await updateTransferOrder(order.id, { hasPackingList: true });
        } catch (error) {
            console.error("Error creating packing list:", error);
            alert("Failed to create packing list.");
        }
    };

    const handleViewPackingList = async (order) => {
        try {
            const formattedOrder = {
                ...order,
                resellerName: order.location,
                address: '',
                returnBlob: true
            };
            const url = await generatePackingList(formattedOrder, inventory, locationSRPs[order.location] || {});
            setPreviewUrl(url);
            setPreviewTitle(`Packing List - ${order.location}`);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Error viewing packing list:", error);
            alert("Failed to view packing list.");
        }
    };

    const handleEditOrder = (order) => {
        // TODO: Implement edit functionality
        // For now, just show an alert
        alert(`Edit functionality for order ${order.id} will be implemented soon.`);
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
                                            className="icon-btn text-primary inline-flex items-center gap-1 w-auto px-2"
                                            title="View Details"
                                        >
                                            <Eye size={16} /> View
                                        </button>
                                    </td>
                                    {/* Packing List Column */}
                                    <td className="text-center">
                                        {order.hasPackingList ? (
                                            <button
                                                className="text-btn text-primary font-medium text-sm inline-flex items-center gap-1"
                                                onClick={() => handleViewPackingList(order)}
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        ) : (
                                            <button
                                                className="text-btn text-secondary underline text-sm"
                                                onClick={() => handleCreatePackingList(order)}
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
                                                className={`status-badge status-${order.status.toLowerCase().replace(' ', '-')}`}
                                                style={{
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    appearance: 'none',
                                                    paddingRight: '1.5rem',
                                                    textAlign: 'center',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Transit">In Transit</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </td>
                                    {/* Actions Column */}
                                    <td className="text-center">
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => handleEditOrder(order)}
                                                className="icon-btn p-1"
                                                title="Edit Order"
                                                style={{ width: 'auto', minWidth: 'unset' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteOrder(order)}
                                                className="icon-btn p-1 text-danger"
                                                title="Delete Order"
                                                style={{ width: 'auto', minWidth: 'unset' }}
                                            >
                                                <Trash2 size={16} />
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
        </div>
    );
};

export default LocationDashboard;

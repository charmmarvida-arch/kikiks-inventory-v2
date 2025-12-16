
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Eye, X, Edit2, Trash2 } from 'lucide-react';
import { generatePackingList, generateCOA } from '../utils/pdfGenerator';

const ResellerOrderList = () => {
    const { resellerOrders, updateResellerOrderStatus, updateResellerOrder, inventory, resellerPrices, deleteResellerOrder, resellers, resellerZones, zonePrices } = useInventory();
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showCOAModal, setShowCOAModal] = useState(false);
    const [selectedCOAOrder, setSelectedCOAOrder] = useState(null);
    const [showConfirmCOA, setShowConfirmCOA] = useState(false);
    const [bestBeforeDates, setBestBeforeDates] = useState({});
    const [preparedBy, setPreparedBy] = useState('');
    const [preparedDate, setPreparedDate] = useState('');

    // Filter out COMPLETED orders
    const activeOrders = resellerOrders.filter(order => order.status !== 'Completed');

    // Preview Modal State
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewTitle, setPreviewTitle] = useState('');

    const handleStatusChange = (id, newStatus) => {
        updateResellerOrderStatus(id, newStatus);
    };

    const handleEditOrder = (order) => {
        navigate(`/reseller-order/edit/${order.id}`);
    };

    const handleDeleteOrder = async (order) => {
        if (window.confirm(`Are you sure you want to delete the order for ${order.resellerName} ? `)) {
            try {
                await deleteResellerOrder(order.id);
                alert('Order deleted successfully');
            } catch (error) {
                console.error('Error deleting order:', error);
                alert('Failed to delete order');
            }
        }
    };

    const getProductDescription = (sku) => {
        const item = inventory.find(i => i.sku === sku);
        return item ? item.description : sku;
    };

    const handleOpenCOAModal = (order) => {
        setSelectedCOAOrder(order);

        // Use existing data if available, otherwise initialize
        if (order.coaData && Object.keys(order.coaData).length > 0) {
            setBestBeforeDates(order.coaData);
        } else {
            const initialDates = {};
            Object.keys(order.items).forEach(sku => {
                if (order.items[sku] > 0) {
                    initialDates[sku] = ['']; // Initialize as array with one empty string
                }
            });
            setBestBeforeDates(initialDates);
        }

        // Initialize Prepared By and Date
        if (order.coaData && order.coaData.preparedBy) {
            setPreparedBy(order.coaData.preparedBy);
        } else {
            setPreparedBy('');
        }

        if (order.coaData && order.coaData.preparedDate) {
            setPreparedDate(order.coaData.preparedDate);
        } else {
            // Default to today's date
            const today = new Date().toISOString().split('T')[0];
            setPreparedDate(today);
        }

        setShowCOAModal(true);
    };

    const handleDateChange = (sku, date) => {
        setBestBeforeDates(prev => ({
            ...prev,
            [sku]: date
        }));
    };

    // Helper to resolve prices for specific order based on Zone/Reseller logic
    const getEffectivePdfPrices = (order) => {
        const itemPrices = {};
        const prefixes = ['FGC', 'FGP', 'FGL', 'FGG', 'FGT'];

        // Find zone info
        const reseller = resellers.find(r => r.id === order.resellerId);
        const zone = reseller ? resellerZones.find(z => z.id === reseller.zone_id) : null;

        // Key must match order.location for PDF generator
        const locationKey = order.location || 'Unknown';
        itemPrices[locationKey] = {};

        prefixes.forEach(prefix => {
            let price = 0;
            // 1. Zone Specific
            if (zone && zonePrices[zone.id] && zonePrices[zone.id][prefix]) {
                price = Number(zonePrices[zone.id][prefix]);
            }
            // 2. Global Reseller Setting
            else if (resellerPrices[prefix]) {
                price = Number(resellerPrices[prefix]);
            }
            // 3. Fallback
            else {
                const BASE_PRICES = { 'FGC': 23, 'FGP': 85, 'FGL': 170, 'FGG': 680, 'FGT': 1000 };
                price = BASE_PRICES[prefix] || 0;
            }
            itemPrices[locationKey][prefix] = price;
        });

        return itemPrices;
    };

    // --- Packing List Handlers ---
    const handleCreatePackingList = async (order) => {
        try {
            const effectivePrices = getEffectivePdfPrices(order);
            await generatePackingList(order, inventory, effectivePrices);
            // Update DB
            await updateResellerOrder(order.id, { hasPackingList: true });
        } catch (error) {
            console.error("Error creating packing list:", error);
            alert("Failed to create packing list.");
        }
    };

    const handleViewPackingList = async (order) => {
        try {
            const effectivePrices = getEffectivePdfPrices(order);
            const url = await generatePackingList({ ...order, returnBlob: true }, inventory, effectivePrices);
            setPreviewUrl(url);
            setPreviewTitle(`Packing List - ${order.resellerName} `);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Error viewing packing list:", error);
            alert("Failed to view packing list.");
        }
    };

    // --- COA Handlers ---
    const handleGenerateCOA = async () => {
        if (!preparedBy.trim()) {
            alert("Please enter 'Prepared by' name.");
            return;
        }
        setShowConfirmCOA(true);
    };

    const handleConfirmGenerateCOA = async () => {
        if (selectedCOAOrder) {
            try {
                console.log('Starting COA generation...');
                // Pass preparedBy and preparedDate to generateCOA
                const coaData = {
                    ...bestBeforeDates,
                    preparedBy,
                    preparedDate
                };
                await generateCOA(selectedCOAOrder, coaData, inventory);

                // Get current user's email/name
                const createdBy = userProfile?.email || 'Unknown User';
                const encodedBy = userProfile?.email || 'Unknown User';

                // Update DB with status and data
                await updateResellerOrder(selectedCOAOrder.id, {
                    hasCOA: true,
                    coaData: {
                        ...bestBeforeDates,
                        preparedBy,
                        preparedDate
                    },
                    created_by: createdBy,
                    encoded_by: encodedBy
                });

                console.log('COA generation completed!');
                setShowConfirmCOA(false);
                setShowCOAModal(false);
                // Show success message or just close? User requested success alert?
                // "if yes,it will create the ordersuccessfully with apop up modal alert"
                alert("COA Generated Successfully!");

            } catch (error) {
                console.error('Error generating COA:', error);
                alert('Error generating COA: ' + error.message);
                setShowConfirmCOA(false);
            }
        }
    };

    const handleViewCOA = async (order) => {
        try {
            // Use saved data for view
            const url = await generateCOA({ ...order, returnBlob: true }, order.coaData || {}, inventory);
            setPreviewUrl(url);
            setPreviewTitle(`COA - ${order.resellerName} `);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Error viewing COA:", error);
            alert("Failed to view COA.");
        }
    };

    return (
        <div className="fade-in">
            <div className="header-section">
                <h2 className="page-title">Pending Orders</h2>
                <p className="page-subtitle">Manage and track reseller orders</p>
            </div>

            {/* Desktop Table View */}
            <div className="form-card p-0 overflow-hidden flex flex-col desktop-only" style={{ height: 'calc(100vh - 340px)' }}>
                <div className="table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', margin: 0, borderRadius: 0, border: 'none', boxShadow: 'none' }}>
                    <table className="inventory-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }}>
                            <tr>
                                <th rowSpan="2">Date</th>
                                <th rowSpan="2">Reseller</th>
                                <th rowSpan="2">Category</th>
                                <th rowSpan="2">Total Amount</th>
                                <th rowSpan="2">Order Details</th>
                                <th colSpan="2" className="text-center border-b border-gray-200">Create Document</th>
                                <th rowSpan="2">Status</th>
                            </tr>
                            <tr>
                                <th className="text-center text-xs p-2">Packing List</th>
                                <th className="text-center text-xs p-2">COA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="empty-state">
                                        No active orders found.
                                    </td>
                                </tr>
                            ) : (
                                activeOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{new Date(order.date).toLocaleDateString()}</span>
                                                <span className="text-xs text-secondary">{new Date(order.date).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="font-medium">{order.resellerName}</td>
                                        <td>{order.location}</td>
                                        <td className="font-bold">₱{order.totalAmount.toLocaleString()}</td>
                                        <td className="text-center">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="std-btn std-btn-primary"
                                            >
                                                <Eye size={14} style={{ marginRight: '4px' }} /> Details
                                            </button>
                                        </td>
                                        {/* Create Document Columns */}
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
                                                    Create List
                                                </button>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {order.hasCOA ? (
                                                <button
                                                    onClick={() => handleViewCOA(order)}
                                                    className="std-btn std-btn-primary"
                                                >
                                                    View COA
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleOpenCOAModal(order)}
                                                    className="std-btn std-btn-primary"
                                                >
                                                    Create COA
                                                </button>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                    className={`std-badge-select status-${order.status.toLowerCase()}`}
                                                    style={{ flex: 1 }}
                                                >
                                                    <option value="Unread">Unread</option>
                                                    <option value="Read">Read</option>
                                                    <option value="Processing">Processing</option>
                                                    <option value="Completed">Completed</option>
                                                </select>
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
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-only" style={{ padding: '1rem' }}>
                {activeOrders.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No active orders found.
                    </div>
                ) : (
                    activeOrders.map(order => (
                        <div key={order.id} className="mobile-order-card" style={{
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            marginBottom: '1rem',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                        {order.resellerName}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {new Date(order.date).toLocaleDateString()} • {new Date(order.date).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    ₱{order.totalAmount.toLocaleString()}
                                </div>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                Category: {order.location}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="icon-btn text-primary"
                                    style={{ fontSize: '0.75rem', padding: '0.5rem', width: '100%' }}
                                >
                                    <Eye size={14} /> Details
                                </button>
                                <button
                                    onClick={order.hasPackingList ? () => handleViewPackingList(order) : () => handleCreatePackingList(order)}
                                    className="text-btn"
                                    style={{ fontSize: '0.75rem', padding: '0.5rem', width: '100%' }}
                                >
                                    {order.hasPackingList ? 'View' : 'Create'} Packing
                                </button>
                                <button
                                    onClick={order.hasCOA ? () => handleViewCOA(order) : () => handleOpenCOAModal(order)}
                                    className="text-btn"
                                    style={{ fontSize: '0.75rem', padding: '0.5rem', width: '100%' }}
                                >
                                    {order.hasCOA ? 'View' : 'Create'} COA
                                </button>
                                <select
                                    value={order.status}
                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                    className={`status - badge status - ${order.status.toLowerCase()} `}
                                    style={{ fontSize: '0.75rem', padding: '0.5rem', width: '100%' }}
                                >
                                    <option value="Unread">Unread</option>
                                    <option value="Read">Read</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
                        </div>
                    ))
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Order Details</h3>
                            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="grid-responsive two-cols mb-6">
                                <div>
                                    <label className="text-secondary text-sm">Reseller</label>
                                    <div className="font-bold">{selectedOrder.resellerName}</div>
                                </div>
                                <div>
                                    <label className="text-secondary text-sm">Category</label>
                                    <div className="font-bold">{selectedOrder.location}</div>
                                </div>
                                <div>
                                    <label className="text-secondary text-sm">Date</label>
                                    <div>{new Date(selectedOrder.date).toLocaleString()}</div>
                                </div>
                                <div>
                                    <label className="text-secondary text-sm">Address</label>
                                    <div>{selectedOrder.address || 'N/A'}</div>
                                </div>
                            </div>

                            <h4 className="card-heading text-base mb-4 pb-2 border-b border-gray-200">Items</h4>
                            <table className="w-full mb-6">
                                <thead>
                                    <tr className="text-left text-sm text-secondary">
                                        <th className="pb-2">Product</th>
                                        <th className="pb-2 text-right">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(selectedOrder.items).map(([sku, qty]) => {
                                        if (qty === 0) return null;
                                        return (
                                            <tr key={sku}>
                                                <td className="py-1">{getProductDescription(sku)}</td>
                                                <td className="py-1 text-right font-bold">{qty}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
                                <span className="text-lg font-bold">Total Amount</span>
                                <span className="text-xl font-bold text-primary">₱{selectedOrder.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* COA Input Modal */}
            {showCOAModal && selectedCOAOrder && (
                <div className="modal-overlay" onClick={() => setShowCOAModal(false)}>
                    <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Generate COA</h3>
                            <button className="close-btn" onClick={() => setShowCOAModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="text-secondary text-sm mb-4">
                                Please enter the Best Before Date for each item. The Production Date will be automatically calculated (3 months prior).
                            </p>
                            <div className="scrollable-table-container mb-6" style={{ maxHeight: '400px' }}>
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-sm text-secondary">
                                            <th className="pb-2 w-1/2">Product</th>
                                            <th className="pb-2 text-center w-1/6">Qty</th>
                                            <th className="pb-2 w-1/3">Best Before Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(selectedCOAOrder.items)
                                            .sort(([skuA], [skuB]) => {
                                                const order = ['FGC', 'FGP', 'FGL', 'FGG', 'FGT'];
                                                const prefixA = skuA.split('-')[0];
                                                const prefixB = skuB.split('-')[0];
                                                return order.indexOf(prefixA) - order.indexOf(prefixB);
                                            })
                                            .map(([sku, qty]) => {
                                                if (qty > 0) {
                                                    // Ensure dates is an array
                                                    const dates = Array.isArray(bestBeforeDates[sku]) ? bestBeforeDates[sku] : [''];

                                                    return (
                                                        <tr key={sku} className="border-b border-gray-50 last:border-0">
                                                            <td className="py-2 align-top pt-3">{getProductDescription(sku)}</td>
                                                            <td className="py-2 align-top pt-3 text-center font-bold text-lg">{qty}</td>
                                                            <td className="py-2">
                                                                <div className="flex flex-col gap-2">
                                                                    {dates.map((date, index) => (
                                                                        <div key={index} className="flex gap-2 items-center">
                                                                            <input
                                                                                type="date"
                                                                                className="premium-input w-full"
                                                                                value={date}
                                                                                onChange={(e) => {
                                                                                    const newDates = [...dates];
                                                                                    newDates[index] = e.target.value;
                                                                                    handleDateChange(sku, newDates);
                                                                                }}
                                                                            />
                                                                            {/* Only show remove button if more than 1 date */}
                                                                            {dates.length > 1 && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newDates = dates.filter((_, i) => i !== index);
                                                                                        handleDateChange(sku, newDates);
                                                                                    }}
                                                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                                                    title="Remove date"
                                                                                >
                                                                                    <X size={16} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        onClick={() => {
                                                                            const newDates = [...dates, ''];
                                                                            handleDateChange(sku, newDates);
                                                                        }}
                                                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-1 w-fit"
                                                                    >
                                                                        + Add Another Date
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                return null;
                                            })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Prepared By and Date Inputs */}
                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Prepared by (Full Name)</label>
                                        <input
                                            type="text"
                                            className="premium-input w-full"
                                            placeholder="Enter Full Name"
                                            value={preparedBy}
                                            onChange={(e) => setPreparedBy(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            className="premium-input w-full bg-gray-50"
                                            value={preparedDate}
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button
                                    className="icon-btn px-4 w-auto"
                                    onClick={() => setShowCOAModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="submit-btn"
                                    onClick={handleGenerateCOA}
                                >
                                    Generate PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Document Preview Modal */}
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

            {/* Confirmation Modal */}
            {showConfirmCOA && (
                <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setShowConfirmCOA(false)}>
                    <div className="modal-content small-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm COA Generation</h3>
                        </div>
                        <div className="modal-body text-center">
                            <p className="mb-6">Are you sure you want to generate the COA? <br /> This will save the encoded data.</p>
                            <div className="flex justify-center gap-4">
                                <button className="icon-btn" onClick={() => setShowConfirmCOA(false)}>
                                    No, Cancel
                                </button>
                                <button className="submit-btn" onClick={handleConfirmGenerateCOA}>
                                    Yes, Generate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResellerOrderList;

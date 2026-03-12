import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Eye, X, Search } from 'lucide-react';
import { generatePackingList, generateCOA } from '../utils/pdfGenerator';

const OrderHistory = () => {
    const {
        resellerOrders,
        inventory,
        resellerPrices,
        updateResellerOrder,
        resellers,
        resellerZones,
        zonePrices
    } = useInventory();
    const { userProfile } = useAuth();

    // View State
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReseller, setSelectedReseller] = useState('');

    // Document Generation State
    const [showCOAModal, setShowCOAModal] = useState(false);
    const [selectedCOAOrder, setSelectedCOAOrder] = useState(null);
    const [showConfirmCOA, setShowConfirmCOA] = useState(false);
    const [bestBeforeDates, setBestBeforeDates] = useState({});
    const [preparedBy, setPreparedBy] = useState('');
    const [preparedDate, setPreparedDate] = useState('');

    // Preview Modal State
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewTitle, setPreviewTitle] = useState('');

    // Get unique resellers from completed orders (exclude Christmas)
    const uniqueResellers = [...new Set(resellerOrders
        .filter(order => order.status === 'Completed' && order.location !== 'Christmas Order')
        .map(order => order.resellerName))];

    // Filter for COMPLETED orders only (exclude Christmas)
    const historyOrders = resellerOrders
        .filter(order =>
            order.status === 'Completed' &&
            order.location !== 'Christmas Order' &&
            (selectedReseller === '' || order.resellerName === selectedReseller) &&
            (order.resellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.location.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending (Newest first)

    // Helper: Get Product Description
    const getProductDescription = (sku) => {
        const item = inventory.find(i => i.sku === sku);
        return item ? item.description : sku;
    };

    // Helper: Resolve prices for PDF
    const getEffectivePdfPrices = (order) => {
        const itemPrices = {};
        const prefixes = ['FGC', 'FGP', 'FGL', 'FGG', 'FGT', 'OTH'];

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
                const BASE_PRICES = { 'FGC': 23, 'FGP': 85, 'FGL': 170, 'FGG': 680, 'FGT': 1000, 'OTH': 0 };
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
            setPreviewTitle(`Packing List - ${order.resellerName}`);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Error viewing packing list:", error);
            alert("Failed to view packing list.");
        }
    };

    // --- COA Handlers ---
    const handleOpenCOAModal = (order) => {
        setSelectedCOAOrder(order);

        // Use existing data if available, otherwise initialize
        if (order.coaData && Object.keys(order.coaData).length > 0) {
            setBestBeforeDates(order.coaData);
        } else {
            const initialDates = {};
            Object.keys(order.items).forEach(sku => {
                if (order.items[sku] > 0) {
                    initialDates[sku] = ['']; // Initialize as array
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

    const handleGenerateCOA = async () => {
        // Validate that all items have dates filled
        let missingDates = false;
        if (selectedCOAOrder && selectedCOAOrder.items) {
            Object.entries(selectedCOAOrder.items).forEach(([sku, qty]) => {
                if (qty > 0) {
                    const dates = bestBeforeDates[sku];
                    if (!dates || dates.length === 0 || dates.some(d => !d || d.trim() === '')) {
                        missingDates = true;
                    }
                }
            });
        }

        if (missingDates) {
            alert("Please fill in ALL Best Before Dates before generating the COA.");
            return;
        }

        if (!preparedBy.trim()) {
            alert("Please enter 'Prepared by' name.");
            return;
        }
        setShowConfirmCOA(true);
    };

    const handleConfirmGenerateCOA = async () => {
        if (selectedCOAOrder) {
            try {
                const coaData = {
                    ...bestBeforeDates,
                    preparedBy,
                    preparedDate
                };
                await generateCOA(selectedCOAOrder, coaData, inventory);

                const createdBy = userProfile?.email || 'Unknown User';
                const encodedBy = userProfile?.email || 'Unknown User';

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

                setShowConfirmCOA(false);
                setShowCOAModal(false);
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
            const url = await generateCOA({ ...order, returnBlob: true }, order.coaData || {}, inventory);
            setPreviewUrl(url);
            setPreviewTitle(`COA - ${order.resellerName}`);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Error viewing COA:", error);
            alert("Failed to view COA.");
        }
    };

    return (
        <div className="fade-in">
            <div className="header-section">
                <h2 className="page-title">Order History</h2>
                <p className="page-subtitle">Archive of completed transactions</p>
            </div>

            <div className="form-card p-0 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', gap: '1rem' }}>
                    <h3 className="card-heading" style={{ fontSize: '1rem', marginBottom: 0, border: 'none', padding: 0 }}>Completed Orders</h3>

                    <div className="flex gap-4 items-center">
                        {/* Reseller Filter */}
                        <select
                            value={selectedReseller}
                            onChange={(e) => setSelectedReseller(e.target.value)}
                            style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.8rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                outline: 'none',
                                minWidth: '150px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">All Resellers</option>
                            {uniqueResellers.map(reseller => (
                                <option key={reseller} value={reseller}>{reseller}</option>
                            ))}
                        </select>

                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '0.3rem 0.6rem 0.3rem 2rem',
                                    fontSize: '0.8rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    outline: 'none',
                                    width: '250px'
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', margin: 0, borderRadius: 0, border: 'none', boxShadow: 'none' }}>
                    <table className="inventory-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'white', borderBottom: '1px solid var(--border-color)' }}>
                            <tr>
                                <th>Date</th>
                                <th>Reseller Name</th>
                                <th>Category</th>
                                <th>Total Amount</th>
                                <th className="text-center">Details</th>
                                <th className="text-center">Packing List</th>
                                <th className="text-center">COA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty-state">
                                        No completed orders found.
                                    </td>
                                </tr>
                            ) : (
                                historyOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>{new Date(order.date).toLocaleDateString()}</td>
                                        <td className="font-medium">{order.resellerName}</td>
                                        <td>{order.location}</td>
                                        <td className="font-bold">₱{order.totalAmount.toLocaleString()}</td>
                                        <td className="text-center">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="std-btn std-btn-primary"
                                                title="View Details"
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
                                                    style={{ backgroundColor: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                                                >
                                                    Create List
                                                </button>
                                            )}
                                        </td>
                                        {/* COA Column */}
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
                                                    style={{ backgroundColor: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                                                >
                                                    Create COA
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-gray-500">Reseller</p>
                                    <p className="font-medium">{selectedOrder.resellerName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Category</p>
                                    <p className="font-medium">{selectedOrder.location}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Date</p>
                                    <p className="font-medium">{new Date(selectedOrder.date).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Amount</p>
                                    <p className="font-bold text-primary">₱{selectedOrder.totalAmount.toLocaleString()}</p>
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
                                                    <span className="block text-xs text-gray-500">{inventory.find(i => i.sku === sku)?.description}</span>
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
                                Please enter the Best Before Date for each item. <strong>All fields are required.</strong> The Production Date will be automatically calculated (3 months prior).
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
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowConfirmCOA(false)}>
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

export default OrderHistory;

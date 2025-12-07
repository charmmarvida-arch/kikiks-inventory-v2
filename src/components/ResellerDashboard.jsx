import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, ArrowUpDown, TrendingUp, TrendingDown, Users, Package, CheckCircle, Clock, Filter } from 'lucide-react';

const ResellerDashboard = () => {
    const { resellerOrders, updateResellerOrder } = useInventory();
    const { userProfile } = useAuth();

    // PIN Protection State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');

    // Date Filter State  
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);

    // Modal State
    const [selectedReseller, setSelectedReseller] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Sorting State
    const [sortDescending, setSortDescending] = useState(true);

    // Loading state for encoding toggle
    const [encodingLoading, setEncodingLoading] = useState({});

    // Check for existing session on mount
    useEffect(() => {
        const sessionData = localStorage.getItem('resellerDashboardAccess');
        if (sessionData) {
            try {
                const parsed = JSON.parse(sessionData);
                if (parsed.authenticated === true) {
                    setIsAuthenticated(true);
                }
            } catch (e) {
                localStorage.removeItem('resellerDashboardAccess');
            }
        }

        // Set default date range to Month-to-date
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    }, []);

    // Handle PIN submission
    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (pinInput === '1234') {
            setIsAuthenticated(true);
            localStorage.setItem('resellerDashboardAccess', JSON.stringify({ authenticated: true }));
            setPinError('');
            setPinInput('');
        } else {
            setPinError('Incorrect PIN. Please try again.');
            setPinInput('');
        }
    };

    // Filter orders by date range
    const filteredOrders = useMemo(() => {
        return resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return orderDate >= start && orderDate <= end && order.status === 'Completed';
        });
    }, [resellerOrders, startDate, endDate]);

    // Calculate previous period orders (for comparison)
    const previousPeriodOrders = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const prevStart = new Date(start);
        prevStart.setDate(prevStart.getDate() - daysDiff);
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);

        return resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= prevStart && orderDate <= prevEnd && order.status === 'Completed';
        });
    }, [resellerOrders, startDate, endDate]);

    // Calculate metrics
    const metrics = useMemo(() => {
        // Current period metrics
        const totalOrders = filteredOrders.length;
        const activeResellers = new Set(filteredOrders.map(o => o.resellerName)).size;
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const encodedCount = filteredOrders.filter(o => o.is_encoded).length;
        const encodingProgress = totalOrders > 0 ? (encodedCount / totalOrders) * 100 : 0;
        const pendingEncoding = totalOrders - encodedCount;

        // Previous period metrics
        const prevTotalOrders = previousPeriodOrders.length;
        const prevActiveResellers = new Set(previousPeriodOrders.map(o => o.resellerName)).size;
        const prevTotalRevenue = previousPeriodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const prevAvgOrderValue = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
        const prevEncodedCount = previousPeriodOrders.filter(o => o.is_encoded).length;
        const prevEncodingProgress = prevTotalOrders > 0 ? (prevEncodedCount / prevTotalOrders) * 100 : 0;

        // Calculate changes
        const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
        const resellersChange = prevActiveResellers > 0 ? ((activeResellers - prevActiveResellers) / prevActiveResellers) * 100 : 0;
        const avgOrderChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0;
        const encodingChange = encodingProgress - prevEncodingProgress;

        return {
            totalOrders,
            activeResellers,
            avgOrderValue,
            encodingProgress,
            pendingEncoding,
            ordersChange,
            resellersChange,
            avgOrderChange,
            encodingChange
        };
    }, [filteredOrders, previousPeriodOrders]);

    // Aggregate orders by reseller
    const aggregatedData = useMemo(() => {
        const grouped = {};

        filteredOrders.forEach(order => {
            const resellerName = order.resellerName;
            if (!grouped[resellerName]) {
                grouped[resellerName] = {
                    resellerName,
                    totalAmount: 0,
                    orders: []
                };
            }
            grouped[resellerName].totalAmount += order.totalAmount || 0;
            grouped[resellerName].orders.push(order);
        });

        let result = Object.values(grouped);
        result.sort((a, b) => {
            return sortDescending
                ? b.totalAmount - a.totalAmount
                : a.totalAmount - b.totalAmount;
        });

        return result;
    }, [filteredOrders, sortDescending]);

    // Handle encoded toggle
    const handleEncodedToggle = async (order) => {
        const newEncodedStatus = !order.is_encoded;
        const encodedBy = newEncodedStatus ? (userProfile?.email || 'Unknown User') : null;
        const encodedAt = newEncodedStatus ? new Date().toISOString() : null;

        // Set loading state
        setEncodingLoading(prev => ({ ...prev, [order.id]: true }));

        try {
            await updateResellerOrder(order.id, {
                is_encoded: newEncodedStatus,
                encoded_by: encodedBy,
                encoded_at: encodedAt
            });
        } catch (error) {
            console.error('Error updating encoded status:', error);
            alert('Failed to update encoded status');
        } finally {
            // Clear loading state
            setEncodingLoading(prev => ({ ...prev, [order.id]: false }));
        }
    };

    // Metric Card Component
    const MetricCard = ({ title, value, change, icon: Icon, format = 'number' }) => {
        const isPositive = change >= 0;
        const formattedValue = format === 'currency'
            ? `₱${value.toLocaleString()}`
            : format === 'percentage'
                ? `${value.toFixed(1)}%`
                : value.toLocaleString();

        return (
            <div style={{
                backgroundColor: 'white',
                border: '2px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
            }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span className="text-secondary text-sm font-medium">{title}</span>
                    <div style={{
                        backgroundColor: 'var(--primary-light)',
                        borderRadius: '8px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon size={20} className="text-primary" />
                    </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                    {formattedValue}
                </div>
                {change !== null && change !== undefined && !isNaN(change) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        {isPositive ? (
                            <TrendingUp size={16} className="text-success" />
                        ) : (
                            <TrendingDown size={16} className="text-danger" />
                        )}
                        <span className={isPositive ? 'text-success' : 'text-danger'} style={{ fontWeight: '600' }}>
                            {isPositive ? '+' : ''}{change.toFixed(1)}%
                        </span>
                        <span className="text-secondary">vs prev period</span>
                    </div>
                )}
            </div>
        );
    };

    // PIN Entry Modal
    if (!isAuthenticated) {
        return (
            <div className="modal-overlay" style={{ display: 'flex' }}>
                <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">Protected Section</h3>
                    </div>
                    <div className="modal-body">
                        <p className="text-secondary mb-4">Please enter PIN to access Reseller Dashboard</p>
                        <form onSubmit={handlePinSubmit}>
                            <input
                                type="password"
                                className="premium-input"
                                placeholder="Enter PIN"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                autoFocus
                                maxLength={4}
                            />
                            {pinError && (
                                <p className="text-danger text-sm mt-2">{pinError}</p>
                            )}
                            <div className="flex justify-end gap-4 mt-6">
                                <button type="submit" className="submit-btn">
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Main Dashboard View
    return (
        <div className="fade-in">
            <div className="header-section" style={{ marginBottom: '1.5rem' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </div>
        </div>

            {/* Key Metrics */ }
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
    }}>
        <MetricCard
            title="Total Orders"
            value={metrics.totalOrders}
            change={metrics.ordersChange}
            icon={Package}
        />
        <MetricCard
            title="Active Resellers"
            value={metrics.activeResellers}
            change={metrics.resellersChange}
            icon={Users}
        />
        <MetricCard
            title="Avg Order Value"
            value={metrics.avgOrderValue}
            change={metrics.avgOrderChange}
            icon={TrendingUp}
            format="currency"
        />
        <MetricCard
            title="Encoding Progress"
            value={metrics.encodingProgress}
            change={metrics.encodingChange}
            icon={CheckCircle}
            format="percentage"
        />
        <MetricCard
            title="Pending Encoding"
            value={metrics.pendingEncoding}
            change={null}
            icon={Clock}
        />
    </div>

    {/* Summary Table */ }
    <div className="card">
        <div className="card-header">
            <h3 className="card-heading">Reseller Summary</h3>
            <button
                onClick={() => setSortDescending(!sortDescending)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: sortDescending ? '#f0f9ff' : '#fef3f2',
                    border: sortDescending ? '1px solid #0ea5e9' : '1px solid #f97316',
                    borderRadius: '8px',
                    color: sortDescending ? '#0284c7' : '#ea580c',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.01em'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = sortDescending
                        ? '0 4px 12px rgba(14, 165, 233, 0.15)'
                        : '0 4px 12px rgba(249, 115, 22, 0.15)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                {sortDescending ? '↓' : '↑'}
                <span>{sortDescending ? 'Highest First' : 'Lowest First'}</span>
            </button>
        </div>
        <div className="table-container">
            <table className="inventory-table">
                <thead>
                    <tr>
                        <th>Reseller Name</th>
                        <th className="text-right">Total Orders</th>
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {aggregatedData.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="empty-state">
                                No orders found for the selected date range.
                            </td>
                        </tr>
                    ) : (
                        aggregatedData.map(reseller => (
                            <tr key={reseller.resellerName}>
                                <td className="font-medium">{reseller.resellerName}</td>
                                <td className="text-right font-bold">
                                    ₱{reseller.totalAmount.toLocaleString()}
                                </td>
                                <td className="text-center">
                                    <button
                                        className="text-btn text-primary"
                                        onClick={() => {
                                            setSelectedReseller(reseller);
                                            setShowModal(true);
                                        }}
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>

    {/* Date Filter Modal */ }
    {
        showDateFilterModal && (
            <div className="modal-overlay" onClick={() => setShowDateFilterModal(false)}>
                <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">
                            <Calendar size={20} />
                            Date Range Filter
                        </h3>
                        <button className="close-btn" onClick={() => setShowDateFilterModal(false)}>
                            <X size={24} />
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="grid-responsive two-cols">
                            <div>
                                <label className="form-label">Start Date</label>
                                <input
                                    type="date"
                                    className="premium-input"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="form-label">End Date</label>
                                <input
                                    type="date"
                                    className="premium-input"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button
                                className="icon-btn px-4 w-auto"
                                onClick={() => setShowDateFilterModal(false)}
                            >
                                Close
                            </button>
                            <button
                                className="submit-btn"
                                onClick={() => setShowDateFilterModal(false)}
                            >
                                Apply Filter
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    {/* Order Details Modal */ }
    {
        showModal && selectedReseller && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
                <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">
                            Orders - {selectedReseller.resellerName}
                        </h3>
                        <button className="close-btn" onClick={() => setShowModal(false)}>
                            <X size={24} />
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="scrollable-table-container" style={{ maxHeight: '500px' }}>
                            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                    <tr className="text-left text-sm text-secondary" style={{ borderBottom: '2px solid var(--border-color)' }}>
                                        <th style={{ padding: '12px 16px', fontWeight: '600' }}>Date</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>Total Order</th>
                                        <th style={{ padding: '12px 16px', fontWeight: '600' }}>COA Created By</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>Encoded Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedReseller.orders.map((order, index) => (
                                        <tr
                                            key={order.id}
                                            style={{
                                                borderBottom: index < selectedReseller.orders.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
                                            }}
                                        >
                                            <td style={{ padding: '16px' }}>
                                                {new Date(order.date).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                                                ₱{order.totalAmount?.toLocaleString() || '0'}
                                            </td>
                                            <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                                                {order.created_by || 'N/A'}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <button
                                                    className={`${order.is_encoded
                                                        ? 'bg-green-100 text-green-700 border-green-300'
                                                        : 'bg-gray-100 text-gray-700 border-gray-300'
                                                        }`}
                                                    onClick={() => handleEncodedToggle(order)}
                                                    disabled={encodingLoading[order.id]}
                                                    style={{
                                                        padding: '6px 16px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.875rem',
                                                        fontWeight: '600',
                                                        border: '1px solid',
                                                        cursor: encodingLoading[order.id] ? 'wait' : 'pointer',
                                                        transition: 'all 0.2s',
                                                        minWidth: '120px',
                                                        opacity: encodingLoading[order.id] ? 0.6 : 1
                                                    }}
                                                >
                                                    {encodingLoading[order.id] ? (
                                                        'Updating...'
                                                    ) : order.is_encoded ? (
                                                        <>✓ ENCODED</>
                                                    ) : (
                                                        <>NOT ENCODED</>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{
                            marginTop: '1.5rem',
                            paddingTop: '1.5rem',
                            borderTop: '2px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Total Amount:</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                ₱{selectedReseller.totalAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
        </div >
    );
};

export default ResellerDashboard;

import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, Settings, ArrowUpDown, TrendingUp, TrendingDown, Users, Package, CheckCircle, Clock, Filter } from 'lucide-react';
import ResellerSettingsModal from './ResellerSettingsModal';

const ResellerDashboard = () => {
    const { resellerOrders, updateResellerOrder, resellerSettings } = useInventory();
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

    // Settings Modal State  
    const [showSettingsModal, setShowSettingsModal] = useState(false);

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

    // Calculate monthly compliance data (rolling cycle)
    const monthlyComplianceData = useMemo(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Helper to get current cycle for a specific start day
        const getCycle = (startDayStr) => {
            // Default to 1st of month if no start date set
            let startDay = 1;
            if (startDayStr) {
                const date = new Date(startDayStr);
                if (!isNaN(date.getTime())) {
                    startDay = date.getDate();
                }
            }

            // Determine if we are past the start day in current month
            // Example: Today Dec 7. Start Day 2. Cycle: Dec 2 - Jan 2.
            // Example: Today Dec 1. Start Day 2. Cycle: Nov 2 - Dec 2.

            let cycleStart = new Date(currentYear, currentMonth, startDay);
            let cycleEnd = new Date(currentYear, currentMonth + 1, startDay); // End is exclusive or inclusive? Let's say exclusive range [start, end) or inclusive [start, end-1]

            if (today < cycleStart) {
                // We are in the previous cycle
                cycleStart = new Date(currentYear, currentMonth - 1, startDay);
                cycleEnd = new Date(currentYear, currentMonth, startDay);
            }

            // Adjust end date to be end of day before next start day?
            // Or just use strict comparison >= start && < end
            // Let's set time to start of day
            cycleStart.setHours(0, 0, 0, 0);
            cycleEnd.setHours(0, 0, 0, 0);

            return { cycleStart, cycleEnd };
        };

        // Get all unique resellers
        const uniqueResellers = new Set(resellerOrders.map(o => o.resellerName));

        // Group orders by reseller
        const groupedOrders = {};
        resellerOrders.forEach(o => {
            if (!groupedOrders[o.resellerName]) groupedOrders[o.resellerName] = [];
            groupedOrders[o.resellerName].push(o);
        });

        const result = Array.from(uniqueResellers).map(resellerName => {
            const setting = resellerSettings.find(s => s.reseller_name === resellerName);
            const minimum = setting ? setting.minimum_monthly_order : 10000;
            const startDateStr = setting ? setting.start_date : null;

            const { cycleStart, cycleEnd } = getCycle(startDateStr);

            // Filter orders for this reseller in the current cycle
            const ordersInCycle = (groupedOrders[resellerName] || []).filter(order => {
                const orderDate = new Date(order.date);
                // Use >= start AND < end logic for 1 month exactly
                return orderDate >= cycleStart && orderDate < cycleEnd && order.status === 'Completed';
            });

            const ordersThisMonth = ordersInCycle.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

            // Determine Cycle Display String
            const cycleString = `${cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

            let status;
            if (ordersThisMonth >= minimum) {
                status = 'met';
            } else if (ordersThisMonth > 0) {
                status = 'pending';
            } else {
                status = 'not_met';
            }

            return {
                resellerName,
                ordersThisMonth,
                minimum,
                status,
                cycleString // Add this for UI display
            };
        });

        // Sort by status
        result.sort((a, b) => {
            const statusOrder = { 'not_met': 0, 'pending': 1, 'met': 2 };
            return statusOrder[a.status] - statusOrder[b.status];
        });

        return result;
    }, [resellerOrders, resellerSettings]);

    // Calculate metrics
    const metrics = useMemo(() => {
        // Current period metrics
        const totalOrders = filteredOrders.length;
        const activeResellers = new Set(filteredOrders.map(o => o.resellerName)).size;
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const encodedCount = filteredOrders.filter(o => o.is_encoded).length;
        const pendingEncoding = totalOrders - encodedCount;

        // Compliance Progress (Replaces Encoding Progress)
        // Count resellers with 'met' status from rolling cycle
        const compliantCount = monthlyComplianceData.filter(d => d.status === 'met').length;
        const totalResellersForCompliance = monthlyComplianceData.length;
        const complianceRate = totalResellersForCompliance > 0
            ? (compliantCount / totalResellersForCompliance) * 100
            : 0;

        // Year-to-Date calculation
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const ytdOrders = resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= startOfYear && orderDate <= today && order.status === 'Completed';
        });
        const ytdRevenue = ytdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Previous year same period for YTD comparison
        const startOfPrevYear = new Date(today.getFullYear() - 1, 0, 1);
        const endOfPrevYearSamePeriod = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        const prevYtdOrders = resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= startOfPrevYear && orderDate <= endOfPrevYearSamePeriod && order.status === 'Completed';
        });
        const prevYtdRevenue = prevYtdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Previous period metrics
        const prevTotalOrders = previousPeriodOrders.length;
        const prevActiveResellers = new Set(previousPeriodOrders.map(o => o.resellerName)).size;

        // Calculate changes
        const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
        const resellersChange = prevActiveResellers > 0 ? ((activeResellers - prevActiveResellers) / prevActiveResellers) * 100 : 0;
        const ytdChange = prevYtdRevenue > 0 ? ((ytdRevenue - prevYtdRevenue) / prevYtdRevenue) * 100 : 0;

        // Removing Encoding Change as it's no longer tracking encoding
        const complianceChange = 0; // Placeholder as we don't have historical compliance data easily accessible in this structure without more complex logic

        return {
            totalOrders,
            activeResellers,
            ytdRevenue,
            complianceRate, // New metric
            pendingEncoding,
            ordersChange,
            resellersChange,
            ytdChange,
            complianceChange
        };
    }, [filteredOrders, previousPeriodOrders, resellerOrders, monthlyComplianceData]);

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="page-title">Reseller Dashboard</h2>
                        <p className="page-subtitle">Executive overview of reseller performance</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '10px 20px',
                                backgroundColor: 'white',
                                border: '1.5px solid #64748b',
                                borderRadius: '50px',
                                color: '#64748b',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(100, 116, 139, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#64748b';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.color = '#64748b';
                            }}
                        >
                            <Settings size={16} />
                            <span>Settings</span>
                        </button>
                        <button
                            onClick={() => setShowDateFilterModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '10px 20px',
                                backgroundColor: 'white',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '50px',
                                color: 'var(--primary)',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--primary)';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.color = 'var(--primary)';
                            }}
                        >
                            <Calendar size={16} />
                            <span>Filter</span>
                        </button>
                    </div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    📅 {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </div>
            </div>

            {/* Key Metrics */}
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
                    title="Total Orders (YTD)"
                    value={metrics.ytdRevenue}
                    change={metrics.ytdChange}
                    icon={TrendingUp}
                    format="currency"
                />
                <MetricCard
                    title="Compliance Rate"
                    value={metrics.complianceRate}
                    change={metrics.complianceChange}
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

            {/* Two-Column Layout: Reseller Summary + Monthly Compliance */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '35fr 65fr',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                {/* Reseller Summary Table - Left */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-heading">Reseller Summary</h3>
                        <button
                            onClick={() => setSortDescending(!sortDescending)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '6px 14px',
                                backgroundColor: sortDescending ? '#3b82f6' : '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: sortDescending
                                    ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                                    : '0 2px 8px rgba(239, 68, 68, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = sortDescending
                                    ? '0 4px 12px rgba(59, 130, 246, 0.4)'
                                    : '0 4px 12px rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = sortDescending
                                    ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                                    : '0 2px 8px rgba(239, 68, 68, 0.3)';
                            }}
                        >
                            <ArrowUpDown size={14} />
                            <span>{sortDescending ? 'Highest First' : 'Lowest First'}</span>
                        </button>
                    </div>
                    <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{
                            width: '100%',
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse'
                        }}>
                            <colgroup>
                                <col style={{ width: '35%' }} />
                                <col style={{ width: '45%' }} />
                                <col style={{ width: '20%' }} />
                            </colgroup>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{
                                        padding: '12px 4px',
                                        textAlign: 'left',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Reseller Name</th>
                                    <th style={{
                                        padding: '12px 4px',
                                        textAlign: 'right',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Total Orders</th>
                                    <th style={{
                                        padding: '12px 4px',
                                        textAlign: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Actions</th>
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
                                        <tr key={reseller.resellerName} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{
                                                padding: '14px 4px',
                                                fontWeight: '500'
                                            }}>{reseller.resellerName}</td>
                                            <td style={{
                                                padding: '14px 4px',
                                                textAlign: 'right',
                                                fontWeight: 'bold'
                                            }}>
                                                ₱{reseller.totalAmount.toLocaleString()}
                                            </td>
                                            <td style={{
                                                padding: '14px 4px',
                                                textAlign: 'center'
                                            }}>
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

                {/* Monthly Compliance Table - Right */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-heading">Monthly Compliance</h3>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="inventory-table">
                            <thead>
                                <tr>
                                    <th>Reseller Name</th>
                                    <th className="text-right">Cycle Period</th>
                                    <th className="text-right">Sales</th>
                                    <th className="text-right">Minimum</th>
                                    <th className="text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyComplianceData.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="empty-state">
                                            No resellers found.
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyComplianceData.map(data => (
                                        <tr key={data.resellerName}>
                                            <td className="font-medium">{data.resellerName}</td>
                                            <td className="text-right" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {data.cycleString}
                                            </td>
                                            <td className="text-right font-bold">
                                                ₱{data.ordersThisMonth.toLocaleString()}
                                            </td>
                                            <td className="text-right" style={{ color: 'var(--text-secondary)' }}>
                                                ₱{data.minimum.toLocaleString()}
                                            </td>
                                            <td className="text-center">
                                                {data.status === 'met' && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        backgroundColor: '#d1fae5',
                                                        color: '#065f46'
                                                    }}>
                                                        ✓ Met
                                                    </span>
                                                )}
                                                {data.status === 'pending' && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        backgroundColor: '#fef3c7',
                                                        color: '#92400e'
                                                    }}>
                                                        ⏳ Pending
                                                    </span>
                                                )}
                                                {data.status === 'not_met' && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        backgroundColor: '#fee2e2',
                                                        color: '#991b1b'
                                                    }}>
                                                        ✗ Not Met
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Date Filter Modal */}
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

            {/* Order Details Modal */}
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

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <ResellerSettingsModal onClose={() => setShowSettingsModal(false)} />
                )
            }
        </div >
    );
};
export default ResellerDashboard;
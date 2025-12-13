import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, Settings, ArrowUpDown, TrendingUp, TrendingDown, Users, Package, CheckCircle, Clock, Filter, FileText } from 'lucide-react';
import ResellerSettingsModal from './ResellerSettingsModal';
import { generatePackingList } from '../utils/pdfGenerator';

const ResellerDashboardV2 = () => {
    const { resellerOrders, updateResellerOrder, resellerSettings, inventory } = useInventory();
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

    // Items Modal State
    const [selectedOrderItems, setSelectedOrderItems] = useState(null);
    const [showItemsModal, setShowItemsModal] = useState(false);

    // Sorting State
    const [sortDescending, setSortDescending] = useState(true);

    // Loading state for encoding toggle
    const [encodingLoading, setEncodingLoading] = useState({});

    // Optimistic UI state for encoding
    const [encodedOverrides, setEncodedOverrides] = useState({});

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
            let startDay = 1;
            if (startDayStr) {
                const date = new Date(startDayStr);
                if (!isNaN(date.getTime())) {
                    startDay = date.getDate();
                }
            }

            let cycleStart = new Date(currentYear, currentMonth, startDay);
            let cycleEnd = new Date(currentYear, currentMonth + 1, startDay);

            if (today < cycleStart) {
                cycleStart = new Date(currentYear, currentMonth - 1, startDay);
                cycleEnd = new Date(currentYear, currentMonth, startDay);
            }

            cycleStart.setHours(0, 0, 0, 0);
            cycleEnd.setHours(0, 0, 0, 0);

            return { cycleStart, cycleEnd };
        };

        const uniqueResellers = new Set(resellerOrders.map(o => o.resellerName));
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

            const ordersInCycle = (groupedOrders[resellerName] || []).filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= cycleStart && orderDate < cycleEnd && order.status === 'Completed';
            });

            const ordersThisMonth = ordersInCycle.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

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
                cycleString
            };
        });

        result.sort((a, b) => {
            const statusOrder = { 'not_met': 0, 'pending': 1, 'met': 2 };
            return statusOrder[a.status] - statusOrder[b.status];
        });

        return result;
    }, [resellerOrders, resellerSettings]);

    // Calculate metrics
    const metrics = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const activeResellers = new Set(filteredOrders.map(o => o.resellerName)).size;
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const encodedCount = filteredOrders.filter(o => o.is_encoded).length;
        const pendingEncoding = totalOrders - encodedCount;

        const compliantCount = monthlyComplianceData.filter(d => d.status === 'met').length;
        const totalResellersForCompliance = monthlyComplianceData.length;
        const complianceRate = totalResellersForCompliance > 0
            ? (compliantCount / totalResellersForCompliance) * 100
            : 0;

        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const ytdOrders = resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= startOfYear && orderDate <= today && order.status === 'Completed';
        });
        const ytdRevenue = ytdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const startOfPrevYear = new Date(today.getFullYear() - 1, 0, 1);
        const endOfPrevYearSamePeriod = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        const prevYtdOrders = resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= startOfPrevYear && orderDate <= endOfPrevYearSamePeriod && order.status === 'Completed';
        });
        const prevYtdRevenue = prevYtdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const prevTotalOrders = previousPeriodOrders.length;
        const prevActiveResellers = new Set(previousPeriodOrders.map(o => o.resellerName)).size;

        const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
        const resellersChange = prevActiveResellers > 0 ? ((activeResellers - prevActiveResellers) / prevActiveResellers) * 100 : 0;
        const ytdChange = prevYtdRevenue > 0 ? ((ytdRevenue - prevYtdRevenue) / prevYtdRevenue) * 100 : 0;

        const complianceChange = 0;

        return {
            totalOrders,
            activeResellers,
            ytdRevenue,
            complianceRate,
            pendingEncoding,
            ordersChange,
            resellersChange,
            ytdChange,
            complianceChange
        };
    }, [filteredOrders, previousPeriodOrders, resellerOrders, monthlyComplianceData]);

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

        const currentYear = new Date().getFullYear();

        Object.values(grouped).forEach(reseller => {
            const resellerYtdOrders = resellerOrders.filter(order => {
                const orderDate = new Date(order.date);
                return order.resellerName === reseller.resellerName &&
                    orderDate.getFullYear() === currentYear &&
                    order.status === 'Completed';
            });
            reseller.ytdAmount = resellerYtdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        });

        let result = Object.values(grouped);
        result.sort((a, b) => {
            return sortDescending
                ? b.totalAmount - a.totalAmount
                : a.totalAmount - b.totalAmount;
        });

        return result;
    }, [filteredOrders, sortDescending]);

    useEffect(() => {
        if (selectedReseller) {
            const updatedReseller = aggregatedData.find(r => r.resellerName === selectedReseller.resellerName);
            if (updatedReseller) {
                setSelectedReseller(updatedReseller);
            }
        }
    }, [aggregatedData, selectedReseller]);

    const handleEncodedToggle = async (order) => {
        const currentStatus = encodedOverrides.hasOwnProperty(order.id)
            ? encodedOverrides[order.id]
            : order.is_encoded;

        const newEncodedStatus = !currentStatus;
        const encodedBy = newEncodedStatus ? (userProfile?.email || 'Unknown User') : null;
        const encodedAt = newEncodedStatus ? new Date().toISOString() : null;

        setEncodedOverrides(prev => ({ ...prev, [order.id]: newEncodedStatus }));

        try {
            await updateResellerOrder(order.id, {
                is_encoded: newEncodedStatus,
                encoded_by: encodedBy,
                encoded_at: encodedAt
            });
        } catch (error) {
            console.error('Error updating encoded status:', error);
            alert('Failed to update encoded status');

            setEncodedOverrides(prev => {
                const newOverrides = { ...prev };
                delete newOverrides[order.id];
                return newOverrides;
            });
        }
    };

    const handleViewPDF = async (order) => {
        try {
            const url = await generatePackingList({ ...order, returnBlob: true }, inventory, resellerSettings);
            window.open(url, '_blank');
        } catch (error) {
            console.error("Error generating PDF", error);
            alert("Failed to open packing list");
        }
    };

    const handleViewResellerHistory = (reseller) => {
        setSelectedReseller(reseller);
        setShowModal(true);
    };

    const MetricCard = ({ title, value, change, icon: Icon, format = 'number' }) => {
        const isPositive = change >= 0;
        const formattedValue = format === 'currency'
            ? `₱${value.toLocaleString()}`
            : format === 'percentage'
                ? `${value.toFixed(1)}%`
                : value.toLocaleString();

        const showChange = change !== null && change !== undefined && !isNaN(change) && Math.abs(change) > 0;

        return (
            <div className="dashboard-card metric-card">
                <div className="metric-header">
                    <span className="metric-title">{title}</span>
                    <div className="metric-icon-wrapper">
                        <Icon size={20} />
                    </div>
                </div>
                <div className="metric-value">
                    {formattedValue}
                </div>
                {showChange && (
                    <div className="metric-trend">
                        {isPositive ? (
                            <TrendingUp size={16} className="text-success" />
                        ) : (
                            <TrendingDown size={16} className="text-danger" />
                        )}
                        <span className={isPositive ? 'text-success' : 'text-danger'}>
                            {isPositive ? '+' : ''}{change.toFixed(1)}%
                        </span>
                        <span className="text-secondary">vs prev period</span>
                    </div>
                )}
            </div>
        );
    };

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

    return (
        <div className="fade-in" style={{ overflow: 'hidden', maxWidth: '100%' }}>
            <div className="header-section" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="page-title">Reseller Dashboard V2</h2>
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

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(350px, 30fr) 70fr',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3 className="card-title">Reseller Summary</h3>
                        <button
                            onClick={() => setSortDescending(!sortDescending)}
                            className="text-btn text-primary text-sm flex items-center gap-1 font-medium bg-gray-50 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowUpDown size={14} />
                            <span>{sortDescending ? 'Highest First' : 'Lowest First'}</span>
                        </button>
                    </div>
                    <div className="table-container shadow-none border-0">
                        <table className="inventory-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                                <col style={{ width: '40%' }} />
                                <col style={{ width: '25%' }} />
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '15%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: '16px' }}>Reseller Name</th>
                                    <th className="text-right">Sales (YTD)</th>
                                    <th className="text-right">Sales</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aggregatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="empty-state">
                                            No orders found for the selected date range.
                                        </td>
                                    </tr>
                                ) : (
                                    aggregatedData.map(reseller => (
                                        <tr key={reseller.resellerName} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{
                                                padding: '12px 16px', // Increased padding
                                                fontWeight: '500',
                                                whiteSpace: 'normal', // Allow wrapping
                                                wordBreak: 'break-word', // Break long words if needed
                                                lineHeight: '1.4',
                                                cursor: 'pointer',
                                                color: 'var(--primary)',
                                                textDecoration: 'underline'
                                            }}
                                                title={reseller.resellerName}
                                                onClick={() => handleViewResellerHistory(reseller)}
                                            >
                                                {reseller.resellerName}
                                            </td>
                                            <td style={{
                                                padding: '12px 2px',
                                                textAlign: 'right'
                                            }}>
                                                <div style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                                                    color: 'var(--primary)',
                                                    borderRadius: '6px',
                                                    fontWeight: '600',
                                                    fontSize: '0.85em',
                                                    minWidth: '80px',
                                                    textAlign: 'center'
                                                }}>
                                                    ₱{reseller.ytdAmount?.toLocaleString() || '0'}
                                                </div>
                                            </td>
                                            <td style={{
                                                padding: '12px 2px',
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

                <div className="dashboard-card">
                    <div className="card-header">
                        <h3 className="card-title">Monthly Compliance</h3>
                        <span className="text-secondary text-sm font-medium">
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="table-container shadow-none border-0">
                        <table className="inventory-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                                <col style={{ width: '28%' }} />
                                <col style={{ width: '22%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '20%' }} />
                            </colgroup>
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
                                        <td colSpan={5} className="empty-state text-center py-8 text-secondary">
                                            No resellers found.
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyComplianceData.map(data => (
                                        <tr key={data.resellerName} className="hover:bg-gray-50 transition-colors">
                                            <td className="font-medium text-main" style={{
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }} title={data.resellerName}>{data.resellerName}</td>
                                            <td className="text-right text-secondary text-sm">
                                                {data.cycleString}
                                            </td>
                                            <td className="text-right font-bold text-main">
                                                ₱{data.ordersThisMonth.toLocaleString()}
                                            </td>
                                            <td className="text-right text-secondary text-sm">
                                                ₱{data.minimum.toLocaleString()}
                                            </td>
                                            <td className="text-center">
                                                {data.status === 'met' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        ✓ Met
                                                    </span>
                                                )}
                                                {data.status === 'pending' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        ⏳ Pending
                                                    </span>
                                                )}
                                                {data.status === 'not_met' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
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
                                <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-between items-center">
                                    <div>
                                        <div className="text-secondary text-sm font-medium">Total Order (YTD)</div>
                                        <div className="text-2xl font-bold text-primary">₱{selectedReseller.ytdAmount?.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-secondary text-sm">Reseller Name</div>
                                        <div className="font-semibold">{selectedReseller.resellerName}</div>
                                    </div>
                                </div>

                                <div className="scrollable-table-container" style={{ maxHeight: '500px' }}>
                                    <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                            <tr className="text-left text-sm text-secondary" style={{ borderBottom: '2px solid var(--border-color)' }}>
                                                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Date</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>Total Order</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>Encoded Status</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>Packing List</th>
                                            </tr>
                                        </thead>
                                        <tbody>

                                            {selectedReseller.orders.map((order, index) => {
                                                const isEncoded = encodedOverrides.hasOwnProperty(order.id) ? encodedOverrides[order.id] : order.is_encoded;
                                                return (
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
                                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                                            <button
                                                                className={`${isEncoded
                                                                    ? 'bg-green-100 text-green-700 border-green-300'
                                                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                                                                    }`}
                                                                onClick={() => handleEncodedToggle(order)}
                                                                style={{
                                                                    padding: '6px 16px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: '600',
                                                                    border: '1px solid',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    minWidth: '120px'
                                                                }}
                                                            >
                                                                {isEncoded ? (
                                                                    <>✓ ENCODED</>
                                                                ) : (
                                                                    <>NOT ENCODED</>
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                                            <button
                                                                className="text-btn text-primary text-sm font-medium flex items-center gap-1 justify-center"
                                                                onClick={() => handleViewPDF(order)}
                                                            >
                                                                <FileText size={16} />
                                                                View PDF
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
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

            {
                showSettingsModal && (
                    <ResellerSettingsModal onClose={() => setShowSettingsModal(false)} />
                )
            }
        </div >
    );
};
export default ResellerDashboardV2;

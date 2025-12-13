import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, CheckSquare, Square } from 'lucide-react';

const PERMISSIONS_LIST = [
    { key: 'dashboard', label: 'Dashboard Overview' },
    { key: 'ftf_manufacturing', label: 'FTF Manufacturing' },
    { key: 'stock_movement', label: 'Stock Movement (In/Transfer)' },
    { key: 'reseller_orders', label: 'Reseller Orders' },
    { key: 'settings', label: 'Settings & Admin' }
];

const RegisterAccount = () => {
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('staff');
    const [permissions, setPermissions] = useState({
        dashboard: true,
        ftf_manufacturing: false,
        stock_movement: false,
        reseller_orders: false,
        settings: false
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const togglePermission = (key) => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await signUp(email, password, role, permissions, fullName);
            setMessage({ type: 'success', text: 'Account created successfully!' });
            // Reset form
            setEmail('');
            setPassword('');
            setFullName('');
            setRole('staff');
            setPermissions({
                dashboard: true,
                ftf_manufacturing: false,
                stock_movement: false,
                reseller_orders: false,
                settings: false
            });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Failed to create account.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="header-section">
                <div>
                    <h2 className="page-title">Register Staff Account</h2>
                    <p className="page-subtitle">Create new accounts and assign specific permissions</p>
                </div>
            </div>

            <div className="form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                {message.text && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1.5rem',
                        backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-grid two-cols">
                        {/* Left Column: Account Details */}
                        <div>
                            <h3 className="card-heading">Account Details</h3>

                            <div className="form-group">
                                <label>Staff Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="premium-input"
                                    placeholder="e.g. Juan Dela Cruz"
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="premium-input"
                                    placeholder="staff@kikiks.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="premium-input"
                                    placeholder="Min. 6 characters"
                                    minLength={6}
                                />
                            </div>

                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="premium-input"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin (Full Access)</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column: Permissions */}
                        <div>
                            <h3 className="card-heading">Access Permissions</h3>
                            <p className="text-secondary" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                Select which areas this user can access.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {PERMISSIONS_LIST.map((perm) => (
                                    <div
                                        key={perm.key}
                                        onClick={() => togglePermission(perm.key)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: `1px solid ${permissions[perm.key] ? 'var(--primary)' : 'var(--border-color)'}`,
                                            backgroundColor: permissions[perm.key] ? 'var(--primary-light)' : 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{
                                            marginRight: '0.75rem',
                                            color: permissions[perm.key] ? 'var(--primary)' : 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>
                                            {permissions[perm.key] ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </div>
                                        <span style={{
                                            fontWeight: permissions[perm.key] ? '600' : '400',
                                            color: permissions[perm.key] ? 'var(--primary)' : 'var(--text-main)'
                                        }}>
                                            {perm.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="action-bar" style={{ marginTop: '2rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="submit-btn"
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            <UserPlus size={20} style={{ marginRight: '0.5rem' }} />
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterAccount;

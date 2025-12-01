import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Package, Lock, Mail, AlertCircle } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false); // Toggle for first-time setup
    const { login, signUp } = useAuth();
    const navigate = useNavigate();

    // Smart Redirect: If domain contains "order" or "reseller", go to public order form
    React.useEffect(() => {
        const hostname = window.location.hostname;
        if (hostname.includes('order') || hostname.includes('reseller')) {
            navigate('/public-order');
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegistering) {
                // First time setup registration (Admin)
                // We give full permissions to the first user
                const fullPermissions = {
                    dashboard: true,
                    ftf_manufacturing: true,
                    stock_movement: true,
                    reseller_orders: true,
                    settings: true
                };

                await signUp(email, password, 'admin', fullPermissions);
                alert('Account created! You are now logged in.');
            } else {
                await login(email, password);
            }
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to authenticate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card fade-in">
                <div className="login-header">
                    <div className="login-icon-wrapper">
                        <Package size={32} strokeWidth={2} />
                    </div>
                    <h1 className="login-title">
                        Kikiks Inventory
                    </h1>
                    <p className="login-subtitle">
                        {isRegistering ? 'Create Admin Account' : 'Sign in to your account'}
                    </p>
                </div>

                {error && (
                    <div className="error-alert">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label>Email Address</label>
                        <div className="login-input-wrapper">
                            <div className="login-input-icon">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="premium-input login-input"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label>Password</label>
                        <div className="login-input-wrapper">
                            <div className="login-input-icon">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="premium-input login-input"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="submit-btn"
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError(null);
                        }}
                        className="login-link"
                    >
                        {isRegistering ? 'Already have an account? Sign In' : 'First time? Create Admin Account'}
                    </button>

                    <div style={{ margin: '1.5rem 0', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0 10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>OR</span>
                    </div>

                    <button
                        onClick={() => navigate('/public-order')}
                        className="submit-btn"
                        style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    >
                        Are you a Reseller? Create Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { Save, Key } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AdminKey = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [adminKey, setAdminKey] = useState('1234'); // Default admin key
    const [isLoaded, setIsLoaded] = useState(false);

    // Load admin key from Supabase on component mount
    useEffect(() => {
        const loadAdminKey = async () => {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'admin_password')
                .single();

            if (error) {
                console.error('Error loading admin key:', error);
            } else if (data && data.value) {
                setAdminKey(data.value);
            }
            setIsLoaded(true);
        };

        loadAdminKey();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();

        // Validate current password
        if (currentPassword !== adminKey) {
            alert('Current password is incorrect!');
            return;
        }

        // Validate new password
        if (!newPassword || newPassword.length < 4) {
            alert('New password must be at least 4 characters!');
            return;
        }

        // Validate confirmation
        if (newPassword !== confirmPassword) {
            alert('New password and confirmation do not match!');
            return;
        }

        // Save to Supabase
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key: 'admin_password',
                value: newPassword
            }, {
                onConflict: 'key'
            });

        if (error) {
            console.error('Error saving admin key:', error);
            alert('Failed to save admin password. Please try again.');
        } else {
            setAdminKey(newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            alert('Admin password updated successfully!');
        }
    };

    return (
        <div className="fade-in">
            <div className="header-section">
                <h2 className="page-title">Admin Key Settings</h2>
                <p className="page-subtitle">Change the admin password for accessing protected features</p>
            </div>

            <div className="form-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <form onSubmit={handleSave}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Key size={18} />
                                Current Password
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="premium-input"
                                required
                            />
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                            <h3 className="card-heading">
                                New Password
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (min 4 characters)"
                                        className="premium-input"
                                        required
                                        minLength={4}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="premium-input"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                            <button
                                type="submit"
                                className="submit-btn full-width"
                            >
                                <Save size={20} />
                                Update Password
                            </button>
                        </div>

                        <div className="alert-box alert-warning">
                            <div>
                                <strong>⚠️ Important:</strong> This password protects access to:
                                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                                    <li>Reseller Management Settings</li>
                                    <li>FTF Manufacturing Admin Mode</li>
                                    <li>FTF Manufacturing Price Settings</li>
                                    <li>SKU Addition Settings</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminKey;

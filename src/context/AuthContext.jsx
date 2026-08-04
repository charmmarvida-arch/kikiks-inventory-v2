import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const MOCK_BYPASS_USER = {
    id: 'bypass-admin-id',
    email: 'admin@bypass.local',
    user_metadata: { full_name: 'Bypass Admin' }
};

const MOCK_BYPASS_PROFILE = {
    id: 'bypass-admin-id',
    email: 'admin@bypass.local',
    full_name: 'Bypass Admin',
    role: 'admin',
    permissions: {
        dashboard: true,
        ftf_manufacturing: true,
        stock_movement: true,
        reseller_orders: true,
        settings: true
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        // Check if emergency bypass mode is enabled
        if (localStorage.getItem('bypass_auth') === 'true') {
            setUser(MOCK_BYPASS_USER);
            setSession({ user: MOCK_BYPASS_USER });
            setUserProfile(MOCK_BYPASS_PROFILE);
            setLoading(false);
            return;
        }

        // Check active sessions and sets the user
        // Timeout after 5s so the app never hangs forever if Supabase is unreachable
        const getSession = async () => {
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session check timeout')), 5000)
                );
                const sessionPromise = supabase.auth.getSession();
                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error('Session check failed or timed out:', err.message);
                // Still unblock the UI — user will see login page
                setUser(null);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (localStorage.getItem('bypass_auth') === 'true') {
                return;
            }
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
                return;
            }

            if (data) {
                setUserProfile(data);
            }
        } catch (error) {
            console.error('Unexpected error fetching profile:', error);
        }
    };

    const bypassLogin = () => {
        localStorage.setItem('bypass_auth', 'true');
        setUser(MOCK_BYPASS_USER);
        setSession({ user: MOCK_BYPASS_USER });
        setUserProfile(MOCK_BYPASS_PROFILE);
        setLoading(false);
    };

    const login = async (email, password) => {
        localStorage.removeItem('bypass_auth');
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signUp = async (email, password, role = 'staff', permissions = {}, fullName = '') => {
        localStorage.removeItem('bypass_auth');
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role,
                    permissions,
                    full_name: fullName
                }
            }
        });

        if (error) throw error;

        // Create profile entry
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        email: email,
                        full_name: fullName,
                        role: role,
                        permissions: permissions
                    }
                ]);

            if (profileError) {
                console.error('Error creating profile:', profileError);
            }
        }

        return data;
    };

    const logout = async () => {
        localStorage.removeItem('bypass_auth');
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
        setUser(null);
        setSession(null);
        setUserProfile(null);
    };

    const value = {
        session,
        user,
        userProfile,
        login,
        signUp,
        bypassLogin,
        logout,
        loading
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchCurrentUser, loginUser, registerUser, devBypassLogin, logoutUser, setAuthToken } from '../api/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = async () => {
        setLoading(true);
        const res = await fetchCurrentUser();
        if (res && res.success && res.user) {
            setUser(res.user);
        } else {
            setUser(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUser();
    }, []);

    const login = async (usernameOrEmail, password) => {
        const res = await loginUser(usernameOrEmail, password);
        if (res && res.success && res.user) {
            setUser(res.user);
            return { success: true };
        }
        return { success: false, error: res?.error || 'Login failed' };
    };

    const register = async (username, email, password, esoHandle) => {
        const res = await registerUser(username, email, password, esoHandle);
        if (res && res.success && res.user) {
            setUser(res.user);
            return { success: true };
        }
        return { success: false, error: res?.error || 'Registration failed' };
    };

    const devBypass = async (userId) => {
        const res = await devBypassLogin(userId);
        if (res && res.success && res.user) {
            setUser(res.user);
            return { success: true, message: res.message };
        }
        return { success: false, error: res?.error || 'Bypass failed' };
    };

    const logout = async () => {
        await logoutUser();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, devBypass, logout, refreshUser: loadUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

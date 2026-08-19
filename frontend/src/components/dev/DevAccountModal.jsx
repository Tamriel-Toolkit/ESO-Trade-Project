import React, { useState, useEffect } from 'react';
import { fetchDevUsers, devUpdateUser, devDeleteUser, registerUser, clearAllListings } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { Shield, Zap, Edit2, Trash2, X, Plus, Key, Users } from 'lucide-react';

export default function DevAccountModal({ isOpen, onClose }) {
    const { user: currentUser, devBypass, refreshUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editForm, setEditForm] = useState({ username: '', email: '', eso_handle: '', role: 'user' });
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', eso_handle: '' });

    const loadUsers = async () => {
        setLoading(true);
        const res = await fetchDevUsers();
        if (res && res.users) {
            setUsers(res.users);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            loadUsers();
        }
    }, [isOpen]);

    if (!isOpen || import.meta.env.PROD) return null;

    const handleClearListings = async () => {
        if (window.confirm("⚠️ [DEV ACTION]\nAre you sure you want to clear all market listings and price entries from the database?")) {
            const res = await clearAllListings();
            if (res && res.success) {
                alert("✅ All market listings and price records have been cleared!");
            } else {
                alert("❌ Failed to clear listings: " + (res?.error || "Unknown error"));
            }
        }
    };

    const handleBypass = async (userId) => {
        const res = await devBypass(userId);
        if (res.success) {
            alert(res.message);
            onClose();
        } else {
            alert("Bypass failed: " + res.error);
        }
    };

    const handleEditClick = (u) => {
        setEditingUserId(u.id);
        setEditForm({ username: u.username, email: u.email, eso_handle: u.eso_handle, role: u.role });
    };

    const handleSaveEdit = async (userId) => {
        const res = await devUpdateUser(userId, editForm);
        if (res.success) {
            setEditingUserId(null);
            loadUsers();
            if (currentUser && currentUser.id === userId) refreshUser();
        } else {
            alert("Update failed: " + res.error);
        }
    };

    const handleDelete = async (userId, username) => {
        if (window.confirm(`⚠️ [DEV ACTION]\nAre you sure you want to delete user '@${username}' and all associated characters?`)) {
            const res = await devDeleteUser(userId);
            if (res.success) {
                loadUsers();
                if (currentUser && currentUser.id === userId) refreshUser();
            } else {
                alert("Delete failed: " + res.error);
            }
        }
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        const res = await registerUser(createForm.username, createForm.email, createForm.password, createForm.eso_handle);
        if (res.success) {
            setShowCreate(false);
            setCreateForm({ username: '', email: '', password: '', eso_handle: '' });
            loadUsers();
        } else {
            alert("Create failed: " + res.error);
        }
    };

    // Escape key handler
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Developer Account Manager & Bypass Vault"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        >
            <div className="relative w-full max-w-4xl rounded-none bg-[#121218] border-2 border-[#c5a059]/60 p-6 text-[#e0d8c3] shadow-2xl max-h-[90vh] flex flex-col">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#2a2c33] pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-none bg-[#0a0a0d] border border-[#c5a059]/40 text-[#c5a059]" aria-hidden="true">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-cinzel text-xl font-bold tracking-wide text-[#e0d8c3] flex items-center gap-2 uppercase">
                                [DEV] Account Manager & Bypass Vault
                            </h2>
                            <p className="text-xs text-[#d4af37]">
                                1-Click developer account switching, editing, and instant session bypass.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Developer Account Manager modal"
                        className="p-2 rounded-none bg-[#0a0a0d] border border-[#2a2c33] hover:border-[#c5a059]/40 text-[#b0a696] hover:text-[#e0d8c3] transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="text-xs text-[#a89f91] flex items-center gap-2 font-mono">
                        <Users className="w-4 h-4 text-[#c5a059]" />
                        <span>Registered Accounts: <strong className="text-[#e0d8c3]">{users.length}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClearListings}
                            className="px-3 py-1.5 rounded-none bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 text-red-400 hover:text-red-300 text-xs font-cinzel font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                            title="Clear all active listings and price records from SQLite database"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear Market DB</span>
                        </button>
                        <button
                            onClick={() => setShowCreate(!showCreate)}
                            className="px-3 py-1.5 rounded-none bg-[#c5a059]/20 hover:bg-[#c5a059]/30 border border-[#c5a059]/40 text-[#d4af37] text-xs font-cinzel font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            {showCreate ? "Cancel New User" : "Create Test Account"}
                        </button>
                    </div>
                </div>

                {/* Create Quick User Form */}
                {showCreate && (
                    <form onSubmit={handleCreateAccount} className="mb-4 p-4 bg-[#0a0a0d] border border-[#c5a059]/30 grid grid-cols-1 md:grid-cols-5 gap-3">
                        <input
                            type="text"
                            placeholder="Username"
                            value={createForm.username}
                            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value, eso_handle: `@${e.target.value}` })}
                            className="px-3 py-1.5 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] focus:border-[#c5a059] focus:outline-none"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={createForm.email}
                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                            className="px-3 py-1.5 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] focus:border-[#c5a059] focus:outline-none"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={createForm.password}
                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            className="px-3 py-1.5 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] focus:border-[#c5a059] focus:outline-none"
                            required
                        />
                        <input
                            type="text"
                            placeholder="ESO Handle (@Name)"
                            value={createForm.eso_handle}
                            onChange={(e) => setCreateForm({ ...createForm, eso_handle: e.target.value })}
                            className="px-3 py-1.5 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] focus:border-[#c5a059] focus:outline-none"
                        />
                        <button type="submit" className="px-3 py-1.5 bg-[#c5a059] text-[#0a0a0d] font-cinzel font-bold text-xs uppercase hover:bg-[#d4af37] transition-colors">
                            Add User
                        </button>
                    </form>
                )}

                {/* Account Cards List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {loading ? (
                        <div className="text-center py-8 text-[#8a8275] font-cinzel text-xs uppercase tracking-wider">Loading developer accounts...</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-[#8a8275] text-xs">No accounts found.</div>
                    ) : (
                        users.map((u) => {
                            const isCurrent = currentUser && currentUser.id === u.id;
                            const isEditing = editingUserId === u.id;

                            return (
                                <div
                                    key={u.id}
                                    className={`p-4 rounded-none border transition-all ${
                                        isCurrent
                                            ? "bg-[#c5a059]/10 border-[#c5a059] shadow-lg"
                                            : "bg-[#0a0a0d] border-[#2a2c33] hover:border-[#c5a059]/40"
                                    }`}
                                >
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <input
                                                type="text"
                                                value={editForm.username}
                                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                                className="px-3 py-1 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3]"
                                            />
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="px-3 py-1 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3]"
                                            />
                                            <input
                                                type="text"
                                                value={editForm.eso_handle}
                                                onChange={(e) => setEditForm({ ...editForm, eso_handle: e.target.value })}
                                                className="px-3 py-1 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3]"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveEdit(u.id)}
                                                    className="px-3 py-1 bg-[#c5a059] text-[#0a0a0d] font-bold text-xs uppercase"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingUserId(null)}
                                                    className="px-3 py-1 bg-[#161620] border border-[#2a2c33] text-[#a89f91] text-xs uppercase"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-[#e0d8c3]">@{u.username}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-[#161620] text-[#d4af37] font-mono border border-[#2a2c33]">
                                                        {u.eso_handle || `@${u.username}`}
                                                    </span>
                                                    {u.role === 'admin' && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-red-950/40 text-red-400 border border-red-600/40 font-semibold uppercase">
                                                            ADMIN
                                                        </span>
                                                    )}
                                                    {isCurrent && (
                                                        <span className="text-[10px] px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-bold uppercase tracking-wider">
                                                            ACTIVE SESSION
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-[#8a8275] flex items-center gap-3">
                                                    <span>Email: <strong className="text-[#a89f91]">{u.email}</strong></span>
                                                    <span>•</span>
                                                    <span>Characters: <strong className="text-[#a89f91]">{u.character_count || 0}</strong></span>
                                                </div>
                                                {u.api_token && (
                                                    <div className="text-[11px] text-[#8a8275] font-mono flex items-center gap-1">
                                                        <Key className="w-3 h-3 text-[#c5a059]" />
                                                        <span>API Token: {u.api_token}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => handleBypass(u.id)}
                                                        className="px-3 py-1.5 rounded-none bg-[#c5a059] hover:bg-[#d4af37] text-[#0a0a0d] font-cinzel font-bold text-xs uppercase flex items-center gap-1.5 shadow-md transition-all"
                                                        title="Instantly switch active session into this account without password"
                                                    >
                                                        <Zap className="w-3.5 h-3.5 fill-current" />
                                                        Bypass Login
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEditClick(u)}
                                                    className="p-1.5 bg-[#161620] hover:bg-[#20202e] text-[#e0d8c3] border border-[#2a2c33] transition-colors"
                                                    title="Edit Account Details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id, u.username)}
                                                    className="p-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-600/40 transition-colors"
                                                    title="Delete Account"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { fetchDevUsers, devUpdateUser, devDeleteUser, registerUser } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { Shield, Zap, Edit2, Trash2, X, Plus, Key, Users } from 'lucide-react';

export default function DevAccountModal({ isOpen, onClose }) {
    const { user: currentUser, devBypass, refreshUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editForm, setEditForm] = useState({ username: '', email: '', eso_handle: '', role: 'user' });
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ username: '', email: '', password: 'password123', eso_handle: '' });

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

    if (!isOpen) return null;

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
            setCreateForm({ username: '', email: '', password: 'password123', eso_handle: '' });
            loadUsers();
        } else {
            alert("Create failed: " + res.error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="relative w-full max-w-4xl rounded-2xl bg-zinc-950 border border-amber-500/30 p-6 text-zinc-100 shadow-2xl shadow-amber-500/10 max-h-[90vh] flex flex-col">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-wide text-zinc-100 flex items-center gap-2">
                                [DEV] Account Manager & Bypass Panel
                            </h2>
                            <p className="text-xs text-amber-400/80">
                                1-Click developer account switching, editing, and instant session bypass.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>Registered Accounts: <strong className="text-white">{users.length}</strong></span>
                    </div>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        {showCreate ? "Cancel New User" : "Create Test Account"}
                    </button>
                </div>

                {/* Create Quick User Form */}
                {showCreate && (
                    <form onSubmit={handleCreateAccount} className="mb-4 p-4 rounded-xl bg-zinc-900/80 border border-amber-500/20 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                            type="text"
                            placeholder="Username"
                            value={createForm.username}
                            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value, eso_handle: `@${e.target.value}` })}
                            className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={createForm.email}
                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                            className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                            required
                        />
                        <input
                            type="text"
                            placeholder="ESO Handle (@Name)"
                            value={createForm.eso_handle}
                            onChange={(e) => setCreateForm({ ...createForm, eso_handle: e.target.value })}
                            className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                        <button type="submit" className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors">
                            Add User
                        </button>
                    </form>
                )}

                {/* Account Cards List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {loading ? (
                        <div className="text-center py-8 text-zinc-500 text-xs">Loading developer accounts...</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-xs">No accounts found.</div>
                    ) : (
                        users.map((u) => {
                            const isCurrent = currentUser && currentUser.id === u.id;
                            const isEditing = editingUserId === u.id;

                            return (
                                <div
                                    key={u.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        isCurrent
                                            ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5"
                                            : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                                    }`}
                                >
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <input
                                                type="text"
                                                value={editForm.username}
                                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                                className="px-3 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs text-white"
                                            />
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="px-3 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs text-white"
                                            />
                                            <input
                                                type="text"
                                                value={editForm.eso_handle}
                                                onChange={(e) => setEditForm({ ...editForm, eso_handle: e.target.value })}
                                                className="px-3 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs text-white"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveEdit(u.id)}
                                                    className="px-3 py-1 bg-amber-500 text-black font-bold text-xs rounded hover:bg-amber-400"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingUserId(null)}
                                                    className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded hover:bg-zinc-700"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-zinc-100">@{u.username}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400 font-mono border border-zinc-700">
                                                        {u.eso_handle || `@${u.username}`}
                                                    </span>
                                                    {u.role === 'admin' && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-semibold uppercase">
                                                            ADMIN
                                                        </span>
                                                    )}
                                                    {isCurrent && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                                                            ACTIVE SESSION
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-zinc-400 flex items-center gap-3">
                                                    <span>Email: <strong className="text-zinc-300">{u.email}</strong></span>
                                                    <span>•</span>
                                                    <span>Characters: <strong className="text-zinc-300">{u.character_count || 0}</strong></span>
                                                </div>
                                                <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                                                    <Key className="w-3 h-3 text-zinc-600" />
                                                    <span>API Token: {u.api_token}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => handleBypass(u.id)}
                                                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all"
                                                        title="Instantly switch active session into this account without password"
                                                    >
                                                        <Zap className="w-3.5 h-3.5 fill-current" />
                                                        Bypass Login
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEditClick(u)}
                                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                                                    title="Edit Account Details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id, u.username)}
                                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
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

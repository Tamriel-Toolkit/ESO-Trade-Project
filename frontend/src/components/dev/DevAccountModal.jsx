import React, { useState, useEffect } from 'react';
import { fetchDevUsers, devUpdateUser, devDeleteUser, registerUser, clearAllListings } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { Shield, Zap, Edit2, Trash2, X, Plus, Key, Users } from 'lucide-react';
import { EsoTooltip } from '../ui/tooltip';
import { useDialogFocus } from '@/hooks/useDialogFocus';

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
        if (isOpen && !import.meta.env.PROD) {
            loadUsers();
        }
    }, [isOpen]);

    const dialogRef = useDialogFocus(isOpen && !import.meta.env.PROD, onClose);

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

    // Escape, focus return, and keyboard containment share the dialog behavior.
    if (!isOpen || import.meta.env.PROD) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Developer accounts"
            className="exchange-modal-backdrop exchange-dev"
        >
            <div ref={dialogRef} tabIndex={-1} className="exchange-modal max-w-4xl p-4 sm:p-6 flex flex-col">
                
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3 border-b border-border pb-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-none bg-recess border border-primary/40 text-primary" aria-hidden="true">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-sans text-xl font-bold  text-foreground flex items-center gap-2 ">
                                Developer accounts
                            </h2>
                            <p className="text-xs text-primary">
                                Manage test accounts and switch development sessions.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Developer Account Manager modal"
                        className="p-2 rounded-none bg-recess border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-2 font-mono">
                        <Users className="w-4 h-4 text-primary" />
                        <span>Registered Accounts: <strong className="text-foreground">{users.length}</strong></span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <EsoTooltip content="Clear all active listings and price records from SQLite database" side="bottom">
                            <button
                                onClick={handleClearListings}
                                className="px-3 py-1.5 rounded-none bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 text-red-400 hover:text-red-300 text-xs font-sans font-bold   flex items-center gap-1.5 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Clear Market DB</span>
                            </button>
                        </EsoTooltip>
                        <button
                            onClick={() => setShowCreate(!showCreate)}
                            aria-expanded={showCreate}
                            aria-controls="dev-create-account-form"
                            className="px-3 py-1.5 rounded-none bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-sans font-bold   flex items-center gap-1.5 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {showCreate ? "Cancel New User" : "Create Test Account"}
                        </button>
                    </div>
                </div>

                {/* Create Quick User Form */}
                {showCreate && (
                    <form id="dev-create-account-form" onSubmit={handleCreateAccount} className="mb-4 p-4 bg-recess border border-primary/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="exchange-field">
                            Username
                        <input
                            type="text"
                            placeholder="Username"
                            value={createForm.username}
                            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value, eso_handle: `@${e.target.value}` })}
                            className="px-3 py-1.5 bg-card border border-border text-xs text-foreground focus:border-primary focus:outline-none"
                            required
                        />
                        </label>
                        <label className="exchange-field">
                            Email
                        <input
                            type="email"
                            placeholder="Email"
                            value={createForm.email}
                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                            className="px-3 py-1.5 bg-card border border-border text-xs text-foreground focus:border-primary focus:outline-none"
                            required
                        />
                        </label>
                        <label className="exchange-field">
                            Password
                        <input
                            type="password"
                            placeholder="Password"
                            value={createForm.password}
                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            className="px-3 py-1.5 bg-card border border-border text-xs text-foreground focus:border-primary focus:outline-none"
                            required
                        />
                        </label>
                        <label className="exchange-field">
                            ESO handle
                        <input
                            type="text"
                            placeholder="ESO Handle (@Name)"
                            value={createForm.eso_handle}
                            onChange={(e) => setCreateForm({ ...createForm, eso_handle: e.target.value })}
                            className="px-3 py-1.5 bg-card border border-border text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                        </label>
                        <button type="submit" className="exchange-primary sm:col-span-2 justify-self-start">
                            Add User
                        </button>
                    </form>
                )}

                {/* Account Cards List */}
                <div className="space-y-3 min-w-0">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground font-sans text-xs  ">Loading developer accounts...</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs">No accounts found.</div>
                    ) : (
                        users.map((u) => {
                            const isCurrent = currentUser && currentUser.id === u.id;
                            const isEditing = editingUserId === u.id;

                            return (
                                <div
                                    key={u.id}
                                    className={`p-4 rounded-none border transition-colors ${
                                        isCurrent
                                            ? "bg-primary/10 border-primary shadow-lg"
                                            : "bg-recess border-border hover:border-primary/40"
                                    }`}
                                >
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className="exchange-field">
                                                Username
                                            <input
                                                type="text"
                                                value={editForm.username}
                                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                                className="px-3 py-1 bg-card border border-border text-xs text-foreground"
                                            />
                                            </label>
                                            <label className="exchange-field">
                                                Email
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="px-3 py-1 bg-card border border-border text-xs text-foreground"
                                            />
                                            </label>
                                            <label className="exchange-field">
                                                ESO handle
                                            <input
                                                type="text"
                                                value={editForm.eso_handle}
                                                onChange={(e) => setEditForm({ ...editForm, eso_handle: e.target.value })}
                                                className="px-3 py-1 bg-card border border-border text-xs text-foreground"
                                            />
                                            </label>
                                            <div className="flex items-end gap-2">
                                                <button
                                                    onClick={() => handleSaveEdit(u.id)}
                                                    className="px-3 py-1 bg-primary text-recess font-bold text-xs "
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingUserId(null)}
                                                    className="px-3 py-1 bg-secondary border border-border text-muted-foreground text-xs "
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-bold text-sm text-foreground break-all">@{u.username}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-secondary text-primary font-mono border border-border break-all">
                                                        {u.eso_handle || `@${u.username}`}
                                                    </span>
                                                    {u.role === 'admin' && (
                                                        <span className="text-xs px-1.5 py-0.5 bg-red-950/40 text-red-400 border border-red-600/40 font-semibold ">
                                                            ADMIN
                                                        </span>
                                                    )}
                                                    {isCurrent && (
                                                        <span className="text-xs px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-bold  ">
                                                            ACTIVE SESSION
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                                                    <span className="break-all">Email: <strong className="text-muted-foreground">{u.email}</strong></span>
                                                    <span>•</span>
                                                    <span>Characters: <strong className="text-muted-foreground">{u.character_count || 0}</strong></span>
                                                </div>
                                                {u.api_token && (
                                                    <div className="text-xs text-muted-foreground font-mono flex items-start gap-1 min-w-0">
                                                        <Key className="w-3 h-3 text-primary shrink-0 mt-1" />
                                                        <span className="break-all">API Token: {u.api_token}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                                                {!isCurrent && (
                                                    <EsoTooltip content="Instantly switch active session into this account without password" side="top">
                                                        <button
                                                            onClick={() => handleBypass(u.id)}
                                                            className="px-3 py-1.5 rounded-none bg-primary hover:bg-primary text-recess font-sans font-bold text-xs  flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                                                        >
                                                            <Zap className="w-3.5 h-3.5 fill-current" />
                                                            Bypass Login
                                                        </button>
                                                    </EsoTooltip>
                                                )}
                                                <EsoTooltip content="Edit Account Details" side="top">
                                                    <button
                                                        onClick={() => handleEditClick(u)}
                                                        className="p-1.5 bg-secondary hover:bg-secondary text-foreground border border-border transition-colors cursor-pointer"
                                                        aria-label={`Edit account @${u.username}`}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </EsoTooltip>
                                                <EsoTooltip content={`Delete account @${u.username}`} side="top">
                                                    <button
                                                        onClick={() => handleDelete(u.id, u.username)}
                                                        className="p-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-600/40 transition-colors cursor-pointer"
                                                        aria-label={`Delete account @${u.username}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </EsoTooltip>
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

import React, { useState, useEffect } from 'react';
import Navbar from '../components/ui/navbar';
import { useAuth } from '../context/AuthContext';
import { fetchCharacters, createCharacter, deleteCharacter } from '../api/api';
import { Shield, Sparkles, Plus, Trash2, User, Award, CheckCircle2, Clock } from 'lucide-react';

const CLASS_COLORS = {
    Dragonknight: "border-orange-500/40 bg-orange-500/10 text-orange-400",
    Sorcerer: "border-purple-500/40 bg-purple-500/10 text-purple-400",
    Nightblade: "border-red-500/40 bg-red-500/10 text-red-400",
    Warden: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    Necromancer: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
    Templar: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    Arcanist: "border-lime-500/40 bg-lime-500/10 text-lime-400"
};

const ALLIANCE_NAMES = {
    1: { name: "Aldmeri Dominion", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
    2: { name: "Ebonheart Pact", color: "text-red-400 border-red-500/30 bg-red-500/10" },
    3: { name: "Daggerfall Covenant", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" }
};

export default function CharacterManager() {
    const { user } = useAuth();
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({ name: '', class: 'Dragonknight', level: 50, alliance: 1, master_crafter_unlocked: 0 });

    const loadRoster = async () => {
        setLoading(true);
        const res = await fetchCharacters();
        if (res && res.characters) {
            setCharacters(res.characters);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadRoster();
    }, [user]);

    const handleAddCharacter = async (e) => {
        e.preventDefault();
        const res = await createCharacter(form);
        if (res.success) {
            setShowAddModal(false);
            setForm({ name: '', class: 'Dragonknight', level: 50, alliance: 1, master_crafter_unlocked: 0 });
            loadRoster();
        } else {
            alert("Failed to add character: " + res.error);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to remove character '${name}' from your roster?`)) {
            const res = await deleteCharacter(id);
            if (res.success) {
                loadRoster();
            } else {
                alert("Failed to delete character: " + res.error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Navbar />

            {/* Header Banner */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md px-6 py-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                <Shield className="w-8 h-8 text-amber-400" />
                                Character Manager & Roster
                            </h1>
                            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                                {user ? `@${user.username}` : "Guest Session"}
                            </span>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">
                            Manage your ESO character roster, Master Crafter achievements, and guild trader slots.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/10 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Character
                    </button>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                
                {/* Auto-Discovery Notice */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                        <strong className="text-white">AUTOMATED CHARACTER AUTO-DISCOVERY IS ACTIVE:</strong> When you run the store scanner in-game (`/esotrade`), your active playing character is automatically registered into your roster with their Class, Level/CP, Alliance, and Master Crafter status!
                    </div>
                </div>

                {/* Character Cards Roster Grid */}
                <div>
                    <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-amber-400" />
                        Active Character Roster ({characters.length})
                    </h2>

                    {!user ? (
                        <div className="text-center py-12 bg-zinc-900/60 border border-amber-500/30 rounded-2xl p-8 space-y-4 shadow-xl">
                            <Shield className="w-12 h-12 text-amber-400 mx-auto" />
                            <h3 className="text-lg font-bold text-white">Authentication Required</h3>
                            <p className="text-zinc-400 text-xs max-w-md mx-auto">
                                Please log in or use the <strong className="text-amber-400">[DEV] Accounts</strong> bypass button in the top header to view and manage your character roster.
                            </p>
                        </div>
                    ) : loading ? (
                        <div className="text-center py-12 text-zinc-500 text-sm">Loading character roster...</div>
                    ) : characters.length === 0 ? (
                        <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8">
                            <p className="text-zinc-400 text-sm mb-4">No characters registered in your roster yet.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold"
                            >
                                + Add First Character
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {characters.map((c) => {
                                const allianceObj = ALLIANCE_NAMES[c.alliance] || ALLIANCE_NAMES[1];
                                const classColor = CLASS_COLORS[c.class] || CLASS_COLORS.Dragonknight;
                                const isMasterCrafter = Boolean(c.master_crafter_unlocked);

                                return (
                                    <div
                                        key={c.id}
                                        className="relative p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 transition-all shadow-xl space-y-4 group"
                                    >
                                        {/* Top Row: Character Name & Master Crafter Badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-white tracking-wide">
                                                        {c.name}
                                                    </h3>
                                                    {/* MASTER CRAFTER ICON BADGE */}
                                                    {isMasterCrafter && (
                                                        <span
                                                            className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-bold flex items-center gap-1 shadow-sm shadow-amber-500/20"
                                                            title="Master Crafter Achievement Unlocked!"
                                                        >
                                                            <Award className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                                                            Master Crafter
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${allianceObj.color} shadow-sm`}>
                                                        {allianceObj.name}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDelete(c.id, c.name)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                                title="Remove character"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Class & Level Badges */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div className={`p-2.5 rounded-xl border ${classColor} flex flex-col items-start`}>
                                                <span className="text-[10px] uppercase tracking-wider text-zinc-400">Class</span>
                                                <span className="text-xs font-extrabold">{c.class || "Dragonknight"}</span>
                                            </div>

                                            <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/50 text-zinc-200 flex flex-col items-start">
                                                <span className="text-[10px] uppercase tracking-wider text-zinc-400">Level / CP</span>
                                                <span className="text-xs font-extrabold text-amber-400">
                                                    Lvl {c.level || 50}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Sync Footer */}
                                        <div className="border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500 flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-zinc-600" />
                                                Last Synced: {c.last_sync_at ? new Date(c.last_sync_at).toLocaleDateString() : 'Never'}
                                            </span>
                                            <span className="text-emerald-400/90 font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Active
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Add Character Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-amber-500/30 p-6 text-zinc-100 shadow-2xl space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Plus className="w-5 h-5 text-amber-400" />
                            Add Character Profile
                        </h2>

                        <form onSubmit={handleAddCharacter} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-zinc-400 mb-1">Character Name</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
                                    placeholder="e.g. Parabellam"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-zinc-400 mb-1">Class</label>
                                    <select
                                        value={form.class}
                                        onChange={(e) => setForm({ ...form, class: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
                                    >
                                        <option value="Dragonknight">Dragonknight</option>
                                        <option value="Sorcerer">Sorcerer</option>
                                        <option value="Nightblade">Nightblade</option>
                                        <option value="Warden">Warden</option>
                                        <option value="Necromancer">Necromancer</option>
                                        <option value="Templar">Templar</option>
                                        <option value="Arcanist">Arcanist</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-zinc-400 mb-1">Alliance</label>
                                    <select
                                        value={form.alliance}
                                        onChange={(e) => setForm({ ...form, alliance: Number(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
                                    >
                                        <option value={1}>Aldmeri Dominion</option>
                                        <option value={2}>Daggerfall Covenant</option>
                                        <option value={3}>Ebonheart Pact</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                                💡 <strong>Master Crafter Achievement Badge:</strong> Automatically verified & awarded when you run the store scanner in-game with the Master Crafter achievement completed on this character.
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400"
                                >
                                    Save Character
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

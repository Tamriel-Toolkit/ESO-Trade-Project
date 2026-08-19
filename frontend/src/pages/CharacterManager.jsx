import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/ui/navbar';
import { useAuth } from '../context/AuthContext';
import { fetchCharacters, createCharacter, deleteCharacter } from '../api/api';
import { Shield, Sparkles, Plus, Trash2, User, Award, CheckCircle2, Clock, X, Users, Flame, Zap, Sword, Skull, Sun, BookOpen, ExternalLink } from 'lucide-react';
import { AldmeriDominionIcon, EbonheartPactIcon, DaggerfallCovenantIcon, getAllianceIcon } from '../components/ui/alliance-icons';
import { EsoSelect } from '../components/ui/eso-select';
import { CharacterProfileModal } from '../components/character/CharacterProfileModal';

const CLASS_COLORS = {
    Dragonknight: "border-orange-600/40 bg-orange-950/20 text-orange-400",
    Sorcerer: "border-purple-600/40 bg-purple-950/20 text-purple-400",
    Nightblade: "border-red-600/40 bg-red-950/20 text-red-400",
    Warden: "border-emerald-600/40 bg-emerald-950/20 text-emerald-400",
    Necromancer: "border-cyan-600/40 bg-cyan-950/20 text-cyan-400",
    Templar: "border-[#c5a059]/40 bg-amber-950/20 text-[#d4af37]",
    Arcanist: "border-lime-600/40 bg-lime-950/20 text-lime-400"
};

const ALLIANCE_NAMES = {
    1: { name: "Aldmeri Dominion", color: "text-[#d4af37] border-[#c5a059]/40 bg-amber-950/20" },
    2: { name: "Ebonheart Pact", color: "text-red-400 border-red-600/40 bg-red-950/20" },
    3: { name: "Daggerfall Covenant", color: "text-blue-400 border-blue-600/40 bg-blue-950/20" }
};

export default function CharacterManager() {
    const { user } = useAuth();
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAllianceFilter, setSelectedAllianceFilter] = useState(0); // 0 = All
    const [selectedClassFilter, setSelectedClassFilter] = useState(""); // "" = All
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCharacterProfile, setSelectedCharacterProfile] = useState(null);
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

    const handleDelete = async (id, name, e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to remove character '${name}' from your roster?`)) {
            const res = await deleteCharacter(id);
            if (res.success) {
                loadRoster();
            } else {
                alert("Failed to delete character: " + res.error);
            }
        }
    };

    // Derived statistics
    const stats = useMemo(() => {
        const total = characters.length;
        const masterCrafters = characters.filter(c => Boolean(c.master_crafter_unlocked)).length;
        const maxLevel = characters.filter(c => c.level >= 50).length;
        return { total, masterCrafters, maxLevel };
    }, [characters]);

    const filteredCharacters = useMemo(() => {
        return characters.filter(c => {
            const matchesAlliance = selectedAllianceFilter === 0 || Number(c.alliance) === Number(selectedAllianceFilter);
            const matchesClass = !selectedClassFilter || c.class === selectedClassFilter;
            return matchesAlliance && matchesClass;
        });
    }, [characters, selectedAllianceFilter, selectedClassFilter]);

    // Dropdown Options with SVG Alliance Crest Icons & Class Symbols
    const allianceOptions = [
        { value: 0, label: "All Alliances", icon: <Shield className="size-4 text-[#c5a059]" /> },
        { value: 1, label: "Aldmeri Dominion", icon: <AldmeriDominionIcon className="size-4" /> },
        { value: 2, label: "Ebonheart Pact", icon: <EbonheartPactIcon className="size-4" /> },
        { value: 3, label: "Daggerfall Covenant", icon: <DaggerfallCovenantIcon className="size-4" /> }
    ];

    const classOptions = [
        { value: "", label: "All Classes", icon: <User className="size-4 text-[#c5a059]" /> },
        { value: "Dragonknight", label: "Dragonknight", icon: <Flame className="size-4 text-orange-400" /> },
        { value: "Sorcerer", label: "Sorcerer", icon: <Zap className="size-4 text-purple-400" /> },
        { value: "Nightblade", label: "Nightblade", icon: <Sword className="size-4 text-red-400" /> },
        { value: "Warden", label: "Warden", icon: <Sparkles className="size-4 text-emerald-400" /> },
        { value: "Necromancer", label: "Necromancer", icon: <Skull className="size-4 text-cyan-400" /> },
        { value: "Templar", label: "Templar", icon: <Sun className="size-4 text-[#d4af37]" /> },
        { value: "Arcanist", label: "Arcanist", icon: <BookOpen className="size-4 text-lime-400" /> }
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0d] text-[#e0d8c3] flex flex-col">
            <Navbar />

            {/* Header Banner (Full-width edge-to-edge) */}
            <header className="w-full border-b border-[#2a2c33] bg-[#121218] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 shadow-xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-cinzel text-2xl md:text-3xl font-extrabold text-[#e0d8c3] tracking-wide uppercase flex items-center gap-2">
                                <Shield className="w-7 h-7 text-[#c5a059]" />
                                Account Characters
                            </h1>
                            <span className="px-3 py-0.5 rounded-none bg-[#c5a059]/10 border border-[#c5a059]/40 text-[#d4af37] text-xs font-mono">
                                {user ? `@${user.username}` : "Guest Session"}
                            </span>
                        </div>
                        <p className="text-xs md:text-sm text-[#a89f91] mt-1">
                            Manage your ESO character roster, Master Crafter achievements, and view anatomical equipment loadouts.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2.5 rounded-none bg-[#c5a059] hover:bg-[#d4af37] text-[#0a0a0d] font-cinzel font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Add Character
                    </button>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
                
                {/* Roster Statistics Cards */}
                {user && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="eso-card p-4 flex items-center gap-3 border-l-4 border-l-[#c5a059]">
                            <Users className="w-8 h-8 text-[#c5a059]" />
                            <div>
                                <span className="text-[11px] font-cinzel uppercase text-[#8a8275] block">Total  Characters</span>
                                <span className="font-mono text-xl font-bold text-[#e0d8c3]">{stats.total}</span>
                            </div>
                        </div>

                        <div className="eso-card p-4 flex items-center gap-3 border-l-4 border-l-amber-500">
                            <Award className="w-8 h-8 text-amber-400" />
                            <div>
                                <span className="text-[11px] font-cinzel uppercase text-[#8a8275] block">Master Crafters</span>
                                <span className="font-mono text-xl font-bold text-[#d4af37]">{stats.masterCrafters}</span>
                            </div>
                        </div>

                        <div className="eso-card p-4 flex items-center gap-3 border-l-4 border-l-emerald-500">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            <div>
                                <span className="text-[11px] font-cinzel uppercase text-[#8a8275] block">Level 50+</span>
                                <span className="font-mono text-xl font-bold text-emerald-400">{stats.maxLevel}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Auto-Discovery Notice */}
                <div className="p-4 rounded-none bg-[#121218] border border-[#c5a059]/40 text-[#d4af37] text-xs flex items-center gap-3 shadow-md">
                    <Sparkles className="w-5 h-5 text-[#c5a059] shrink-0" />
                    <div className="leading-relaxed">
                        <strong className="text-[#e0d8c3] uppercase tracking-wider font-cinzel">Automated Character Sync Active:</strong> Click any character card below to inspect their full **Anatomical Equipment Diagram**, set bonuses, and equipped traits!
                    </div>
                </div>

                {/* Character Cards Roster Grid */}
                <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-[#2a2c33] pb-3">
                        <h2 className="font-cinzel text-xl font-bold text-[#e0d8c3] uppercase tracking-wider flex items-center gap-2">
                            <User className="w-5 h-5 text-[#c5a059]" />
                            Active Character Roster ({filteredCharacters.length})
                        </h2>

                        {/* Dual Alliance & Class Custom Icon Dropdowns */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Alliance Filter Custom Dropdown */}
                            <EsoSelect
                                value={selectedAllianceFilter}
                                onChange={(val) => setSelectedAllianceFilter(Number(val))}
                                options={allianceOptions}
                                placeholder="Select Alliance"
                                aria-label="Filter character roster by Alliance"
                            />

                            {/* Class Filter Custom Dropdown */}
                            <EsoSelect
                                value={selectedClassFilter}
                                onChange={(val) => setSelectedClassFilter(String(val))}
                                options={classOptions}
                                placeholder="Select Class"
                                aria-label="Filter character roster by Class"
                            />

                            {/* Reset Filters Quick Button */}
                            {(selectedAllianceFilter !== 0 || selectedClassFilter !== "") && (
                                <button
                                    onClick={() => {
                                        setSelectedAllianceFilter(0);
                                        setSelectedClassFilter("");
                                    }}
                                    className="px-2.5 py-1 text-xs text-[#a89f91] hover:text-[#e0d8c3] bg-[#161620] border border-[#2a2c33] hover:border-[#c5a059]/40 flex items-center gap-1 font-cinzel uppercase cursor-pointer"
                                >
                                    <X className="w-3 h-3" /> Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {!user ? (
                        <div className="text-center py-12 eso-card rounded-none p-8 space-y-4 shadow-xl border border-[#c5a059]/40">
                            <Shield className="w-12 h-12 text-[#c5a059] mx-auto" />
                            <h3 className="font-cinzel text-xl font-bold text-[#d4af37] tracking-wider uppercase">Authentication Required</h3>
                            <p className="text-[#a89f91] text-xs max-w-md mx-auto leading-relaxed">
                                Sign in with your Merchant Account to synchronize your in-game character roster, gear loadouts, and trait research from the ESOTrade addon.
                            </p>
                            <div className="pt-2">
                                <Link
                                    to="/login"
                                    state={{ from: { pathname: '/characters' } }}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#c5a059] hover:bg-[#d4af37] text-[#0a0a0d] font-cinzel font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                                >
                                    <User className="size-4" />
                                    <span>Sign In or Register</span>
                                </Link>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="text-center py-12 text-[#8a8275] font-cinzel text-xs uppercase tracking-wider">Loading character roster...</div>
                    ) : filteredCharacters.length === 0 ? (
                        <div className="text-center py-12 eso-card rounded-none p-8">
                            <p className="text-[#a89f91] text-sm mb-4">No characters found matching the selected alliance and class filters.</p>
                            <button
                                onClick={() => {
                                    setSelectedAllianceFilter(0);
                                    setSelectedClassFilter("");
                                }}
                                className="px-4 py-2 rounded-none bg-[#c5a059]/20 text-[#d4af37] border border-[#c5a059]/40 text-xs font-cinzel font-bold uppercase tracking-wider hover:bg-[#c5a059]/30"
                            >
                                Clear Roster Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCharacters.map((c) => {
                                const allianceObj = ALLIANCE_NAMES[c.alliance] || ALLIANCE_NAMES[1];
                                const classColor = CLASS_COLORS[c.class] || CLASS_COLORS.Dragonknight;
                                const isMasterCrafter = Boolean(c.master_crafter_unlocked);

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => setSelectedCharacterProfile(c)}
                                        className="eso-card rounded-none p-6 space-y-4 relative group hover:border-[#c5a059] border-2 cursor-pointer transition-all shadow-xl"
                                    >
                                        {/* Top Row: Character Name & Master Crafter Badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-cinzel text-lg font-bold text-[#e0d8c3] tracking-wide group-hover:text-[#c5a059] transition-colors flex items-center gap-1.5">
                                                        <span>{c.name}</span>
                                                        <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 text-[#c5a059] transition-opacity" />
                                                    </h3>
                                                    {/* MASTER CRAFTER ICON BADGE */}
                                                    {isMasterCrafter && (
                                                        <span
                                                            className="px-2 py-0.5 rounded-none bg-[#c5a059]/20 border border-[#c5a059]/60 text-[#d4af37] text-[10px] font-cinzel font-bold uppercase tracking-wider flex items-center gap-1"
                                                            title="Master Crafter Achievement Unlocked!"
                                                        >
                                                            <Award className="w-3.5 h-3.5 text-[#c5a059] fill-[#c5a059]/20" />
                                                            Master Crafter
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs mt-1.5 flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-none text-[10px] font-semibold border uppercase tracking-wider flex items-center gap-1.5 ${allianceObj.color}`}>
                                                        {getAllianceIcon(c.alliance, "size-3.5")}
                                                        <span>{allianceObj.name}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => handleDelete(c.id, c.name, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-none bg-red-950/40 border border-red-600/40 text-red-400 hover:bg-red-900/60 transition-all"
                                                title="Remove character"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Class & Level Badges */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div className={`p-2.5 rounded-none border ${classColor} flex flex-col items-start`}>
                                                <span className="text-[10px] uppercase font-cinzel tracking-wider text-[#8a8275]">Class</span>
                                                <span className="text-xs font-bold font-cinzel">{c.class || "Dragonknight"}</span>
                                            </div>

                                            <div className="p-2.5 rounded-none border border-[#2a2c33] bg-[#0a0a0d] text-zinc-200 flex flex-col items-start">
                                                <span className="text-[10px] uppercase font-cinzel tracking-wider text-[#8a8275]">Level / CP</span>
                                                <span className="text-xs font-bold font-mono text-[#d4af37]">
                                                    Lvl {c.level || 50}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Sync Footer */}
                                        <div className="border-t border-[#2a2c33] pt-3 text-[11px] text-[#8a8275] flex items-center justify-between font-mono">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-[#c5a059]" />
                                                Synced: {c.last_sync_at ? new Date(c.last_sync_at).toLocaleDateString() : 'Never'}
                                            </span>
                                            <span className="text-emerald-400 font-semibold flex items-center gap-1 font-sans text-[11px]">
                                                <CheckCircle2 className="w-3 h-3" /> Inspect Loadout →
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Character Loadout & Anatomical Diagram Profile Modal */}
            {selectedCharacterProfile && (
                <CharacterProfileModal
                    character={selectedCharacterProfile}
                    onClose={() => setSelectedCharacterProfile(null)}
                />
            )}

            {/* Add Character Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-none bg-[#121218] border-2 border-[#c5a059]/60 p-6 text-[#e0d8c3] shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#2a2c33] pb-3">
                            <h2 className="font-cinzel text-lg font-bold text-[#e0d8c3] flex items-center gap-2 uppercase">
                                <Plus className="w-5 h-5 text-[#c5a059]" />
                                Add Character Profile
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-[#8a8275] hover:text-[#e0d8c3]">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCharacter} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-cinzel text-[#c5a059] mb-1 uppercase tracking-wider">Character Name</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#0a0a0d] border border-[#2a2c33] text-[#e0d8c3] text-sm focus:border-[#c5a059] focus:outline-none"
                                    placeholder="e.g. Parabellam"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-cinzel text-[#c5a059] mb-1 uppercase tracking-wider">Class</label>
                                    <select
                                        value={form.class}
                                        onChange={(e) => setForm({ ...form, class: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#0a0a0d] border border-[#2a2c33] text-[#e0d8c3] text-xs focus:border-[#c5a059] focus:outline-none"
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
                                    <label className="block font-cinzel text-[#c5a059] mb-1 uppercase tracking-wider">Alliance</label>
                                    <select
                                        value={form.alliance}
                                        onChange={(e) => setForm({ ...form, alliance: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-[#0a0a0d] border border-[#2a2c33] text-[#e0d8c3] text-xs focus:border-[#c5a059] focus:outline-none"
                                    >
                                        <option value={1}>Aldmeri Dominion</option>
                                        <option value={2}>Ebonheart Pact</option>
                                        <option value={3}>Daggerfall Covenant</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-3 bg-[#0a0a0d] border border-[#2a2c33] text-[11px] text-[#a89f91]">
                                💡 <strong className="text-[#d4af37]">Master Crafter Badge:</strong> Automatically verified & awarded when you run the store scanner in-game with the Master Crafter achievement completed on this character.
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-[#2a2c33]">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-[#161620] border border-[#2a2c33] text-[#a89f91] text-xs font-cinzel font-bold uppercase hover:bg-[#20202e]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#c5a059] text-[#0a0a0d] font-cinzel font-bold text-xs uppercase hover:bg-[#d4af37]"
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

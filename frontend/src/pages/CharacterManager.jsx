import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/ui/navbar';
import { useAuth } from '../context/AuthContext';
import { fetchCharacters, createCharacter, deleteCharacter } from '../api/api';
import { Shield, Sparkles, Plus, Trash2, User, Award, CheckCircle2, Clock, X, Users, Flame, Zap, Sword, Skull, Sun, BookOpen, ExternalLink } from 'lucide-react';
import { AldmeriDominionIcon, EbonheartPactIcon, DaggerfallCovenantIcon, getAllianceIcon } from '../components/ui/alliance-icons';
import { EsoSelect } from '../components/ui/eso-select';
import { EsoTooltip } from '../components/ui/tooltip';
import { CharacterProfileModal } from '../components/character/CharacterProfileModal';
import '../styles/characters.css';
import { useDialogFocus } from '../hooks/useDialogFocus';

const CLASS_COLORS = {
    Dragonknight: "border-orange-600/40 bg-orange-950/20 text-orange-400",
    Sorcerer: "border-purple-600/40 bg-purple-950/20 text-purple-400",
    Nightblade: "border-red-600/40 bg-red-950/20 text-red-400",
    Warden: "border-emerald-600/40 bg-emerald-950/20 text-emerald-400",
    Necromancer: "border-cyan-600/40 bg-cyan-950/20 text-cyan-400",
    Templar: "border-[#e6c15a]/40 bg-amber-950/20 text-[#e6c15a]",
    Arcanist: "border-lime-600/40 bg-lime-950/20 text-lime-400"
};

const ALLIANCE_NAMES = {
    1: { name: "Aldmeri Dominion", color: "text-[#e6c15a] border-[#e6c15a]/40 bg-amber-950/20" },
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
    const addDialogRef = useDialogFocus(showAddModal, () => setShowAddModal(false));

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
        { value: 0, label: "All Alliances", icon: <Shield className="size-4 text-[#e6c15a]" /> },
        { value: 1, label: "Aldmeri Dominion", icon: <AldmeriDominionIcon className="size-4" /> },
        { value: 2, label: "Ebonheart Pact", icon: <EbonheartPactIcon className="size-4" /> },
        { value: 3, label: "Daggerfall Covenant", icon: <DaggerfallCovenantIcon className="size-4" /> }
    ];

    const classOptions = [
        { value: "", label: "All Classes", icon: <User className="size-4 text-[#e6c15a]" /> },
        { value: "Dragonknight", label: "Dragonknight", icon: <Flame className="size-4 text-orange-400" /> },
        { value: "Sorcerer", label: "Sorcerer", icon: <Zap className="size-4 text-purple-400" /> },
        { value: "Nightblade", label: "Nightblade", icon: <Sword className="size-4 text-red-400" /> },
        { value: "Warden", label: "Warden", icon: <Sparkles className="size-4 text-emerald-400" /> },
        { value: "Necromancer", label: "Necromancer", icon: <Skull className="size-4 text-cyan-400" /> },
        { value: "Templar", label: "Templar", icon: <Sun className="size-4 text-[#e6c15a]" /> },
        { value: "Arcanist", label: "Arcanist", icon: <BookOpen className="size-4 text-lime-400" /> }
    ];

    return (
        <div className="exchange-page character-page min-h-screen bg-[#111214] text-[#efe5cf] flex flex-col">
            <Navbar />

            {/* Header Banner aligned with the shared marketplace container. */}
            <header className="exchange-container">
                <div className="exchange-page-heading character-heading">
                    <div>
                        <p className="exchange-eyebrow mb-2">Your account</p>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="font-cinzel text-2xl md:text-3xl font-extrabold text-[#efe5cf] tracking-wide uppercase flex items-center gap-2">
                                <Shield className="w-7 h-7 text-[#e6c15a]" />
                                Characters
                            </h1>
                            <span className="px-3 py-0.5 rounded-none bg-[#e6c15a]/10 border border-[#e6c15a]/40 text-[#e6c15a] text-xs font-mono">
                                {user ? `@${user.username}` : "Guest Session"}
                            </span>
                        </div>
                        <p className="text-xs md:text-sm text-[#afa797] mt-1">
                            Your roster, equipment, and crafting progress.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2.5 rounded-none bg-[#e6c15a] hover:bg-[#e6c15a] text-[#111214] font-cinzel font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Add Character
                    </button>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="exchange-container character-content w-full flex-1 space-y-6 pb-8">
                
                {/* Roster Statistics Cards */}
                {user && (
                    <div className="roster-statistics grid grid-cols-3 gap-4">
                        <div className="eso-card p-4 flex items-center gap-3 border-l-4 border-l-[#e6c15a]">
                            <Users className="w-8 h-8 text-[#e6c15a]" />
                            <div>
                                <span className="text-xs text-[#afa797] block">Characters</span>
                                <span className="font-mono text-xl font-bold text-[#efe5cf]">{stats.total}</span>
                            </div>
                        </div>

                        <div className="eso-card p-4 flex items-center gap-3 border-l-4 border-l-amber-500">
                            <Award className="w-8 h-8 text-amber-400" />
                            <div>
                                <span className="text-xs font-cinzel uppercase text-[#afa797] block">Master Crafters</span>
                                <span className="font-mono text-xl font-bold text-[#e6c15a]">{stats.masterCrafters}</span>
                            </div>
                        </div>

                        <div className="eso-card p-4 flex items-center gap-3 border-l-4 border-l-emerald-500">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            <div>
                                <span className="text-xs font-cinzel uppercase text-[#afa797] block">Level 50+</span>
                                <span className="font-mono text-xl font-bold text-emerald-400">{stats.maxLevel}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Auto-Discovery Notice */}
                <div className="character-sync-note text-sm flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#e6c15a] shrink-0" />
                    <div className="leading-relaxed">
                        <strong className="text-[#efe5cf]">Character equipment.</strong> Open a character to view their saved loadout, set bonuses, and traits.
                    </div>
                </div>

                {/* Character Cards Roster Grid */}
                <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-[#403c33] pb-3">
                        <h2 className="font-cinzel text-xl font-bold text-[#efe5cf] uppercase tracking-wider flex items-center gap-2">
                            <User className="w-5 h-5 text-[#e6c15a]" />
                            Your roster <span className="roster-count">{filteredCharacters.length}</span>
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
                                    className="px-2.5 py-1 text-xs text-[#afa797] hover:text-[#efe5cf] bg-[#202022] border border-[#403c33] hover:border-[#e6c15a]/40 flex items-center gap-1 font-cinzel uppercase cursor-pointer"
                                >
                                    <X className="w-3 h-3" /> Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {!user ? (
                        <div className="text-center py-12 eso-card rounded-none p-8 space-y-4 shadow-xl border border-[#e6c15a]/40">
                            <Shield className="w-12 h-12 text-[#e6c15a] mx-auto" />
                            <h3 className="font-cinzel text-xl font-bold text-[#e6c15a]">Your characters, in one place</h3>
                            <p className="text-[#afa797] text-xs max-w-md mx-auto leading-relaxed">
                                Sign in to ESO Marketplace to see your roster, equipment, and trait research from the ESOTrade addon.
                            </p>
                            <div className="pt-2">
                                <Link
                                    to="/login"
                                    state={{ from: { pathname: '/characters' } }}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e6c15a] hover:bg-[#e6c15a] text-[#111214] font-cinzel font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                                >
                                    <User className="size-4" />
                                    <span>Sign in or register</span>
                                </Link>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="text-center py-12 text-[#afa797] font-cinzel text-xs uppercase tracking-wider">Loading character roster...</div>
                    ) : filteredCharacters.length === 0 ? (
                        <div className="text-center py-12 eso-card rounded-none p-8">
                            <p className="text-[#afa797] text-sm mb-4">No characters found matching the selected alliance and class filters.</p>
                            <button
                                onClick={() => {
                                    setSelectedAllianceFilter(0);
                                    setSelectedClassFilter("");
                                }}
                                className="px-4 py-2 rounded-none bg-[#e6c15a]/20 text-[#e6c15a] border border-[#e6c15a]/40 text-xs font-cinzel font-bold uppercase tracking-wider hover:bg-[#e6c15a]/30"
                            >
                                Clear Roster Filters
                            </button>
                        </div>
                    ) : (
                        <div className="roster-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredCharacters.map((c) => {
                                const allianceObj = ALLIANCE_NAMES[c.alliance] || ALLIANCE_NAMES[1];
                                const classColor = CLASS_COLORS[c.class] || CLASS_COLORS.Dragonknight;
                                const isMasterCrafter = Boolean(c.master_crafter_unlocked);

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => setSelectedCharacterProfile(c)}
                                        className="roster-character relative group"
                                    >
                                        {/* Top Row: Character Name & Master Crafter Badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-cinzel text-lg text-[#efe5cf]">
                                                        <button type="button" className="roster-open" onClick={() => setSelectedCharacterProfile(c)} aria-label={`View ${c.name}'s equipment`}>
                                                            <span className="roster-class-icon" aria-hidden="true">{classOptions.find(option => option.value === c.class)?.icon || <User className="size-5" />}</span>
                                                            <span>{c.name}</span>
                                                        </button>
                                                    </h3>
                                                    {/* MASTER CRAFTER ICON BADGE */}
                                                    {isMasterCrafter && (
                                                        <EsoTooltip content="Master Crafter Achievement Unlocked! Complete 9-trait research & crafting proficiencies." side="top">
                                                            <span tabIndex={0} className="px-2 py-0.5 rounded-none bg-[#e6c15a]/20 border border-[#e6c15a]/60 text-[#e6c15a] text-xs font-cinzel font-bold uppercase tracking-wider flex items-center gap-1 cursor-default">
                                                                <Award className="w-3.5 h-3.5 text-[#e6c15a] fill-[#e6c15a]/20" />
                                                                Master Crafter
                                                            </span>
                                                        </EsoTooltip>
                                                    )}
                                                </div>
                                                <div className="text-xs mt-1.5 flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-none text-xs font-semibold border uppercase tracking-wider flex items-center gap-1.5 ${allianceObj.color}`}>
                                                        {getAllianceIcon(c.alliance, "size-3.5")}
                                                        <span>{allianceObj.name}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <EsoTooltip content={`Remove ${c.name} from character roster`} side="left">
                                                <button
                                                    onClick={(e) => handleDelete(c.id, c.name, e)}
                                                    className="roster-remove p-2 text-[#afa797] hover:text-red-300 transition-colors cursor-pointer"
                                                    aria-label={`Remove ${c.name}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </EsoTooltip>
                                        </div>

                                        {/* Class & Level Badges */}
                                        <div className="roster-facts grid grid-cols-2 gap-3 pt-2">
                                            <div className={`p-2.5 rounded-none border ${classColor} flex flex-col items-start`}>
                                                <span className="text-xs uppercase font-cinzel tracking-wider text-[#afa797]">Class</span>
                                                <span className="text-xs font-bold font-cinzel">{c.class || "Dragonknight"}</span>
                                            </div>

                                            <div className="p-2.5 rounded-none border border-[#403c33] bg-[#111214] text-zinc-200 flex flex-col items-start">
                                                <span className="text-xs uppercase font-cinzel tracking-wider text-[#afa797]">Level / CP</span>
                                                <span className="text-xs font-bold font-mono text-[#e6c15a]">
                                                    Lvl {c.level || 50}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Sync Footer */}
                                        <div className="border-t border-[#403c33] pt-3 text-xs text-[#afa797] flex items-center justify-between font-mono">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-[#e6c15a]" />
                                                Synced: {c.last_sync_at ? new Date(c.last_sync_at).toLocaleDateString() : 'Never'}
                                            </span>
                                            <span className="text-[#e6c15a] font-semibold flex items-center gap-1 font-sans text-xs">
                                                Equipment <ExternalLink className="w-3 h-3" />
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
                <div className="character-add-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="add-character-title">
                    <div ref={addDialogRef} tabIndex={-1} className="character-add-panel w-full max-w-md rounded-none bg-[#19191b] border border-[#e6c15a]/60 p-6 text-[#efe5cf] shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#403c33] pb-3">
                            <h2 id="add-character-title" className="font-cinzel text-lg text-[#efe5cf] flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[#e6c15a]" />
                                Add character
                            </h2>
                            <button type="button" aria-label="Close add character" onClick={() => setShowAddModal(false)} className="text-[#afa797] hover:text-[#efe5cf] p-2">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCharacter} className="space-y-4 text-xs">
                            <div>
                                <label htmlFor="character-name" className="block text-[#afa797] mb-1">Character name</label>
                                <input
                                    id="character-name"
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#111214] border border-[#403c33] text-[#efe5cf] text-sm focus:border-[#e6c15a] focus:outline-none"
                                    placeholder="e.g. Parabellam"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="character-class" className="block text-[#afa797] mb-1">Class</label>
                                    <select
                                        id="character-class"
                                        value={form.class}
                                        onChange={(e) => setForm({ ...form, class: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#111214] border border-[#403c33] text-[#efe5cf] text-xs focus:border-[#e6c15a] focus:outline-none"
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
                                    <label htmlFor="character-alliance" className="block text-[#afa797] mb-1">Alliance</label>
                                    <select
                                        id="character-alliance"
                                        value={form.alliance}
                                        onChange={(e) => setForm({ ...form, alliance: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-[#111214] border border-[#403c33] text-[#efe5cf] text-xs focus:border-[#e6c15a] focus:outline-none"
                                    >
                                        <option value={1}>Aldmeri Dominion</option>
                                        <option value={2}>Ebonheart Pact</option>
                                        <option value={3}>Daggerfall Covenant</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-3 bg-[#111214] border border-[#403c33] text-xs text-[#afa797]">
                                <strong className="text-[#e6c15a]">Master Crafter.</strong> The ESOTrade addon verifies this achievement when you scan a guild trader.
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-[#403c33]">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-[#202022] border border-[#403c33] text-[#afa797] text-xs font-cinzel font-bold uppercase hover:bg-[#20202e]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#e6c15a] text-[#111214] font-cinzel font-bold text-xs uppercase hover:bg-[#e6c15a]"
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

import React, { useState, useEffect, useMemo } from "react";
import { 
    Shield, Sparkles, Sword, Search, Plus, ShoppingCart, Lock, RefreshCw, 
    Layers, User, BookOpen, Trash2, Flame, Zap, Skull, Sun, Award, Crosshair
} from "lucide-react";
import { fetchBuilds, deleteCustomBuild } from "@/api/api";
import Navbar from "@/components/ui/navbar";
import { EsoSelect } from "@/components/ui/eso-select";
import { BuildDetailModal } from "@/components/builds/BuildDetailModal";
import { BuildCreatorModal } from "@/components/builds/BuildCreatorModal";

const CLASS_OPTIONS = [
    { value: "All Classes", label: "All Classes", icon: <User className="size-4 text-[#c5a059]" /> },
    { value: "Arcanist", label: "Arcanist", icon: <BookOpen className="size-4 text-lime-400" /> },
    { value: "Dragonknight", label: "Dragonknight", icon: <Flame className="size-4 text-orange-400" /> },
    { value: "Necromancer", label: "Necromancer", icon: <Skull className="size-4 text-cyan-400" /> },
    { value: "Nightblade", label: "Nightblade", icon: <Sword className="size-4 text-red-400" /> },
    { value: "Sorcerer", label: "Sorcerer", icon: <Zap className="size-4 text-purple-400" /> },
    { value: "Templar", label: "Templar", icon: <Sun className="size-4 text-[#d4af37]" /> },
    { value: "Warden", label: "Warden", icon: <Sparkles className="size-4 text-emerald-400" /> }
];

const ROLE_OPTIONS = [
    { value: "All Roles", label: "All Roles", icon: <Shield className="size-4 text-[#c5a059]" /> },
    { value: "Magicka DPS", label: "Magicka DPS", icon: <Zap className="size-4 text-sky-400" /> },
    { value: "Stamina DPS", label: "Stamina DPS", icon: <Sword className="size-4 text-emerald-400" /> },
    { value: "Tank", label: "Tank", icon: <Shield className="size-4 text-amber-400" /> },
    { value: "Healer", label: "Healer", icon: <Sun className="size-4 text-yellow-300" /> },
    { value: "Solo / Arena", label: "Solo / Arena", icon: <Award className="size-4 text-purple-400" /> },
    { value: "PvP", label: "PvP", icon: <Crosshair className="size-4 text-red-400" /> }
];

const ROLE_STYLES = {
    "Magicka DPS": "text-sky-400 border-sky-500/40 bg-sky-950/20",
    "Stamina DPS": "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
    "Tank": "text-amber-400 border-amber-500/40 bg-amber-950/20",
    "Healer": "text-yellow-300 border-yellow-500/40 bg-yellow-950/20",
    "Solo / Arena": "text-purple-400 border-purple-500/40 bg-purple-950/20",
    "PvP": "text-red-400 border-red-500/40 bg-red-950/20"
};

export function BuildExplorer() {
    const [builds, setBuilds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState("All Classes");
    const [selectedRole, setSelectedRole] = useState("All Roles");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal states
    const [inspectBuildId, setInspectBuildId] = useState(null);
    const [inspectInitialTab, setInspectInitialTab] = useState("gear");
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);

    const loadBuilds = async () => {
        setLoading(true);
        const res = await fetchBuilds({
            class: selectedClass !== "All Classes" ? selectedClass : undefined,
            role: selectedRole !== "All Roles" ? selectedRole : undefined,
            search: searchQuery.trim() || undefined
        });
        if (res && res.success) {
            setBuilds(res.builds || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadBuilds();
    }, [selectedClass, selectedRole]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadBuilds();
    };

    const handleDeleteBuild = async (e, buildId) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this custom build?")) return;
        const res = await deleteCustomBuild(buildId);
        if (res && res.success) {
            loadBuilds();
        } else {
            alert(res?.error || "Failed to delete build.");
        }
    };

    const openBuildModal = (buildId, tab = "gear") => {
        setInspectInitialTab(tab);
        setInspectBuildId(buildId);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0d] text-[#b8af9f] pb-24">
            <Navbar />
            
            {/* Header Banner */}
            <header className="w-full border-b border-[#2a2c33] bg-[#121218] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent pointer-events-none" />
                
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-none bg-[#c5a059]/10 border border-[#c5a059]/40 mb-2 text-[#d4af37] text-xs font-cinzel tracking-widest uppercase">
                            <Sparkles className="size-3.5 text-[#c5a059]" /> Builds & Market Deals
                        </div>
                        <h1 className="font-cinzel text-2xl sm:text-4xl font-extrabold text-[#e0d8c3] tracking-wide uppercase flex items-center gap-3">
                            <Shield className="size-8 text-[#c5a059]" />
                            Build Explorer
                        </h1>
                        <p className="text-xs sm:text-sm text-[#a89f91] mt-1 max-w-2xl leading-relaxed">
                            Explore meta builds, compare gear against your characters, and find the best trader deals.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsCreatorOpen(true)}
                        className="px-5 py-3 rounded-none bg-[#c5a059] hover:bg-[#d4af37] text-[#0a0a0d] font-cinzel font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
                    >
                        <Plus className="size-4" /> Create Build
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-4">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
                        <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search builds, sets, or authors..."
                            className="w-full pl-10 pr-24 py-2 bg-[#14141c] border border-[#2a2c33] hover:border-[#c5a059]/60 text-xs text-[#e0d8c3] placeholder:text-muted-foreground focus:outline-none focus:border-[#c5a059] transition-all font-cinzel rounded-none shadow-sm"
                        />
                        <button
                            type="submit"
                            className="absolute right-1 top-1 bottom-1 px-3.5 rounded-none bg-[#c5a059] hover:bg-[#d4af37] text-[#0a0a0d] text-xs font-cinzel font-bold tracking-wider uppercase transition-all cursor-pointer"
                        >
                            Search
                        </button>
                    </form>

                    {/* Class & Role EsoSelect Custom Dropdowns */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Class Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-cinzel font-bold text-[#c5a059] uppercase tracking-wider hidden sm:inline">
                                Class:
                            </span>
                            <EsoSelect
                                value={selectedClass}
                                onChange={(val) => setSelectedClass(String(val))}
                                options={CLASS_OPTIONS}
                                placeholder="Select Class"
                                aria-label="Filter builds by class"
                            />
                        </div>

                        {/* Role Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-cinzel font-bold text-[#c5a059] uppercase tracking-wider hidden sm:inline">
                                Role:
                            </span>
                            <EsoSelect
                                value={selectedRole}
                                onChange={(val) => setSelectedRole(String(val))}
                                options={ROLE_OPTIONS}
                                placeholder="Select Role"
                                aria-label="Filter builds by role"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Build Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {loading ? (
                    <div className="py-24 text-center text-muted-foreground">
                        <RefreshCw className="size-8 animate-spin text-[#c5a059] mx-auto mb-3" />
                        <p className="font-cinzel text-sm">Loading builds...</p>
                    </div>
                ) : builds.length === 0 ? (
                    <div className="py-20 text-center rounded-none bg-[#14141c]/50 border border-[#c5a059]/20 p-8 space-y-3">
                        <BookOpen className="size-10 text-[#c5a059] mx-auto opacity-60" />
                        <h3 className="font-cinzel font-bold text-lg text-[#fce2a6] uppercase tracking-wider">No Builds Found</h3>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Try adjusting your class, role, or search filters.
                        </p>
                        <button
                            onClick={() => { setSelectedClass("All Classes"); setSelectedRole("All Roles"); setSearchQuery(""); }}
                            className="px-4 py-2 rounded-none bg-[#c5a059]/20 hover:bg-[#c5a059]/30 text-[#e6c278] border border-[#c5a059]/40 text-xs font-cinzel font-bold transition-all inline-block mt-2 uppercase tracking-wider cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {builds.map((build) => (
                            <div
                                key={build.id}
                                onClick={() => openBuildModal(build.id, "gear")}
                                className="group relative rounded-none bg-[#13131b] border-2 border-[#2a2c33] hover:border-[#c5a059]/80 transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer shadow-xl hover:-translate-y-0.5"
                            >
                                <div>
                                    {/* Card Header Badges */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            {build.is_curated ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-cinzel font-bold bg-[#c5a059]/15 text-[#e6c278] border border-[#c5a059]/40 uppercase tracking-wider">
                                                    <Sparkles className="size-2.5" /> Curated
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-cinzel font-bold bg-purple-950/40 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                                                    <User className="size-2.5" /> Custom
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-none text-[10px] font-semibold border uppercase tracking-wider ${ROLE_STYLES[build.role] || "text-gray-300 border-gray-700 bg-gray-900/40"}`}>
                                                {build.role}
                                            </span>
                                        </div>

                                        <span className="text-[11px] font-cinzel font-bold text-[#c5a059] uppercase tracking-wider">
                                            {build.class}
                                        </span>
                                    </div>

                                    {/* Title & Author */}
                                    <h3 className="font-cinzel font-bold text-lg text-[#e0d8c3] group-hover:text-[#d4af37] transition-colors mb-1">
                                        {build.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        By <span className="text-[#e0d8c3] font-medium">{build.author}</span>
                                    </p>

                                    {/* Description */}
                                    {build.description && (
                                        <p className="text-xs text-[#a89f91] line-clamp-2 leading-relaxed mb-4">
                                            {build.description}
                                        </p>
                                    )}

                                    {/* Sets Preview Pills */}
                                    {build.sets && build.sets.length > 0 && (
                                        <div className="space-y-1.5 mb-4">
                                            <div className="text-[10px] uppercase font-cinzel font-bold tracking-wider text-[#c5a059]">
                                                Key Sets:
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {build.sets.map((s) => (
                                                    <span 
                                                        key={s} 
                                                        className="px-2 py-0.5 rounded-none bg-[#0a0a0d] border border-[#2a2c33] text-[11px] text-[#e6c278] font-cinzel"
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {/* Market Availability Bar */}
                                    <div className="pt-3 border-t border-[#2a2c33] flex items-center justify-between text-xs text-muted-foreground mb-4">
                                        <span className="text-emerald-400 flex items-center gap-1 font-medium font-cinzel">
                                            <ShoppingCart className="size-3" /> {build.tradeable_items} Tradeable
                                        </span>
                                        <span className="text-red-400 flex items-center gap-1 font-medium font-cinzel">
                                            <Lock className="size-3" /> {build.bop_items} Bound
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openBuildModal(build.id, "diff"); }}
                                            className="py-2 px-3 rounded-none bg-[#161620] hover:bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/30 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Sword className="size-3.5" /> Compare
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openBuildModal(build.id, "deals"); }}
                                            className="py-2 px-3 rounded-none bg-[#c5a059] hover:bg-[#d4af37] text-black text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                        >
                                            <ShoppingCart className="size-3.5" /> Deals
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {inspectBuildId && (
                <BuildDetailModal
                    buildId={inspectBuildId}
                    initialTab={inspectInitialTab}
                    onClose={() => setInspectBuildId(null)}
                />
            )}

            {isCreatorOpen && (
                <BuildCreatorModal
                    onClose={() => setIsCreatorOpen(false)}
                    onBuildCreated={(newId) => {
                        loadBuilds();
                        openBuildModal(newId, "gear");
                    }}
                />
            )}
        </div>
    );
}

export default BuildExplorer;

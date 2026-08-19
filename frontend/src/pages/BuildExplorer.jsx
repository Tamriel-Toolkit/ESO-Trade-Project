import React, { useState, useEffect, useMemo } from "react";
import { 
    Shield, Sparkles, Sword, Search, Plus, ShoppingCart, Lock, RefreshCw, 
    Layers, User, ArrowRight, CheckCircle2, ChevronRight, BookOpen, Trash2
} from "lucide-react";
import { fetchBuilds, deleteCustomBuild, fetchCharacters } from "@/api/api";
import Navbar from "@/components/ui/navbar";
import { BuildDetailModal } from "@/components/builds/BuildDetailModal";
import { BuildCreatorModal } from "@/components/builds/BuildCreatorModal";

const CLASSES = ["All Classes", "Arcanist", "Dragonknight", "Necromancer", "Nightblade", "Sorcerer", "Templar", "Warden"];
const ROLES = ["All Roles", "Magicka DPS", "Stamina DPS", "Tank", "Healer", "Solo / Arena", "PvP"];

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
            {/* Hero Header */}
            <div className="relative border-b border-[#c5a059]/30 bg-gradient-to-b from-[#161622] via-[#101018] to-[#0a0a0d] py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#c5a059]/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-cinzel font-bold bg-[#c5a059]/15 text-[#e6c278] border border-[#c5a059]/40 mb-3 shadow-[0_0_12px_rgba(197,160,89,0.2)]">
                            <Sparkles className="size-3.5" /> Meta Builds & Live Kiosk Optimizer
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#fce2a6] via-[#e6c278] to-[#c5a059] tracking-wide">
                            Tamriel Build Arsenal
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                            Explore top meta theorycrafting builds, automatically diff required 12-slot gear against your active character loadout, and discover the cheapest Guild Trader kiosk deals across Tamriel.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => setIsCreatorOpen(true)}
                            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#e6c278] hover:from-[#d4af37] hover:to-[#fce2a6] text-black font-cinzel font-bold text-sm shadow-[0_0_20px_rgba(197,160,89,0.35)] transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Plus className="size-4" /> Forge Custom Build
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-4">
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
                    <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search builds, sets, or theorycrafter authors..."
                        className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-[#14141c] border border-[#c5a059]/30 text-sm text-[#fce2a6] placeholder:text-muted-foreground focus:outline-none focus:border-[#c5a059] transition-all"
                    />
                    <button
                        type="submit"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[#c5a059]/20 hover:bg-[#c5a059]/30 text-[#e6c278] border border-[#c5a059]/40 text-xs font-cinzel font-bold transition-all"
                    >
                        Search
                    </button>
                </form>

                {/* Class Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
                    <span className="text-xs font-cinzel font-bold text-muted-foreground shrink-0 mr-2">Class:</span>
                    {CLASSES.map((cls) => {
                        const active = selectedClass === cls;
                        return (
                            <button
                                key={cls}
                                onClick={() => setSelectedClass(cls)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-semibold whitespace-nowrap transition-all ${
                                    active
                                        ? "bg-[#c5a059] text-black shadow-[0_0_12px_rgba(197,160,89,0.3)] font-bold"
                                        : "bg-[#14141c] text-muted-foreground hover:text-white border border-[#c5a059]/20 hover:border-[#c5a059]/40"
                                }`}
                            >
                                {cls}
                            </button>
                        );
                    })}
                </div>

                {/* Role Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
                    <span className="text-xs font-cinzel font-bold text-muted-foreground shrink-0 mr-2">Role:</span>
                    {ROLES.map((r) => {
                        const active = selectedRole === r;
                        return (
                            <button
                                key={r}
                                onClick={() => setSelectedRole(r)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-semibold whitespace-nowrap transition-all ${
                                    active
                                        ? "bg-[#c5a059] text-black shadow-[0_0_12px_rgba(197,160,89,0.3)] font-bold"
                                        : "bg-[#14141c] text-muted-foreground hover:text-white border border-[#c5a059]/20 hover:border-[#c5a059]/40"
                                }`}
                            >
                                {r}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Build Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {loading ? (
                    <div className="py-24 text-center text-muted-foreground">
                        <RefreshCw className="size-8 animate-spin text-[#c5a059] mx-auto mb-3" />
                        <p className="font-cinzel text-sm">Querying Build Archives & Market Indices...</p>
                    </div>
                ) : builds.length === 0 ? (
                    <div className="py-20 text-center rounded-2xl bg-[#14141c]/50 border border-[#c5a059]/20 p-8 space-y-3">
                        <BookOpen className="size-10 text-[#c5a059] mx-auto opacity-60" />
                        <h3 className="font-cinzel font-bold text-lg text-[#fce2a6]">No Builds Matching Criteria</h3>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Try adjusting your class and role filters or search query to find meta presets.
                        </p>
                        <button
                            onClick={() => { setSelectedClass("All Classes"); setSelectedRole("All Roles"); setSearchQuery(""); }}
                            className="px-4 py-2 rounded-lg bg-[#c5a059]/20 hover:bg-[#c5a059]/30 text-[#e6c278] border border-[#c5a059]/40 text-xs font-cinzel font-bold transition-all inline-block mt-2"
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
                                className="group relative rounded-2xl bg-[#13131b] border-2 border-[#c5a059]/20 hover:border-[#c5a059]/60 transition-all duration-300 p-5 flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] hover:-translate-y-1"
                            >
                                <div>
                                    {/* Card Header Badges */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            {build.is_curated ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-cinzel font-bold bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/40">
                                                    <Sparkles className="size-2.5" /> Curated
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-cinzel font-bold bg-purple-950/40 text-purple-300 border border-purple-500/40">
                                                    <User className="size-2.5" /> Custom
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${ROLE_STYLES[build.role] || "text-gray-300 border-gray-700 bg-gray-900/40"}`}>
                                                {build.role}
                                            </span>
                                        </div>

                                        <span className="text-[11px] font-cinzel font-semibold text-[#c5a059]">
                                            {build.class}
                                        </span>
                                    </div>

                                    {/* Title & Author */}
                                    <h3 className="font-cinzel font-bold text-lg text-[#fce2a6] group-hover:text-white transition-colors mb-1">
                                        {build.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        By <span className="text-gray-300 font-medium">{build.author}</span>
                                    </p>

                                    {/* Description */}
                                    {build.description && (
                                        <p className="text-xs text-[#9d9382] line-clamp-2 leading-relaxed mb-4">
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
                                                        className="px-2 py-0.5 rounded bg-[#181824] border border-[#c5a059]/20 text-[11px] text-[#e6c278] font-cinzel"
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
                                    <div className="pt-3 border-t border-[#c5a059]/10 flex items-center justify-between text-xs text-muted-foreground mb-4">
                                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                                            <ShoppingCart className="size-3" /> {build.tradeable_items} Tradeable
                                        </span>
                                        <span className="text-red-400 flex items-center gap-1 font-medium">
                                            <Lock className="size-3" /> {build.bop_items} Farmable BOP
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openBuildModal(build.id, "diff"); }}
                                            className="py-2 px-3 rounded-lg bg-[#181824] hover:bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/30 text-xs font-cinzel font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Sword className="size-3.5" /> Diff Loadout
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openBuildModal(build.id, "deals"); }}
                                            className="py-2 px-3 rounded-lg bg-gradient-to-r from-[#c5a059]/20 to-[#e6c278]/20 hover:from-[#c5a059]/30 hover:to-[#e6c278]/30 text-[#fce2a6] border border-[#c5a059]/40 text-xs font-cinzel font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <ShoppingCart className="size-3.5" /> Kiosk Deals
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

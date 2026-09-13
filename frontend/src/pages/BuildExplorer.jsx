import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
    Shield, Sparkles, Sword, Search, Plus, ShoppingCart, Lock, RefreshCw, 
    User, BookOpen, Trash2, Flame, Zap, Skull, Sun, Award, Crosshair
} from "lucide-react";
import { fetchBuilds, deleteCustomBuild } from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/ui/navbar";
import { EsoSelect } from "@/components/ui/eso-select";
import { EsoTooltip } from "@/components/ui/tooltip";
import { BuildDetailModal } from "@/components/builds/BuildDetailModal";
import { BuildCreatorModal } from "@/components/builds/BuildCreatorModal";
import "@/styles/requests-builds.css";

const CLASS_OPTIONS = [
    { value: "All Classes", label: "All Classes", icon: <User className="size-4 text-primary" /> },
    { value: "Arcanist", label: "Arcanist", icon: <BookOpen className="size-4 text-lime-400" /> },
    { value: "Dragonknight", label: "Dragonknight", icon: <Flame className="size-4 text-orange-400" /> },
    { value: "Necromancer", label: "Necromancer", icon: <Skull className="size-4 text-cyan-400" /> },
    { value: "Nightblade", label: "Nightblade", icon: <Sword className="size-4 text-red-400" /> },
    { value: "Sorcerer", label: "Sorcerer", icon: <Zap className="size-4 text-purple-400" /> },
    { value: "Templar", label: "Templar", icon: <Sun className="size-4 text-[#f0d07a]" /> },
    { value: "Warden", label: "Warden", icon: <Sparkles className="size-4 text-emerald-400" /> }
];

const ROLE_OPTIONS = [
    { value: "All Roles", label: "All Roles", icon: <Shield className="size-4 text-primary" /> },
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
    const { user } = useAuth();
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
        <div className="exchange-page exchange-builds">
            <Navbar />
            
            {/* Header Banner */}
            <header className="exchange-container">
                <div className="exchange-page-heading">
                    <div>
                        <p className="exchange-eyebrow"><Shield className="size-4" /> Equipment & inspiration</p>
                        <h1>Builds</h1>
                        <p className="text-sm sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                            Explore builds, compare your equipment, and find the missing pieces.
                        </p>
                    </div>

                    {user ? (
                        <button
                            onClick={() => setIsCreatorOpen(true)}
                            className="exchange-primary"
                        >
                            <Plus className="size-4" /> Create build
                        </button>
                    ) : (
                        <Link
                            to="/login"
                            className="exchange-secondary"
                        >
                            <Lock className="size-4 text-primary" /> Sign in to create a build
                        </Link>
                    )}
                </div>
            </header>

            {/* Filter Bar */}
            <main className="exchange-container rb-page-content">
                <div className="rb-build-filters exchange-panel">
                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative rb-build-search" role="search">
                        <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            aria-label="Search builds, sets, or authors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search builds, sets, or authors..."
                            className="exchange-input"
                        />
                        <button
                            type="submit"
                            className="exchange-primary"
                        >
                            Search
                        </button>
                    </form>

                    {/* Class & Role EsoSelect Custom Dropdowns */}
                    <div className="rb-build-refinements">
                        {/* Class Dropdown */}
                        <div className="flex items-center gap-2">
                            <span>
                                Class
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
                            <span>
                                Role
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
            {/* Build Grid */}
            <div>
                {loading ? (
                    <div className="py-24 text-center text-muted-foreground">
                        <RefreshCw className="size-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="font-sans text-sm">Loading builds...</p>
                    </div>
                ) : builds.length === 0 ? (
                    <div className="py-20 text-center rounded-none bg-card/50 border border-primary/20 p-8 space-y-3">
                        <BookOpen className="size-10 text-primary mx-auto opacity-60" />
                        <h3 className="font-cinzel text-xl text-foreground">No matching builds</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Try adjusting your class, role, or search filters.
                        </p>
                        <button
                            onClick={() => { setSelectedClass("All Classes"); setSelectedRole("All Roles"); setSearchQuery(""); }}
                            className="px-4 py-2 rounded-none bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-sm font-sans font-bold transition-all inline-block mt-2 tracking-normal cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="rb-build-grid">
                        {builds.map((build) => (
                            <article
                                key={build.id}
                                onClick={() => openBuildModal(build.id, "gear")}
                                className="rb-build-card exchange-frame group cursor-pointer"
                            >
                                <div>
                                    {/* Card Header Badges */}
                                    <div className="rb-build-meta">
                                        <div className="flex items-center gap-1.5">
                                            {build.is_curated ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-sans font-bold bg-primary/15 text-primary border border-primary/40 tracking-normal">
                                                    <Sparkles className="size-2.5" /> Curated
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-sans font-bold bg-purple-950/40 text-purple-300 border border-purple-500/40 tracking-normal">
                                                    <User className="size-2.5" /> Custom
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-none text-xs font-semibold border tracking-normal ${ROLE_STYLES[build.role] || "text-gray-300 border-gray-700 bg-gray-900/40"}`}>
                                                {build.role}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-sans font-bold text-primary tracking-normal">
                                                {build.class}
                                            </span>
                                            {Boolean(user && !build.is_curated && (build.user_id === user.id || user.role === "admin")) && (
                                                <EsoTooltip content={`Delete custom build "${build.title}"`} side="left">
                                                    <button
                                                        onClick={(e) => handleDeleteBuild(e, build.id)}
                                                        className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-950/50 border border-transparent hover:border-red-500/30 transition-all rounded-none cursor-pointer"
                                                        aria-label={`Delete ${build.title}`}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </EsoTooltip>
                                            )}
                                        </div>
                                    </div>

                                    {/* Title & Author */}
                                    <h3 className="font-sans font-bold text-lg text-foreground group-hover:text-[#f0d07a] transition-colors mb-1">
                                        {build.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        By <span className="text-foreground font-medium">{build.author}</span>
                                    </p>

                                    {/* Description */}
                                    {build.description && (
                                        <p className="rb-build-description line-clamp-2">
                                            {build.description}
                                        </p>
                                    )}

                                    {/* Sets Preview Pills */}
                                    {build.sets && build.sets.length > 0 && (
                                        <div className="rb-build-sets">
                                            <div>
                                                Key sets
                                            </div>
                                            <ul>
                                                {build.sets.map((s) => (
                                                    <li
                                                        key={s} 
                                                    >
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {/* Market Availability Bar */}
                                    <div className="rb-build-availability">
                                        <span className="text-emerald-400 flex items-center gap-1 font-medium font-sans">
                                            <ShoppingCart className="size-3" /> {build.tradeable_items} Tradeable
                                        </span>
                                        <span className="text-red-400 flex items-center gap-1 font-medium font-sans">
                                            <Lock className="size-3" /> {build.bop_items} Bound
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="rb-build-actions">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openBuildModal(build.id, "gear"); }}
                                            className="exchange-secondary"
                                        >
                                            <Shield className="size-3.5" /> Equipment
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openBuildModal(build.id, "diff"); }}
                                            className="exchange-primary"
                                        >
                                            <Sword className="size-3.5" /> Comparison
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
            </main>

            {/* Modals */}
            {inspectBuildId && (
                <BuildDetailModal
                    buildId={inspectBuildId}
                    initialTab={inspectInitialTab}
                    onClose={() => setInspectBuildId(null)}
                    onBuildDeleted={() => {
                        loadBuilds();
                        setInspectBuildId(null);
                    }}
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

import React, { useState, useEffect } from "react";
import { 
    X, Shield, Award, Sparkles, Sword, CheckCircle2, Zap, Layers, RefreshCw, 
    ExternalLink, ShoppingCart, Lock, AlertTriangle, ChevronRight, Copy, Check,
    Store, MapPin, Tag, ArrowRight, User
} from "lucide-react";
import { fetchBuildById, fetchBuildGearDiff, fetchBuildDeals, fetchCharacters } from "@/api/api";
import { renderEsoFormattedText, cleanEsoText } from "@/lib/utils";

const ROLE_COLORS = {
    "Magicka DPS": "text-sky-400 border-sky-500/40 bg-sky-950/20",
    "Stamina DPS": "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
    "Tank": "text-amber-400 border-amber-500/40 bg-amber-950/20",
    "Healer": "text-yellow-300 border-yellow-500/40 bg-yellow-950/20",
    "Solo / Arena": "text-purple-400 border-purple-500/40 bg-purple-950/20",
    "PvP": "text-red-400 border-red-500/40 bg-red-950/20"
};

export function BuildDetailModal({ buildId, initialTab = "gear", onClose, onSelectCharacterDiff }) {
    const [loading, setLoading] = useState(true);
    const [build, setBuild] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab); // "gear", "diff", "deals"
    const [characters, setCharacters] = useState([]);
    const [selectedCharId, setSelectedCharId] = useState("");
    const [diffData, setDiffData] = useState(null);
    const [diffLoading, setDiffLoading] = useState(false);
    const [dealsData, setDealsData] = useState(null);
    const [dealsLoading, setDealsLoading] = useState(false);
    const [server, setServer] = useState("NA");
    const [copiedZone, setCopiedZone] = useState(null);

    // Initial Load
    useEffect(() => {
        if (!buildId) return;
        setLoading(true);
        Promise.all([
            fetchBuildById(buildId),
            fetchCharacters()
        ]).then(([buildRes, charRes]) => {
            if (buildRes && buildRes.success) {
                setBuild(buildRes.build);
            }
            if (charRes && charRes.characters && charRes.characters.length > 0) {
                setCharacters(charRes.characters);
                setSelectedCharId(charRes.characters[0].id);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [buildId]);

    // Fetch Diff when selected character changes
    useEffect(() => {
        if (!buildId || !selectedCharId || activeTab !== "diff") return;
        setDiffLoading(true);
        fetchBuildGearDiff(buildId, selectedCharId).then((res) => {
            if (res && res.success) {
                setDiffData(res);
            }
            setDiffLoading(false);
        }).catch(() => setDiffLoading(false));
    }, [buildId, selectedCharId, activeTab]);

    // Fetch Deals when tab or server changes
    useEffect(() => {
        if (!buildId || activeTab !== "deals") return;
        setDealsLoading(true);
        fetchBuildDeals(buildId, { server, characterId: selectedCharId || undefined }).then((res) => {
            if (res && res.success) {
                setDealsData(res);
            }
            setDealsLoading(false);
        }).catch(() => setDealsLoading(false));
    }, [buildId, server, activeTab, selectedCharId]);

    // Escape Key Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleCopyZoneCommand = (zone, listings) => {
        const itemNames = listings.map(l => l.item_name).slice(0, 3).join(", ");
        const text = `/say [Tamriel Trade Hub] Shopping at ${zone}: Looking for ${itemNames}`;
        navigator.clipboard.writeText(text);
        setCopiedZone(zone);
        setTimeout(() => setCopiedZone(null), 2500);
    };

    if (!buildId) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={build?.title ? `${build.title} Build Specifications` : "Build Details"}
        >
            <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#111116] border-2 border-[#c5a059]/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-[#c5a059]/30 bg-gradient-to-r from-[#181822] via-[#14141c] to-[#181822] flex items-start justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                            {build?.is_curated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-cinzel font-bold bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/40 shadow-[0_0_8px_rgba(197,160,89,0.2)]">
                                    <Sparkles className="size-3 text-[#e6c278]" /> Curated Meta Preset
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-cinzel font-bold bg-purple-950/40 text-purple-300 border border-purple-500/40">
                                    <User className="size-3" /> Community Custom
                                </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[build?.role] || "text-gray-300 border-gray-700 bg-gray-900/40"}`}>
                                {build?.role}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-[#c5a059] border border-[#c5a059]/30 bg-[#161620]">
                                {build?.class}
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#fce2a6] via-[#e6c278] to-[#c5a059]">
                            {build ? build.title : "Loading Build..."}
                        </h2>
                        {build?.author && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Crafted by <span className="text-[#e6c278] font-medium">{build.author}</span>
                                {build.source_url && (
                                    <a 
                                        href={build.source_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 ml-2 text-[#c5a059] hover:text-[#fce2a6] underline"
                                    >
                                        Source Guide <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-[#c5a059]/30"
                        aria-label="Close build details modal"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 py-2.5 bg-[#0e0e13] border-b border-[#c5a059]/20 flex items-center justify-between overflow-x-auto gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab("gear")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === "gear"
                                    ? "bg-[#c5a059] text-black shadow-[0_0_12px_rgba(197,160,89,0.4)]"
                                    : "text-muted-foreground hover:text-[#e6c278] hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            <Shield className="size-3.5" /> 12-Slot Loadout & Sets
                        </button>
                        <button
                            onClick={() => setActiveTab("diff")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === "diff"
                                    ? "bg-[#c5a059] text-black shadow-[0_0_12px_rgba(197,160,89,0.4)]"
                                    : "text-muted-foreground hover:text-[#e6c278] hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            <Sword className="size-3.5" /> Gear Diff vs Character
                        </button>
                        <button
                            onClick={() => setActiveTab("deals")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === "deals"
                                    ? "bg-[#c5a059] text-black shadow-[0_0_12px_rgba(197,160,89,0.4)]"
                                    : "text-muted-foreground hover:text-[#e6c278] hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            <ShoppingCart className="size-3.5" /> Live Kiosk Deals & Route
                        </button>
                    </div>

                    {/* Server toggle for deals */}
                    {activeTab === "deals" && (
                        <div className="flex items-center gap-1 bg-[#161620] p-0.5 rounded-md border border-[#c5a059]/30">
                            {["NA", "EU"].map((srv) => (
                                <button
                                    key={srv}
                                    onClick={() => setServer(srv)}
                                    className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all ${
                                        server === srv ? "bg-[#c5a059] text-black" : "text-muted-foreground hover:text-white"
                                    }`}
                                >
                                    {srv}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <RefreshCw className="size-8 animate-spin text-[#c5a059] mb-3" />
                            <p className="font-cinzel text-sm">Consulting the Tamriel Archives...</p>
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: EQUIPMENT LOADOUT & SET BONUSES */}
                            {activeTab === "gear" && (
                                <div className="space-y-6">
                                    {build?.description && (
                                        <div className="p-4 rounded-lg bg-[#161620]/60 border border-[#c5a059]/20 text-sm text-[#b8af9f] leading-relaxed">
                                            {build.description}
                                        </div>
                                    )}

                                    {/* Set Summary Chips */}
                                    {build?.sets && build.sets.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#e6c278] uppercase mb-2 flex items-center gap-1.5">
                                                <Layers className="size-3.5" /> Set Bonuses Active
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {build.sets.map((s) => (
                                                    <div 
                                                        key={s.name} 
                                                        className="px-3 py-1.5 rounded-lg bg-[#161622] border border-[#c5a059]/30 flex items-center gap-2 text-xs"
                                                    >
                                                        <span className="font-cinzel font-bold text-[#fce2a6]">{s.name}</span>
                                                        <span className="px-1.5 py-0.2 rounded bg-[#c5a059]/20 text-[#e6c278] font-mono text-[10px] font-bold">
                                                            {s.count} pcs
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 12 Slot Items Grid */}
                                    <div>
                                        <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#e6c278] uppercase mb-3 flex items-center gap-1.5">
                                            <Shield className="size-3.5" /> 12-Slot Gear Architecture
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {build?.items?.map((item) => (
                                                <div 
                                                    key={item.id || item.slot_id}
                                                    className="p-3.5 rounded-xl bg-[#14141c] border border-[#c5a059]/20 hover:border-[#c5a059]/50 transition-all flex flex-col justify-between"
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div>
                                                            <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded border border-[#c5a059]/20">
                                                                {item.slot_name}
                                                            </span>
                                                            <h4 className="font-cinzel font-bold text-sm text-[#fce2a6] mt-1">
                                                                {item.item_name}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground">
                                                                Set: <span className="text-gray-300 font-medium">{item.set_name}</span> • {item.item_type}
                                                            </p>
                                                        </div>
                                                        {item.is_tradeable ? (
                                                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                                                                <ShoppingCart className="size-3" /> Tradeable
                                                            </span>
                                                        ) : (
                                                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-500/30">
                                                                <Lock className="size-3" /> Bind on Pickup
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="pt-2 border-t border-[#c5a059]/10 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-300">
                                                                Trait: <span className="text-[#e6c278]">{item.trait_name || "Divines"}</span>
                                                            </span>
                                                            <span>•</span>
                                                            <span className="text-gray-300">
                                                                Enchant: <span className="text-[#e6c278]">{item.enchantment || "Max Magicka"}</span>
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-gray-400 italic">
                                                            📍 {item.source_location || "Tamriel"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: GEAR DIFF ENGINE */}
                            {activeTab === "diff" && (
                                <div className="space-y-6">
                                    {/* Character Selector Banner */}
                                    <div className="p-4 rounded-xl bg-[#161622] border border-[#c5a059]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-cinzel font-bold text-[#fce2a6] text-sm">
                                                Active Character Loadout Comparison
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Select a character from your roster to diff against target build equipment.
                                            </p>
                                        </div>
                                        {characters.length > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <label htmlFor="char-select" className="text-xs text-muted-foreground font-cinzel">Character:</label>
                                                <select
                                                    id="char-select"
                                                    value={selectedCharId}
                                                    onChange={(e) => setSelectedCharId(e.target.value)}
                                                    className="px-3 py-1.5 rounded-lg bg-[#0e0e13] border border-[#c5a059]/40 text-[#fce2a6] text-xs font-semibold focus:outline-none focus:border-[#c5a059]"
                                                >
                                                    {characters.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name} (Lv {c.level} {c.class})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-amber-400 font-cinzel">
                                                No characters in roster. Add one in Roster Manager to use live diffing.
                                            </div>
                                        )}
                                    </div>

                                    {/* Diff Metrics Header */}
                                    {diffData && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3.5 rounded-xl bg-[#14141c] border border-[#c5a059]/20 text-center">
                                                <div className="text-2xl font-bold font-cinzel text-emerald-400">
                                                    {diffData.completion_rate}%
                                                </div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-cinzel mt-0.5">
                                                    Completion Rate
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-xl bg-[#14141c] border border-emerald-500/20 text-center">
                                                <div className="text-2xl font-bold font-cinzel text-emerald-400">
                                                    {diffData.matched_count} / {diffData.total_slots}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-cinzel mt-0.5">
                                                    🟢 Equipped & Matched
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-xl bg-[#14141c] border border-amber-500/20 text-center">
                                                <div className="text-2xl font-bold font-cinzel text-amber-400">
                                                    {diffData.trait_mismatch_count}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-cinzel mt-0.5">
                                                    🟡 Trait Mismatch
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-xl bg-[#14141c] border border-red-500/20 text-center">
                                                <div className="text-2xl font-bold font-cinzel text-red-400">
                                                    {diffData.missing_count}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-cinzel mt-0.5">
                                                    🔴 Missing Slots
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Slot by Slot Diff List */}
                                    {diffLoading ? (
                                        <div className="py-12 text-center text-muted-foreground font-cinzel text-xs">
                                            <RefreshCw className="size-6 animate-spin text-[#c5a059] mx-auto mb-2" />
                                            Diffing character equipment...
                                        </div>
                                    ) : diffData?.slot_diffs ? (
                                        <div className="space-y-2.5">
                                            {diffData.slot_diffs.map((diff) => {
                                                const status = diff.status; // "matched", "trait_mismatch", "missing"
                                                return (
                                                    <div 
                                                        key={diff.slot_id}
                                                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                            status === "matched"
                                                                ? "bg-emerald-950/10 border-emerald-500/30"
                                                                : status === "trait_mismatch"
                                                                ? "bg-amber-950/10 border-amber-500/30"
                                                                : "bg-red-950/10 border-red-500/30"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="shrink-0 w-24">
                                                                <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059]">
                                                                    {diff.slot_name}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <div className="font-cinzel font-bold text-sm text-[#fce2a6]">
                                                                    {diff.target_item.item_name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Target: <span className="text-gray-300">{diff.target_item.set_name}</span> ({diff.target_item.trait_name})
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 sm:text-right">
                                                            {status === "matched" && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                                                                    <CheckCircle2 className="size-3.5" /> Equipped & Matched
                                                                </span>
                                                            )}
                                                            {status === "trait_mismatch" && (
                                                                <div className="text-right">
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-500/40">
                                                                        <AlertTriangle className="size-3.5" /> Trait Mismatch
                                                                    </span>
                                                                    <p className="text-[10px] text-amber-300/80 mt-0.5">
                                                                        Equipped: {diff.equipped_item?.trait_name || "Unknown"} (Transmute needed)
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {status === "missing" && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/60 text-red-400 border border-red-500/40">
                                                                    <X className="size-3.5" /> Missing
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* TAB 3: LIVE MARKET DEALS & KIOSK ITINERARY */}
                            {activeTab === "deals" && (
                                <div className="space-y-6">
                                    {dealsLoading ? (
                                        <div className="py-16 text-center text-muted-foreground font-cinzel text-xs">
                                            <RefreshCw className="size-6 animate-spin text-[#c5a059] mx-auto mb-2" />
                                            Scanning Tamriel Guild Kiosks for optimal prices...
                                        </div>
                                    ) : dealsData ? (
                                        <>
                                            {/* Summary Stats Banner */}
                                            <div className="p-4 rounded-xl bg-gradient-to-r from-[#181824] via-[#14141e] to-[#181824] border border-[#c5a059]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#e6c278]">
                                                        Kiosk Market Evaluation • {dealsData.server}
                                                    </span>
                                                    <h3 className="font-cinzel font-bold text-lg text-[#fce2a6] mt-0.5">
                                                        Estimated Gold to Complete Tradeable Slots:
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Based on cheapest verified active listings across all guild kiosks.
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl sm:text-3xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-[#c5a059]">
                                                        {dealsData.total_estimated_gold > 0 ? `${dealsData.total_estimated_gold.toLocaleString()}g` : "0g (All Farmable/Owned)"}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Zone Itinerary Route */}
                                            {dealsData.zone_itinerary && dealsData.zone_itinerary.length > 0 && (
                                                <div>
                                                    <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#e6c278] uppercase mb-3 flex items-center gap-1.5">
                                                        <MapPin className="size-3.5" /> Recommended Kiosk Route by Zone
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {dealsData.zone_itinerary.map((itinerary) => (
                                                            <div 
                                                                key={itinerary.zone_location}
                                                                className="p-3.5 rounded-xl bg-[#14141c] border border-[#c5a059]/20 flex flex-col justify-between gap-2.5"
                                                            >
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="font-cinzel font-bold text-sm text-[#fce2a6] flex items-center gap-1.5">
                                                                            <Store className="size-3.5 text-[#c5a059]" /> {itinerary.zone_location}
                                                                        </span>
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c5a059]/20 text-[#e6c278]">
                                                                            {itinerary.items_available} item{itinerary.items_available > 1 ? "s" : ""}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Guilds: {itinerary.listings.map(l => l.guild_name).filter(Boolean).slice(0, 2).join(", ") || "Active Kiosks"}
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    onClick={() => handleCopyZoneCommand(itinerary.zone_location, itinerary.listings)}
                                                                    className="w-full py-1.5 px-3 rounded-lg bg-[#181824] hover:bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/30 text-xs font-cinzel font-semibold transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    {copiedZone === itinerary.zone_location ? (
                                                                        <>
                                                                            <Check className="size-3.5 text-emerald-400" /> Copied In-Game Callout!
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Copy className="size-3.5" /> Copy In-Game Chat Route
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Slot-by-Slot Listings Table */}
                                            <div>
                                                <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#e6c278] uppercase mb-3 flex items-center gap-1.5">
                                                    <Tag className="size-3.5" /> Kiosk Listings by Slot
                                                </h3>
                                                <div className="space-y-3">
                                                    {dealsData.deals_by_slot?.map((slotDeal) => (
                                                        <div 
                                                            key={slotDeal.slot_id}
                                                            className="p-4 rounded-xl bg-[#14141c] border border-[#c5a059]/20 space-y-2.5"
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c5a059]/10 pb-2">
                                                                <div>
                                                                    <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059]">
                                                                        {slotDeal.slot_name}
                                                                    </span>
                                                                    <h4 className="font-cinzel font-bold text-sm text-[#fce2a6]">
                                                                        {slotDeal.item_name} ({slotDeal.set_name})
                                                                    </h4>
                                                                </div>

                                                                {!slotDeal.is_tradeable ? (
                                                                    <span className="px-2.5 py-1 rounded text-xs font-semibold bg-red-950/40 text-red-300 border border-red-500/30 flex items-center gap-1">
                                                                        <Lock className="size-3" /> Bind on Pickup ({slotDeal.source_location || "Dungeon / Trial / Mythic"})
                                                                    </span>
                                                                ) : slotDeal.cheapest_price ? (
                                                                    <span className="px-2.5 py-1 rounded text-xs font-cinzel font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                                                                        Best: {slotDeal.cheapest_price.toLocaleString()}g
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2.5 py-1 rounded text-xs text-muted-foreground bg-gray-900/40 border border-gray-800">
                                                                        No Active Listings on Kiosks
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Listing Rows */}
                                                            {slotDeal.listings && slotDeal.listings.length > 0 ? (
                                                                <div className="space-y-1.5 pt-1">
                                                                    {slotDeal.listings.map((l) => (
                                                                        <div 
                                                                            key={l.id}
                                                                            className="p-2.5 rounded-lg bg-[#0e0e13] border border-white/5 hover:border-[#c5a059]/30 transition-all flex flex-wrap items-center justify-between text-xs gap-2"
                                                                        >
                                                                            <div className="flex items-center gap-2.5">
                                                                                <span className="font-bold text-[#e6c278]">
                                                                                    {l.price.toLocaleString()}g
                                                                                </span>
                                                                                {l.deal_badge === "steal" && (
                                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                                                        🔥 {l.discount_percent}% Under Macro Avg
                                                                                    </span>
                                                                                )}
                                                                                {l.deal_badge === "great" && (
                                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                                                        ✨ {l.discount_percent}% Off
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className="text-right text-muted-foreground">
                                                                                <span className="text-gray-300 font-medium">{l.guild_name}</span> • <span>{l.location}</span> ({l.seller_name})
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : slotDeal.is_tradeable ? (
                                                                <p className="text-xs text-muted-foreground italic">
                                                                    No live kiosk listings found on {dealsData.server} server. Try searching in-game or posting a WTB request.
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
export default BuildDetailModal;

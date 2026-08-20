import React, { useState, useEffect, useMemo } from "react";
import { 
    X, Shield, Award, Sparkles, Sword, CheckCircle2, Zap, Layers, RefreshCw, 
    ExternalLink, ShoppingCart, Lock, AlertTriangle, ChevronRight, Copy, Check,
    Store, MapPin, Tag, ArrowRight, User
} from "lucide-react";
import { fetchBuildById, fetchBuildGearDiff, fetchBuildDeals, fetchCharacters } from "@/api/api";
import { AnatomicalEquipmentDiagram } from "@/components/character/AnatomicalEquipmentDiagram";

const ROLE_COLORS = {
    "Magicka DPS": "text-sky-400 border-sky-500/40 bg-sky-950/20",
    "Stamina DPS": "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
    "Tank": "text-amber-400 border-amber-500/40 bg-amber-950/20",
    "Healer": "text-yellow-300 border-yellow-500/40 bg-yellow-950/20",
    "Solo / Arena": "text-purple-400 border-purple-500/40 bg-purple-950/20",
    "PvP": "text-red-400 border-red-500/40 bg-red-950/20"
};

export function BuildDetailModal({ buildId, initialTab = "gear", onClose }) {
    const [loading, setLoading] = useState(true);
    const [build, setBuild] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab); // "gear", "diff", "deals"
    const [activeWeaponBar, setActiveWeaponBar] = useState("front"); // "front" or "back"
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

    // Format build items into gearBySlot mapping for AnatomicalEquipmentDiagram
    const gearBySlot = useMemo(() => {
        if (!build?.items) return {};
        const map = {};
        build.items.forEach((item) => {
            map[item.slot_id] = {
                ...item,
                item_name: item.item_name,
                set_name: item.set_name,
                quality: item.quality || 4,
                trait_name: item.trait_name || "Divines",
                trait_id: item.trait_id || 18,
                enchantment: item.enchantment || "Max Stamina",
                is_tradeable: item.is_tradeable,
                source_location: item.source_location
            };
        });
        return map;
    }, [build]);

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
            <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-[#111116] border-2 border-[#c5a059]/50 rounded-none shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-[#2a2c33] bg-[#161620] flex items-start justify-between relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent pointer-events-none" />
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                            {build?.is_curated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-cinzel font-bold bg-[#c5a059]/15 text-[#e6c278] border border-[#c5a059]/40 uppercase tracking-wider">
                                    <Sparkles className="size-3 text-[#e6c278]" /> Curated
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-cinzel font-bold bg-purple-950/40 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                                    <User className="size-3" /> Custom
                                </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-none text-xs font-semibold border uppercase tracking-wider ${ROLE_COLORS[build?.role] || "text-gray-300 border-gray-700 bg-gray-900/40"}`}>
                                {build?.role}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-none text-xs font-semibold text-[#c5a059] border border-[#c5a059]/30 bg-[#0a0a0d] font-cinzel uppercase tracking-wider">
                                {build?.class}
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-cinzel font-bold text-[#e0d8c3] tracking-wide">
                            {build ? build.title : "Loading Build..."}
                        </h2>
                        {build?.author && (
                            <p className="text-xs text-muted-foreground mt-0.5 font-cinzel">
                                By <span className="text-[#e6c278] font-medium">{build.author}</span>
                                {build.source_url && (
                                    <a 
                                        href={build.source_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 ml-2 text-[#c5a059] hover:text-[#fce2a6] underline"
                                    >
                                        Guide <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-none text-muted-foreground hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-[#c5a059]/30 cursor-pointer"
                        aria-label="Close build details modal"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 py-2.5 bg-[#0e0e13] border-b border-[#2a2c33] flex items-center justify-between overflow-x-auto gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab("gear")}
                            className={`px-4 py-2 rounded-none text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "gear"
                                    ? "bg-[#c5a059] text-black shadow-md"
                                    : "text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620] border border-transparent"
                            }`}
                        >
                            <Shield className="size-3.5" /> Equipment
                        </button>
                        <button
                            onClick={() => setActiveTab("diff")}
                            className={`px-4 py-2 rounded-none text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "diff"
                                    ? "bg-[#c5a059] text-black shadow-md"
                                    : "text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620] border border-transparent"
                            }`}
                        >
                            <Sword className="size-3.5" /> Comparison
                        </button>
                        <button
                            onClick={() => setActiveTab("deals")}
                            className={`px-4 py-2 rounded-none text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "deals"
                                    ? "bg-[#c5a059] text-black shadow-md"
                                    : "text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620] border border-transparent"
                            }`}
                        >
                            <ShoppingCart className="size-3.5" /> Kiosk Deals
                        </button>
                    </div>

                    {/* Server toggle for deals */}
                    {activeTab === "deals" && (
                        <div className="flex items-center gap-1 bg-[#161620] p-0.5 rounded-none border border-[#2a2c33]">
                            {["NA", "EU"].map((srv) => (
                                <button
                                    key={srv}
                                    onClick={() => setServer(srv)}
                                    className={`px-3 py-1 rounded-none text-xs font-cinzel font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0a0a0d]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <RefreshCw className="size-8 animate-spin text-[#c5a059] mb-3" />
                            <p className="font-cinzel text-sm">Loading build data...</p>
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: EQUIPMENT LOADOUT & SET BONUSES */}
                            {activeTab === "gear" && (
                                <div className="space-y-5">
                                    {build?.description && (
                                        <div className="p-3.5 rounded-none bg-[#121218] border border-[#2a2c33] text-xs text-[#b8af9f] leading-relaxed">
                                            {build.description}
                                        </div>
                                    )}

                                    {/* Anatomical Diagram + Active Sets Sidebar Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Left 2 Cols: Full Anatomical Equipment Diagram with Bar Toggle */}
                                        <div className="lg:col-span-2 space-y-3">
                                            <div className="flex items-center justify-between bg-[#121218] px-3 py-2 border border-[#2a2c33]">
                                                <span className="font-cinzel font-bold text-xs text-[#c5a059] uppercase tracking-wider flex items-center gap-1.5">
                                                    <Shield className="size-3.5" /> Equipment
                                                </span>

                                                {/* Weapon Bar Toggle */}
                                                <div className="flex items-center gap-1 bg-[#0a0a0d] p-0.5 border border-[#2a2c33]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveWeaponBar("front")}
                                                        className={`px-3 py-1 text-xs font-cinzel font-bold uppercase border transition-all cursor-pointer ${
                                                            activeWeaponBar === "front" ? "bg-[#c5a059] text-black border-[#c5a059]" : "text-[#b0a696] border-transparent hover:text-[#e0d8c3]"
                                                        }`}
                                                    >
                                                        Front Bar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveWeaponBar("back")}
                                                        className={`px-3 py-1 text-xs font-cinzel font-bold uppercase border transition-all cursor-pointer ${
                                                            activeWeaponBar === "back" ? "bg-[#c5a059] text-black border-[#c5a059]" : "text-[#b0a696] border-transparent hover:text-[#e0d8c3]"
                                                        }`}
                                                    >
                                                        Back Bar
                                                    </button>
                                                </div>
                                            </div>

                                            <AnatomicalEquipmentDiagram gearBySlot={gearBySlot} activeBar={activeWeaponBar} />
                                        </div>

                                        {/* Right 1 Col: Active Set Bonuses Sidebar & Acquisition Summary */}
                                        <div className="space-y-4 text-xs">
                                            {/* Active Set Bonus Counter */}
                                            <div className="p-4 bg-[#121218] border border-[#2a2c33] space-y-3">
                                                <span className="font-cinzel font-bold text-xs text-[#c5a059] uppercase tracking-wider block flex items-center justify-between border-b border-[#2a2c33] pb-2">
                                                    <span>Set Bonuses ({activeWeaponBar.toUpperCase()} BAR)</span>
                                                    <Layers className="size-4 text-[#c5a059]" />
                                                </span>

                                                {build?.sets && build.sets.length > 0 ? (
                                                    <div className="space-y-2.5">
                                                        {build.sets.map((s) => (
                                                            <div key={s.name} className="p-2.5 rounded-none bg-[#0a0a0d] border border-[#2a2c33] flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-cinzel font-bold text-xs text-[#e0d8c3]">{s.name}</div>
                                                                </div>
                                                                <span className="px-2 py-0.5 rounded-none bg-[#c5a059]/20 text-[#e6c278] font-mono text-[10px] font-bold">
                                                                    {s.count} pcs
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-[#8a8275] italic">No set bonuses logged.</p>
                                                )}
                                            </div>

                                            {/* Acquisition Summary */}
                                            <div className="p-4 bg-[#121218] border border-[#2a2c33] space-y-3">
                                                <span className="font-cinzel font-bold text-xs text-[#c5a059] uppercase tracking-wider block border-b border-[#2a2c33] pb-2">
                                                    Acquisition
                                                </span>
                                                <div className="space-y-2.5 text-[11px]">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-emerald-400 font-medium flex items-center gap-1 font-cinzel">
                                                            <ShoppingCart className="size-3" /> Tradeable:
                                                        </span>
                                                        <span className="font-bold text-[#e0d8c3] font-mono">
                                                            {build?.items?.filter(i => i.is_tradeable).length || 0} slots
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-red-400 font-medium flex items-center gap-1 font-cinzel">
                                                            <Lock className="size-3" /> Bound:
                                                        </span>
                                                        <span className="font-bold text-[#e0d8c3] font-mono">
                                                            {build?.items?.filter(i => !i.is_tradeable).length || 0} slots
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: GEAR DIFF ENGINE */}
                            {activeTab === "diff" && (
                                <div className="space-y-6">
                                    {/* Character Selector Banner */}
                                    <div className="p-4 rounded-none bg-[#121218] border border-[#2a2c33] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-cinzel font-bold text-[#e0d8c3] text-sm uppercase tracking-wider">
                                                Character Comparison
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Select a character to compare against build requirements.
                                            </p>
                                        </div>
                                        {characters.length > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <label htmlFor="char-select" className="text-xs text-muted-foreground font-cinzel uppercase tracking-wider">Character:</label>
                                                <select
                                                    id="char-select"
                                                    value={selectedCharId}
                                                    onChange={(e) => setSelectedCharId(e.target.value)}
                                                    className="px-3 py-1.5 rounded-none bg-[#0a0a0d] border border-[#c5a059]/40 text-[#fce2a6] text-xs font-semibold focus:outline-none focus:border-[#c5a059]"
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
                                                No characters found in roster.
                                            </div>
                                        )}
                                    </div>

                                    {/* Diff Metrics Header */}
                                    {diffData && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3.5 rounded-none bg-[#13131b] border border-[#2a2c33] text-center">
                                                <div className="text-2xl font-bold font-cinzel text-emerald-400">
                                                    {diffData.completion_rate}%
                                                </div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-cinzel mt-0.5">
                                                    Complete
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-none bg-[#13131b] border border-emerald-500/20 text-center">
                                                <div className="text-2xl font-bold font-cinzel text-emerald-400">
                                                    {diffData.matched_count} / {diffData.total_slots}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-cinzel mt-0.5">
                                                    Equipped
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-none bg-[#13131b] border border-amber-500/20 text-center">
                                                <div className="text-2xl font-bold font-cinzel text-amber-400">
                                                    {diffData.trait_mismatch_count}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-cinzel mt-0.5">
                                                    Trait Mismatch
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-none bg-[#13131b] border border-red-500/20 text-center">
                                                <div className="text-2xl font-bold font-cinzel text-red-400">
                                                    {diffData.missing_count}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-cinzel mt-0.5">
                                                    Missing
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Slot by Slot Diff List */}
                                    {diffLoading ? (
                                        <div className="py-12 text-center text-muted-foreground font-cinzel text-xs">
                                            <RefreshCw className="size-6 animate-spin text-[#c5a059] mx-auto mb-2" />
                                            Comparing equipment...
                                        </div>
                                    ) : diffData?.slot_diffs ? (
                                        <div className="space-y-2.5">
                                            {diffData.slot_diffs.map((diff) => {
                                                const status = diff.status; // "matched", "trait_mismatch", "missing"
                                                return (
                                                    <div 
                                                        key={diff.slot_id}
                                                        className={`p-3.5 rounded-none border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
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
                                                                <div className="font-cinzel font-bold text-sm text-[#e0d8c3]">
                                                                    {diff.target_item.item_name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Target: <span className="text-gray-300">{diff.target_item.set_name}</span> ({diff.target_item.trait_name})
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 sm:text-right">
                                                            {status === "matched" && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider font-cinzel">
                                                                    <CheckCircle2 className="size-3.5" /> Equipped
                                                                </span>
                                                            )}
                                                            {status === "trait_mismatch" && (
                                                                <div className="text-right">
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-500/40 uppercase tracking-wider font-cinzel">
                                                                        <AlertTriangle className="size-3.5" /> Trait Mismatch
                                                                    </span>
                                                                    <p className="text-[10px] text-amber-300/80 mt-0.5">
                                                                        Equipped: {diff.equipped_item?.trait_name || "Unknown"} (Transmute needed)
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {status === "missing" && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-red-950/60 text-red-400 border border-red-500/40 uppercase tracking-wider font-cinzel">
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
                                            Scanning guild kiosks...
                                        </div>
                                    ) : dealsData ? (
                                        <>
                                            {/* Summary Stats Banner */}
                                            <div className="p-4 rounded-none bg-[#121218] border border-[#2a2c33] flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059]">
                                                        Market Pricing ({dealsData.server})
                                                    </span>
                                                    <h3 className="font-cinzel font-bold text-base sm:text-lg text-[#e0d8c3] mt-0.5">
                                                        Estimated Cost (Tradeable Items):
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Calculated from active trader kiosk listings.
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl sm:text-3xl font-cinzel font-bold text-[#d4af37]">
                                                        {dealsData.total_estimated_gold > 0 ? `${dealsData.total_estimated_gold.toLocaleString()}g` : "0g (All Bound or Owned)"}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Zone Itinerary Route */}
                                            {dealsData.zone_itinerary && dealsData.zone_itinerary.length > 0 && (
                                                <div>
                                                    <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#c5a059] uppercase mb-3 flex items-center gap-1.5">
                                                        <MapPin className="size-3.5" /> Trader Locations by Zone
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {dealsData.zone_itinerary.map((itinerary) => (
                                                            <div 
                                                                key={itinerary.zone_location}
                                                                className="p-3.5 rounded-none bg-[#13131b] border border-[#2a2c33] flex flex-col justify-between gap-2.5"
                                                            >
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="font-cinzel font-bold text-sm text-[#e0d8c3] flex items-center gap-1.5">
                                                                            <Store className="size-3.5 text-[#c5a059]" /> {itinerary.zone_location}
                                                                        </span>
                                                                        <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-[#c5a059]/20 text-[#e6c278] font-mono">
                                                                            {itinerary.items_available} item{itinerary.items_available > 1 ? "s" : ""}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Guilds: {itinerary.listings.map(l => l.guild_name).filter(Boolean).slice(0, 2).join(", ") || "Active Kiosks"}
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    onClick={() => handleCopyZoneCommand(itinerary.zone_location, itinerary.listings)}
                                                                    className="w-full py-2 px-3 rounded-none bg-[#161620] hover:bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/30 text-xs font-cinzel font-semibold transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
                                                                >
                                                                    {copiedZone === itinerary.zone_location ? (
                                                                        <>
                                                                            <Check className="size-3.5 text-emerald-400" /> Copied!
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Copy className="size-3.5" /> Copy Route
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
                                                <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#c5a059] uppercase mb-3 flex items-center gap-1.5">
                                                    <Tag className="size-3.5" /> Listings by Slot
                                                </h3>
                                                <div className="space-y-3">
                                                    {dealsData.deals_by_slot?.map((slotDeal) => (
                                                        <div 
                                                            key={slotDeal.slot_id}
                                                            className="p-4 rounded-none bg-[#13131b] border border-[#2a2c33] space-y-2.5"
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2c33] pb-2">
                                                                <div>
                                                                    <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059]">
                                                                        {slotDeal.slot_name}
                                                                    </span>
                                                                    <h4 className="font-cinzel font-bold text-sm text-[#e0d8c3]">
                                                                        {slotDeal.item_name} ({slotDeal.set_name})
                                                                    </h4>
                                                                </div>

                                                                {!slotDeal.is_tradeable ? (
                                                                    <span className="px-2.5 py-1 rounded-none text-xs font-semibold bg-red-950/40 text-red-300 border border-red-500/30 flex items-center gap-1 font-cinzel uppercase tracking-wider">
                                                                        <Lock className="size-3" /> Bound ({slotDeal.source_location || "Dungeon / Trial / Mythic"})
                                                                    </span>
                                                                ) : slotDeal.cheapest_price ? (
                                                                    <span className="px-2.5 py-1 rounded-none text-xs font-cinzel font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                                                                        Best: {slotDeal.cheapest_price.toLocaleString()}g
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2.5 py-1 rounded-none text-xs text-muted-foreground bg-gray-900/40 border border-gray-800 font-cinzel">
                                                                        No Active Listings
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Listing Rows */}
                                                            {slotDeal.listings && slotDeal.listings.length > 0 ? (
                                                                <div className="space-y-1.5 pt-1">
                                                                    {slotDeal.listings.map((l) => (
                                                                        <div 
                                                                            key={l.id}
                                                                            className="p-2.5 rounded-none bg-[#0a0a0d] border border-[#2a2c33] hover:border-[#c5a059]/40 transition-all flex flex-wrap items-center justify-between text-xs gap-2"
                                                                        >
                                                                            <div className="flex items-center gap-2.5">
                                                                                <span className="font-bold text-[#e6c278] font-mono">
                                                                                    {l.price.toLocaleString()}g
                                                                                </span>
                                                                                {l.deal_badge === "steal" && (
                                                                                    <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-cinzel">
                                                                                        🔥 {l.discount_percent}% Under Avg
                                                                                    </span>
                                                                                )}
                                                                                {l.deal_badge === "great" && (
                                                                                    <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-cinzel">
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
                                                                    No active listings on {dealsData.server}.
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

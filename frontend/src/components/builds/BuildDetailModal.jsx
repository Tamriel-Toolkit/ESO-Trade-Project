import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
    X, Shield, Sparkles, Sword, CheckCircle2, Layers, RefreshCw,
    ExternalLink, ShoppingCart, Lock, AlertTriangle, Copy, Check,
    User, Search, Trash2
} from "lucide-react";
import { fetchBuildById, fetchBuildGearDiff, fetchBuildDeals, fetchCharacters, deleteBuild } from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { AnatomicalEquipmentDiagram } from "@/components/character/AnatomicalEquipmentDiagram";
import { getEsoIconUrl } from "@/lib/utils";
import { EsoTooltip } from "@/components/ui/tooltip";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import "@/styles/requests-builds.css";

const ROLE_COLORS = {
    "Magicka DPS": "text-sky-400 border-sky-500/40 bg-sky-950/20",
    "Stamina DPS": "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
    "Tank": "text-amber-400 border-amber-500/40 bg-amber-950/20",
    "Healer": "text-yellow-300 border-yellow-500/40 bg-yellow-950/20",
    "Solo / Arena": "text-purple-400 border-purple-500/40 bg-purple-950/20",
    "PvP": "text-red-400 border-red-500/40 bg-red-950/20"
};

export function BuildDetailModal({ buildId, initialTab = "gear", onClose, onBuildDeleted }) {
    const dialogRef = useDialogFocus(Boolean(buildId), onClose);
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [build, setBuild] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab === "deals" ? "diff" : initialTab); // "gear", "diff"
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
                item_icon: item.item_icon || item.icon_url,
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

    // Fetch Diff and Deals together when on comparison tab or character changes
    useEffect(() => {
        if (!buildId || !selectedCharId || activeTab !== "diff") return;
        setDiffLoading(true);
        setDealsLoading(true);

        Promise.all([
            fetchBuildGearDiff(buildId, selectedCharId),
            fetchBuildDeals(buildId, { server, characterId: selectedCharId || undefined })
        ]).then(([diffRes, dealsRes]) => {
            if (diffRes && diffRes.success) {
                setDiffData(diffRes);
            }
            if (dealsRes && dealsRes.success) {
                setDealsData(dealsRes);
            }
            setDiffLoading(false);
            setDealsLoading(false);
        }).catch(() => {
            setDiffLoading(false);
            setDealsLoading(false);
        });
    }, [buildId, selectedCharId, activeTab, server]);

    // Escape handling, nested focus containment, and restoration use the shared dialog hook.

    const handleCopyZoneCommand = (zone, listings) => {
        const itemNames = listings.map(l => l.item_name).slice(0, 3).join(", ");
        const text = `/say [ESO Marketplace] Shopping at ${zone}: Looking for ${itemNames}`;
        navigator.clipboard.writeText(text);
        setCopiedZone(zone);
        setTimeout(() => setCopiedZone(null), 2500);
    };

    const handleSearchMarketplace = (targetItem, setName) => {
        const params = new URLSearchParams();
        params.set("view", "listings");

        const itemObj = (typeof targetItem === "object" && targetItem !== null) ? targetItem : {};
        const rawName = itemObj.item_name || (typeof targetItem === "string" ? targetItem : "");
        const rawSet = itemObj.set_name || setName || "";
        const trait = itemObj.trait_name;

        // 1. Search Query: Set name if available
        const isGeneric = !rawName || 
            / (Legs|Head|Chest|Shoulders|Waist|Feet|Hands|Ring 1|Ring 2|Necklace|Main Hand|Off Hand)$/i.test(rawName) ||
            /^Monster (Helm|Shoulders)/i.test(rawName);

        const query = (isGeneric && rawSet) ? rawSet : (rawSet || rawName || "");
        if (query.trim()) {
            params.set("search", query.trim());
        }

        // 2. Trait Filter
        if (trait && trait !== "None" && trait !== "Unknown") {
            params.set("trait", trait);
        }

        // 3. Category / Subcategory Filter based on armor weight or weapon/jewelry type
        const weight = itemObj.armor_weight;
        const itemType = (itemObj.item_type || "").toLowerCase();
        const weaponType = (itemObj.weapon_type || "").toLowerCase();

        if (weight) {
            params.set("category", "Apparel");
            if (weight === "Light") params.set("subcategory", "Light Armor");
            else if (weight === "Medium") params.set("subcategory", "Medium Armor");
            else if (weight === "Heavy") params.set("subcategory", "Heavy Armor");
        } else if (itemType.includes("dagger") || weaponType === "dagger") {
            params.set("category", "Weapons");
            params.set("subcategory", "Dagger");
        } else if (itemType.includes("bow") || weaponType === "bow") {
            params.set("category", "Weapons");
            params.set("subcategory", "Bow");
        } else if (itemType.includes("staff") || weaponType.includes("staff")) {
            params.set("category", "Weapons");
            params.set("subcategory", itemType.includes("resto") ? "Restoration Staff" : "Destruction Staff");
        } else if (itemType.includes("axe") || weaponType.includes("axe")) {
            params.set("category", "Weapons");
            params.set("subcategory", itemType.includes("two") ? "Two-Handed Axe" : "One-Handed Axe");
        } else if (itemType.includes("sword") || weaponType.includes("sword")) {
            params.set("category", "Weapons");
            params.set("subcategory", itemType.includes("two") ? "Two-Handed Sword" : "One-Handed Sword");
        } else if (itemType.includes("mace") || weaponType.includes("mace")) {
            params.set("category", "Weapons");
            params.set("subcategory", itemType.includes("two") ? "Two-Handed Mace" : "One-Handed Mace");
        } else if (itemType.includes("ring") || itemType.includes("neck") || itemType.includes("jewelry")) {
            params.set("category", "Jewelry");
            if (itemType.includes("neck")) params.set("subcategory", "Necklace");
            else if (itemType.includes("ring")) params.set("subcategory", "Ring");
        }

        navigate(`/marketplace?${params.toString()}`);
        onClose();
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to permanently delete "${build?.title || 'this custom build'}"?`)) return;
        setDeleting(true);
        const res = await deleteBuild(buildId);
        if (res && res.success) {
            if (onBuildDeleted) onBuildDeleted(buildId);
            onClose();
        } else {
            alert(res?.error || "Failed to delete build.");
            setDeleting(false);
        }
    };

    if (!buildId) return null;

    return (
        <div 
            className="exchange-modal-backdrop"
        >
            <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={build?.title ? `${build.title} build details` : "Build details"} className="exchange-modal rb-modal rb-build-modal">
                {/* Modal Header */}
                <div className="exchange-modal-heading">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                            {build?.is_curated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-sm font-sans font-bold bg-primary/15 text-primary border border-primary/40 tracking-normal">
                                    <Sparkles className="size-3 text-primary" /> Curated
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-sm font-sans font-bold bg-purple-950/40 text-purple-300 border border-purple-500/40 tracking-normal">
                                    <User className="size-3" /> Custom
                                </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-none text-sm font-semibold border tracking-normal ${ROLE_COLORS[build?.role] || "text-gray-300 border-gray-700 bg-gray-900/40"}`}>
                                {build?.role}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-none text-sm font-semibold text-primary border border-primary/30 bg-recess font-sans tracking-normal">
                                {build?.class}
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-sans font-bold text-foreground tracking-wide">
                            {build ? build.title : "Loading Build..."}
                        </h2>
                        {build?.author && (
                            <p className="text-sm text-muted-foreground mt-0.5 font-sans">
                                By <span className="text-primary font-medium">{build.author}</span>
                                {build.source_url && (
                                    <a 
                                        href={build.source_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 ml-2 text-primary hover:text-foreground underline"
                                    >
                                        Guide <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </p>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                        {Boolean(user && build && !build.is_curated && (build.user_id === user.id || user.role === "admin")) && (
                            <EsoTooltip content="Permanently delete this custom build" side="bottom">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-3 py-1.5 rounded-none bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-500/40 text-sm font-sans font-bold tracking-normal flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                    aria-label="Delete build"
                                >
                                    <Trash2 className="size-3.5" />
                                    {deleting ? "Deleting..." : "Delete Build"}
                                </button>
                            </EsoTooltip>
                        )}
                        <button
                            onClick={onClose}
                            className="exchange-close"
                            aria-label="Close build details modal"
                        >
                            <X className="size-5" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation (Merged into Equipment & Comparison) */}
                <div className="rb-build-tabs">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab("gear")}
                            aria-pressed={activeTab === "gear"}
                            className={`px-4 py-2 rounded-none text-sm font-sans font-bold tracking-normal transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "gear"
                                    ? "bg-primary text-black shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                            }`}
                        >
                            <Shield className="size-3.5" /> Equipment
                        </button>
                        <button
                            onClick={() => setActiveTab("diff")}
                            aria-pressed={activeTab === "diff"}
                            className={`px-4 py-2 rounded-none text-sm font-sans font-bold tracking-normal transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "diff"
                                    ? "bg-primary text-black shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                            }`}
                        >
                            <Sword className="size-3.5" /> Comparison
                        </button>
                    </div>

                    {/* Server toggle for live market pricing */}
                    {activeTab === "diff" && (
                        <div className="rb-server-toggle" aria-label="Megaserver">
                            {["NA", "EU"].map((srv) => (
                                <button
                                    key={srv}
                                    onClick={() => setServer(srv)}
                                    aria-pressed={server === srv}
                                    className={`px-3 py-1 rounded-none text-sm font-sans font-bold tracking-normal transition-all cursor-pointer ${
                                        server === srv ? "bg-primary text-black" : "text-muted-foreground hover:text-white"
                                    }`}
                                >
                                    {srv}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Body */}
                <div className="rb-modal-body space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <RefreshCw className="size-8 animate-spin text-primary mb-3" />
                            <p className="font-sans text-sm">Loading build data...</p>
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: EQUIPMENT LOADOUT & SET BONUSES */}
                            {activeTab === "gear" && (
                                <div className="space-y-5">
                                    {build?.description && (
                                        <div className="p-3.5 rounded-none bg-card border border-border text-sm text-muted-foreground leading-relaxed">
                                            {build.description}
                                        </div>
                                    )}

                                    {/* Anatomical Diagram + Active Sets Sidebar Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Left 2 Cols: Full Anatomical Equipment Diagram with Bar Toggle */}
                                        <div className="lg:col-span-2 space-y-3">
                                            <div className="flex items-center justify-between bg-card px-3 py-2 border border-border">
                                                <span className="font-sans font-bold text-sm text-primary tracking-normal flex items-center gap-1.5">
                                                    <Shield className="size-3.5" /> Weapon bar
                                                </span>

                                                {/* Weapon Bar Toggle */}
                                                <div className="flex items-center gap-1 bg-recess p-0.5 border border-border">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveWeaponBar("front")}
                                                        aria-pressed={activeWeaponBar === "front"}
                                                        className={`px-3 py-1 text-sm font-sans font-bold border transition-all cursor-pointer ${
                                                            activeWeaponBar === "front" ? "bg-primary text-black border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                                                        }`}
                                                    >
                                                        Front Bar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveWeaponBar("back")}
                                                        aria-pressed={activeWeaponBar === "back"}
                                                        className={`px-3 py-1 text-sm font-sans font-bold border transition-all cursor-pointer ${
                                                            activeWeaponBar === "back" ? "bg-primary text-black border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                                                        }`}
                                                    >
                                                        Back Bar
                                                    </button>
                                                </div>
                                            </div>

                                            <AnatomicalEquipmentDiagram gearBySlot={gearBySlot} activeBar={activeWeaponBar} />
                                        </div>

                                        {/* Right 1 Col: Active Set Bonuses Sidebar & Acquisition Summary */}
                                        <div className="space-y-4 text-sm">
                                            {/* Active Set Bonus Counter */}
                                            <div className="p-4 bg-card border border-border space-y-3">
                                                <span className="font-sans font-bold text-sm text-primary tracking-normal block flex items-center justify-between border-b border-border pb-2">
                                                    <span>Set bonuses · {activeWeaponBar} bar</span>
                                                    <Layers className="size-4 text-primary" />
                                                </span>

                                                {build?.sets && build.sets.length > 0 ? (
                                                    <div className="space-y-2.5">
                                                        {build.sets.map((s) => (
                                                            <div key={s.name} className="p-2.5 rounded-none bg-recess border border-border flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-sans font-bold text-sm text-foreground">{s.name}</div>
                                                                </div>
                                                                <span className="px-2 py-0.5 rounded-none bg-primary/20 text-primary tabular-nums text-xs font-bold">
                                                                    {s.count} pcs
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">No set bonuses logged.</p>
                                                )}
                                            </div>

                                            {/* Acquisition Summary */}
                                            <div className="p-4 bg-card border border-border space-y-3">
                                                <span className="font-sans font-bold text-sm text-primary tracking-normal block border-b border-border pb-2">
                                                    Acquisition
                                                </span>
                                                <div className="space-y-2.5 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-emerald-400 font-medium flex items-center gap-1 font-sans">
                                                            <ShoppingCart className="size-3" /> Tradeable:
                                                        </span>
                                                        <span className="font-bold text-foreground tabular-nums">
                                                            {build?.items?.filter(i => i.is_tradeable).length || 0} slots
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-red-400 font-medium flex items-center gap-1 font-sans">
                                                            <Lock className="size-3" /> Bound:
                                                        </span>
                                                        <span className="font-bold text-foreground tabular-nums">
                                                            {build?.items?.filter(i => !i.is_tradeable).length || 0} slots
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: MERGED COMPARISON & MARKET DEALS */}
                            {activeTab === "diff" && (
                                <div className="space-y-6">
                                    {/* Character Selector & Server Banner */}
                                    <div className="rb-comparison-controls">
                                        <div>
                                            <h3 className="font-sans font-bold text-foreground text-sm tracking-normal">
                                                Compare equipment
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Your equipment and recorded {server} offers for the missing pieces.
                                            </p>
                                        </div>
                                        {characters.length > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <label htmlFor="char-select" className="text-sm text-muted-foreground font-sans tracking-normal">Character:</label>
                                                <select
                                                    id="char-select"
                                                    value={selectedCharId}
                                                    onChange={(e) => setSelectedCharId(e.target.value)}
                                                    className="px-3 py-1.5 rounded-none bg-recess border border-primary/40 text-foreground text-sm font-semibold focus:outline-none focus:border-primary"
                                                >
                                                    {characters.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name} (Lv {c.level} {c.class})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-amber-400 font-sans">
                                                No characters found in roster.
                                            </div>
                                        )}
                                    </div>

                                    {/* Diff Metrics Header */}
                                    {diffData && (
                                        <div className="rb-diff-metrics">
                                            <div className="p-3.5 rounded-none bg-card border border-border text-center">
                                                <div className="text-2xl font-bold font-sans text-emerald-400">
                                                    {diffData.completion_rate}%
                                                </div>
                                                <div className="text-xs text-muted-foreground tracking-normal font-sans mt-0.5">
                                                    Complete
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-none bg-card border border-emerald-500/20 text-center">
                                                <div className="text-2xl font-bold font-sans text-emerald-400">
                                                    {diffData.matched_count} / {diffData.total_slots}
                                                </div>
                                                <div className="text-xs text-muted-foreground tracking-normal font-sans mt-0.5">
                                                    Equipped
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-none bg-card border border-amber-500/20 text-center">
                                                <div className="text-2xl font-bold font-sans text-amber-400">
                                                    {diffData.trait_mismatch_count}
                                                </div>
                                                <div className="text-xs text-muted-foreground tracking-normal font-sans mt-0.5">
                                                    Trait mismatch
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-none bg-card border border-red-500/20 text-center">
                                                <div className="text-2xl font-bold font-sans text-red-400">
                                                    {diffData.missing_count}
                                                </div>
                                                <div className="text-xs text-muted-foreground tracking-normal font-sans mt-0.5">
                                                    Missing
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Market Cost Evaluation Banner */}
                                    {dealsData && (
                                        <div className="p-4 rounded-none bg-card border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-sans font-bold tracking-normal text-primary">
                                                    Market estimate · {server}
                                                </span>
                                                <div className="text-sm font-sans font-bold text-foreground mt-0.5 flex flex-wrap items-center gap-2">
                                                    <span>Estimated cost:</span>
                                                    {dealsData.total_estimated_gold > 0 ? (
                                                        <span className="text-[#f0d07a] tabular-nums text-base">
                                                            {dealsData.total_estimated_gold.toLocaleString()}g
                                                        </span>
                                                    ) : diffData?.missing_count > 0 && build?.items?.some(i => i.is_tradeable) ? (
                                                        <span className="text-muted-foreground text-sm font-sans font-normal italic">
                                                            No active market listings currently recorded
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-400 text-sm font-sans font-bold">
                                                            0g (all tradeable pieces owned)
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5">
                                                    Based on recorded guild trader listings on {server}.
                                                </p>
                                            </div>

                                            {dealsData.zone_itinerary && dealsData.zone_itinerary.length > 0 && (
                                                <button
                                                    onClick={() => handleCopyZoneCommand(dealsData.zone_itinerary[0].zone_location, dealsData.zone_itinerary[0].listings)}
                                                    className="px-4 py-2 rounded-none bg-secondary hover:bg-primary/20 text-primary border border-primary/30 text-sm font-sans font-semibold transition-all flex items-center gap-1.5 tracking-normal cursor-pointer shrink-0"
                                                >
                                                    {copiedZone ? (
                                                        <>
                                                            <Check className="size-3.5 text-emerald-400" /> Route copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="size-3.5" /> Copy trader route
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Slot by Slot Diff & Market Search Rows */}
                                    {diffLoading || dealsLoading ? (
                                        <div className="py-12 text-center text-muted-foreground font-sans text-sm">
                                            <RefreshCw className="size-6 animate-spin text-primary mx-auto mb-2" />
                                            Comparing equipment and querying guild traders...
                                        </div>
                                    ) : diffData?.slot_diffs ? (
                                        <div className="space-y-2.5">
                                            {diffData.slot_diffs.map((diff) => {
                                                const status = diff.status; // "matched", "trait_mismatch", "missing"
                                                const isTradeable = diff.target_item?.is_tradeable === 1;
                                                const slotDeal = dealsData?.deals_by_slot?.find(d => d.slot_id === diff.slot_id);
                                                const targetIcon = diff.target_item?.item_icon || getEsoIconUrl(diff.target_item?.icon_url);

                                                return (
                                                    <div 
                                                        key={diff.slot_id}
                                                        className="rb-diff-row"
                                                    >
                                                        {/* Column 1: Slot Icon & Target Specs */}
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="size-9 shrink-0 border border-border bg-recess p-1 flex items-center justify-center">
                                                                {targetIcon ? (
                                                                    <img src={getEsoIconUrl(targetIcon)} alt="" className="size-full object-contain" />
                                                                ) : (
                                                                    <Shield className="size-4 text-muted-foreground" />
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 space-y-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-sans font-bold tracking-normal text-primary">
                                                                        {diff.slot_name}
                                                                    </span>
                                                                    {isTradeable ? (
                                                                        <span className="text-xs font-sans font-bold tracking-normal px-1.5 py-0.2 rounded-none bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                                                                            Tradeable
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs font-sans font-bold tracking-normal px-1.5 py-0.2 rounded-none bg-secondary text-muted-foreground border border-border">
                                                                            Bound
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="font-sans font-bold text-sm text-foreground truncate">
                                                                    {diff.target_item.item_name}
                                                                </div>

                                                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                                                                    <span>Set: <strong className="text-gray-300 font-medium">{diff.target_item.set_name}</strong></span>
                                                                    <span>•</span>
                                                                    <span>Trait: <strong className="text-gray-300 font-medium">{diff.target_item.trait_name}</strong></span>
                                                                    {diff.target_item.enchantment && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>Enchant: <strong className="text-gray-300 font-medium">{diff.target_item.enchantment}</strong></span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Column 2 & 3: Fixed-width Status & Market Action */}
                                                        <div className="rb-diff-actions">
                                                            {/* Status Column (Fixed width ~140px) */}
                                                            <div className="w-36 flex justify-start md:justify-center">
                                                                {status === "matched" && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-sm font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-500/40 tracking-normal font-sans">
                                                                        <CheckCircle2 className="size-3.5" /> Equipped
                                                                    </span>
                                                                )}
                                                                {status === "trait_mismatch" && (
                                                                    <div className="text-left md:text-center">
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-semibold bg-amber-950/50 text-amber-400 border border-amber-500/40 tracking-normal font-sans">
                                                                            <AlertTriangle className="size-3" /> Trait mismatch
                                                                        </span>
                                                                        <p className="text-xs text-amber-300/80 mt-0.5">
                                                                            Equipped: {diff.equipped_item?.trait_name || "Unknown"}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {status === "missing" && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-sm font-semibold bg-red-950/30 text-red-400 border border-red-500/30 tracking-normal font-sans">
                                                                        <X className="size-3.5" /> Missing
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Action / Source Column (Fixed width ~170px) */}
                                                            <div className="w-44 flex items-center justify-end">
                                                                {isTradeable ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        {slotDeal?.cheapest_price ? (
                                                                            <span className="text-xs font-sans font-bold text-primary bg-recess px-2 py-1 border border-primary/30">
                                                                                {slotDeal.cheapest_price.toLocaleString()}g
                                                                            </span>
                                                                        ) : null}
                                                                        <EsoTooltip content={`Search marketplace for ${diff.target_item.item_name}`} side="left">
                                                                            <button
                                                                                onClick={() => handleSearchMarketplace(diff.target_item, diff.target_item.set_name)}
                                                                                className="px-3 py-1.5 rounded-none bg-primary hover:bg-[#f0d07a] text-black font-sans font-bold text-sm tracking-normal transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                                                                            >
                                                                                <Search className="size-3.5" /> Search market
                                                                            </button>
                                                                        </EsoTooltip>
                                                                    </div>
                                                                ) : (
                                                                    <EsoTooltip content={diff.target_item.source_location || "Dungeon / Trial"} side="left">
                                                                        <span className="text-xs text-muted-foreground font-sans text-right truncate max-w-[170px] cursor-default">
                                                                            {diff.target_item.source_location || "Dungeon / Trial"}
                                                                        </span>
                                                                    </EsoTooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
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

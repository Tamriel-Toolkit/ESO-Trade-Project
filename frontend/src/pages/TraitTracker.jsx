import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/ui/navbar";
import { useAuth } from "@/context/AuthContext";
import { fetchCharacters, fetchCharacterTraits, updateCharacterTraits, fetchTraitMarketMatches } from "@/api/api";
import { 
    Shield, Sparkles, Sword, Search, Check, Clock, AlertTriangle, 
    ShoppingCart, RefreshCw, Layers, User, Award, ExternalLink, ChevronRight,
    Flame, Zap, Skull, Sun, BookOpen, Hammer, Scissors, Trees, Gem
} from "lucide-react";
import { EsoSelect } from "@/components/ui/eso-select";

const DISCIPLINE_CONFIG = {
    "Blacksmithing": {
        name: "Blacksmithing",
        icon: <Hammer className="size-4 text-orange-400" />,
        badgeColor: "text-orange-400 border-orange-500/40 bg-orange-950/20",
        description: "Weapons & Heavy Armor lines"
    },
    "Clothier (Light)": {
        name: "Clothier (Light Armor)",
        icon: <Scissors className="size-4 text-cyan-400" />,
        badgeColor: "text-cyan-400 border-cyan-500/40 bg-cyan-950/20",
        description: "Light Armor lines (Robes, Jerkins, Hats)"
    },
    "Clothier (Medium)": {
        name: "Clothier (Medium Armor)",
        icon: <Scissors className="size-4 text-emerald-400" />,
        badgeColor: "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
        description: "Medium Armor lines (Jacks, Helmets, Guards)"
    },
    "Woodworking": {
        name: "Woodworking",
        icon: <Trees className="size-4 text-amber-400" />,
        badgeColor: "text-amber-400 border-amber-500/40 bg-amber-950/20",
        description: "Bows, Staves & Wooden Shields"
    },
    "Jewelry": {
        name: "Jewelry Crafting",
        icon: <Gem className="size-4 text-purple-400" />,
        badgeColor: "text-purple-400 border-purple-500/40 bg-purple-950/20",
        description: "Necklaces & Rings"
    }
};

const TRAIT_DESCRIPTIONS = {
    "Powered": "Increases healing done.",
    "Charged": "Increases chance to apply status effects.",
    "Precise": "Increases Critical Chance.",
    "Infused": "Increases weapon/armor/jewelry enchantment power.",
    "Defending": "Increases total Armor.",
    "Training": "Increases experience gained from kills.",
    "Sharpened": "Increases Armor & Spell Penetration.",
    "Decisive": "Chance to gain additional Ultimate.",
    "Sturdy": "Reduces the cost of Block.",
    "Impenetrable": "Increases Critical Resistance and reduces durability loss.",
    "Reinforced": "Increases item's Armor rating.",
    "Well-Fitted": "Reduces Sprint and Roll Dodge cost.",
    "Invigorating": "Increases Magicka, Stamina, and Health Recovery.",
    "Divines": "Increases Mundus Stone effects.",
    "Nirnhoned": "Increases Weapon/Spell Damage or total Armor.",
    "Arcane": "Increases Maximum Magicka.",
    "Healthy": "Increases Maximum Health.",
    "Robust": "Increases Maximum Stamina.",
    "Triune": "Increases Health, Magicka, and Stamina.",
    "Bloodthirsty": "Increases damage against enemies under 25% Health.",
    "Harmony": "Increases damage, healing, and resource restore from Synergies.",
    "Swift": "Increases Movement Speed."
};

export function TraitTracker() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [characters, setCharacters] = useState([]);
    const [selectedCharId, setSelectedCharId] = useState(null);
    const [server, setServer] = useState("NA");
    const [activeTab, setActiveTab] = useState("Blacksmithing");

    const [traitData, setTraitData] = useState(null);
    const [marketMatches, setMarketMatches] = useState(null);
    const [loading, setLoading] = useState(true);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [togglingKey, setTogglingKey] = useState(null);
    const [searchFodderQuery, setSearchFodderQuery] = useState("");

    // Load user characters
    useEffect(() => {
        fetchCharacters().then((res) => {
            if (res && res.characters && res.characters.length > 0) {
                setCharacters(res.characters);
                setSelectedCharId(res.characters[0].id);
            } else {
                setLoading(false);
            }
        }).catch(() => setLoading(false));
    }, [user]);

    // Load character trait matrix
    const loadTraits = async (charId) => {
        if (!charId) return;
        setLoading(true);
        try {
            const res = await fetchCharacterTraits(charId);
            if (res && res.success) {
                setTraitData(res);
            }
        } catch (e) {
            console.error("Failed to load character traits:", e);
        } finally {
            setLoading(false);
        }
    };

    // Load live market fodder matches
    const loadMarketMatches = async (charId, currentServer) => {
        if (!charId) return;
        setMatchesLoading(true);
        try {
            const res = await fetchTraitMarketMatches(charId, { server: currentServer, limitPerTrait: 3 });
            if (res && res.success) {
                setMarketMatches(res);
            }
        } catch (e) {
            console.error("Failed to load trait market matches:", e);
        } finally {
            setMatchesLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCharId) {
            loadTraits(selectedCharId);
            loadMarketMatches(selectedCharId, server);
        }
    }, [selectedCharId, server]);

    // Map market matches by `${equipment_type}_${trait_id}` for instant cell lookup
    const matchLookup = useMemo(() => {
        if (!marketMatches || !marketMatches.matches) return {};
        const map = {};
        for (const m of marketMatches.matches) {
            if (m.cheapest_listing) {
                map[`${m.equipment_type}_${m.trait_id}`] = m;
            }
        }
        return map;
    }, [marketMatches]);

    // Handle 1-click status cycle: UNKNOWN -> COMPLETED -> RESEARCHING -> UNKNOWN
    const handleToggleTrait = async (equipmentType, traitId, currentStatus) => {
        if (!selectedCharId) return;

        let nextStatus = "COMPLETED";
        if (currentStatus === "COMPLETED") nextStatus = "RESEARCHING";
        else if (currentStatus === "RESEARCHING") nextStatus = "UNKNOWN";
        else if (currentStatus === "UNKNOWN") nextStatus = "COMPLETED";

        const key = `${equipmentType}_${traitId}`;
        setTogglingKey(key);

        // Optimistic UI update
        setTraitData((prev) => {
            if (!prev) return prev;
            const updatedTraits = prev.traits.map((t) => {
                if (t.equipment_type === equipmentType && t.trait_id === traitId) {
                    return { ...t, research_status: nextStatus };
                }
                return t;
            });

            const totalResearched = updatedTraits.filter(r => r.research_status === "COMPLETED").length;
            const totalResearching = updatedTraits.filter(r => r.research_status === "RESEARCHING").length;
            const totalUnknown = updatedTraits.filter(r => r.research_status === "UNKNOWN").length;
            const totalTraits = updatedTraits.length;
            const completionRate = totalTraits > 0 ? Math.round((totalResearched / totalTraits) * 1000) / 10 : 0;

            const updatedDisciplines = prev.disciplines.map((d) => ({
                ...d,
                lines: d.lines.map((line) => {
                    if (line.equipment_type === equipmentType) {
                        return {
                            ...line,
                            traits: line.traits.map((t) => t.trait_id === traitId ? { ...t, research_status: nextStatus } : t)
                        };
                    }
                    return line;
                })
            }));

            return {
                ...prev,
                traits: updatedTraits,
                total_researched: totalResearched,
                total_researching: totalResearching,
                total_unknown: totalUnknown,
                completion_percentage: completionRate,
                disciplines: updatedDisciplines
            };
        });

        try {
            await updateCharacterTraits(selectedCharId, {
                equipment_type: equipmentType,
                trait_id: traitId,
                research_status: nextStatus
            });
            // Refresh market matches if status changed to/from UNKNOWN
            if (nextStatus === "COMPLETED" || currentStatus === "COMPLETED") {
                loadMarketMatches(selectedCharId, server);
            }
        } catch (e) {
            console.error("Failed to update trait status:", e);
        } finally {
            setTogglingKey(null);
        }
    };

    const characterOptions = useMemo(() => {
        return characters.map((c) => ({
            value: String(c.id),
            label: `${c.name} (Lvl ${c.level} ${c.class})`,
            icon: <User className="size-4 text-[#c5a059]" />
        }));
    }, [characters]);

    const activeDisciplineData = useMemo(() => {
        if (!traitData || !traitData.disciplines) return null;
        return traitData.disciplines.find(d => d.crafting_type === activeTab);
    }, [traitData, activeTab]);

    // Filter market fodder list
    const filteredFodderMatches = useMemo(() => {
        if (!marketMatches || !marketMatches.matches) return [];
        const q = searchFodderQuery.trim().toLowerCase();
        return marketMatches.matches.filter(m => {
            if (!m.cheapest_listing) return false;
            if (!q) return true;
            return (
                m.equipment_type.toLowerCase().includes(q) ||
                m.trait_name.toLowerCase().includes(q) ||
                m.crafting_type.toLowerCase().includes(q) ||
                (m.cheapest_listing.guild_name && m.cheapest_listing.guild_name.toLowerCase().includes(q)) ||
                (m.cheapest_listing.location && m.cheapest_listing.location.toLowerCase().includes(q)) ||
                (m.cheapest_listing.item_name && m.cheapest_listing.item_name.toLowerCase().includes(q))
            );
        });
    }, [marketMatches, searchFodderQuery]);

    return (
        <div className="min-h-screen bg-[#0a0a0d] text-[#e0d8c3] flex flex-col font-sans">
            <Navbar />

            {/* Header */}
            <header className="border-b border-[#2a2c33] bg-[#121218]/90 backdrop-blur sticky top-16 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-cinzel font-bold bg-[#c5a059]/15 text-[#e6c278] border border-[#c5a059]/40 uppercase tracking-wider">
                                <Award className="size-3 text-[#e6c278]" /> Master Crafter Engine
                            </span>
                            <span className="px-2.5 py-0.5 rounded-none text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-950/20 font-cinzel uppercase tracking-wider">
                                9-Trait Matrix
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#e0d8c3] tracking-wide">
                            Trait Research Tracker
                        </h1>
                        <p className="text-xs sm:text-sm text-[#a89f91] mt-0.5">
                            Track all 9 traits across weapons, armor, and jewelry with live cheapest market fodder discovery.
                        </p>
                    </div>

                    {/* Character & Megaserver Selectors */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {characters.length > 0 ? (
                            <div className="w-64">
                                <EsoSelect
                                    value={String(selectedCharId)}
                                    onChange={(val) => setSelectedCharId(Number(val))}
                                    options={characterOptions}
                                    placeholder="Select Character"
                                />
                            </div>
                        ) : (
                            <Link
                                to="/characters"
                                className="px-4 py-2 bg-[#c5a059] text-black font-cinzel font-bold text-xs uppercase tracking-wider"
                            >
                                + Create Character First
                            </Link>
                        )}

                        {/* Megaserver Selector */}
                        <div className="flex rounded-none border border-[#2a2c33] bg-[#0e0e13] p-0.5">
                            <button
                                onClick={() => setServer("NA")}
                                className={`px-3 py-1.5 text-xs font-cinzel font-bold tracking-wider transition-all cursor-pointer ${
                                    server === "NA"
                                        ? "bg-[#c5a059] text-black shadow"
                                        : "text-muted-foreground hover:text-white"
                                }`}
                            >
                                NA
                            </button>
                            <button
                                onClick={() => setServer("EU")}
                                className={`px-3 py-1.5 text-xs font-cinzel font-bold tracking-wider transition-all cursor-pointer ${
                                    server === "EU"
                                        ? "bg-[#c5a059] text-black shadow"
                                        : "text-muted-foreground hover:text-white"
                                }`}
                            >
                                EU
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">

                {/* Research Stats Dashboard */}
                {traitData && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* Overall Progress Card */}
                        <div className="col-span-2 lg:col-span-2 p-4 bg-[#121218] border border-[#2a2c33] flex flex-col justify-between relative overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-cinzel font-bold text-[#c5a059] uppercase tracking-wider">
                                    Research Mastery
                                </span>
                                <span className="text-sm font-bold font-mono text-[#e6c278]">
                                    {traitData.completion_percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-[#1c1c26] h-2.5 rounded-none overflow-hidden mb-2 border border-[#2a2c33]">
                                <div 
                                    className="bg-gradient-to-r from-[#c5a059] via-[#e6c278] to-emerald-400 h-full transition-all duration-500" 
                                    style={{ width: `${traitData.completion_percentage}%` }}
                                />
                            </div>
                            <span className="text-[11px] text-muted-foreground font-cinzel">
                                <strong className="text-white font-mono">{traitData.total_researched}</strong> of {traitData.total_traits} Total Traits Researched
                            </span>
                        </div>

                        {/* Researched Known Card */}
                        <div className="p-4 bg-[#121218] border border-emerald-500/30 flex items-center gap-3">
                            <div className="size-9 bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <Check className="size-5 text-emerald-400" />
                            </div>
                            <div>
                                <span className="text-[10px] font-cinzel uppercase text-emerald-400 block font-bold">
                                    Researched
                                </span>
                                <span className="font-mono text-xl font-bold text-white">
                                    {traitData.total_researched}
                                </span>
                            </div>
                        </div>

                        {/* Researching In-Progress Card */}
                        <div className="p-4 bg-[#121218] border border-amber-500/30 flex items-center gap-3">
                            <div className="size-9 bg-amber-950/40 border border-amber-500/40 flex items-center justify-center shrink-0">
                                <Clock className="size-5 text-amber-400" />
                            </div>
                            <div>
                                <span className="text-[10px] font-cinzel uppercase text-amber-400 block font-bold">
                                    In Progress
                                </span>
                                <span className="font-mono text-xl font-bold text-white">
                                    {traitData.total_researching}
                                </span>
                            </div>
                        </div>

                        {/* Missing Traits / Market Fodder Card */}
                        <div className="p-4 bg-[#121218] border border-[#c5a059]/40 flex items-center gap-3">
                            <div className="size-9 bg-[#c5a059]/15 border border-[#c5a059]/40 flex items-center justify-center shrink-0">
                                <ShoppingCart className="size-5 text-[#e6c278]" />
                            </div>
                            <div>
                                <span className="text-[10px] font-cinzel uppercase text-[#c5a059] block font-bold">
                                    Fodder on Market
                                </span>
                                <span className="font-mono text-xl font-bold text-[#e6c278]">
                                    {marketMatches ? marketMatches.available_matches_count : "..."}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Addon In-Game Sync Banner */}
                <div className="p-3.5 bg-[#121218] border border-[#c5a059]/30 text-xs flex items-center justify-between gap-3 text-[#d4af37]">
                    <div className="flex items-center gap-2.5">
                        <Sparkles className="size-4 text-[#c5a059] shrink-0" />
                        <span className="text-muted-foreground">
                            <strong className="text-[#e0d8c3] font-cinzel">Interactive Status Toggle:</strong> Click any trait cell below to cycle its status (Known ↔ In Progress ↔ Missing). In-game syncing occurs automatically via the <code className="text-[#e6c278] bg-black/40 px-1 py-0.5 border border-[#2a2c33]">ESOTrade</code> addon upon crafting station interact.
                        </span>
                    </div>
                </div>

                {/* Discipline & Fodder Navigation Tabs */}
                <div className="flex items-center justify-between border-b border-[#2a2c33] bg-[#0e0e13] px-2 overflow-x-auto gap-2">
                    <div className="flex items-center gap-1 py-2">
                        {Object.keys(DISCIPLINE_CONFIG).map((key) => {
                            const config = DISCIPLINE_CONFIG[key];
                            const isActive = activeTab === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`px-3.5 py-2 rounded-none text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                                        isActive
                                            ? "bg-[#c5a059] text-black shadow-md font-extrabold"
                                            : "text-muted-foreground hover:text-[#e0d8c3] hover:bg-white/5 border border-transparent"
                                    }`}
                                >
                                    {config.icon}
                                    <span>{config.name}</span>
                                </button>
                            );
                        })}

                        {/* Fodder Market Feed Tab */}
                        <button
                            onClick={() => setActiveTab("MarketFodder")}
                            className={`px-3.5 py-2 rounded-none text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                                activeTab === "MarketFodder"
                                    ? "bg-emerald-500 text-black border-emerald-400 shadow-md font-extrabold"
                                    : "text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/20"
                            }`}
                        >
                            <ShoppingCart className="size-3.5" />
                            <span>Market Fodder ({marketMatches ? marketMatches.available_matches_count : 0})</span>
                        </button>
                    </div>
                </div>

                {/* Matrix Content */}
                {loading ? (
                    <div className="py-20 text-center space-y-3">
                        <RefreshCw className="size-8 animate-spin mx-auto text-[#c5a059]" />
                        <p className="text-xs font-cinzel text-muted-foreground uppercase tracking-wider">
                            Loading Trait Matrix...
                        </p>
                    </div>
                ) : activeTab === "MarketFodder" ? (
                    /* Market Fodder Shopping List View */
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121218] p-4 border border-[#2a2c33]">
                            <div>
                                <h3 className="text-base font-cinzel font-bold text-[#e0d8c3]">
                                    Live Research Fodder on Guild Traders
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Cheapest available market listings across Tamriel for this character's unresearched traits.
                                </p>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchFodderQuery}
                                    onChange={(e) => setSearchFodderQuery(e.target.value)}
                                    placeholder="Filter by piece, trait, zone..."
                                    className="w-full pl-9 pr-3 py-1.5 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] placeholder:text-muted-foreground font-cinzel focus:outline-none focus:border-[#c5a059]"
                                />
                            </div>
                        </div>

                        {filteredFodderMatches.length === 0 ? (
                            <div className="p-12 text-center bg-[#121218] border border-[#2a2c33] space-y-2">
                                <Check className="size-8 text-emerald-400 mx-auto" />
                                <h4 className="font-cinzel font-bold text-sm text-[#e0d8c3]">
                                    No Active Research Fodder Needed (or Listings Unavailable)
                                </h4>
                                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                    All missing traits either have no current market listings recorded or all available traits in this category have been researched.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredFodderMatches.map((m) => {
                                    const listing = m.cheapest_listing;
                                    return (
                                        <div 
                                            key={`${m.equipment_type}_${m.trait_id}`}
                                            className="p-4 bg-[#121218] border border-[#2a2c33] hover:border-[#c5a059]/50 transition-all flex flex-col justify-between space-y-3"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-[#0a0a0d] border border-[#2a2c33] text-[10px] font-cinzel font-bold text-[#c5a059] uppercase tracking-wider">
                                                        {m.crafting_type}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-amber-950/30 border border-amber-500/30 text-[10px] font-cinzel font-bold text-amber-300 uppercase">
                                                        {m.trait_name}
                                                    </span>
                                                </div>
                                                <h4 className="font-cinzel font-bold text-sm text-[#e0d8c3]">
                                                    {listing.item_name || `${m.equipment_type} of ${m.trait_name}`}
                                                </h4>
                                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                                    <p>Guild: <span className="text-[#e6c278]">{listing.guild_name || "Unknown Guild"}</span></p>
                                                    <p>Location: <span className="text-gray-300">{listing.location || "Tamriel Kiosk"}</span></p>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-[#2a2c33] flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-cinzel block">Cheapest Price</span>
                                                    <span className="text-base font-bold font-mono text-[#e6c278]">
                                                        {listing.price.toLocaleString()}g
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => navigate(`/marketplace?search=${encodeURIComponent(m.equipment_type)}`)}
                                                    className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow"
                                                >
                                                    Market <ChevronRight className="size-3" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* 9-Trait Matrix Table */
                    activeDisciplineData && (
                        <div className="bg-[#121218] border border-[#2a2c33] overflow-x-auto shadow-xl">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-[#2a2c33] bg-[#161620]">
                                        <th className="py-3.5 px-4 text-xs font-cinzel font-bold uppercase tracking-wider text-[#c5a059] w-48">
                                            Equipment Piece
                                        </th>
                                        {activeDisciplineData.lines[0]?.traits.map((t) => (
                                            <th 
                                                key={t.trait_id} 
                                                className="py-3.5 px-2.5 text-[11px] font-cinzel font-bold uppercase tracking-wider text-center text-[#e0d8c3] border-l border-[#2a2c33]/50"
                                                title={TRAIT_DESCRIPTIONS[t.trait_name] || t.trait_name}
                                            >
                                                {t.trait_name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2c33]/50">
                                    {activeDisciplineData.lines.map((line) => {
                                        const completedInLine = line.traits.filter(t => t.research_status === "COMPLETED").length;
                                        return (
                                            <tr key={line.equipment_type} className="hover:bg-[#181822]/60 transition-colors">
                                                {/* Line Header & Progress */}
                                                <td className="py-3 px-4 font-cinzel">
                                                    <div className="font-bold text-sm text-[#e0d8c3]">
                                                        {line.equipment_type}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                        {completedInLine}/9 Known ({Math.round((completedInLine / 9) * 100)}%)
                                                    </div>
                                                </td>

                                                {/* 9 Trait Interactive Cells */}
                                                {line.traits.map((t) => {
                                                    const status = t.research_status; // "UNKNOWN", "RESEARCHING", "COMPLETED"
                                                    const cellKey = `${line.equipment_type}_${t.trait_id}`;
                                                    const isToggling = togglingKey === cellKey;
                                                    const marketFodder = matchLookup[cellKey];

                                                    let cellBg = "bg-[#0d0d12]/50 hover:bg-[#1b1b26]";
                                                    let statusIcon = null;
                                                    let statusBadge = "text-red-400";

                                                    if (status === "COMPLETED") {
                                                        cellBg = "bg-emerald-950/25 border-emerald-500/40 hover:bg-emerald-900/35";
                                                        statusIcon = <Check className="size-4 text-emerald-400 mx-auto" />;
                                                        statusBadge = "text-emerald-400";
                                                    } else if (status === "RESEARCHING") {
                                                        cellBg = "bg-amber-950/30 border-amber-500/40 hover:bg-amber-900/40 animate-pulse";
                                                        statusIcon = <Clock className="size-4 text-amber-400 mx-auto" />;
                                                        statusBadge = "text-amber-400";
                                                    } else {
                                                        statusIcon = <span className="size-2 rounded-full bg-red-500/50 block mx-auto" />;
                                                    }

                                                    return (
                                                        <td 
                                                            key={t.trait_id} 
                                                            className={`py-2 px-1 text-center border-l border-[#2a2c33]/40 cursor-pointer transition-all relative select-none ${cellBg}`}
                                                            onClick={() => handleToggleTrait(line.equipment_type, t.trait_id, status)}
                                                            title={`Click to cycle status: ${line.equipment_type} — ${t.trait_name} (${status})\n${TRAIT_DESCRIPTIONS[t.trait_name] || ''}`}
                                                        >
                                                            <div className="flex flex-col items-center justify-center min-h-[44px]">
                                                                {isToggling ? (
                                                                    <RefreshCw className="size-3.5 animate-spin text-[#c5a059]" />
                                                                ) : (
                                                                    <>
                                                                        {statusIcon}
                                                                        <span className={`text-[9px] font-cinzel font-bold mt-1 uppercase ${statusBadge}`}>
                                                                            {status === "COMPLETED" ? "Known" : status === "RESEARCHING" ? "Cooking" : "Missing"}
                                                                        </span>
                                                                    </>
                                                                )}

                                                                {/* Market Fodder Price Indicator for Missing Traits */}
                                                                {status === "UNKNOWN" && marketFodder && (
                                                                    <span 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigate(`/marketplace?search=${encodeURIComponent(line.equipment_type)}`);
                                                                        }}
                                                                        className="mt-1 px-1.5 py-0.5 rounded-none bg-[#c5a059]/20 border border-[#c5a059]/40 text-[#e6c278] text-[8px] font-mono font-bold hover:bg-[#c5a059] hover:text-black transition-colors"
                                                                        title={`Lowest Kiosk Price: ${marketFodder.cheapest_listing.price}g @ ${marketFodder.cheapest_listing.location}`}
                                                                    >
                                                                        {marketFodder.cheapest_listing.price}g
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}

export default TraitTracker;

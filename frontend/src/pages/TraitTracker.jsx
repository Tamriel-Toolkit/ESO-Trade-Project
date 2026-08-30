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
import { EsoTooltip } from "@/components/ui/tooltip";

const DISCIPLINE_CONFIG = {
    "Blacksmithing": {
        name: "Blacksmithing",
        icon: <Hammer className="size-4 text-orange-400" />,
        badgeColor: "text-orange-400 border-orange-500/40 bg-orange-950/20",
        description: "Weapons & Heavy Armor lines (14 total)"
    },
    "Clothier": {
        name: "Clothier",
        icon: <Scissors className="size-4 text-emerald-400" />,
        badgeColor: "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
        description: "Light & Medium Armor lines (14 total)"
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

const getDisciplineGroups = (disciplineName, lines) => {
    if (!lines || lines.length === 0) return [];

    if (disciplineName === "Blacksmithing") {
        const weaponTypes = ["axe", "mace", "sword", "battle axe", "battleaxe", "maul", "greatsword", "dagger"];
        const weapons = lines.filter(l => weaponTypes.includes(l.equipment_type.toLowerCase()));
        const heavyArmor = lines.filter(l => !weaponTypes.includes(l.equipment_type.toLowerCase()));

        return [
            {
                title: "Weapons",
                icon: <Sword className="size-4 text-[#c5a059]" />,
                lines: weapons
            },
            {
                title: "Heavy Armor",
                icon: <Shield className="size-4 text-[#c5a059]" />,
                lines: heavyArmor
            }
        ];
    }

    if (disciplineName === "Clothier") {
        const lightArmorTypes = ["robe", "jerkin", "robe & jerkin", "shoes", "gloves", "hat", "breeches", "epaulets", "sash"];
        const light = lines.filter(l => lightArmorTypes.includes(l.equipment_type.toLowerCase()));
        const medium = lines.filter(l => !lightArmorTypes.includes(l.equipment_type.toLowerCase()));

        return [
            {
                title: "Light Armor",
                icon: <Sparkles className="size-4 text-[#c5a059]" />,
                lines: light
            },
            {
                title: "Medium Armor",
                icon: <Shield className="size-4 text-[#c5a059]" />,
                lines: medium
            }
        ];
    }

    if (disciplineName === "Woodworking") {
        const bowStaff = lines.filter(l => l.equipment_type.toLowerCase() !== "shield");
        const shields = lines.filter(l => l.equipment_type.toLowerCase() === "shield");

        return [
            {
                title: "Bows & Staves",
                icon: <Zap className="size-4 text-[#c5a059]" />,
                lines: bowStaff
            },
            {
                title: "Shields",
                icon: <Shield className="size-4 text-[#c5a059]" />,
                lines: shields
            }
        ];
    }

    // Single-group disciplines (Jewelry Crafting) do not render subheaders or dividers
    return [
        {
            title: null,
            icon: null,
            lines: lines
        }
    ];
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

/**
 * Generates a clean marketplace navigation URL using structured category, subcategory, and trait filters
 * instead of raw keyword substring searches.
 */
export function getMarketplaceUrlForTrait(craftingType, equipmentType, traitName) {
    const params = new URLSearchParams();
    params.set("view", "listings");
    if (traitName) params.set("trait", traitName);

    const eqLower = (equipmentType || "").toLowerCase();
    const craftLower = (craftingType || "").toLowerCase();

    if (craftLower.includes("blacksmith")) {
        if (["axe", "mace", "sword", "dagger"].includes(eqLower)) {
            params.set("category", "Weapon");
            params.set("subcategory", equipmentType);
        } else if (eqLower === "battle axe") {
            params.set("category", "Weapon");
            params.set("subcategory", "Two Handed Axe");
        } else if (eqLower === "maul") {
            params.set("category", "Weapon");
            params.set("subcategory", "Two Handed Mace");
        } else if (eqLower === "greatsword") {
            params.set("category", "Weapon");
            params.set("subcategory", "Two Handed Sword");
        } else {
            // Heavy Armor pieces (Cuirass, Helm, Pauldrons, Gauntlets, Girdle, Greaves, Sabatons)
            params.set("category", "Armor");
            params.set("subcategory", "Heavy Armor");
        }
    } else if (craftLower.includes("clothier")) {
        if (["robe", "jerkin", "hat", "epaulets", "gloves", "sash", "breeches", "shoes"].includes(eqLower)) {
            params.set("category", "Armor");
            params.set("subcategory", "Light Armor");
        } else {
            // Medium Armor pieces (Jack, Helmet, Arm Cops, Bracers, Belt, Guards, Boots)
            params.set("category", "Armor");
            params.set("subcategory", "Medium Armor");
        }
    } else if (craftLower.includes("woodwork")) {
        if (eqLower === "bow") {
            params.set("category", "Weapon");
            params.set("subcategory", "Bow");
        } else if (eqLower.includes("staff") || eqLower.includes("staves")) {
            if (eqLower.includes("restoration") || eqLower.includes("resto")) {
                params.set("category", "Weapon");
                params.set("subcategory", "Restoration Staff");
            } else {
                params.set("category", "Weapon");
                params.set("subcategory", "Destruction Staff");
            }
        } else if (eqLower === "shield") {
            params.set("category", "Armor");
        }
    } else if (craftLower.includes("jewelry")) {
        params.set("category", "Other");
    }

    return `/marketplace?${params.toString()}`;
}

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

            {/* Header Banner */}
            <header className="w-full border-b border-[#2a2c33] bg-[#121218] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 shadow-xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-cinzel text-2xl md:text-3xl font-extrabold tracking-wide text-[#e0d8c3] flex items-center gap-2 uppercase">
                            <Hammer className="size-7 text-[#c5a059]" />
                            <span>Trait Research Tracker</span>
                        </h1>
                        <p className="text-[#a89f91] text-xs md:text-sm mt-1">
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
                            <strong className="text-[#e0d8c3] font-cinzel">Automated In-Game Sync:</strong> Character trait research is read directly from your game client via the <code className="text-[#e6c278] bg-black/40 px-1 py-0.5 border border-[#2a2c33]">ESOTrade</code> addon and desktop watcher.
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
                                                    onClick={() => navigate(getMarketplaceUrlForTrait(m.crafting_type, m.equipment_type, m.trait_name))}
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
                                            >
                                                <EsoTooltip 
                                                    title={t.trait_name} 
                                                    content={TRAIT_DESCRIPTIONS[t.trait_name] || "Standard Crafting Trait"}
                                                    side="top"
                                                >
                                                    <span className="cursor-help inline-block">{t.trait_name}</span>
                                                </EsoTooltip>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2c33]/50">
                                    {getDisciplineGroups(activeDisciplineData.crafting_type, activeDisciplineData.lines).map((group, groupIdx) => {
                                        const groupTotalKnown = group.lines.reduce((acc, l) => acc + l.traits.filter(t => t.research_status === "COMPLETED").length, 0);
                                        const groupTotalTraits = group.lines.length * 9;
                                        const groupPercent = groupTotalTraits > 0 ? Math.round((groupTotalKnown / groupTotalTraits) * 100) : 0;

                                        return (
                                            <React.Fragment key={group.title || `group_${groupIdx}`}>
                                                {/* Section Header Divider (only for disciplines with divisions like Blacksmithing, Clothier, Woodworking) */}
                                                {group.title && (
                                                    <tr className="bg-[#14141d] border-y border-[#2a2c33]">
                                                        <td 
                                                            colSpan={(activeDisciplineData.lines[0]?.traits?.length || 9) + 1}
                                                            className="py-2.5 px-4 font-cinzel text-xs font-bold uppercase tracking-wider text-[#c5a059] bg-[#161622]"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    {group.icon}
                                                                    <span>{group.title}</span>
                                                                </div>
                                                                <span className="text-[11px] font-mono text-[#8a8275] normal-case font-medium">
                                                                    {groupTotalKnown}/{groupTotalTraits} Known ({groupPercent}%)
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}

                                                {/* Individual Equipment Line Rows */}
                                                {group.lines.map((line) => {
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

                                                            {/* 9 Trait Status Cells */}
                                                            {line.traits.map((t) => {
                                                                const status = t.research_status; // "UNKNOWN", "RESEARCHING", "COMPLETED"
                                                                const cellKey = `${line.equipment_type}_${t.trait_id}`;
                                                                const marketFodder = matchLookup[cellKey];

                                                                let cellBg = "bg-[#0d0d12]/50";
                                                                let statusIcon = null;
                                                                let statusBadge = "text-red-400";

                                                                if (status === "COMPLETED") {
                                                                    cellBg = "bg-emerald-950/25 border-emerald-500/40";
                                                                    statusIcon = <Check className="size-4 text-emerald-400 mx-auto" />;
                                                                    statusBadge = "text-emerald-400";
                                                                } else if (status === "RESEARCHING") {
                                                                    cellBg = "bg-amber-950/30 border-amber-500/40 animate-pulse";
                                                                    statusIcon = <Clock className="size-4 text-amber-400 mx-auto" />;
                                                                    statusBadge = "text-amber-400";
                                                                } else {
                                                                    statusIcon = <span className="size-2 rounded-full bg-red-500/50 block mx-auto" />;
                                                                }

                                                                const cellTooltipTitle = `${line.equipment_type} — ${t.trait_name}`;
                                                                const cellTooltipDesc = status === "COMPLETED" 
                                                                    ? `Researched on this character. ${TRAIT_DESCRIPTIONS[t.trait_name] || ""}`
                                                                    : status === "RESEARCHING"
                                                                        ? `Currently researching at crafting station. ${TRAIT_DESCRIPTIONS[t.trait_name] || ""}`
                                                                        : marketFodder
                                                                            ? `Missing trait. Cheapest kiosk deal: ${marketFodder.cheapest_listing.price.toLocaleString()}g @ ${marketFodder.cheapest_listing.location}. Click to buy.`
                                                                            : `Missing trait. Click to search Marketplace. ${TRAIT_DESCRIPTIONS[t.trait_name] || ""}`;

                                                                const marketUrl = getMarketplaceUrlForTrait(activeDisciplineData.crafting_type, line.equipment_type, t.trait_name);

                                                                return (
                                                                    <td 
                                                                        key={t.trait_id} 
                                                                        className={`py-2 px-1 text-center border-l border-[#2a2c33]/40 select-none ${cellBg}`}
                                                                    >
                                                                        <EsoTooltip title={cellTooltipTitle} content={cellTooltipDesc} side="top">
                                                                            <div className="flex flex-col items-center justify-center min-h-[44px] cursor-pointer">
                                                                                {statusIcon}
                                                                                <span className={`text-[9px] font-cinzel font-bold mt-1 uppercase ${statusBadge}`}>
                                                                                    {status === "COMPLETED" ? "Known" : status === "RESEARCHING" ? "In Progress" : "Missing"}
                                                                                </span>

                                                                                {/* Search Market / Fodder Price Button for UNKNOWN Traits */}
                                                                                {status === "UNKNOWN" && (
                                                                                    marketFodder ? (
                                                                                        <button 
                                                                                            onClick={() => navigate(marketUrl)}
                                                                                            className="mt-1 px-1.5 py-0.5 rounded-none bg-[#c5a059]/20 border border-[#c5a059]/40 text-[#e6c278] text-[8px] font-mono font-bold hover:bg-[#c5a059] hover:text-black transition-colors cursor-pointer flex items-center gap-0.5"
                                                                                        >
                                                                                            <span>{marketFodder.cheapest_listing.price.toLocaleString()}g</span>
                                                                                        </button>
                                                                                    ) : (
                                                                                        <button 
                                                                                            onClick={() => navigate(marketUrl)}
                                                                                            className="mt-1 px-1.5 py-0.5 rounded-none bg-[#161620] border border-[#2a2c33] hover:border-[#c5a059] text-[#a89f91] hover:text-[#d4af37] text-[8px] font-cinzel font-bold transition-all cursor-pointer flex items-center gap-0.5 shadow-sm"
                                                                                        >
                                                                                            <Search className="size-2.5" />
                                                                                            <span>Market</span>
                                                                                        </button>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        </EsoTooltip>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
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

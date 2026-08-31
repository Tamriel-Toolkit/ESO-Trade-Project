import { useEffect, useState, useMemo } from "react";
import {
  Search,
  X,
  Tag,
  Store,
  MapPin,
  Sparkles,
  Zap,
  Trash2,
  Layers,
  Copy,
  Check,
  DollarSign,
  Compass,
  Clock,
  Bookmark
} from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { EsoTooltip } from "@/components/ui/tooltip";

import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";

import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/ui/navbar";
import SavedSearchesCard, { PinnedSearchChips } from "@/components/SavedSearchesCard";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import {
  fetchTaxonomy,
  fetchMarketListings,
  extractLiveListings,
  clearAllListings,
  fetchSavedSearches,
  createSavedSearch,
  setSavedSearchPinned,
  deleteSavedSearch
} from "@/api/api";
import { cleanEsoText, renderEsoFormattedText, getEsoIconUrl } from "@/lib/utils";

const DEAL_THRESHOLD = 1.2;
const LISTING_SORT_VALUES = new Set([
  "value_index",
  "trait_asc",
  "trait_desc",
  "rarity_desc",
  "rarity_asc",
  "price_asc",
  "price_desc",
  "newest",
]);

const RARITY_MAP = {
  1: { label: "Normal", color: "border-gray-600 text-gray-300 bg-gray-900/40" },
  2: { label: "Fine", color: "border-green-600 text-green-400 bg-green-950/40" },
  3: { label: "Superior", color: "border-blue-600 text-blue-400 bg-blue-950/40" },
  4: { label: "Epic", color: "border-purple-600 text-purple-400 bg-purple-950/40" },
  5: { label: "Legendary", color: "border-[#c5a059] text-[#d4af37] bg-amber-950/40" },
};

const ESO_TRAIT_NAMES = {
  0: "None",
  1: "Powered", 2: "Charged", 3: "Precise", 4: "Infused", 5: "Defending",
  6: "Training", 7: "Sharpened", 8: "Decisive", 9: "Intricate", 10: "Ornate",
  11: "Sturdy", 12: "Impenetrable", 13: "Reinforced", 14: "Well-Fitted", 15: "Training",
  16: "Infused", 17: "Invigorating", 18: "Divines", 19: "Intricate", 20: "Ornate",
  21: "Healthy", 22: "Arcane", 23: "Robust", 24: "Intricate", 25: "Nirnhoned",
  26: "Nirnhoned", 27: "Ornate", 28: "Protective", 29: "Swift", 30: "Triune",
  31: "Bloodthirsty", 32: "Harmony", 33: "Swift", 34: "Protective", 35: "Infused"
};

// Major Tamriel Trading Hub Capitals
const MAJOR_TRADE_HUBS = [
  { name: "All Hubs", location: "" },
  { name: "Mournhold (Deshaan)", location: "Deshaan" },
  { name: "Wayrest (Stormhaven)", location: "Stormhaven" },
  { name: "Elden Root (Grahtwood)", location: "Grahtwood" },
  { name: "Vivec City (Vvardenfell)", location: "Vvardenfell" },
  { name: "Belkarth (Craglorn)", location: "Craglorn" },
  { name: "Rawl'kha (Reaper's March)", location: "Reaper's March" },
  { name: "Alinor (Summerset)", location: "Summerset" },
  { name: "Leyawiin (Blackwood)", location: "Blackwood" },
  { name: "Skingrad (West Weald)", location: "West Weald" }
];

// Popular ESO Trade Filter Presets (Structured filters — zero manual text search input)
const POPULAR_SEARCH_PRESETS = [
  { label: "Gold Tempers", category: "Materials", subcategory: "Upgrade Temper", rarity: "5" },
  { label: "Clothier Mats", category: "Materials", subcategory: "Clothier" },
  { label: "Blacksmith Mats", category: "Materials", subcategory: "Blacksmithing" },
  { label: "Woodworking Mats", category: "Materials", subcategory: "Woodworking" },
  { label: "Alchemy Reagents", category: "Materials", subcategory: "Alchemy" },
  { label: "Enchanting Runes", category: "Materials", subcategory: "Enchanting" },
  { label: "Provisioning Mats", category: "Materials", subcategory: "Provisioning" },
  { label: "Jewelry Crafting", category: "Materials", subcategory: "Jewelry Crafting" },
  { label: "Crafting Motifs", category: "Consumables", subcategory: "Motif" },
  { label: "Master Writs", category: "Consumables", subcategory: "Master Writ" },
  { label: "Furnishing Plans", category: "Consumables", subcategory: "Recipe / Plan" },
  { label: "Glyphs", category: "Glyphs" }
];

const formatLastSeen = (timestamp) => {
  if (!timestamp) return "Recently";
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  if (isNaN(diffMs) || diffMs < 0) return "Just now";

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};

function Marketplace() {
  const { serverLocation, setServerLocation, platform, setPlatform } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State Management
  const [taxonomy, setTaxonomy] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get("subcategory") || "");
  const [selectedTrait, setSelectedTrait] = useState(searchParams.get("trait") || "");
  const [selectedRarity, setSelectedRarity] = useState(searchParams.get("rarity") || "");
  const [selectedHubLocation, setSelectedHubLocation] = useState(searchParams.get("location") || "");
  const [selectedMaxAge, setSelectedMaxAge] = useState("");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortOption, setSortOption] = useState(() => {
    const requestedSort = searchParams.get("sort");
    return LISTING_SORT_VALUES.has(requestedSort) ? requestedSort : "value_index";
  });
  const [dealsOnly, setDealsOnly] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchesLoading, setSavedSearchesLoading] = useState(false);
  const [savedSearchesMutating, setSavedSearchesMutating] = useState(false);
  const [savedSearchMessage, setSavedSearchMessage] = useState(null);
  const [savedSearchDrawerOpen, setSavedSearchDrawerOpen] = useState(false);
  const [savedSearchRunId, setSavedSearchRunId] = useState(0);

  // Sync URL search parameters on change
  useEffect(() => {
    const q = searchParams.get("search");
    const t = searchParams.get("trait");
    const cat = searchParams.get("category");
    const subcat = searchParams.get("subcategory");
    const srt = searchParams.get("sort");
    if (q !== null && q !== undefined) setSearchQuery(q);
    if (t !== null && t !== undefined) setSelectedTrait(t);
    if (cat !== null && cat !== undefined) setSelectedCategory(cat);
    if (subcat !== null && subcat !== undefined) setSelectedSubcategory(subcat);
    if (srt !== null && srt !== undefined && LISTING_SORT_VALUES.has(srt)) setSortOption(srt);
    setCurrentPage(1);
  }, [searchParams]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Data & Selection State
  const [itemsData, setItemsData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch Taxonomy on Mount
  useEffect(() => {
    fetchTaxonomy().then((data) => {
      if (data) setTaxonomy(data);
    });
  }, []);

  const currentSavedSearchFilters = useMemo(() => ({
    server: serverLocation,
    platform,
    view: "listings",
    search: searchQuery,
    category: selectedCategory,
    subcategory: selectedSubcategory,
    trait: selectedTrait,
    rarity: selectedRarity,
    location: selectedHubLocation,
    max_age: selectedMaxAge,
    sort: sortOption,
    deals_only: dealsOnly,
  }), [
    serverLocation,
    platform,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedTrait,
    selectedRarity,
    selectedHubLocation,
    selectedMaxAge,
    sortOption,
    dealsOnly,
  ]);

  useEffect(() => {
    let isActive = true;
    if (!user?.id) {
      setSavedSearches([]);
      setSavedSearchMessage(null);
      return undefined;
    }

    setSavedSearchesLoading(true);
    fetchSavedSearches().then((result) => {
      if (!isActive) return;
      if (result.success) {
        setSavedSearches(result.saved_searches || []);
      } else {
        setSavedSearchMessage({ type: "error", text: result.error || "Unable to load saved searches." });
      }
      setSavedSearchesLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!savedSearchDrawerOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") setSavedSearchDrawerOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [savedSearchDrawerOpen]);

  // Fetch Market Data when filters/server/page change
  useEffect(() => {
    setIsLoading(true);
    const offset = (currentPage - 1) * itemsPerPage;

    const params = {
      server: serverLocation,
      limit: itemsPerPage,
      offset: offset,
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(selectedSubcategory && { subcategory: selectedSubcategory }),
      ...(selectedTrait && { trait: selectedTrait }),
      ...(selectedRarity && { rarity: selectedRarity }),
      ...(selectedHubLocation && { location: selectedHubLocation }),
      ...(selectedMaxAge && { max_age: selectedMaxAge }),
      ...(sortOption && { sort: sortOption }),
    };

    if (dealsOnly) params.min_value_index = DEAL_THRESHOLD;
    let isActive = true;
    fetchMarketListings(params).then((res) => {
      if (isActive) {
        setItemsData(res.listings || []);
        setTotalItems(res.total || 0);
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [
    serverLocation,
    selectedCategory,
    selectedSubcategory,
    selectedTrait,
    selectedRarity,
    selectedHubLocation,
    selectedMaxAge,
    searchQuery,
    sortOption,
    dealsOnly,
    currentPage,
    savedSearchRunId,
  ]);

  // Derived subcategories list based on selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory || !taxonomy[selectedCategory]) return [];
    return taxonomy[selectedCategory];
  }, [selectedCategory, taxonomy]);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const formatGold = (num) => {
    if (num === null || num === undefined) return "N/A";
    return num.toLocaleString() + "g";
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedTrait("");
    setSelectedRarity("");
    setSelectedHubLocation("");
    setSelectedMaxAge("");
    setSearchQuery("");
    setSortOption("value_index");
    setDealsOnly(false);
    setCurrentPage(1);
    setSelectedItem(null);
  };

  const handleSaveSearch = async (name) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/marketplace' } } });
      return false;
    }

    setSavedSearchesMutating(true);
    setSavedSearchMessage(null);
    const trimmedName = name.trim();
    const hasActiveCriteria = Boolean(
      currentSavedSearchFilters.search ||
      currentSavedSearchFilters.category ||
      currentSavedSearchFilters.subcategory ||
      currentSavedSearchFilters.trait ||
      currentSavedSearchFilters.rarity ||
      currentSavedSearchFilters.location ||
      currentSavedSearchFilters.max_age ||
      currentSavedSearchFilters.deals_only ||
      currentSavedSearchFilters.sort !== "value_index"
    );
    const filtersToSave = {
      ...currentSavedSearchFilters,
      search: hasActiveCriteria ? currentSavedSearchFilters.search : trimmedName,
    };
    const result = await createSavedSearch(trimmedName, filtersToSave);
    if (result.success && result.saved_search) {
      setSavedSearches((current) => [result.saved_search, ...current]);
      if (!hasActiveCriteria) {
        setSearchQuery(trimmedName);
        setCurrentPage(1);
        setSelectedItem(null);
        setSavedSearchRunId((current) => current + 1);
      }
      setSavedSearchMessage({
        type: "success",
        text: !hasActiveCriteria
          ? `Saved and searched for “${result.saved_search.name}”.`
          : `Saved “${result.saved_search.name}”.`,
      });
      setSavedSearchesMutating(false);
      return true;
    }

    setSavedSearchMessage({ type: "error", text: result.error || "Unable to save this search." });
    setSavedSearchesMutating(false);
    return false;
  };

  const handleApplySavedSearch = (savedSearch) => {
    const filters = savedSearch.filter_params || {};
    const hasStoredCriteria = Boolean(
      filters.search ||
      filters.category ||
      filters.subcategory ||
      filters.trait ||
      filters.rarity ||
      filters.location ||
      filters.max_age ||
      filters.deals_only ||
      (filters.sort && filters.sort !== "value_index" && filters.sort !== "suggested_desc")
    );
    const nextSearch = filters.search || (hasStoredCriteria ? "" : savedSearch.name);
    setServerLocation(filters.server === "EU" ? "EU" : "NA");
    setPlatform(["PC", "Xbox", "PlayStation"].includes(filters.platform) ? filters.platform : "PC");
    setSearchQuery(nextSearch);
    setSelectedCategory(filters.category || "");
    setSelectedSubcategory(filters.subcategory || "");
    setSelectedTrait(filters.trait || "");
    setSelectedRarity(filters.rarity || "");
    setSelectedHubLocation(filters.location || "");
    setSelectedMaxAge(filters.max_age || "");
    setSortOption(LISTING_SORT_VALUES.has(filters.sort) ? filters.sort : "value_index");
    setDealsOnly(filters.deals_only === true);
    setCurrentPage(1);
    setSelectedItem(null);
    setSavedSearchRunId((current) => current + 1);
    setSavedSearchDrawerOpen(false);
    setSavedSearchMessage({ type: "success", text: `Applied “${savedSearch.name}”.` });
  };

  const handleToggleSavedSearchPin = async (savedSearch) => {
    setSavedSearchesMutating(true);
    setSavedSearchMessage(null);
    const result = await setSavedSearchPinned(savedSearch.id, !savedSearch.is_pinned);
    if (result.success && result.saved_search) {
      setSavedSearches((current) => current
        .map((search) => search.id === savedSearch.id ? result.saved_search : search)
        .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.id - a.id));
      setSavedSearchMessage({
        type: "success",
        text: `${result.saved_search.is_pinned ? "Pinned" : "Unpinned"} “${result.saved_search.name}”.`,
      });
    } else {
      setSavedSearchMessage({ type: "error", text: result.error || "Unable to update this saved search." });
    }
    setSavedSearchesMutating(false);
  };

  const handleDeleteSavedSearch = async (savedSearch) => {
    if (!window.confirm(`Delete the saved search “${savedSearch.name}”?`)) return;
    setSavedSearchesMutating(true);
    setSavedSearchMessage(null);
    const result = await deleteSavedSearch(savedSearch.id);
    if (result.success) {
      setSavedSearches((current) => current.filter((search) => search.id !== savedSearch.id));
      setSavedSearchMessage({ type: "success", text: `Deleted “${savedSearch.name}”.` });
    } else {
      setSavedSearchMessage({ type: "error", text: result.error || "Unable to delete this saved search." });
    }
    setSavedSearchesMutating(false);
  };

  const savedSearchesCardProps = {
    user,
    searches: savedSearches,
    isLoading: savedSearchesLoading,
    isMutating: savedSearchesMutating,
    message: savedSearchMessage,
    onSave: handleSaveSearch,
    onApply: handleApplySavedSearch,
    onTogglePin: handleToggleSavedSearchPin,
    onDelete: handleDeleteSavedSearch,
    onLogin: () => navigate('/login', { state: { from: { pathname: '/marketplace' } } }),
  };

  const handleClearListings = async () => {
    if (window.confirm("⚠️ DEVELOPMENT ACTION:\nAre you sure you want to clear all market listings and price entries from the database?")) {
      setIsLoading(true);
      const res = await clearAllListings();
      if (res && res.success) {
        alert("✅ All market listings and price records have been cleared!");
        setCurrentPage(1);
        setItemsData([]);
        setTotalItems(0);
      } else {
        alert("❌ Failed to clear listings: " + (res?.error || "Unknown error"));
      }
      setIsLoading(false);
    }
  };

  const copyInGameCommand = (itemName) => {
    const cleanName = cleanEsoText(itemName);
    const text = `/script TradingHouseSearch("${cleanName}")`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-[#e0d8c3] flex flex-col">
      <Navbar />

      {/* Header Banner (Full-width edge-to-edge) */}
      <header className="w-full border-b border-[#2a2c33] bg-[#121218] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="font-cinzel text-2xl md:text-3xl font-extrabold tracking-wide text-[#e0d8c3] flex items-center gap-2 uppercase">
              <Store className="size-7 text-[#c5a059]" />
              <span>Live Guild Trader Listings</span>
            </h1>
            <p className="text-[#a89f91] text-xs md:text-sm mt-1">
              Real-time market analytics, active guild trader listings, and deal intelligence for{" "}
              <span className="font-semibold text-[#d4af37] font-mono">{platform} - {serverLocation}</span>.
            </p>
          </div>

          {/* Action Controls & Dev Tools */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Development: Clear Listings (Visible for dev testing) */}
            {user?.role === "admin" && (
              <EsoTooltip content="Development: Clear all active listings and price records from SQLite database" side="bottom">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearListings}
                  className="rounded-none gap-1.5 font-bold text-xs border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 hover:border-red-600 transition-all cursor-pointer"
                >
                  <Trash2 className="size-3.5 text-red-400" />
                  <span>[DEV] Clear Listings</span>
                </Button>
              </EsoTooltip>
            )}

            <div className="flex h-9 items-center gap-2 border border-[#c5a059]/50 bg-[#c5a059]/10 px-4 text-xs font-cinzel font-semibold uppercase tracking-wider text-[#d4af37]">
              <Tag className="size-3.5" />
              <span>Active Listings ({totalItems.toLocaleString()})</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Quick Selectors Bar: Major Trading Hubs & Popular Trade Presets */}
        <div className="p-3 bg-[#121218] border border-[#2a2c33] shadow flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Major Trading Hub Selector */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-cinzel text-[#c5a059] font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 shrink-0">
                <Compass className="size-3.5" /> Trading Hub:
              </span>
              <NativeSelect
                value={selectedHubLocation}
                onChange={(e) => {
                  const loc = e.target.value;
                  setSelectedHubLocation(loc);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3] text-xs h-9"
              >
                <NativeSelectOption value="">All Trading Hubs</NativeSelectOption>
                <NativeSelectOptGroup label="Major Capital Hubs">
                  {MAJOR_TRADE_HUBS.filter(h => h.location).map((hub) => (
                    <NativeSelectOption key={hub.name} value={hub.location}>
                      {hub.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelectOptGroup>
              </NativeSelect>
            </div>

            {/* Popular Trade Presets Selector */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-cinzel text-[#c5a059] font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 shrink-0">
                <Sparkles className="size-3.5" /> Popular Trades:
              </span>
              <NativeSelect
                value={
                  POPULAR_SEARCH_PRESETS.find(p => 
                    selectedCategory === (p.category || "") &&
                    selectedSubcategory === (p.subcategory || "") &&
                    selectedRarity === (p.rarity || "") &&
                    !searchQuery
                  )?.label || ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const preset = POPULAR_SEARCH_PRESETS.find(p => p.label === val);
                  if (preset) {
                    setSelectedCategory(preset.category || "");
                    setSelectedSubcategory(preset.subcategory || "");
                    setSelectedRarity(preset.rarity || "");
                  } else {
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                    setSelectedRarity("");
                  }
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3] text-xs h-9"
              >
                <NativeSelectOption value="">Popular Trade Presets...</NativeSelectOption>
                <NativeSelectOptGroup label="Quick Trade Presets">
                  {POPULAR_SEARCH_PRESETS.map((preset) => (
                    <NativeSelectOption key={preset.label} value={preset.label}>
                      {preset.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelectOptGroup>
              </NativeSelect>
            </div>
          </div>

          {(selectedHubLocation || (selectedCategory && POPULAR_SEARCH_PRESETS.some(p => p.category === selectedCategory))) && (
            <button
              onClick={() => {
                setSelectedHubLocation("");
                setSelectedCategory("");
                setSelectedSubcategory("");
                setSelectedRarity("");
                setCurrentPage(1);
              }}
              className="text-xs font-cinzel text-[#a89f91] hover:text-[#e0d8c3] underline shrink-0 cursor-pointer self-end md:self-center"
            >
              Clear Quick Filters
            </button>
          )}
        </div>

      {/* Control Bar: Search & Select Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 mb-6 p-4 bg-[#121218] border border-[#2a2c33] shadow-lg">
        {/* Search Bar Input */}
        <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-2 xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8a8275]" />
          <input
            type="text"
            placeholder="Search items by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 h-10 bg-[#0a0a0d] border border-[#2a2c33] text-[#e0d8c3] text-sm focus:border-[#c5a059] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a8275] hover:text-[#e0d8c3]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Category NativeSelect */}
        <NativeSelect
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSubcategory("");
            setCurrentPage(1);
          }}
          className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3]"
        >
          <NativeSelectOption value="">All Categories</NativeSelectOption>
          <NativeSelectOptGroup label="Categories">
            {Object.keys(taxonomy).map((cat) => (
              <NativeSelectOption key={cat} value={cat}>
                {cat}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        </NativeSelect>

        {/* Subcategory NativeSelect */}
        <NativeSelect
          value={selectedSubcategory}
          onChange={(e) => {
            setSelectedSubcategory(e.target.value);
            setCurrentPage(1);
          }}
          disabled={availableSubcategories.length === 0}
          className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3]"
        >
          <NativeSelectOption value="">
            {availableSubcategories.length > 0 ? "All Subcategories" : "Subcategory"}
          </NativeSelectOption>
          {availableSubcategories.length > 0 && (
            <NativeSelectOptGroup label="Subcategories">
              {availableSubcategories.map((sub) => (
                <NativeSelectOption key={sub} value={sub}>
                  {sub}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          )}
        </NativeSelect>

        {/* Trait NativeSelect */}
        <NativeSelect
          value={selectedTrait}
          onChange={(e) => {
            setSelectedTrait(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3]"
        >
          <NativeSelectOption value="">All Traits</NativeSelectOption>
          <NativeSelectOptGroup label="Weapon Traits">
            <NativeSelectOption value="Powered">Powered (Healing)</NativeSelectOption>
            <NativeSelectOption value="Charged">Charged (Status Effects)</NativeSelectOption>
            <NativeSelectOption value="Precise">Precise (Crit Chance)</NativeSelectOption>
            <NativeSelectOption value="Infused">Infused (Enchantment)</NativeSelectOption>
            <NativeSelectOption value="Defending">Defending (Armor)</NativeSelectOption>
            <NativeSelectOption value="Training">Training (XP)</NativeSelectOption>
            <NativeSelectOption value="Sharpened">Sharpened (Penetration)</NativeSelectOption>
            <NativeSelectOption value="Decisive">Decisive (Ultimate)</NativeSelectOption>
            <NativeSelectOption value="Nirnhoned">Nirnhoned (Damage)</NativeSelectOption>
            <NativeSelectOption value="Intricate">Intricate (Inspiration)</NativeSelectOption>
            <NativeSelectOption value="Ornate">Ornate (Gold)</NativeSelectOption>
          </NativeSelectOptGroup>
          <NativeSelectOptGroup label="Armor Traits">
            <NativeSelectOption value="Divines">Divines (Mundus Stone)</NativeSelectOption>
            <NativeSelectOption value="Impenetrable">Impenetrable (Crit Resist)</NativeSelectOption>
            <NativeSelectOption value="Infused">Infused (Enchantment)</NativeSelectOption>
            <NativeSelectOption value="Invigorating">Invigorating (Recovery)</NativeSelectOption>
            <NativeSelectOption value="Reinforced">Reinforced (Armor Rating)</NativeSelectOption>
            <NativeSelectOption value="Sturdy">Sturdy (Block Cost)</NativeSelectOption>
            <NativeSelectOption value="Training">Training (XP)</NativeSelectOption>
            <NativeSelectOption value="Well-Fitted">Well-Fitted (Roll/Sprint)</NativeSelectOption>
            <NativeSelectOption value="Nirnhoned">Nirnhoned (Armor)</NativeSelectOption>
            <NativeSelectOption value="Intricate">Intricate (Inspiration)</NativeSelectOption>
            <NativeSelectOption value="Ornate">Ornate (Gold)</NativeSelectOption>
          </NativeSelectOptGroup>
          <NativeSelectOptGroup label="Jewelry Traits">
            <NativeSelectOption value="Arcane">Arcane (Max Magicka)</NativeSelectOption>
            <NativeSelectOption value="Bloodthirsty">Bloodthirsty (Execute Damage)</NativeSelectOption>
            <NativeSelectOption value="Harmony">Harmony (Synergies)</NativeSelectOption>
            <NativeSelectOption value="Healthy">Healthy (Max Health)</NativeSelectOption>
            <NativeSelectOption value="Infused">Infused (Enchantment)</NativeSelectOption>
            <NativeSelectOption value="Protective">Protective (Armor)</NativeSelectOption>
            <NativeSelectOption value="Robust">Robust (Max Stamina)</NativeSelectOption>
            <NativeSelectOption value="Swift">Swift (Speed)</NativeSelectOption>
            <NativeSelectOption value="Triune">Triune (Tri-Stat)</NativeSelectOption>
            <NativeSelectOption value="Intricate">Intricate (Inspiration)</NativeSelectOption>
            <NativeSelectOption value="Ornate">Ornate (Gold)</NativeSelectOption>
          </NativeSelectOptGroup>
        </NativeSelect>

        {/* Rarity NativeSelect */}
        <NativeSelect
          value={selectedRarity}
          onChange={(e) => {
            setSelectedRarity(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3]"
        >
          <NativeSelectOption value="">Any Quality</NativeSelectOption>
          <NativeSelectOptGroup label="Rarity">
            {Object.entries(RARITY_MAP).map(([key, val]) => (
              <NativeSelectOption key={key} value={key}>
                {val.label}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        </NativeSelect>

        {/* Time Since Last Seen NativeSelect */}
        <NativeSelect
          value={selectedMaxAge}
          onChange={(e) => {
            setSelectedMaxAge(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3]"
        >
          <NativeSelectOption value="">Last Seen: Any Time</NativeSelectOption>
          <NativeSelectOptGroup label="Scan Recency Scale">
            <NativeSelectOption value="1">⏱️ Last 24 Hours</NativeSelectOption>
            <NativeSelectOption value="3">⏱️ Last 3 Days</NativeSelectOption>
            <NativeSelectOption value="7">⏱️ Last 7 Days</NativeSelectOption>
            <NativeSelectOption value="14">⏱️ Last 14 Days</NativeSelectOption>
            <NativeSelectOption value="30">⏱️ Last 30 Days</NativeSelectOption>
          </NativeSelectOptGroup>
        </NativeSelect>

        {/* Sort Option NativeSelect */}
        <NativeSelect
          value={sortOption}
          onChange={(e) => {
            setSortOption(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3]"
        >
          <NativeSelectOptGroup label="Sort By">
            <NativeSelectOption value="value_index">🔥 Best Value Deals</NativeSelectOption>
            <NativeSelectOption value="trait_asc">Trait: A → Z</NativeSelectOption>
            <NativeSelectOption value="trait_desc">Trait: Z → A</NativeSelectOption>
            <NativeSelectOption value="rarity_desc">Rarity: Legendary → Normal</NativeSelectOption>
            <NativeSelectOption value="rarity_asc">Rarity: Normal → Legendary</NativeSelectOption>
            <NativeSelectOption value="price_asc">Price: Low to High</NativeSelectOption>
            <NativeSelectOption value="price_desc">Price: High to Low</NativeSelectOption>
            <NativeSelectOption value="newest">Recently Discovered</NativeSelectOption>
          </NativeSelectOptGroup>
        </NativeSelect>
      </div>

      {user && (
        <PinnedSearchChips searches={savedSearches} onApply={handleApplySavedSearch} />
      )}

      {/* Filter Quick Tags & Deals Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSavedSearchDrawerOpen(true)}
            className="rounded-none border-[#c5a059]/40 bg-[#161620] text-[#d4af37] lg:hidden"
          >
            <Bookmark className="size-3.5" />
            Saved Searches{savedSearches.length ? ` (${savedSearches.length})` : ""}
          </Button>

          <Button
            variant={dealsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setDealsOnly(!dealsOnly);
              setCurrentPage(1);
            }}
            className={`rounded-none gap-1.5 font-semibold text-xs border ${
              dealsOnly ? "bg-[#c5a059] text-[#0a0a0d] border-[#c5a059]" : "border-[#c5a059]/40 text-[#d4af37] bg-[#161620]"
            }`}
          >
            <Sparkles className="size-3.5 text-[#c5a059]" />
            <span>Only Bargain Deals (1.2x+ Value)</span>
          </Button>

          {(selectedCategory || selectedSubcategory || selectedTrait || selectedRarity || selectedHubLocation || selectedMaxAge || searchQuery || dealsOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="rounded-none text-xs text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620] gap-1"
            >
              <X className="size-3" />
              <span>Reset Filters</span>
            </Button>
          )}
        </div>

        <div className="text-xs text-[#8a8275] font-mono">
          Page <span className="font-bold text-[#d4af37]">{currentPage}</span> of{" "}
          <span className="font-bold text-[#d4af37]">{totalPages}</span> ({totalItems} total results)
        </div>
      </div>

      {savedSearchDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Saved searches">
          <button
            type="button"
            onClick={() => setSavedSearchDrawerOpen(false)}
            aria-label="Close saved searches"
            className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(90vw,24rem)] overflow-y-auto border-r border-[#c5a059]/40 bg-[#0a0a0d] p-3 shadow-2xl">
            <SavedSearchesCard
              {...savedSearchesCardProps}
              onClose={() => setSavedSearchDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main Grid & Detail Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <aside className="hidden lg:col-span-1 lg:block lg:self-start lg:sticky lg:top-4">
          <SavedSearchesCard {...savedSearchesCardProps} />
        </aside>

        {/* Active Listings Grid */}
        <div className={selectedItem ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
          {isLoading ? (
            <div className="eso-card flex flex-col items-center justify-center p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c5a059] mb-3"></div>
              <p className="text-xs font-cinzel text-[#a89f91] tracking-wider uppercase">Loading Tamriel Market Intelligence...</p>
            </div>
          ) : itemsData.length === 0 ? (
            <div className="eso-card flex flex-col items-center justify-center p-12 text-center">
              <Store className="size-12 text-[#c5a059]/60 mb-3" />
              <h3 className="font-cinzel text-xl font-bold text-[#e0d8c3] mb-1">
                {searchQuery ? `No Active Listings Found for "${searchQuery}"` : "No Guild Trader Scans Logged"}
              </h3>
              <p className="text-xs text-[#a89f91] max-w-lg mb-4 leading-relaxed">
                {searchQuery
                  ? `Click below to trigger a live search scan across ESO guild traders for "${searchQuery}".`
                  : "No authentic guild trader listings match these filters yet. Load in-game ESOTrade scans or adjust the filters to search the active listing feed."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {searchQuery && (
                  <Button
                    variant="default"
                    onClick={async () => {
                      setIsLoading(true);
                      const res = await extractLiveListings(searchQuery, serverLocation);
                      if (res.listings) {
                        setItemsData(res.listings);
                        setTotalItems(res.count || res.listings.length);
                      }
                      setIsLoading(false);
                    }}
                    className="rounded-none gap-2 font-cinzel font-bold bg-[#c5a059] text-[#0a0a0d] hover:bg-[#d4af37]"
                  >
                    <Zap className="size-4" />
                    <span>Fetch Live Market Scans for "{searchQuery}"</span>
                  </Button>
                )}
                {(selectedCategory || selectedSubcategory || selectedTrait || selectedRarity || selectedHubLocation || searchQuery) && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters} className="rounded-none">
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
              {itemsData.map((item, idx) => {
                const isSelected = selectedItem && (
                  (item.listing_id && selectedItem.listing_id === item.listing_id) ||
                  (item.game_item_id && selectedItem.game_item_id === item.game_item_id && !item.listing_id)
                );
                const rarityInfo = RARITY_MAP[item.quality || item.item_rarity] || RARITY_MAP[1];
                const cleanName = cleanEsoText(item.item_name);
                const itemTrait = item.trait_name || (item.trait_id && ESO_TRAIT_NAMES[item.trait_id] && ESO_TRAIT_NAMES[item.trait_id] !== "None" ? ESO_TRAIT_NAMES[item.trait_id] : null);

                return (
                  <Card
                    key={item.listing_id || `${item.game_item_id}-${idx}`}
                    onClick={() => setSelectedItem(item)}
                    className={`eso-card rounded-none cursor-pointer transition-all duration-200 hover:border-[#c5a059]/80 border-l-4 ${rarityInfo.color.split(" ")[0]} ${
                      isSelected ? "border-[#c5a059] bg-[#c5a059]/10" : ""
                    }`}
                  >
                    <CardHeader className="p-4 pb-2 border-b border-[#2a2c33]/50 bg-[#161620]/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {getEsoIconUrl(item.item_icon) ? (
                            <img
                              src={getEsoIconUrl(item.item_icon)}
                              alt={cleanName}
                              className="size-10 rounded-none border border-[#2a2c33] object-contain bg-[#0a0a0d] p-1"
                              onError={(e) => (e.target.style.display = "none")}
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-10 rounded-none border border-[#2a2c33] bg-[#0a0a0d] flex items-center justify-center font-cinzel font-bold text-xs text-[#c5a059]">
                              ESO
                            </div>
                          )}
                          <div>
                            <CardTitle className="font-cinzel text-sm font-bold text-[#e0d8c3] line-clamp-1">
                              {cleanName}
                            </CardTitle>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-none font-bold uppercase tracking-wider border ${rarityInfo.color}`}>
                                {rarityInfo.label}
                              </span>
                              {itemTrait && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-none font-bold uppercase tracking-wider border border-amber-500/40 bg-amber-950/30 text-amber-300">
                                  {itemTrait}
                                </span>
                              )}
                              <span className="text-[11px] text-[#8a8275]">
                                {item.item_category} {item.item_subcategory ? `• ${item.item_subcategory}` : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Value Index Badge */}
                        {item.value_index && item.value_index >= DEAL_THRESHOLD && (
                          <span className="shrink-0 bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-[11px] px-2 py-0.5 font-bold flex items-center gap-1">
                            <Zap className="size-3 fill-emerald-400" />
                            {item.value_index.toFixed(1)}x Deal
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between border-t border-[#2a2c33]/40 pt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#a89f91]">Unit Price:</span>
                            <span className="bg-[#161620] text-[#d4af37] font-mono font-bold px-1.5 py-0.5 text-[10px] border border-[#2a2c33]">
                              x{item.quantity || 1}/stack
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-base text-[#c5a059] block font-mono">
                              {formatGold(item.price)}
                              <span className="text-[10px] text-[#8a8275] font-normal ml-0.5">/ea</span>
                            </span>
                            <span className="text-[10px] text-[#8a8275] block font-mono">
                              Total/stack: {formatGold((item.price || 0) * (item.quantity || 1))}
                            </span>
                          </div>
                        </div>

                        {/* Smart Seller Inventory & Stacks Badge */}
                        <div className="flex items-center justify-between text-xs bg-[#0a0a0d] border border-[#2a2c33] px-2.5 py-1.5 mt-2">
                          <div className="flex items-center gap-1.5 font-semibold text-[#d4af37]">
                            <Layers className="size-3.5 text-[#c5a059] shrink-0" />
                            <span>
                              {(item.active_stacks || 1) > 1
                                ? `📦 ${item.active_stacks} Stacks Available (${((item.quantity || 1) * item.active_stacks).toLocaleString()} total)`
                                : `1 Stack Available (${item.quantity || 1} total)`}
                            </span>
                          </div>
                          <EsoTooltip content={`Seller Account: ${item.seller_name || "@Unknown"}`} side="top">
                            <span className="font-mono text-[#a89f91] text-[11px] truncate max-w-[110px] cursor-default">
                              {item.seller_name || "@Unknown"}
                            </span>
                          </EsoTooltip>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#a89f91]">Suggested Value:</span>
                          <span className="font-medium text-[#d4af37] font-mono">
                            {formatGold(item.suggested_price)}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Guild Trader Name, Location, & Last Seen Marker */}
                      <div className="flex items-center justify-between text-[11px] text-[#8a8275] pt-2 mt-2 border-t border-[#2a2c33]/40 gap-1">
                        <EsoTooltip content={`Guild Trader: ${item.guild_name || "Active Guild Trader"}`} side="top">
                          <span className="flex items-center gap-1.5 truncate max-w-[120px] cursor-default">
                            <Store className="size-3.5 text-[#c5a059] shrink-0" />
                            <span className="truncate font-semibold text-[#e0d8c3]">{item.guild_name || "Guild Trader"}</span>
                          </span>
                        </EsoTooltip>
                        <EsoTooltip content={`Location: ${item.location || "Tamriel Guild Trader"}`} side="top">
                          <span className="flex items-center gap-1.5 truncate max-w-[110px] cursor-default">
                            <MapPin className="size-3.5 text-[#d4af37] shrink-0" />
                            <span className="truncate font-semibold text-[#d4af37]">{item.location || "Tamriel Guild Trader"}</span>
                          </span>
                        </EsoTooltip>
                        {(() => {
                          const scanDate = item.discovered_at || item.updated_at;
                          const isItemStale = scanDate && ((new Date() - new Date(scanDate)) / (1000 * 3600 * 24) > 7);
                          const scanTooltip = `Last Seen Scan: ${scanDate ? new Date(scanDate).toLocaleString() : 'Recent scan'}${isItemStale ? ' (Stale >7d old)' : ''}`;
                          return (
                            <EsoTooltip content={scanTooltip} side="top">
                              <span
                                className={`flex items-center gap-1 shrink-0 font-mono text-[10px] px-1.5 py-0.5 border cursor-default ${
                                  isItemStale
                                    ? "border-amber-500/50 bg-amber-950/60 text-amber-400"
                                    : "border-[#2a2c33] bg-[#0a0a0d] text-[#38bdf8]"
                                }`}
                              >
                                <Clock className={`size-3 shrink-0 ${isItemStale ? 'text-amber-400' : 'text-[#38bdf8]'}`} />
                                <span className="font-semibold">{isItemStale ? `⚠️ Stale (${formatLastSeen(scanDate)})` : formatLastSeen(scanDate || item.created_at)}</span>
                              </span>
                            </EsoTooltip>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Item Detail Sidebar */}
        {selectedItem && (
          <div className="lg:col-span-1">
            <Card className="eso-card rounded-none sticky top-4 border-2 border-[#c5a059]/60 shadow-2xl">
              <CardHeader className="p-4 pb-2 border-b border-[#2a2c33] bg-[#161620]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getEsoIconUrl(selectedItem.item_icon) && (
                      <img
                        src={getEsoIconUrl(selectedItem.item_icon)}
                        alt={cleanEsoText(selectedItem.item_name)}
                        className="size-12 rounded-none border border-[#c5a059]/40 p-1 bg-[#0a0a0d] object-contain"
                        onError={(e) => (e.target.style.display = "none")}
                        loading="lazy"
                      />
                    )}
                    <div>
                      <CardTitle className="font-cinzel text-base font-bold text-[#e0d8c3]">
                        {cleanEsoText(selectedItem.item_name)}
                      </CardTitle>
                      <CardDescription className="text-xs text-[#8a8275] font-mono">
                        ID: {selectedItem.game_item_id} • {selectedItem.item_category}
                        {(selectedItem.trait_name || (selectedItem.trait_id && ESO_TRAIT_NAMES[selectedItem.trait_id] && ESO_TRAIT_NAMES[selectedItem.trait_id] !== "None")) && (
                          <span className="ml-2 text-amber-300 font-bold font-cinzel">
                            • Trait: {selectedItem.trait_name || ESO_TRAIT_NAMES[selectedItem.trait_id]}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedItem(null)}
                    aria-label="Close detail panel"
                    className="rounded-none text-[#a89f91] hover:text-[#e0d8c3]"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Price & Flipping Profit Intelligence */}
                <div className="space-y-2 p-3 bg-[#0a0a0d] border border-[#2a2c33]">
                  <span className="font-cinzel font-bold uppercase tracking-wider text-[10px] text-[#c5a059] block flex items-center justify-between">
                    <span>Market Valuation ({serverLocation})</span>
                    <DollarSign className="size-3 text-[#c5a059]" />
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-sm font-bold font-mono">
                    <div>
                      <span className="text-[#8a8275] text-xs font-normal block font-sans">Suggested</span>
                      <span className="text-[#c5a059]">{formatGold(selectedItem.suggested_price)}</span>
                    </div>
                    <div>
                      <span className="text-[#8a8275] text-xs font-normal block font-sans">Average</span>
                      <span className="text-[#e0d8c3]">{formatGold(selectedItem.avg_price)}</span>
                    </div>
                  </div>

                  {/* Flipping Profit Calculator */}
                  {selectedItem.price && selectedItem.suggested_price && (
                    <div className="pt-2 border-t border-[#2a2c33] space-y-1 text-xs">
                      {(() => {
                        const netResale = Math.round(selectedItem.suggested_price * 0.93); // 7% ESO guild listing tax
                        const estProfit = netResale - selectedItem.price;
                        const marginPct = Math.round((estProfit / selectedItem.price) * 100);
                        const isLucrative = estProfit > 0;

                        return (
                          <div className={`p-2 border ${isLucrative ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300' : 'border-amber-900/40 bg-amber-950/20 text-[#d4af37]'}`}>
                            <div className="flex items-center justify-between font-cinzel font-bold text-[11px] uppercase">
                              <span>Est. Flip Margin (after 7% tax):</span>
                              <span className={isLucrative ? 'text-emerald-400 font-mono' : 'text-[#d4af37] font-mono'}>
                                {estProfit > 0 ? `+${estProfit.toLocaleString()}g` : `${estProfit.toLocaleString()}g`}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#a89f91] mt-0.5 flex justify-between font-mono">
                              <span>Return on Investment:</span>
                              <span>{marginPct > 0 ? `+${marginPct}%` : `${marginPct}%`} ROI</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedItem.price && (
                    <div className="pt-2 border-t border-[#2a2c33] space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[#a89f91] font-sans">Stack Quantity:</span>
                        <span className="font-bold text-[#d4af37] bg-[#161620] px-2 py-0.5 text-xs border border-[#2a2c33]">
                          {selectedItem.quantity || 1} units
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#a89f91] font-sans">Unit Price:</span>
                        <span className="font-semibold text-[#e0d8c3]">{formatGold(selectedItem.price)} / ea</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[#a89f91] font-semibold font-sans">Total Listing Price:</span>
                        <span className="font-extrabold text-base text-emerald-400">
                          {formatGold(selectedItem.price * (selectedItem.quantity || 1))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Always Render Trader Name, Location & Last Seen Scan Marker */}
                <div className="space-y-2 p-3 bg-[#0a0a0d] border border-[#2a2c33]">
                  <span className="font-cinzel font-bold uppercase tracking-wider text-[10px] text-[#c5a059] block flex items-center justify-between">
                    <span>Guild Trader Details</span>
                    <Store className="size-3.5 text-[#c5a059]" />
                  </span>
                  <div className="flex items-center gap-2">
                    <Store className="size-4 text-[#c5a059] shrink-0" />
                    <span className="font-semibold text-[#e0d8c3]">{selectedItem.guild_name || "Active Guild Trader"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#d4af37] font-semibold">
                    <MapPin className="size-4 shrink-0" />
                    <span>{selectedItem.location || "Tamriel Guild Trader"}</span>
                  </div>
                  {(() => {
                    const scanDate = selectedItem.discovered_at || selectedItem.updated_at;
                    const isStale = scanDate && ((new Date() - new Date(scanDate)) / (1000 * 3600 * 24) > 7);
                    return (
                      <div className={`pt-2 border-t border-[#2a2c33]/60 flex items-center justify-between text-xs font-mono ${isStale ? 'text-amber-400' : ''}`}>
                        <span className="text-[#a89f91] flex items-center gap-1.5 font-sans">
                          <Clock className={`size-3.5 shrink-0 ${isStale ? 'text-amber-400' : 'text-[#38bdf8]'}`} />
                          <span>Last Seen Scan:</span>
                        </span>
                        <span className={`font-bold ${isStale ? 'text-amber-400' : 'text-[#38bdf8]'}`}>
                          {isStale ? `⚠️ Stale (${formatLastSeen(scanDate)})` : formatLastSeen(scanDate || selectedItem.created_at)}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Clean ESO Formatted Metadata Details */}
                {selectedItem.item_metadata && (
                  <div className="space-y-2">
                    {selectedItem.item_metadata.set && (
                      <div className="p-3 bg-[#0a0a0d] border border-[#2a2c33]">
                        <span className="font-cinzel font-bold text-xs text-[#d4af37] block mb-1">
                          Set: {cleanEsoText(selectedItem.item_metadata.set.name)}
                        </span>
                        <ul className="space-y-1 text-[11px] text-[#a89f91] pl-2 border-l border-[#c5a059]/40">
                          {selectedItem.item_metadata.set.bonuses?.slice(0, 5).map((bonus, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              • {renderEsoFormattedText(bonus)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedItem.item_metadata.trait_description && (
                      <div className="p-2.5 bg-[#0a0a0d] border border-[#2a2c33]">
                        <span className="font-cinzel font-bold text-xs block text-[#c5a059] mb-1 uppercase tracking-wider">
                          Trait Description
                        </span>
                        <p className="text-[11px] text-[#e0d8c3] leading-relaxed">
                          {renderEsoFormattedText(selectedItem.item_metadata.trait_description)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 pt-0 border-t border-[#2a2c33] mt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyInGameCommand(selectedItem.item_name)}
                  className="w-full rounded-none font-cinzel font-semibold border-[#2a2c33] bg-[#161620] text-[#e0d8c3] hover:border-[#c5a059]/50 hover:bg-[#1f1f2e] text-xs gap-1.5"
                >
                  {copiedLink ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-[#c5a059]" />}
                  <span>{copiedLink ? "Copied In-Game Search Cmd!" : "Copy In-Game Search Command"}</span>
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (!user) {
                      navigate('/login', { state: { from: { pathname: '/marketplace' } } });
                    } else {
                      navigate('/characters');
                    }
                  }}
                  className="w-full rounded-none font-cinzel font-bold bg-[#c5a059] text-[#0a0a0d] hover:bg-[#d4af37] uppercase tracking-wider cursor-pointer"
                >
                  Track in Watchlist
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="mt-auto pt-6 border-t border-[#2a2c33] flex items-center justify-center">
        <Pagination>
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={`rounded-none border border-[#2a2c33] bg-[#121218] text-[#e0d8c3] ${
                  currentPage === 1 ? "pointer-events-none opacity-40" : "cursor-pointer hover:border-[#c5a059]/60"
                }`}
              />
            </PaginationItem>

            <PaginationItem>
              <PaginationLink className="rounded-none border border-[#c5a059] bg-[#c5a059]/10 text-[#d4af37] font-bold font-mono">
                {currentPage}
              </PaginationLink>
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className={`rounded-none border border-[#2a2c33] bg-[#121218] text-[#e0d8c3] ${
                  currentPage >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer hover:border-[#c5a059]/60"
                }`}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      </main>
    </div>
  );
}

export default Marketplace;

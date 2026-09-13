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
  fetchCatalogItems,
  clearAllListings,
  fetchSavedSearches,
  createSavedSearch,
  setSavedSearchPinned,
  deleteSavedSearch
} from "@/api/api";
import { cleanEsoText, renderEsoFormattedText, getEsoIconUrl } from "@/lib/utils";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import "@/styles/marketplace.css";

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
  5: { label: "Legendary", color: "border-primary text-primary bg-amber-950/40" },
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
  const [viewMode, setViewMode] = useState(searchParams.get("view") === "catalog" ? "catalog" : "listings");
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
  const [savedSearchError, setSavedSearchError] = useState("");
  const [savedSearchDrawerOpen, setSavedSearchDrawerOpen] = useState(false);
  const [savedSearchRunId, setSavedSearchRunId] = useState(0);
  const savedSearchPanelRef = useDialogFocus(savedSearchDrawerOpen, () => setSavedSearchDrawerOpen(false));

  // Sync URL search parameters on change
  useEffect(() => {
    const q = searchParams.get("search");
    const t = searchParams.get("trait");
    const cat = searchParams.get("category");
    const subcat = searchParams.get("subcategory");
    const srt = searchParams.get("sort");
    const requestedView = searchParams.get("view");
    if (q !== null && q !== undefined) setSearchQuery(q);
    if (t !== null && t !== undefined) setSelectedTrait(t);
    if (cat !== null && cat !== undefined) setSelectedCategory(cat);
    if (subcat !== null && subcat !== undefined) setSelectedSubcategory(subcat);
    if (srt !== null && srt !== undefined && LISTING_SORT_VALUES.has(srt)) setSortOption(srt);
    if (requestedView) setViewMode(requestedView === "catalog" ? "catalog" : "listings");
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
    view: viewMode,
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
    viewMode,
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
      setSavedSearchError("");
      return undefined;
    }

    setSavedSearchesLoading(true);
    fetchSavedSearches().then((result) => {
      if (!isActive) return;
      if (result.success) {
        setSavedSearches(result.saved_searches || []);
      } else {
        setSavedSearchError(result.error || "Unable to load saved searches.");
      }
      setSavedSearchesLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  // Fetch either native listing observations or the full item catalog.
  useEffect(() => {
    setIsLoading(true);
    const offset = (currentPage - 1) * itemsPerPage;

    const params = {
      limit: itemsPerPage,
      offset: offset,
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(selectedSubcategory && { subcategory: selectedSubcategory }),
      ...(selectedRarity && { rarity: selectedRarity }),
    };

    if (viewMode === "listings") {
      params.server = serverLocation;
      if (selectedTrait) params.trait = selectedTrait;
      if (selectedHubLocation) params.location = selectedHubLocation;
      if (selectedMaxAge) params.max_age = selectedMaxAge;
      if (sortOption) params.sort = sortOption;
      if (dealsOnly) params.min_value_index = DEAL_THRESHOLD;
    }

    let isActive = true;
    const request = viewMode === "catalog" ? fetchCatalogItems(params) : fetchMarketListings(params);
    request.then((res) => {
      if (isActive) {
        const rows = viewMode === "catalog"
          ? (res.items || []).map((item) => ({
              ...item,
              item_name: item.name,
              item_icon: item.icon_url || item.icon,
              item_category: item.category,
              item_subcategory: item.subcategory,
              item_rarity: item.rarity,
            }))
          : (res.listings || []);
        setItemsData(rows);
        setTotalItems(res.total || 0);
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [
    serverLocation,
    viewMode,
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
    setSavedSearchError("");
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
      setSavedSearchesMutating(false);
      return true;
    }

    setSavedSearchError(result.error || "Unable to save this search.");
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
    setViewMode(filters.view === "catalog" ? "catalog" : "listings");
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
  };

  const handleToggleSavedSearchPin = async (savedSearch) => {
    setSavedSearchesMutating(true);
    setSavedSearchError("");
    const result = await setSavedSearchPinned(savedSearch.id, !savedSearch.is_pinned);
    if (result.success && result.saved_search) {
      setSavedSearches((current) => current
        .map((search) => search.id === savedSearch.id ? result.saved_search : search)
        .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.id - a.id));
    } else {
      setSavedSearchError(result.error || "Unable to update this saved search.");
    }
    setSavedSearchesMutating(false);
  };

  const handleDeleteSavedSearch = async (savedSearch) => {
    if (!window.confirm(`Delete the saved search “${savedSearch.name}”?`)) return;
    setSavedSearchesMutating(true);
    setSavedSearchError("");
    const result = await deleteSavedSearch(savedSearch.id);
    if (result.success) {
      setSavedSearches((current) => current.filter((search) => search.id !== savedSearch.id));
    } else {
      setSavedSearchError(result.error || "Unable to delete this saved search.");
    }
    setSavedSearchesMutating(false);
  };

  const savedSearchesCardProps = {
    user,
    searches: savedSearches,
    isLoading: savedSearchesLoading,
    isMutating: savedSearchesMutating,
    error: savedSearchError,
    onSave: handleSaveSearch,
    onApply: handleApplySavedSearch,
    onTogglePin: handleToggleSavedSearchPin,
    onDelete: handleDeleteSavedSearch,
    onLogin: () => navigate('/login', { state: { from: { pathname: '/marketplace' } } }),
  };

  const handleClearListings = async () => {
    if (window.confirm("⚠️ DEVELOPMENT ACTION:\nAre you sure you want to clear all native market listings from the database?")) {
      setIsLoading(true);
      const res = await clearAllListings();
      if (res && res.success) {
        alert("✅ All native market listings have been cleared!");
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
    <div className="exchange-page exchange-marketplace">
      <Navbar />

      {/* Header Banner (Full-width edge-to-edge) */}
      <header className="exchange-container">
        <div className="exchange-page-heading">
          <div>
            <p className="exchange-eyebrow"><Store className="size-4" /> {platform} · {serverLocation}</p>
            <h1>
              {viewMode === "catalog" ? "Item catalog" : "Marketplace"}
            </h1>
            <p>
              {viewMode === "catalog"
                ? "Explore ESO items, traits, and sets."
                : "Find the item. Compare the offers. Visit the trader."}
            </p>
          </div>

          {/* Action Controls & Dev Tools */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="exchange-market-tabs" role="group" aria-label="Marketplace view">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "listings" ? "default" : "ghost"}
                aria-pressed={viewMode === "listings"}
                onClick={() => { setViewMode("listings"); setCurrentPage(1); setSelectedItem(null); }}
                className="rounded-none"
              >
                Guild traders
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "catalog" ? "default" : "ghost"}
                aria-pressed={viewMode === "catalog"}
                onClick={() => { setViewMode("catalog"); setCurrentPage(1); setSelectedItem(null); }}
                className="rounded-none"
              >
                Item catalog
              </Button>
            </div>
            {/* Development: Clear Listings (Visible for dev testing) */}
            {viewMode === "listings" && user?.role === "admin" && (
              <EsoTooltip content="Development: Clear all native listing observations from SQLite" side="bottom">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearListings}
                  className="rounded-none gap-1.5 font-bold text-xs border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 hover:border-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3.5 text-red-400" />
                  <span>[DEV] Clear Listings</span>
                </Button>
              </EsoTooltip>
            )}

            <div className="exchange-market-count">
              <Tag className="size-3.5" />
              <span>{totalItems.toLocaleString()} {viewMode === "catalog" ? (totalItems === 1 ? "catalog item" : "catalog items") : (totalItems === 1 ? "listing" : "listings")}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body Container */}
      <main className="exchange-container exchange-market-workspace">
        <aside className="exchange-market-saved">
          <SavedSearchesCard {...savedSearchesCardProps} />
        </aside>
        <div className="exchange-market-main">
        <section className="exchange-market-refine" aria-label="Find items">
          <div className="exchange-market-search">
            <Search className="size-5 text-primary" aria-hidden="true" />
            <input type="search" aria-label="Search items by name" placeholder="Search items by name"
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
            {searchQuery && <button type="button" aria-label="Clear item search" onClick={() => setSearchQuery("")}><X className="size-4" /></button>}
          </div>
        {/* Quick Selectors Bar: Major Trading Hubs & Popular Trade Presets */}
        {viewMode === "listings" && (
        <div className="exchange-market-quick">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Major Trading Hub Selector */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-sans text-primary font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0">
                <Compass className="size-3.5" /> Trading hub
              </span>
              <NativeSelect aria-label="Trading hub"
                value={selectedHubLocation}
                onChange={(e) => {
                  const loc = e.target.value;
                  setSelectedHubLocation(loc);
                  setCurrentPage(1);
                }}
                className="w-full bg-recess border-border text-foreground text-xs h-9"
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
              <span className="text-xs font-sans text-primary font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0">
                <Sparkles className="size-3.5" /> Popular trades
              </span>
              <NativeSelect aria-label="Popular trades"
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
                className="w-full bg-recess border-border text-foreground text-xs h-9"
              >
                <NativeSelectOption value="">All trades</NativeSelectOption>
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
              className="text-xs font-sans text-muted-foreground hover:text-foreground underline shrink-0 cursor-pointer self-end md:self-center"
            >
              Clear quick filters
            </button>
          )}
        </div>
        )}

      {/* Control Bar: Search & Select Filters */}
      <div className="exchange-market-filters">
        {/* Search Bar Input */}

        {/* Category NativeSelect */}
        <label className="exchange-field">
          <span>Category</span>
        <NativeSelect aria-label="Category"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSubcategory("");
            setCurrentPage(1);
          }}
          className="w-full bg-recess border-border text-foreground"
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
        </label>

        {/* Subcategory NativeSelect */}
        <label className="exchange-field">
          <span>Subcategory</span>
        <NativeSelect aria-label="Subcategory"
          value={selectedSubcategory}
          onChange={(e) => {
            setSelectedSubcategory(e.target.value);
            setCurrentPage(1);
          }}
          disabled={availableSubcategories.length === 0}
          className="w-full bg-recess border-border text-foreground"
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
        </label>

        {/* Trait NativeSelect */}
        {viewMode === "listings" && (
        <label className="exchange-field">
          <span>Trait</span>
        <NativeSelect aria-label="Trait"
          value={selectedTrait}
          onChange={(e) => {
            setSelectedTrait(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-recess border-border text-foreground"
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
        </label>
        )}

        {/* Rarity NativeSelect */}
        <label className="exchange-field">
          <span>Quality</span>
        <NativeSelect aria-label="Quality"
          value={selectedRarity}
          onChange={(e) => {
            setSelectedRarity(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-recess border-border text-foreground"
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
        </label>

        {/* Time Since Last Seen NativeSelect */}
        {viewMode === "listings" && (
        <>
        <label className="exchange-field">
          <span>Last seen</span>
        <NativeSelect aria-label="Last seen"
          value={selectedMaxAge}
          onChange={(e) => {
            setSelectedMaxAge(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-recess border-border text-foreground"
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
        </label>

        {/* Sort Option NativeSelect */}
        <label className="exchange-field">
          <span>Sort by</span>
        <NativeSelect aria-label="Sort listings"
          value={sortOption}
          onChange={(e) => {
            setSortOption(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-recess border-border text-foreground"
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
        </label>
        </>
        )}
      </div>

      </section>
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
            className="rounded-none border-primary/40 bg-secondary text-primary lg:hidden"
          >
            <Bookmark className="size-3.5" />
            Saved Searches{savedSearches.length ? ` (${savedSearches.length})` : ""}
          </Button>

          {viewMode === "listings" && (
          <Button
            variant={dealsOnly ? "default" : "outline"}
            aria-pressed={dealsOnly}
            size="sm"
            onClick={() => {
              setDealsOnly(!dealsOnly);
              setCurrentPage(1);
            }}
            className={`rounded-none gap-1.5 font-semibold text-xs border ${
              dealsOnly ? "bg-primary text-recess border-primary" : "border-primary/40 text-primary bg-secondary"
            }`}
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>Deals only · 1.2x+ value</span>
          </Button>
          )}

          {(selectedCategory || selectedSubcategory || selectedTrait || selectedRarity || selectedHubLocation || selectedMaxAge || searchQuery || dealsOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="rounded-none text-xs text-muted-foreground hover:text-foreground hover:bg-secondary gap-1"
            >
              <X className="size-3" />
              <span>Reset Filters</span>
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground tabular-nums" role="status">
          Page <span className="font-bold text-primary">{currentPage}</span> of{" "}
          <span className="font-bold text-primary">{totalPages}</span> ({totalItems} total results)
        </div>
      </div>

      {savedSearchDrawerOpen && (
        <div className="fixed inset-0 z-70" role="dialog" aria-modal="true" aria-label="Saved searches">
          <button
            type="button"
            onClick={() => setSavedSearchDrawerOpen(false)}
            aria-label="Close saved searches"
            className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
          />
          <aside ref={savedSearchPanelRef} tabIndex={-1} className="absolute inset-y-0 left-0 w-[min(90vw,24rem)] overflow-y-auto border-r border-primary/40 bg-recess p-3 shadow-2xl">
            <SavedSearchesCard
              {...savedSearchesCardProps}
              onClose={() => setSavedSearchDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main Grid & Detail Sidebar Layout */}
      <div className={`exchange-market-results ${selectedItem ? "has-selection" : ""}`}>

        {/* Active Listings Grid */}
        <div className="min-w-0 space-y-4">
          {isLoading ? (
            <div className="eso-card flex flex-col items-center justify-center p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
              <p className="text-sm text-muted-foreground" role="status">Loading items…</p>
            </div>
          ) : itemsData.length === 0 ? (
            <div className="eso-card flex flex-col items-center justify-center p-12 text-center">
              <Store className="size-12 text-primary/60 mb-3" />
              <h3 className="font-sans text-xl font-bold text-foreground mb-1">
                {viewMode === "catalog"
                  ? (searchQuery ? `No Catalog Items Found for "${searchQuery}"` : "No Catalog Items Found")
                  : (searchQuery ? `No Active Listings Found for "${searchQuery}"` : "No Guild Trader Scans Logged")}
              </h3>
              <p className="text-xs text-muted-foreground max-w-lg mb-4 leading-relaxed">
                {viewMode === "catalog"
                  ? "Adjust the catalog filters or run the UESP master catalog ingestion workflow if the local catalog is empty."
                  : "No native guild trader observations match these filters yet. Load an in-game ESOTrade scan or adjust the active listing filters."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {(selectedCategory || selectedSubcategory || selectedTrait || selectedRarity || selectedHubLocation || searchQuery) && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters} className="rounded-none">
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="exchange-listing-grid">
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
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${cleanName}`}
                    aria-expanded={Boolean(isSelected)}
                    aria-controls={isSelected ? "market-item-detail" : undefined}
                    onClick={() => setSelectedItem(item)}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        setSelectedItem(item);
                      }
                    }}
                    className={`exchange-offer ${isSelected ? "is-selected" : ""}`}
                  >
                    <CardHeader className="exchange-offer-heading">
                      <div className={`exchange-offer-icon ${rarityInfo.color.split(" ")[0]}`}>
                        {getEsoIconUrl(item.item_icon) ? (
                          <img src={getEsoIconUrl(item.item_icon)} alt="" loading="lazy"
                            onError={(e) => (e.target.style.display = "none")} />
                        ) : <span>ESO</span>}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="exchange-offer-name">{cleanName}</CardTitle>
                        <div className="exchange-offer-meta">
                          <span className={rarityInfo.color.split(" ")[1]}>{rarityInfo.label}</span>
                          {itemTrait && <span>{itemTrait}</span>}
                          <span>{item.item_category}{item.item_subcategory ? ` · ${item.item_subcategory}` : ""}</span>
                        </div>
                      </div>
                      {/* Value Index Badge */}
                      {item.value_index && item.value_index >= DEAL_THRESHOLD && (
                        <span className="exchange-deal"><Zap className="size-3" />{item.value_index.toFixed(1)}x deal</span>
                      )}
                    </CardHeader>
                    <CardContent className="exchange-offer-content">
                      {viewMode === "listings" ? (
                        <>
                          {/* Smart Seller Inventory & Stacks Badge */}
                          <div className="exchange-offer-quote">
                            <div>
                              <span className="exchange-offer-stacks"><Layers className="size-4" />
                                {(item.active_stacks || 1) > 1 ? `${item.active_stacks} stacks` : "1 stack"}
                              </span>
                              <span className="exchange-offer-secondary">
                                {item.quantity || 1} each · {((item.quantity || 1) * (item.active_stacks || 1)).toLocaleString()} {(item.quantity || 1) * (item.active_stacks || 1) === 1 ? "item" : "items"} total
                              </span>
                            </div>
                            <div className="exchange-offer-price">
                              <span>{formatGold(item.price)} <small>/ item</small></span>
                              <span className="exchange-offer-secondary">{formatGold((item.price || 0) * (item.quantity || 1))} / stack</span>
                            </div>
                          </div>
                          <div className="exchange-offer-average"><span>Observed average</span><span>{formatGold(item.observed_avg_price)} / item</span></div>
                        </>
                      ) : <div className="exchange-offer-average"><span>Catalog ID</span><span>{item.game_item_id}</span></div>}

                      {/* Prominent Guild Trader Name, Location, & Last Seen Marker */}
                      {viewMode === "listings" && (
                        <div className="exchange-offer-trader">
                          <span className="exchange-offer-guild"><Store className="size-3.5" />{item.guild_name || "Guild Trader"}</span>
                          <span className="exchange-offer-seller">{item.seller_name || "@Unknown"}</span>
                          <span className="exchange-offer-location"><MapPin className="size-3.5" />{item.location || "Tamriel Guild Trader"}</span>
                          {(() => {
                            const scanDate = item.discovered_at || item.updated_at;
                            const isItemStale = scanDate && ((new Date() - new Date(scanDate)) / (1000 * 3600 * 24) > 7);
                            const scanTooltip = `Last Seen Scan: ${scanDate ? new Date(scanDate).toLocaleString() : 'Recent scan'}${isItemStale ? ' (Stale >7d old)' : ''}`;
                            return (
                              <EsoTooltip content={scanTooltip} side="top">
                                <span className={`exchange-offer-seen ${isItemStale ? "text-amber-300" : ""}`}>
                                  <Clock className="size-3" />
                                  {isItemStale ? `Stale (${formatLastSeen(scanDate)})` : `Seen ${formatLastSeen(scanDate || item.created_at)}`}
                                </span>
                              </EsoTooltip>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Item Detail Sidebar */}
        {selectedItem && (
          <div className="exchange-market-detail" id="market-item-detail">
            <Card className="exchange-frame">
              <CardHeader className="p-4 pb-2 border-b border-border bg-secondary">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getEsoIconUrl(selectedItem.item_icon) && (
                      <img
                        src={getEsoIconUrl(selectedItem.item_icon)}
                        alt={cleanEsoText(selectedItem.item_name)}
                        className="size-12 rounded-none border border-primary/40 p-1 bg-recess object-contain"
                        onError={(e) => (e.target.style.display = "none")}
                        loading="lazy"
                      />
                    )}
                    <div>
                      <CardTitle className="font-sans text-base font-bold text-foreground">
                        {cleanEsoText(selectedItem.item_name)}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground font-mono">
                        ID: {selectedItem.game_item_id} • {selectedItem.item_category}
                        {Boolean(selectedItem.trait_name || (selectedItem.trait_id && ESO_TRAIT_NAMES[selectedItem.trait_id] && ESO_TRAIT_NAMES[selectedItem.trait_id] !== "None")) && (
                          <span className="ml-2 text-amber-300 font-bold font-sans">
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
                    className="rounded-none text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Native observation summary */}
                {viewMode === "listings" && (
                <div className="space-y-2 p-3 bg-recess border border-border">
                  <span className="font-sans font-bold text-xs text-primary block flex items-center justify-between">
                    <span>Observed prices · {serverLocation}</span>
                    <DollarSign className="size-3 text-primary" />
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-sm font-bold font-mono">
                    <div>
                      <span className="text-muted-foreground text-xs font-normal block font-sans">Observed Average</span>
                      <span className="text-primary">{formatGold(selectedItem.observed_avg_price)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs font-normal block font-sans">Observed Range</span>
                      <span className="text-foreground">{formatGold(selectedItem.observed_min_price)}–{formatGold(selectedItem.observed_max_price)}</span>
                    </div>
                  </div>

                  {/* Flipping Profit Calculator */}
                  {selectedItem.price && selectedItem.observed_avg_price && (
                    <div className="pt-2 border-t border-border space-y-1 text-xs">
                      {(() => {
                        const netResale = Math.round(selectedItem.observed_avg_price * 0.93); // 7% ESO guild listing tax
                        const estProfit = netResale - selectedItem.price;
                        const marginPct = Math.round((estProfit / selectedItem.price) * 100);
                        const isLucrative = estProfit > 0;

                        return (
                          <div className={`p-2 border ${isLucrative ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300' : 'border-amber-900/40 bg-amber-950/20 text-primary'}`}>
                            <div className="flex items-center justify-between font-sans font-bold text-xs ">
                              <span>Est. profit after 7% tax</span>
                              <span className={isLucrative ? 'text-emerald-400 font-mono' : 'text-primary font-mono'}>
                                {estProfit > 0 ? `+${estProfit.toLocaleString()}g` : `${estProfit.toLocaleString()}g`}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex justify-between font-mono">
                              <span>Est. return</span>
                              <span>{marginPct > 0 ? `+${marginPct}%` : `${marginPct}%`} ROI</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedItem.price && (
                    <div className="pt-2 border-t border-border space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-sans">Stack Quantity:</span>
                        <span className="font-bold text-primary bg-secondary px-2 py-0.5 text-xs border border-border">
                          {selectedItem.quantity || 1} units
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-sans">Unit Price:</span>
                        <span className="font-semibold text-foreground">{formatGold(selectedItem.price)} / ea</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-muted-foreground font-semibold font-sans">Total Listing Price:</span>
                        <span className="font-extrabold text-base text-emerald-400">
                          {formatGold(selectedItem.price * (selectedItem.quantity || 1))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* Always Render Trader Name, Location & Last Seen Scan Marker */}
                <div className="space-y-2 p-3 bg-recess border border-border">
                  <span className="font-sans font-bold text-xs text-primary block flex items-center justify-between">
                    <span>Trader details</span>
                    <Store className="size-3.5 text-primary" />
                  </span>
                  <div className="flex items-center gap-2">
                    <Store className="size-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">{selectedItem.guild_name || "Active Guild Trader"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <MapPin className="size-4 shrink-0" />
                    <span>{selectedItem.location || "Tamriel Guild Trader"}</span>
                  </div>
                  {(() => {
                    const scanDate = selectedItem.discovered_at || selectedItem.updated_at;
                    const isStale = scanDate && ((new Date() - new Date(scanDate)) / (1000 * 3600 * 24) > 7);
                    return (
                      <div className={`pt-2 border-t border-border/60 flex items-center justify-between text-xs font-mono ${isStale ? 'text-amber-400' : ''}`}>
                        <span className="text-muted-foreground flex items-center gap-1.5 font-sans">
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
                {(selectedItem.item_metadata?.set || selectedItem.item_metadata?.trait_description) && (
                  <div className="space-y-2">
                    {selectedItem.item_metadata.set && (
                      <div className="p-3 bg-recess border border-border">
                        <span className="font-sans font-bold text-xs text-primary block mb-1">
                          Set: {cleanEsoText(selectedItem.item_metadata.set.name)}
                        </span>
                        <ul className="space-y-1 text-xs text-muted-foreground pl-2 border-l border-primary/40">
                          {selectedItem.item_metadata.set.bonuses?.slice(0, 5).map((bonus, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              • {renderEsoFormattedText(bonus)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedItem.item_metadata.trait_description && (
                      <div className="p-2.5 bg-recess border border-border">
                        <span className="font-sans font-bold text-xs block text-primary mb-1 r">
                          Trait Description
                        </span>
                        <p className="text-xs text-foreground leading-relaxed">
                          {renderEsoFormattedText(selectedItem.item_metadata.trait_description)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 pt-0 border-t border-border mt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyInGameCommand(selectedItem.item_name)}
                  className="w-full rounded-none font-sans font-semibold border-border bg-secondary text-foreground hover:border-primary/50 hover:bg-secondary text-xs gap-1.5"
                >
                  {copiedLink ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-primary" />}
                  <span>{copiedLink ? "Search command copied" : "Copy in-game search"}</span>
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
                  className="w-full rounded-none font-sans font-bold bg-primary text-recess hover:bg-primary cursor-pointer"
                >
                  View characters
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="mt-auto pt-6 border-t border-border flex items-center justify-center">
        <Pagination>
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={`rounded-none border border-border bg-card text-foreground ${
                  currentPage === 1 ? "pointer-events-none opacity-40" : "cursor-pointer hover:border-primary/60"
                }`}
              />
            </PaginationItem>

            <PaginationItem>
              <PaginationLink isActive aria-label={`Page ${currentPage}`} className="rounded-none border border-primary bg-secondary text-primary font-bold tabular-nums">
                {currentPage}
              </PaginationLink>
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className={`rounded-none border border-border bg-card text-foreground ${
                  currentPage >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer hover:border-primary/60"
                }`}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
        </div>
      </main>
    </div>
  );
}

export default Marketplace;

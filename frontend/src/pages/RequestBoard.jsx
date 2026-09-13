import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Clock, 
  RefreshCw, 
  Package,
  X, 
  ChevronLeft, 
  ChevronRight
} from "lucide-react";
import { 
  fetchTradeRequests, 
  fetchTradeRequestStats, 
  claimTradeRequest, 
  unclaimTradeRequest, 
  completeTradeRequest,
  fulfillTradeRequest, 
  cancelTradeRequest 
} from "../api/api";
import { useAuth } from "../context/AuthContext";
import { RequestCard } from "../components/requests/RequestCard";
import { RequestModal } from "../components/requests/RequestModal";
import Navbar from "@/components/ui/navbar";
import "@/styles/requests-builds.css";

const CATEGORIES = [
  "All Categories",
  "Weapons",
  "Apparel",
  "Jewelry",
  "Consumables",
  "Materials",
  "Glyphs",
  "Furnishings",
  "Miscellaneous"
];

export function RequestBoard() {
  const { user } = useAuth();

  const [server, setServer] = useState("NA");
  // Streamlined 2-tab view: PUBLIC (all WTB & crafting bounties) and MY_ORDERS
  const [activeTab, setActiveTab] = useState("PUBLIC"); // PUBLIC, MY_ORDERS
  
  // Data state
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total_open: 0, total_in_progress: 0, total_fulfilled: 0, total_gold_offered: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL"); // ALL, CRAFTING, WTB
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE"); // ACTIVE (Open/In-Progress), OPEN, IN_PROGRESS, FULFILLED, ALL
  const [sortOption, setSortOption] = useState("newest"); // newest, gold_desc, gold_asc, expiring_soon
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Load request stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchTradeRequestStats(server);
      if (res && res.total_open !== undefined) {
        setStats(res);
      }
    } catch (e) {
      console.error("Failed to load request stats:", e);
    } finally {
      setStatsLoading(false);
    }
  }, [server]);

  // Load trade requests
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        server,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      };

      // Type filter (All, Crafting, WTB)
      if (selectedType && selectedType !== "ALL") {
        params.request_type = selectedType;
      }

      // Tab filter
      if (activeTab === "MY_ORDERS" && user) {
        params.status = "ALL";
      } else {
        // Status filter
        if (selectedStatus === "ACTIVE") params.status = "OPEN,IN_PROGRESS";
        else if (selectedStatus !== "ALL") params.status = selectedStatus;
        else params.status = "ALL";
      }

      // Category filter
      if (selectedCategory && selectedCategory !== "All Categories") {
        params.category = selectedCategory;
      }

      // Search filter
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // Sort
      if (sortOption !== "newest") {
        params.sort = sortOption;
      }

      const res = await fetchTradeRequests(params);
      if (res && Array.isArray(res.requests)) {
        setRequests(res.requests);
        setTotalCount(res.total || 0);
      } else {
        setRequests([]);
        setTotalCount(0);
      }
    } catch (e) {
      console.error("Failed to load requests:", e);
      setRequests([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [server, selectedType, selectedStatus, selectedCategory, searchQuery, sortOption, currentPage]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Handlers for claim / unclaim / fulfill / cancel
  const handleClaim = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await claimTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to claim request.");
      }
    } catch (e) {
      alert("Error claiming request: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnclaim = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await unclaimTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to release claim.");
      }
    } catch (e) {
      alert("Error releasing claim: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await completeTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to mark order as completed.");
      }
    } catch (e) {
      alert("Error completing order: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFulfill = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await fulfillTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to fulfill request.");
      }
    } catch (e) {
      alert("Error fulfilling request: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this trade request?")) return;
    setActionLoadingId(id);
    try {
      const res = await cancelTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to cancel request.");
      }
    } catch (e) {
      alert("Error canceling request: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedType("ALL");
    setSelectedCategory("All Categories");
    setSelectedStatus("ACTIVE");
    setSortOption("newest");
    setCurrentPage(1);
  };

  return (
    <div className="exchange-page exchange-requests">
      <Navbar />

      {/* Top Banner Header */}
      <header className="exchange-container">
        <div className="exchange-page-heading">
          <div>
            <p className="exchange-eyebrow"><ShoppingCart className="size-4" /> Player requests</p>
            <h1>Requests</h1>
            <p className="text-muted-foreground text-sm md:text-sm mt-1">
              Find a crafter or buy the items you need.
            </p>
          </div>

          {/* Controls: Megaserver & Post Request CTA */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Server Selector */}
            <div className="rb-server-toggle" aria-label="Megaserver">
              <button
                onClick={() => { setServer("NA"); setCurrentPage(1); }}
                aria-pressed={server === "NA"}
                className={`px-3 py-1.5 text-sm font-sans font-bold tracking-normal transition-all cursor-pointer ${
                  server === "NA"
                    ? "bg-primary text-black shadow font-semibold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                NA
              </button>
              <button
                onClick={() => { setServer("EU"); setCurrentPage(1); }}
                aria-pressed={server === "EU"}
                className={`px-3 py-1.5 text-sm font-sans font-bold tracking-normal transition-all cursor-pointer ${
                  server === "EU"
                    ? "bg-primary text-black shadow font-semibold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                EU
              </button>
            </div>

            {/* Post Request CTA */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="exchange-primary"
            >
              <Plus className="size-4" />
              <span>Post request</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="exchange-container rb-page-content">
        {/* Stats Dashboard */}
        <div className="rb-stats">
          <div className="rb-stat">
            <div className="rb-stat-icon text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400" />
            </div>
            <div>
              <span className="text-xs font-sans text-emerald-400 block font-bold">
                Open requests
              </span>
              <span className="tabular-nums text-xl font-bold text-white">
                {statsLoading ? "..." : (stats?.total_open || 0)}
              </span>
            </div>
          </div>

          <div className="rb-stat">
            <div className="rb-stat-icon text-amber-400">
              <Clock className="size-5 text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-sans text-amber-400 block font-bold">
                Claimed
              </span>
              <span className="tabular-nums text-xl font-bold text-white">
                {statsLoading ? "..." : (stats?.total_in_progress || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Feed Header Bar & Link to My Orders */}
        <div className="rb-section-heading">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-primary" />
            <span className="text-sm font-sans font-bold tracking-normal text-foreground">
              Public requests
            </span>
            <span className="text-sm tabular-nums text-muted-foreground ml-2">
              <strong className="text-white">{requests.length}</strong> of {totalCount}
            </span>
          </div>

          <Link
            to="/my-orders"
            className="exchange-secondary"
          >
            <Package className="size-3.5 text-primary" />
            <span>My orders & claims →</span>
          </Link>
        </div>

        {/* Dynamic Filter Controls Bar */}
        <div className="rb-request-filters exchange-panel" role="search" aria-label="Filter requests">
          {/* Search Query */}
          <div className="relative rb-request-search">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              aria-label="Search requests by item, set, or handle"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Item, set, or @handle"
              className="w-full pl-9 pr-8 py-2 bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground font-sans focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                aria-label="Clear request search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              aria-label="Request type"
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-background border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Request Types</option>
              <option value="CRAFTING">Crafted Gear Only</option>
              <option value="WTB">Materials & Items Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              aria-label="Request category"
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-background border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              aria-label="Request status"
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-background border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
            >
              <option value="ACTIVE">Active (Open & Claimed)</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_PROGRESS">In Progress Only</option>
              <option value="FULFILLED">Fulfilled (History)</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <select
              value={sortOption}
              aria-label="Sort requests"
              onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-background border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
            >
              <option value="newest">Newest First</option>
              <option value="gold_desc">Highest Gold Bounty</option>
              <option value="gold_asc">Lowest Gold Bounty</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="quality_desc">Highest Quality</option>
            </select>
          </div>
        </div>

        {/* Request Cards Grid */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="size-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-sans text-muted-foreground tracking-normal">
              Loading requests…
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center bg-card border border-border p-8 max-w-xl mx-auto space-y-4 shadow-sm">
            <ShoppingCart className="size-12 text-primary mx-auto opacity-70" />
            <h3 className="font-sans font-bold text-lg text-foreground">
              No matching requests
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No requests match this server and these filters.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-secondary hover:bg-[#292824] border border-border text-sm font-sans text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2 bg-primary hover:bg-[#f0d07a] text-black font-sans font-bold text-sm tracking-normal transition-colors shadow"
              >
                + Post request
              </button>
            </div>
          </div>
        ) : (
          <div className="rb-request-grid">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                currentUser={user}
                onClaim={handleClaim}
                onUnclaim={handleUnclaim}
                onComplete={handleComplete}
                onFulfill={handleFulfill}
                onCancel={handleCancel}
                isClaiming={actionLoadingId === req.id}
                isCanceling={actionLoadingId === req.id}
              />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 px-2">
            <span className="text-sm text-muted-foreground font-sans">
              Page <strong className="text-white tabular-nums">{currentPage}</strong> of {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                aria-label="Previous page"
                disabled={currentPage === 1}
                className="p-1.5 bg-card border border-border hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm font-sans cursor-pointer transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                disabled={currentPage === totalPages}
                className="p-1.5 bg-card border border-border hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm font-sans cursor-pointer transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Create Request Modal */}
      <RequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultServer={server}
        onRequestCreated={() => {
          loadRequests();
          loadStats();
        }}
      />
    </div>
  );
}

export default RequestBoard;

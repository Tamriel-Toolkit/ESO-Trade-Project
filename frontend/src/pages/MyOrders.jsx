import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Package, 
  Hammer, 
  ShoppingCart, 
  Search, 
  Check, 
  Coins, 
  RefreshCw, 
  User, 
  X,
  ChevronLeft,
  ChevronRight,
  LogIn
} from "lucide-react";
import { 
  fetchTradeRequests, 
  claimTradeRequest, 
  unclaimTradeRequest, 
  completeTradeRequest,
  fulfillTradeRequest, 
  cancelTradeRequest 
} from "../api/api";
import { useAuth } from "../context/AuthContext";
import { RequestCard } from "../components/requests/RequestCard";
import Navbar from "@/components/ui/navbar";
import "@/styles/requests-builds.css";

export function MyOrders() {
  const { user } = useAuth();

  const [server, setServer] = useState("NA");
  const [subTab, setSubTab] = useState("ALL"); // ALL, POSTED, CLAIMED, FULFILLED
  
  // Data state
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Load user's trade requests
  const loadRequests = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        server,
        status: "ALL",
        limit: 100 // Load user's orders
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (sortOption !== "newest") {
        params.sort = sortOption;
      }

      const res = await fetchTradeRequests(params);
      if (res && Array.isArray(res.requests)) {
        // Filter strictly for orders created by user OR claimed by user
        let userOrders = res.requests.filter(
          r => r.user_id === user.id || r.claimed_by_user_id === user.id
        );

        setAllOrders(userOrders);
      } else {
        setAllOrders([]);
      }
    } catch (e) {
      console.error("Failed to load user orders:", e);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [server, searchQuery, sortOption, user?.id]);

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
      } else {
        alert(res?.error || "Failed to cancel request.");
      }
    } catch (e) {
      alert("Error canceling request: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Compute User-Specific Global Stats across all user orders (Active / Non-completed)
  const activePostedCount = allOrders.filter(
    r => r.user_id === user?.id && (r.status === "OPEN" || r.status === "IN_PROGRESS" || r.status === "COMPLETED")
  ).length;

  const activeClaimedCount = allOrders.filter(
    r => r.claimed_by_user_id === user?.id && (r.status === "IN_PROGRESS" || r.status === "COMPLETED")
  ).length;

  const activeOrdersCount = allOrders.filter(
    r => (r.user_id === user?.id || r.claimed_by_user_id === user?.id) && 
         (r.status === "OPEN" || r.status === "IN_PROGRESS" || r.status === "COMPLETED")
  ).length;

  const fulfilledCount = allOrders.filter(r => r.status === "FULFILLED").length;
  const totalGold = allOrders.reduce((acc, r) => acc + ((r.offered_gold_price || 0) * (r.quantity || 1)), 0);

  // Filter orders for active sub-tab and search query
  const filteredRequests = useMemo(() => {
    let list = allOrders;
    if (subTab === "ALL") {
      // Only show active requests and actively claimed orders
      list = list.filter(r => r.status === "OPEN" || r.status === "IN_PROGRESS" || r.status === "COMPLETED");
    } else if (subTab === "POSTED") {
      // Only show active / non-completed requests posted by user
      list = list.filter(r => r.user_id === user?.id && (r.status === "OPEN" || r.status === "IN_PROGRESS" || r.status === "COMPLETED"));
    } else if (subTab === "CLAIMED") {
      // Only show active / non-completed orders claimed by user
      list = list.filter(r => r.claimed_by_user_id === user?.id && (r.status === "IN_PROGRESS" || r.status === "COMPLETED"));
    } else if (subTab === "FULFILLED") {
      list = list.filter(r => r.status === "FULFILLED");
    }
    return list;
  }, [allOrders, subTab, user?.id]);

  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;

  return (
    <div className="exchange-page exchange-orders">
      <Navbar />

      {/* Top Banner Header */}
      <header className="exchange-container">
        <div className="exchange-page-heading">
          <div>
            <p className="exchange-eyebrow"><Package className="size-4" /> Your trading activity</p>
            <h1>My orders & claims</h1>
            <p className="text-muted-foreground text-sm md:text-sm mt-1">
              Track your requests, claimed orders, and deliveries.
            </p>
          </div>

          {/* Controls: Megaserver & Link to Public Board */}
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

            {/* Navigation to Public Requests */}
            <Link
              to="/requests"
              className="exchange-secondary"
            >
              <ShoppingCart className="size-3.5 text-primary" />
              <span>Browse requests →</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="exchange-container rb-page-content">
        {!user ? (
          /* Unauthenticated State */
          <div className="py-20 text-center bg-card border border-border p-8 max-w-xl mx-auto space-y-4 shadow-sm">
            <User className="size-12 text-primary mx-auto opacity-70" />
            <h3 className="font-sans font-bold text-lg text-foreground">
              Sign in to view your orders
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage requests, claim orders, and track your in-game deliveries.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2.5 bg-primary hover:bg-[#f0d07a] text-black font-sans font-bold text-sm tracking-normal transition-colors shadow flex items-center gap-1.5"
              >
                <LogIn className="size-4" />
                <span>Sign in or register</span>
              </Link>
              <Link
                to="/requests"
                className="px-4 py-2.5 bg-secondary hover:bg-[#292824] border border-border text-sm font-sans text-muted-foreground hover:text-white transition-colors"
              >
                Browse requests
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* User Stats Overview */}
            <div className="rb-stats rb-order-stats">
              <div className="rb-stat">
                <div className="rb-stat-icon">
                  <ShoppingCart className="size-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-sans text-primary block font-bold">
                    Posted
                  </span>
                  <span className="tabular-nums text-xl font-bold text-white">
                    {loading ? "..." : (activePostedCount || 0)}
                  </span>
                </div>
              </div>

              <div className="rb-stat">
                <div className="rb-stat-icon">
                  <Hammer className="size-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-xs font-sans text-amber-400 block font-bold">
                    Claimed
                  </span>
                  <span className="tabular-nums text-xl font-bold text-white">
                    {loading ? "..." : (activeClaimedCount || 0)}
                  </span>
                </div>
              </div>

              <div className="rb-stat">
                <div className="rb-stat-icon">
                  <Check className="size-5 text-purple-400" />
                </div>
                <div>
                  <span className="text-xs font-sans text-purple-400 block font-bold">
                    Fulfilled
                  </span>
                  <span className="tabular-nums text-xl font-bold text-white">
                    {loading ? "..." : (fulfilledCount || 0)}
                  </span>
                </div>
              </div>

              <div className="rb-stat">
                <div className="rb-stat-icon">
                  <Coins className="size-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-xs font-sans text-emerald-400 block font-bold">
                    Total order value
                  </span>
                  <span className="tabular-nums text-xl font-bold text-primary">
                    {loading ? "..." : `${(totalGold || 0).toLocaleString()}g`}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Sub-Tabs */}
            <div className="rb-section-heading rb-order-navigation">
              <div className="rb-order-tabs" aria-label="Order views">
                <button
                  onClick={() => { setSubTab("ALL"); setCurrentPage(1); }}
                  aria-pressed={subTab === "ALL"}
                  className={`px-3.5 py-2 text-sm font-sans font-bold tracking-normal transition-all cursor-pointer shrink-0 ${
                    subTab === "ALL"
                      ? "bg-primary text-black shadow-md font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  Active ({activeOrdersCount})
                </button>

                <button
                  onClick={() => { setSubTab("POSTED"); setCurrentPage(1); }}
                  aria-pressed={subTab === "POSTED"}
                  className={`px-3.5 py-2 text-sm font-sans font-bold tracking-normal transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    subTab === "POSTED"
                      ? "bg-primary text-black shadow-md font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <ShoppingCart className="size-3.5" />
                  Posted ({activePostedCount})
                </button>

                <button
                  onClick={() => { setSubTab("CLAIMED"); setCurrentPage(1); }}
                  aria-pressed={subTab === "CLAIMED"}
                  className={`px-3.5 py-2 text-sm font-sans font-bold tracking-normal transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    subTab === "CLAIMED"
                      ? "bg-amber-600 text-white shadow-md font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Hammer className="size-3.5" />
                  Claimed ({activeClaimedCount})
                </button>

                <button
                  onClick={() => { setSubTab("FULFILLED"); setCurrentPage(1); }}
                  aria-pressed={subTab === "FULFILLED"}
                  className={`px-3.5 py-2 text-sm font-sans font-bold tracking-normal transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    subTab === "FULFILLED"
                      ? "bg-purple-600 text-white shadow-md font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Check className="size-3.5" />
                  Fulfilled ({fulfilledCount})
                </button>
              </div>

              <Link
                to="/requests"
                className="text-sm font-sans text-primary hover:underline hidden sm:flex items-center gap-1"
              >
                <span>Browse requests</span>
                <span>→</span>
              </Link>
            </div>

            {/* Filter Search & Sort Bar */}
            <div className="rb-order-filters exchange-panel" role="search" aria-label="Filter your orders">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  aria-label="Search your orders by item, set, or notes"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Item, set, or notes"
                  className="w-full pl-9 pr-8 py-2 bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground font-sans focus:outline-none focus:border-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                    aria-label="Clear order search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="sm:w-56">
                <select
                  value={sortOption}
                  aria-label="Sort your orders"
                  onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
                  className="w-full py-2 px-3 bg-background border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="gold_desc">Highest Gold Bounty</option>
                  <option value="gold_asc">Lowest Gold Bounty</option>
                  <option value="expiring_soon">Expiring Soon</option>
                </select>
              </div>
            </div>

            {/* Orders Grid */}
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-sm font-sans text-muted-foreground tracking-normal">
                  Loading your orders…
                </p>
              </div>
            ) : paginatedRequests.length === 0 ? (
              <div className="py-16 text-center bg-card border border-border p-8 max-w-xl mx-auto space-y-4 shadow-sm">
                <Package className="size-12 text-primary mx-auto opacity-70" />
                <h3 className="font-sans font-bold text-lg text-foreground">
                  No orders in this view
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You have not posted or claimed any orders matching this category yet.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Link
                    to="/requests"
                    className="px-5 py-2.5 bg-primary hover:bg-[#f0d07a] text-black font-sans font-bold text-sm tracking-normal transition-colors shadow flex items-center gap-1.5"
                  >
                    <ShoppingCart className="size-4" />
                    <span>Browse requests</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rb-request-grid">
                {paginatedRequests.map((req) => (
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
          </>
        )}
      </main>
    </div>
  );
}

export default MyOrders;

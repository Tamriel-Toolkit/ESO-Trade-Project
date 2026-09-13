import React, { useState, useEffect } from "react";
import { 
  Hammer, 
  ShoppingCart, 
  Clock, 
  Check, 
  X, 
  Copy,
  Coins,
  User,
  MessageSquare
} from "lucide-react";
import { EsoTooltip } from "../ui/tooltip";
import { getEsoIconUrl } from "@/lib/utils";
import "@/styles/requests-builds.css";

const RARITY_COLORS = {
  1: "border-gray-500 text-gray-300",
  2: "border-emerald-500 text-emerald-400",
  3: "border-blue-500 text-blue-400",
  4: "border-purple-500 text-purple-400",
  5: "border-primary text-primary"
};

const RARITY_BG = {
  1: "bg-gray-950/40",
  2: "bg-emerald-950/40",
  3: "bg-blue-950/40",
  4: "bg-purple-950/40",
  5: "bg-primary/15"
};

const RARITY_NAMES = {
  1: "Normal",
  2: "Fine",
  3: "Superior",
  4: "Epic",
  5: "Legendary"
};

export function RequestCard({
  request,
  currentUser,
  onClaim,
  onUnclaim,
  onComplete,
  onFulfill,
  onCancel,
  isClaiming = false,
  isCanceling = false
}) {
  const [copiedType, setCopiedType] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");

  const isOwner = currentUser && (currentUser.id === request.user_id);
  const isClaimedByMe = currentUser && (currentUser.id === request.claimed_by_user_id);

  // 24-hour Claim Timer Countdown
  useEffect(() => {
    if (request.status !== "IN_PROGRESS" || !request.claim_expires_at) {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const diff = new Date(request.claim_expires_at) - new Date();
      if (diff <= 0) {
        setTimeRemaining("Claim Expired (Reverting)");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${hours}h ${mins}m ${secs}s left`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [request.status, request.claim_expires_at]);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  if (!request) return null;

  const whisperText = `/w ${request.buyer_display_handle || 'Buyer'} Hello! I can fulfill your ${
    request.request_type === "CRAFTING" ? "crafting order" : "WTB request"
  } for ${request.quantity > 1 ? `${request.quantity}x ` : ""}${request.item_name || 'Item'} (${(request.offered_gold_price || 0).toLocaleString()}g C.O.D.).`;

  const mailCodText = `${request.quantity > 1 ? `${request.quantity}x ` : ""}${request.item_name || 'Item'}${
    request.set_name ? ` (${request.set_name})` : ""
  } - Requested on ESO Marketplace`;

  const quality = request.quality || 1;
  const rarityClass = RARITY_COLORS[quality] || RARITY_COLORS[1];
  const rarityBg = RARITY_BG[quality] || RARITY_BG[1];

  const offeredGold = request.offered_gold_price || 0;
  const totalPrice = offeredGold * (request.quantity || 1);

  return (
    <article className="rb-request-card exchange-frame" aria-label={`${request.item_name} request`}>
      {/* Top Header Row */}
      <div className="rb-request-identity">
        {/* Badges & Status */}
        <div className="rb-request-badges">
          <div className="flex items-center gap-1.5">
            {request.request_type === "CRAFTING" ? (
              <span className="px-2 py-0.5 bg-primary/20 border border-primary/50 text-primary text-xs font-sans font-bold tracking-normal flex items-center gap-1">
                <Hammer className="size-3" />
                Crafting
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-950/40 border border-blue-500/40 text-blue-300 text-xs font-sans font-bold tracking-normal flex items-center gap-1">
                <ShoppingCart className="size-3" />
                Buying
              </span>
            )}

            <span className="px-1.5 py-0.5 bg-recess border border-border text-xs tabular-nums text-muted-foreground">
              {request.server}
            </span>
          </div>

          {/* Status Badge */}
          {request.status === "OPEN" && (
            <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-sans font-bold tracking-normal flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Open
            </span>
          )}
          {request.status === "IN_PROGRESS" && (
            <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-sans font-bold tracking-normal flex items-center gap-1">
              <Clock className="size-3" />
              In progress
            </span>
          )}
          {request.status === "COMPLETED" && (
            <span className="px-2 py-0.5 bg-blue-950/40 border border-blue-500/40 text-blue-300 text-xs font-sans font-bold tracking-normal flex items-center gap-1">
              <Check className="size-3 text-blue-400" />
              Completed / sent
            </span>
          )}
          {request.status === "FULFILLED" && (
            <span className="px-2 py-0.5 bg-purple-950/40 border border-purple-500/40 text-purple-300 text-xs font-sans font-bold tracking-normal flex items-center gap-1">
              <Check className="size-3" />
              Fulfilled
            </span>
          )}
          {request.status === "CANCELLED" && (
            <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 text-xs font-sans font-bold tracking-normal">
              Cancelled
            </span>
          )}
          {request.status === "EXPIRED" && (
            <span className="px-2 py-0.5 bg-red-950/30 border border-red-500/30 text-red-400 text-xs font-sans font-bold tracking-normal">
              Expired
            </span>
          )}
        </div>

        {/* Item Primary Display */}
        <div className="rb-request-item">
          <div className={`rb-item-icon ${rarityClass} ${rarityBg}`}>
            {request.icon_url ? (
              <img
                src={getEsoIconUrl(request.icon_url)}
                alt={request.item_name}
                className="size-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <Hammer className="size-6 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="rb-item-name">
              {request.quantity > 1 ? `${request.quantity}x ` : ""}{request.item_name}
            </h3>

            {request.set_name && (
              <p className="rb-item-set">
                Set: <span>{request.set_name}</span>
              </p>
            )}

            {/* Spec pills */}
            <div className="rb-request-specs">
              <span className={`px-1.5 py-0.2 border ${rarityClass} bg-black/40`}>
                {RARITY_NAMES[quality]}
              </span>
              {request.trait_name && request.trait_name !== "None" && (
                <span className="px-1.5 py-0.2 border border-border text-amber-300/90 bg-black/40">
                  Trait: {request.trait_name}
                </span>
              )}
              {request.style_name && (
                <span className="px-1.5 py-0.2 border border-border text-muted-foreground bg-black/40">
                  Style: {request.style_name}
                </span>
              )}
              {request.cp_req > 0 ? (
                <span className="px-1.5 py-0.2 border border-border text-purple-300 bg-black/40 tabular-nums">
                  CP {request.cp_req}
                </span>
              ) : request.level_req ? (
                <span className="px-1.5 py-0.2 border border-border text-gray-300 bg-black/40 tabular-nums">
                  Lvl {request.level_req}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Delivery Notes */}
        {request.delivery_notes && (
          <div className="rb-delivery-note">
            "{request.delivery_notes}"
          </div>
        )}
      </div>

      {/* Financials & Buyer Details */}
      <div className="rb-request-details">
        {/* Offered Gold & Market Comparison */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-sans text-muted-foreground block">
              Total offer
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="rb-offer-price">
                <Coins className="size-4 text-primary" />
                {(totalPrice || 0).toLocaleString()}g
              </span>
              {request.quantity > 1 && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {(offeredGold || 0).toLocaleString()}g each
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Buyer & Claim Info */}
        <div className="rb-request-people">
          <div className="rb-person-row">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="size-3 text-primary" />
              Buyer:
            </span>
            <span className="tabular-nums text-white font-bold">
              {request.buyer_display_handle}
            </span>
          </div>

          {request.status === "IN_PROGRESS" && (
            <div className="rb-claim-timer text-amber-300">
              <span className="flex items-center gap-1">
                <Hammer className="size-3 text-amber-400" />
                Claimed by: <strong className="tabular-nums text-white">{request.claimed_by_handle || "Crafter"}</strong>
              </span>
              <span className="tabular-nums font-bold text-amber-400">
                {timeRemaining}
              </span>
            </div>
          )}

          {(request.status === "COMPLETED" || request.status === "FULFILLED") && request.claimed_by_handle && (
            <div className="rb-person-row">
              <span className="text-muted-foreground flex items-center gap-1">
                <Hammer className="size-3 text-primary" />
                Merchant:
              </span>
              <span className="tabular-nums text-white font-bold">
                {request.claimed_by_handle}
              </span>
            </div>
          )}
        </div>

        {/* In-Game C.O.D. Mail Helper Buttons */}
        <div className="rb-copy-actions">
          <EsoTooltip content="Copy in-game whisper command: /w @BuyerHandle ...">
            <button
              onClick={() => handleCopy(whisperText, "whisper")}
              className="flex-1 py-1 px-2 bg-secondary border border-border hover:border-primary text-xs font-sans text-[#f0d07a] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              {copiedType === "whisper" ? (
                <>
                  <Check className="size-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Whisper Copied!</span>
                </>
              ) : (
                <>
                  <MessageSquare className="size-3 text-primary" />
                  <span>Copy whisper</span>
                </>
              )}
            </button>
          </EsoTooltip>

          <EsoTooltip content="Copy C.O.D. in-game mail note text">
            <button
              onClick={() => handleCopy(mailCodText, "mail")}
              className="py-1 px-2 bg-secondary border border-border hover:border-primary text-xs font-sans text-muted-foreground hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              {copiedType === "mail" ? (
                <>
                  <Check className="size-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>Copy C.O.D. note</span>
                </>
              )}
            </button>
          </EsoTooltip>
        </div>

        {/* Action Buttons */}
        <div className="rb-request-actions">
          {request.status === "OPEN" && (
            isOwner ? (
              <button
                onClick={() => onCancel(request.id)}
                disabled={isCanceling}
                className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-sans font-bold text-sm tracking-normal transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="size-3.5" />
                <span>Cancel request</span>
              </button>
            ) : (
              <button
                onClick={() => onClaim(request.id)}
                disabled={isClaiming || !currentUser}
                className="w-full py-2 bg-primary hover:bg-[#f0d07a] text-black font-sans font-bold text-sm tracking-normal transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Hammer className="size-3.5 text-black" />
                <span>{currentUser ? "Claim order" : "Sign in to claim"}</span>
              </button>
            )
          )}

          {request.status === "IN_PROGRESS" && (
            <div className="flex items-center gap-1.5">
              {isClaimedByMe && (
                <button
                  onClick={() => (onComplete ? onComplete(request.id) : onFulfill(request.id))}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-sans font-bold text-sm tracking-normal transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Check className="size-3.5" />
                  <span>Mark completed</span>
                </button>
              )}

              {isOwner && !isClaimedByMe && (
                <>
                  <button
                    onClick={() => onFulfill(request.id)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-sans font-bold text-sm tracking-normal transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check className="size-3.5" />
                    <span>Confirm & close</span>
                  </button>
                  <EsoTooltip content="Unassign this claimer and reopen request to the public board">
                    <button
                      onClick={() => onUnclaim(request.id)}
                      className="py-2 px-3 bg-secondary hover:bg-amber-950/30 border border-border hover:border-amber-500/40 text-amber-300 hover:text-amber-200 font-sans text-sm transition-all cursor-pointer"
                    >
                      Unassign
                    </button>
                  </EsoTooltip>
                </>
              )}

              {isClaimedByMe && (
                <button
                  onClick={() => onUnclaim(request.id)}
                  className="py-2 px-3 bg-secondary hover:bg-red-950/30 border border-border hover:border-red-500/40 text-red-300 font-sans text-sm transition-all cursor-pointer"
                >
                  Release claim
                </button>
              )}
            </div>
          )}

          {request.status === "COMPLETED" && (
            <div className="flex items-center gap-1.5">
              {isOwner ? (
                <>
                  <button
                    onClick={() => onFulfill(request.id)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-sans font-bold text-sm tracking-normal transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check className="size-3.5" />
                    <span>Confirm delivery & close</span>
                  </button>
                  <EsoTooltip content="Unassign crafter and reopen request to the public board">
                    <button
                      onClick={() => onUnclaim(request.id)}
                      className="py-2 px-3 bg-secondary hover:bg-amber-950/30 border border-border hover:border-amber-500/40 text-amber-300 hover:text-amber-200 font-sans text-sm transition-all cursor-pointer"
                    >
                      Unassign
                    </button>
                  </EsoTooltip>
                </>
              ) : isClaimedByMe ? (
                <>
                  <div className="flex-1 py-2 bg-blue-950/30 border border-blue-500/30 text-blue-300 font-sans font-bold text-sm tracking-normal text-center flex items-center justify-center gap-1.5">
                    <Clock className="size-3.5 text-blue-400" />
                    <span>Awaiting buyer confirmation</span>
                  </div>
                  <button
                    onClick={() => onUnclaim(request.id)}
                    className="py-2 px-3 bg-secondary hover:bg-red-950/30 border border-border hover:border-red-500/40 text-red-300 font-sans text-sm transition-all cursor-pointer"
                  >
                    Release
                  </button>
                </>
              ) : (
                <div className="w-full py-2 bg-blue-950/30 border border-blue-500/30 text-blue-300 font-sans font-bold text-sm tracking-normal text-center flex items-center justify-center gap-1.5">
                  <Check className="size-4 text-blue-400" />
                  <span>Completed by crafter</span>
                </div>
              )}
            </div>
          )}

          {request.status === "FULFILLED" && (
            <div className="w-full py-2 bg-purple-950/30 border border-purple-500/30 text-purple-300 font-sans font-bold text-sm tracking-normal text-center flex items-center justify-center gap-1.5">
              <Check className="size-4 text-purple-400" />
              <span>Fulfilled & closed</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default RequestCard;

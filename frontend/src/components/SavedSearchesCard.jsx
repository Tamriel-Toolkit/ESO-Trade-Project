import { useId, useState } from "react";
import { Bookmark, LogIn, Pin, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function describeFilters(filters = {}, fallbackSearch = "") {
  const scope = [filters.platform, filters.server, "Live listings"]
    .filter(Boolean)
    .join(" · ");
  const details = [
    filters.search && `“${filters.search}”`,
    filters.category,
    filters.subcategory,
    filters.trait && `Trait ${filters.trait}`,
    filters.rarity && `Quality ${filters.rarity}`,
    filters.location,
    filters.deals_only && "Deals only",
  ].filter(Boolean);

  return {
    scope,
    details: details.length
      ? details.slice(0, 3).join(" · ")
      : fallbackSearch
        ? `“${fallbackSearch}”`
        : "All active listings",
  };
}

export function PinnedSearchChips({ searches, onApply }) {
  const pinnedSearches = searches.filter((search) => search.is_pinned);
  if (!pinnedSearches.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Pinned saved searches">
      <span className="text-[10px] font-cinzel font-bold uppercase tracking-widest text-[#8a8275]">
        Pinned
      </span>
      {pinnedSearches.map((search) => (
        <Button
          key={search.id}
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onApply(search)}
          className="rounded-none border-[#c5a059]/50 bg-[#c5a059]/10 text-[#d4af37] hover:border-[#d4af37] hover:bg-[#c5a059]/20"
        >
          <Pin className="size-3 fill-current" />
          {search.name}
        </Button>
      ))}
    </div>
  );
}

export default function SavedSearchesCard({
  user,
  searches,
  isLoading,
  isMutating,
  message,
  onSave,
  onApply,
  onTogglePin,
  onDelete,
  onLogin,
  onClose,
}) {
  const [name, setName] = useState("");
  const nameInputId = useId();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const wasSaved = await onSave(name);
    if (wasSaved) setName("");
  };

  return (
    <Card className="eso-card rounded-none border-[#2a2c33] bg-[#121218] py-0 gap-0">
      <CardHeader className="border-b border-[#2a2c33] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm text-[#e0d8c3]">
            <Bookmark className="size-4 text-[#c5a059]" />
            Saved Searches
          </CardTitle>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="Close saved searches"
              className="rounded-none text-[#a89f91] hover:text-[#e0d8c3]"
            >
              <X />
            </Button>
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-[#8a8275]">
          Keep useful market combinations ready for your next trader run.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 px-4 py-4">
        {!user ? (
          <div className="border border-dashed border-[#c5a059]/40 bg-[#c5a059]/5 p-4 text-center">
            <LogIn className="mx-auto mb-2 size-5 text-[#c5a059]" />
            <p className="text-xs font-cinzel font-bold uppercase tracking-wider text-[#e0d8c3]">
              Sign in to save filters
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8a8275]">
              Your presets stay private to your account.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onLogin}
              className="mt-3 w-full rounded-none bg-[#c5a059] text-[#0a0a0d] hover:bg-[#d4af37]"
            >
              Sign In
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-2">
              <label htmlFor={nameInputId} className="text-[10px] font-cinzel font-bold uppercase tracking-widest text-[#a89f91]">
                Save filters or item search
              </label>
              <input
                id={nameInputId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="Item or preset name (e.g. lockpick)"
                className="h-9 w-full rounded-none border border-[#2a2c33] bg-[#0a0a0d] px-3 text-xs text-[#e0d8c3] outline-none placeholder:text-[#625d55] focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20"
              />
              <p className="text-[10px] leading-relaxed text-[#625d55]">
                With no filters selected, this name becomes the live item search.
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={isMutating || !name.trim()}
                className="w-full rounded-none bg-[#c5a059] text-[#0a0a0d] hover:bg-[#d4af37]"
              >
                <Plus />
                Save Search
              </Button>
            </form>

            {message?.text && (
              <p
                role="status"
                className={`border px-2.5 py-2 text-[11px] ${
                  message.type === "error"
                    ? "border-red-900/60 bg-red-950/30 text-red-300"
                    : "border-emerald-900/60 bg-emerald-950/30 text-emerald-300"
                }`}
              >
                {message.text}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-cinzel font-bold uppercase tracking-widest text-[#a89f91]">
                  Your presets
                </span>
                <span className="font-mono text-[10px] text-[#625d55]">{searches.length}</span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center border border-[#2a2c33] py-6">
                  <div className="size-5 animate-spin rounded-full border-2 border-[#2a2c33] border-b-[#c5a059]" />
                  <span className="sr-only">Loading saved searches</span>
                </div>
              ) : searches.length === 0 ? (
                <div className="border border-dashed border-[#2a2c33] px-3 py-5 text-center">
                  <Search className="mx-auto mb-2 size-4 text-[#625d55]" />
                  <p className="text-[11px] text-[#8a8275]">No saved searches yet.</p>
                </div>
              ) : (
                <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                  {searches.map((search) => {
                    const description = describeFilters(search.filter_params, search.name);
                    return (
                      <li key={search.id} className="border border-[#2a2c33] bg-[#0a0a0d] p-3 hover:border-[#c5a059]/50">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onApply(search)}
                            className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]/50"
                          >
                            <span className="block truncate text-xs font-semibold text-[#e0d8c3]">{search.name}</span>
                            <span className="mt-1 block text-[10px] font-mono uppercase tracking-wide text-[#c5a059]">{description.scope}</span>
                            <span className="mt-1 block truncate text-[10px] text-[#8a8275]">{description.details}</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={isMutating}
                              onClick={() => onTogglePin(search)}
                              aria-label={`${search.is_pinned ? "Unpin" : "Pin"} ${search.name}`}
                              className={`rounded-none ${search.is_pinned ? "text-[#d4af37]" : "text-[#625d55] hover:text-[#d4af37]"}`}
                            >
                              <Pin className={search.is_pinned ? "fill-current" : ""} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={isMutating}
                              onClick={() => onDelete(search)}
                              aria-label={`Delete ${search.name}`}
                              className="rounded-none text-[#625d55] hover:bg-red-950/30 hover:text-red-400"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { marketSearchParams, normalizeMarketFilters } from '@/lib/marketplaceFilters';

export function useMarketplaceFilters({ serverLocation, platform, defaultMinDealScore }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const defaults = useRef({ server: serverLocation, platform, min_value_index: defaultMinDealScore });
  const previousPreferences = useRef({ serverLocation, platform, defaultMinDealScore });
  const typing = useRef(false);
  const filters = normalizeMarketFilters(new URLSearchParams(location.search), defaults.current);
  const canonical = marketSearchParams(filters, location.search).toString();

  const updateFilters = useCallback((patch, { replace = false, reset = false, typingSearch = false } = {}) => {
    const current = normalizeMarketFilters(new URLSearchParams(location.search), defaults.current);
    const next = normalizeMarketFilters(reset ? patch : { ...current, ...patch }, defaults.current);
    const search = marketSearchParams(next, location.search).toString();
    const replaceEntry = replace || (typingSearch && typing.current);
    typing.current = typingSearch;
    if (search !== location.search.slice(1)) navigate({ pathname: location.pathname, search: `?${search}`, hash: location.hash }, { replace: replaceEntry, state: location.state });
  }, [location.search, location.pathname, location.hash, location.state, navigate]);

  useEffect(() => {
    if (navigationType === 'POP') typing.current = false;
  }, [location.key, navigationType]);

  useEffect(() => {
    // Canonicalization replaces this entry, never adds a navigation loop.
    if (canonical !== location.search.slice(1)) navigate({ pathname: location.pathname, search: `?${canonical}`, hash: location.hash }, { replace: true, state: location.state });
  }, [canonical, location.search, location.pathname, location.hash, location.state, navigate]);

  useEffect(() => {
    const previous = previousPreferences.current;
    previousPreferences.current = { serverLocation, platform, defaultMinDealScore };
    const patch = {};
    // Only an actual preference change overrides a link, not the recipient's defaults.
    if (previous.serverLocation !== serverLocation) patch.server = serverLocation;
    if (previous.platform !== platform) patch.platform = platform;
    if (previous.defaultMinDealScore !== defaultMinDealScore) {
      defaults.current.min_value_index = defaultMinDealScore;
      if (filters.deals) patch.min_value_index = defaultMinDealScore;
    }
    if (Object.keys(patch).length) updateFilters(patch);
  }, [serverLocation, platform, defaultMinDealScore, filters.deals, updateFilters]);

  return { filters, updateFilters, finishTyping: () => { typing.current = false; } };
}

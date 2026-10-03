import { afterEach, expect, it, vi } from 'vitest';
import { fetchMarketListings } from '../api/api';

afterEach(() => vi.unstubAllGlobals());

it('distinguishes API errors from a successful empty listing response', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const fetch = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0, listings: [] }) });
  vi.stubGlobal('fetch', fetch);
  expect(await fetchMarketListings()).toMatchObject({ error: expect.any(String) });
  expect(await fetchMarketListings()).toEqual({ total: 0, listings: [] });
});

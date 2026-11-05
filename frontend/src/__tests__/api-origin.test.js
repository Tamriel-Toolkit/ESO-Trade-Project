import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

it.each([['', ''], ['https://api.example.com/', 'https://api.example.com']])(
  'uses origin %j for cookie requests and cached icons', async (setting, prefix) => {
    vi.stubEnv('VITE_API_BASE_URL', setting);
    const { apiFetch } = await import('../api/api');
    const { getEsoIconUrl } = await import('../lib/utils');
    const fetch = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal('fetch', fetch);
    await apiFetch('/api/auth/me');
    expect(fetch).toHaveBeenCalledWith(prefix + '/api/auth/me', expect.objectContaining({ credentials: 'include' }));
    expect(getEsoIconUrl('gear.dds')).toBe(prefix + '/api/icons/gear.png');
  });

it('defaults to same origin and rejects path-based settings', async () => {
  const { normalizeApiOrigin } = await import('../api/origin');
  expect(normalizeApiOrigin(undefined)).toBe('');
  for (const value of ['/api', 'https://api.example.com/api', '//other.example']) {
    expect(() => normalizeApiOrigin(value)).toThrow(/VITE_API_BASE_URL/);
  }
});

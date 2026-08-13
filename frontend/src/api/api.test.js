import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchTaxonomy } from './api.js';

describe('fetchTaxonomy', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return parsed JSON when the response is ok', async () => {
        const mockData = { categories: [] };
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });

        const result = await fetchTaxonomy();
        expect(result).toEqual(mockData);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/taxonomy'));
    });

    it('should return an empty object and log an error when the response is not ok', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        const result = await fetchTaxonomy();
        expect(result).toEqual({});
        expect(console.error).toHaveBeenCalledWith('Error fetching taxonomy:', expect.any(Error));
        expect(console.error.mock.calls[0][1].message).toBe('HTTP error! status: 404');
    });

    it('should return an empty object and log an error when fetch throws an exception', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network failure'));

        const result = await fetchTaxonomy();
        expect(result).toEqual({});
        expect(console.error).toHaveBeenCalledWith('Error fetching taxonomy:', expect.any(Error));
        expect(console.error.mock.calls[0][1].message).toBe('Network failure');
    });
});

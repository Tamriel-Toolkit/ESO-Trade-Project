import { describe, it, expect } from 'vitest';
import { normalizeMarketFilters, marketSearchParams, savedMarketFilters, buildMarketplaceUrl, researchMarketplaceUrl } from '../lib/marketplaceFilters';

const params = url => Object.fromEntries(new URL(url, 'https://example.test').searchParams);
describe('marketplace filter contract', () => {
  it('round-trips every criterion through URL and saved searches', () => {
    const filters = normalizeMarketFilters({ server: 'EU', platform: 'Xbox', search: 'Ring', set: "Order's Wrath", category: 'Apparel', subcategory: 'Light Armor', slot: 'chest', weight: 'light', weapon: 'ice-staff', trait: 'Infused', rarity: '4', location: 'Vivec', max_age: '7', sort: 'price_asc', deals: true, min_value_index: '1.75' });
    expect(normalizeMarketFilters(marketSearchParams(filters))).toEqual(filters);
    expect(normalizeMarketFilters(savedMarketFilters(filters))).toEqual(filters);
    expect(marketSearchParams(normalizeMarketFilters({})).toString()).toBe('server=NA&platform=PC');
    expect(normalizeMarketFilters(marketSearchParams(normalizeMarketFilters({})), { server: 'EU', platform: 'Xbox' })).toMatchObject({ server: 'NA', platform: 'PC' });
  });
  it('normalizes invalid values and preserves unrelated URL context', () => {
    const raw = new URLSearchParams('view=catalog&source=bookmark&server=bad&slot=123&weight=bad&weapon=bad&trait=wat&rarity=6&max_age=-1&sort=wat&deals=true&min_value_index=Infinity');
    expect(Object.fromEntries(marketSearchParams(normalizeMarketFilters(raw), raw))).toEqual({ source: 'bookmark', view: 'listings', server: 'NA', platform: 'PC', deals: '1', min_value_index: '1.2' });
  });
  it('links Deadly Ring by set identity, never the nonmatching set-name keyword', () => {
    expect(params(buildMarketplaceUrl({ item_name: 'Deadly Ring', set_name: 'Deadly Strike', item_type: 'Ring', trait_name: 'Bloodthirsty' }, 'EU'))).toEqual({ server: 'EU', platform: 'PC', set: 'Deadly Strike', category: 'Jewelry', subcategory: 'Ring', slot: 'ring', trait: 'Bloodthirsty' });
  });
  it.each([
    ['Blacksmithing', 'Battleaxe', { category: 'Weapons', weapon: 'battleaxe', subcategory: 'Two-Handed Axe' }],
    ['Blacksmithing', 'Battle Axe', { weapon: 'battleaxe' }],
    ['Blacksmithing', 'Gauntlets', { category: 'Apparel', weight: 'heavy', slot: 'hands' }],
    ['Clothier', 'Robe & Jerkin', { weight: 'light', slot: 'chest' }],
    ['Clothier', 'Arm Cops', { weight: 'medium', slot: 'shoulders' }],
    ['Woodworking', 'Inferno Staff', { weapon: 'inferno-staff' }],
    ['Woodworking', 'Ice Staff', { weapon: 'ice-staff' }],
    ['Woodworking', 'Lightning Staff', { weapon: 'lightning-staff' }],
    ['Woodworking', 'Restoration Staff', { weapon: 'restoration-staff' }],
    ['Woodworking', 'Shield', { category: 'Apparel', weapon: 'shield' }],
    ['Jewelry', 'Necklace', { slot: 'neck' }],
  ])('maps %s / %s without using item-name searches', (craft, type, expected) => {
    const result = params(researchMarketplaceUrl(craft, type, 'Infused', 'EU'));
    expect(result).toMatchObject({ ...expected, server: 'EU', trait: 'Infused' });
    expect(result).not.toHaveProperty('search');
  });
  it('handles authored weight and weapon labels without guessing from item names', () => {
    expect(params(buildMarketplaceUrl({ slot_name: 'Head', item_type: 'Medium Armor', set_name: 'Stormfist' }))).toMatchObject({ weight: 'medium', slot: 'head' });
    expect(params(buildMarketplaceUrl({ slot_name: 'Main Hand 1', item_type: 'One-Handed Dagger' }))).toMatchObject({ weapon: 'dagger' });
    expect(params(buildMarketplaceUrl({ slot_name: 'Main Hand 2', item_type: 'Destruction Staff' }))).toMatchObject({ subcategory: 'Destruction Staff' });
    expect(params(buildMarketplaceUrl({ slot_name: 'Main Hand 1', item_type: 'Two-Handed Greatsword' }))).toMatchObject({ weapon: 'greatsword', subcategory: 'Two-Handed Sword' });
  });
});

// One contract for bookmarks, controls, saved searches, and cross-page links.
export const MARKET_SORTS = ['value_index', 'trait_asc', 'trait_desc', 'rarity_desc', 'rarity_asc', 'price_asc', 'price_desc', 'newest'];
export const SLOT_IDS = { head: [1], neck: [2], chest: [3], shoulders: [4], 'one-hand': [5], 'two-hand': [6], 'off-hand': [5, 7], waist: [8], legs: [9], feet: [10], ring: [12], hands: [13], 'main-hand': [5, 6, 14] };
export const WEAPON_IDS = { axe: 1, mace: 2, sword: 3, greatsword: 4, battleaxe: 5, maul: 6, bow: 8, 'restoration-staff': 9, dagger: 11, 'inferno-staff': 12, 'ice-staff': 13, shield: 14, 'lightning-staff': 15 };
const TRAITS = 'Powered,Charged,Precise,Infused,Defending,Training,Sharpened,Decisive,Nirnhoned,Intricate,Ornate,Divines,Impenetrable,Invigorating,Reinforced,Sturdy,Well-Fitted,Arcane,Bloodthirsty,Harmony,Healthy,Protective,Robust,Swift,Triune,Quickened,Prolific,Focused,Shattering,Aggressive,Soothing,Augmented,Bolstered,Vigorous'.split(',');
const CATEGORIES = ['Weapons', 'Apparel', 'Jewelry', 'Consumables', 'Materials', 'Glyphs', 'Furnishings', 'Miscellaneous', 'Companion Equipment'];
const KEYS = ['view', 'server', 'platform', 'search', 'set', 'category', 'subcategory', 'slot', 'weight', 'weapon', 'trait', 'rarity', 'location', 'max_age', 'sort', 'deals', 'deals_only', 'min_value_index'];
const text = value => typeof value === 'string' ? value.trim().slice(0, 160) : '';
const choice = (value, values, fallback = '') => values.find(v => v.toLowerCase() === text(value).toLowerCase()) || fallback;
const score = value => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 100 ? String(Number(value)) : '';

export function normalizeMarketFilters(input = {}, defaults = {}) {
  const raw = input instanceof URLSearchParams ? Object.fromEntries(input) : input;
  const category = choice(({ armor: 'Apparel', weapon: 'Weapons' })[text(raw.category).toLowerCase()] || raw.category, CATEGORIES);
  const deals = raw.deals === true || raw.deals === 'true' || raw.deals === '1' || raw.deals_only === true || raw.deals_only === 'true';
  return {
    server: choice(raw.server, ['NA', 'EU'], choice(defaults.server, ['NA', 'EU'], 'NA')),
    platform: choice(raw.platform, ['PC', 'Xbox', 'PlayStation'], choice(defaults.platform, ['PC', 'Xbox', 'PlayStation'], 'PC')),
    search: typeof raw.search === 'string' ? raw.search.slice(0, 160) : '', set: text(raw.set), category,
    subcategory: category ? text(raw.subcategory) : '',
    slot: choice(raw.slot, Object.keys(SLOT_IDS)), weight: choice(raw.weight, ['light', 'medium', 'heavy']),
    weapon: choice(raw.weapon, Object.keys(WEAPON_IDS)),
    trait: choice(raw.trait, TRAITS), rarity: choice(raw.rarity, ['1', '2', '3', '4', '5']),
    location: text(raw.location), max_age: choice(raw.max_age, ['1', '3', '7', '14', '30']),
    sort: choice(raw.sort, MARKET_SORTS, 'value_index'), deals,
    min_value_index: deals ? score(raw.min_value_index) || score(defaults.min_value_index) || '1.2' : '',
  };
}

export function marketSearchParams(filters, previous = '') {
  const params = new URLSearchParams(previous);
  const hadView = params.has('view');
  KEYS.forEach(key => params.delete(key));
  const normalized = normalizeMarketFilters(filters);
  if (hadView) params.set('view', 'listings'); // Retired catalog bookmarks remain usable.
  for (const [key, value] of Object.entries(normalized)) {
    if (!value || (key === 'sort' && value === 'value_index')) continue;
    params.set(key, key === 'deals' ? '1' : value);
  }
  return params;
}

export function hasMarketCriteria(filters) {
  return ['search', 'set', 'category', 'subcategory', 'slot', 'weight', 'weapon', 'trait', 'rarity', 'location', 'max_age'].some(key => filters[key]) || filters.deals || (filters.sort && filters.sort !== 'value_index');
}

export function savedMarketFilters(filters) {
  const { deals, ...rest } = filters;
  return { ...rest, view: 'listings', deals_only: deals };
}

// These are equipment labels, never guesses based on an item's marketing name.
const ARMOR_LINES = {
  head: ['hat', 'helmet', 'helm'], chest: ['robe', 'jerkin', 'robe & jerkin', 'jack', 'cuirass'],
  shoulders: ['epaulets', 'arm cops', 'pauldrons'], hands: ['gloves', 'bracers', 'gauntlets'],
  waist: ['sash', 'belt', 'girdle'], legs: ['breeches', 'guards', 'greaves'], feet: ['shoes', 'boots', 'sabatons'],
  ring: ['ring', 'ring 1', 'ring 2'], neck: ['necklace', 'neck'],
};
const WEAPON_ALIASES = { 'battle axe': 'battleaxe', 'two-handed axe': 'battleaxe', 'two handed axe': 'battleaxe', 'two-handed sword': 'greatsword', 'two handed sword': 'greatsword', 'two-handed mace': 'maul', 'two handed mace': 'maul', 'hammer': 'mace', 'fire staff': 'inferno-staff', 'inferno staff': 'inferno-staff', 'frost staff': 'ice-staff', 'ice staff': 'ice-staff', 'lightning staff': 'lightning-staff', 'shock staff': 'lightning-staff', 'healing staff': 'restoration-staff', 'restoration staff': 'restoration-staff' };
const WEAPON_SUBCATEGORIES = { axe: 'One-Handed Axe', mace: 'One-Handed Mace', sword: 'One-Handed Sword', greatsword: 'Two-Handed Sword', battleaxe: 'Two-Handed Axe', maul: 'Two-Handed Mace', bow: 'Bow', dagger: 'Dagger', shield: 'Shield', 'restoration-staff': 'Restoration Staff', 'inferno-staff': 'Destruction Staff', 'ice-staff': 'Destruction Staff', 'lightning-staff': 'Destruction Staff' };

export function equipmentMarketFilters(item, craftingType = '') {
  const type = text(item.item_type).toLowerCase();
  const slotName = text(item.slot_name).toLowerCase();
  const slot = Object.entries(ARMOR_LINES).find(([key, aliases]) => [key, ...aliases].includes(slotName) || [key, ...aliases].includes(type))?.[0];
  if (slot === 'ring' || slot === 'neck') return { category: 'Jewelry', subcategory: slot === 'ring' ? 'Ring' : 'Necklace', slot };
  if (slot) {
    let weight = text(item.armor_weight).toLowerCase() || /^(light|medium|heavy) armor$/.exec(type)?.[1] || '';
    if (!weight && craftingType === 'Blacksmithing') weight = 'heavy';
    if (!weight && craftingType === 'Clothier') weight = ['robe', 'jerkin', 'robe & jerkin', 'hat', 'epaulets', 'gloves', 'sash', 'breeches', 'shoes'].includes(type) ? 'light' : 'medium';
    return { category: 'Apparel', slot, weight, subcategory: ['light', 'medium', 'heavy'].includes(weight) ? `${weight[0].toUpperCase()}${weight.slice(1)} Armor` : '' };
  }
  const rawWeapon = text(item.weapon_type || item.item_type).toLowerCase().replace(/^one[- ]handed /, '').replace(/^two[- ]handed greatsword$/, 'greatsword');
  const weapon = WEAPON_ALIASES[rawWeapon] || rawWeapon;
  if (WEAPON_IDS[weapon]) return { category: weapon === 'shield' ? 'Apparel' : 'Weapons', subcategory: WEAPON_SUBCATEGORIES[weapon], weapon };
  // Generic staff labels can constrain the family, but cannot promise an element.
  if (rawWeapon === 'destruction staff') return { category: 'Weapons', subcategory: 'Destruction Staff' };
  if (/^(main hand|off hand)( [12]| \(back\))?$/.test(slotName)) return { slot: slotName.startsWith('off') ? 'off-hand' : 'main-hand' };
  return {};
}

export function buildMarketplaceUrl(item, server = 'NA') {
  const set = text(item.set_name);
  return `/marketplace?${marketSearchParams(normalizeMarketFilters({
    ...equipmentMarketFilters(item), server, set, search: set ? '' : item.item_name,
    trait: item.trait_name,
  }))}`;
}

export function researchMarketplaceUrl(craftingType, equipmentType, trait, server = 'NA') {
  return `/marketplace?${marketSearchParams(normalizeMarketFilters({
    ...equipmentMarketFilters({ item_type: equipmentType }, craftingType), server, trait,
  }))}`;
}

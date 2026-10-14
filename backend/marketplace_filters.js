// Values are ESO EquipType / ArmorType / WeaponType from catalog metadata.raw,
// not BAG_WORN slot IDs and not translated item-name substrings.
const SLOT_IDS = { head: [1], neck: [2], chest: [3], shoulders: [4], 'one-hand': [5], 'two-hand': [6], 'off-hand': [5, 7], waist: [8], legs: [9], feet: [10], ring: [12], hands: [13], 'main-hand': [5, 6, 14] };
const WEIGHT_IDS = { light: 1, medium: 2, heavy: 3 };
const WEAPON_IDS = { axe: 1, mace: 2, sword: 3, greatsword: 4, battleaxe: 5, maul: 6, bow: 8, 'restoration-staff': 9, dagger: 11, 'inferno-staff': 12, 'ice-staff': 13, shield: 14, 'lightning-staff': 15 };

function appendEquipmentFilters(query, conditions, params) {
    const metadata = "CASE WHEN json_valid(i.metadata) THEN i.metadata ELSE '{}' END";
    if (query.set !== undefined && query.set !== '') {
        if (typeof query.set !== 'string' || !query.set.trim() || query.set.length > 160) throw new Error('Invalid set filter.');
        conditions.push(`COALESCE(NULLIF(TRIM(i.set_name), ''), json_extract(${metadata}, '$.set.name')) = ? COLLATE NOCASE`);
        params.push(query.set.trim());
    }
    for (const [key, mapping, path] of [['slot', SLOT_IDS, 'equip_type'], ['weight', WEIGHT_IDS, 'armor_type'], ['weapon', WEAPON_IDS, 'weapon_type']]) {
        if (query[key] === undefined || query[key] === '') continue;
        if (typeof query[key] !== 'string' || !Object.hasOwn(mapping, query[key])) throw new Error(`Invalid ${key} filter.`);
        const values = [].concat(mapping[query[key]]);
        conditions.push(`CAST(json_extract(${metadata}, '$.raw.${path}') AS INTEGER) IN (${values.map(() => '?').join(', ')})`);
        params.push(...values);
    }
}

module.exports = { appendEquipmentFilters, SLOT_IDS, WEIGHT_IDS, WEAPON_IDS };

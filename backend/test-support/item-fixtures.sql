-- Applied explicitly by isolated API integration tests after schema initialization.
INSERT OR IGNORE INTO items (game_item_id, name, category, subcategory, rarity, type, set_name, icon, metadata, icon_url)
VALUES
    (1129, 'Werewolf Hide King Deleyn''s Longbow', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
    (1321, 'Maple Bow', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
    (1727, 'Brackenleaf''s Bough', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
    (2501, 'Ebony-Inlaid Longbow', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
    (4317, 'Naryu''s Sniper''s Bow', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
    (68447, 'Briarheart Jack', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_chest_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_chest_a.dds'),
    (68448, 'Briarheart Boots', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_feet_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_feet_a.dds'),
    (68449, 'Briarheart Bracers', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_hands_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_hands_a.dds'),
    (68450, 'Briarheart Helmet', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_head_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_head_a.dds'),
    (68451, 'Briarheart Guards', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_legs_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_legs_a.dds'),
    (97218, 'Necklace of a Mother''s Sorrow', 'Armor', 'Jewelry', 4, 'Armor', 'Mother''s Sorrow', '/esoui/art/icons/gear_nord_necklace_a.dds', '{"set": {"name": "Mother''s Sorrow"}}', '/esoui/art/icons/gear_nord_necklace_a.dds'),
    (97227, 'Inferno Staff of a Mother''s Sorrow', 'Weapon', 'Destruction Staff', 5, 'Weapon', 'Mother''s Sorrow', '/esoui/art/icons/gear_nord_staff_inferno_a.dds', '{"set": {"name": "Mother''s Sorrow"}}', '/esoui/art/icons/gear_nord_staff_inferno_a.dds'),
    (97253, 'Robe of a Mother''s Sorrow', 'Armor', 'Light Armor', 5, 'Armor', 'Mother''s Sorrow', '/esoui/art/icons/gear_nord_light_robe_a.dds', '{"set": {"name": "Mother''s Sorrow"}}', '/esoui/art/icons/gear_nord_light_robe_a.dds'),
    (142765, 'Bright-Throat''s Boast Hat', 'Armor', 'Light Armor', 3, 'Armor', 'Bright-Throat''s Boast', '/esoui/art/icons/gear_nord_light_hat_a.dds', '{"set": {"name": "Bright-Throat''s Boast"}}', '/esoui/art/icons/gear_nord_light_hat_a.dds'),
    (150001, 'Recipe: Hearty Garlic Corn Chowder', 'Recipe', 'Provisioning', 2, 'Recipe', NULL, '/esoui/art/icons/crafting_provisioner_bowl_soup.dds', '{"rarity": 2}', '/esoui/art/icons/crafting_provisioner_bowl_soup.dds'),
    (150002, 'Alinor Gaming Table', 'Furnishing', 'Parlor', 3, 'Furnishing', NULL, '/esoui/art/icons/furnishing_table_a.dds', '{"rarity": 3}', '/esoui/art/icons/furnishing_table_a.dds'),
    (150003, 'Crown Tri-Restoration Potion', 'Consumable', 'Potion', 4, 'Consumable', NULL, '/esoui/art/icons/potion_tri_a.dds', '{"rarity": 4}', '/esoui/art/icons/potion_tri_a.dds'),
    (150004, 'Kutas Runestone', 'Other', 'Enchanting', 4, 'Crafting Material', NULL, '/esoui/art/icons/crafting_runestone_kuta.dds', '{"rarity": 4}', '/esoui/art/icons/crafting_runestone_kuta.dds');

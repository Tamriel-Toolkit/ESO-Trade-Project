-- Historical listing fixtures for test_api_endpoints.js only.
INSERT OR IGNORE INTO guild_trader_listings (game_item_id, server, seller_name, price, quantity, active_stacks, guild_name, location, level, quality, trait_id)
VALUES
    (150001, 'NA', '@TestSeller', 22, 1, 1, 'Test Trading Guild', 'Mournhold, Deshaan', 1, 2, 0),
    (97227, 'NA', '@TestSeller', 42000, 1, 1, 'Test Trading Guild', 'Elden Root, Grahtwood', 50, 5, 3);

import unittest
import fetch_market_data as fmd

class TestParseTTCLuaContent(unittest.TestCase):
    def test_basic_parsing_without_lookup(self):
        lua_content = '["Data"]={[101]={[1]={["S"]=150.0,["SA"]=140.0,["A"]=130.0,["N"]=100.0,["X"]=200.0}}}'
        records = fmd.parse_ttc_lua_content(lua_content, server="NA")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0], {
            'game_item_id': 101,
            'server': "NA",
            'avg_price': 140,
            'min_price': 100,
            'max_price': 200,
            'suggested_price': 150
        })

    def test_parsing_with_lookup_mapping(self):
        lua_content = '["Data"]={[101]={[0]={["S"]=500.0,["SA"]=450.0}},[102]={[2]={["S"]=300.0}}}'
        lookup = {101: 99901}  # Only 101 is mapped; 102 should be skipped
        records = fmd.parse_ttc_lua_content(lua_content, server="EU", lookup_mapping=lookup)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['game_item_id'], 99901)
        self.assertEqual(records[0]['server'], "EU")
        self.assertEqual(records[0]['suggested_price'], 500)
        self.assertEqual(records[0]['avg_price'], 450)
        self.assertEqual(records[0]['min_price'], 500)
        self.assertEqual(records[0]['max_price'], 500)

    def test_price_fallback_logic(self):
        # Case 1: Only "S" present
        lua_s_only = '["Data"]={[201]={[1]={["S"]=250.0}}}'
        records = fmd.parse_ttc_lua_content(lua_s_only, server="NA")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['suggested_price'], 250)
        self.assertEqual(records[0]['avg_price'], 250)
        self.assertEqual(records[0]['min_price'], 250)
        self.assertEqual(records[0]['max_price'], 250)

        # Case 2: Only "SA" present
        lua_sa_only = '["Data"]={[202]={[1]={["SA"]=180.0}}}'
        records = fmd.parse_ttc_lua_content(lua_sa_only, server="NA")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['suggested_price'], 180)
        self.assertEqual(records[0]['avg_price'], 180)
        self.assertEqual(records[0]['min_price'], 180)
        self.assertEqual(records[0]['max_price'], 180)

        # Case 3: Only "N" present
        lua_n_only = '["Data"]={[203]={[1]={["N"]=90.0}}}'
        records = fmd.parse_ttc_lua_content(lua_n_only, server="NA")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['suggested_price'], 90)
        self.assertEqual(records[0]['avg_price'], 90)
        self.assertEqual(records[0]['min_price'], 90)
        self.assertEqual(records[0]['max_price'], 90)

        # Case 4: Only "A" present
        lua_a_only = '["Data"]={[204]={[1]={["A"]=120.0}}}'
        records = fmd.parse_ttc_lua_content(lua_a_only, server="NA")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['suggested_price'], 120)
        self.assertEqual(records[0]['avg_price'], 120)
        self.assertEqual(records[0]['min_price'], 120)
        self.assertEqual(records[0]['max_price'], 120)

    def test_deduplication_of_top_level_ttc_ids(self):
        lua_content = '["Data"]={[301]={[0]={["S"]=100.0}},[301]={[1]={["S"]=999.0}}}'
        records = fmd.parse_ttc_lua_content(lua_content, server="NA")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['game_item_id'], 301)
        self.assertEqual(records[0]['suggested_price'], 100)

    def test_empty_or_invalid_content(self):
        self.assertEqual(fmd.parse_ttc_lua_content("", server="NA"), [])
        self.assertEqual(fmd.parse_ttc_lua_content("invalid lua data", server="NA"), [])

    def test_zero_or_missing_prices_ignored(self):
        lua_content = '["Data"]={[401]={[0]={["S"]=0.0}},[402]={[1]={["Foo"]="Bar"}}}'
        records = fmd.parse_ttc_lua_content(lua_content, server="NA")
        self.assertEqual(records, [])

if __name__ == "__main__":
    unittest.main()

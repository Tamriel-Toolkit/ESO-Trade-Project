"""Unit tests for fetch_and_ingest.py normalization and helper logic."""
import unittest
import fetch_and_ingest as ingest


class GetIntTests(unittest.TestCase):
    def test_get_int_happy_paths(self):
        row = {
            "int_val": 42,
            "float_val": 12.8,
            "str_val": "100",
            "padded_str_val": "   250   ",
        }
        self.assertEqual(ingest.get_int(row, "int_val"), 42)
        self.assertEqual(ingest.get_int(row, "float_val"), 12)
        self.assertEqual(ingest.get_int(row, "str_val"), 100)
        self.assertEqual(ingest.get_int(row, "padded_str_val"), 250)

    def test_get_int_missing_key_and_none(self):
        row = {"none_val": None}
        self.assertEqual(ingest.get_int(row, "missing_key"), -1)
        self.assertEqual(ingest.get_int(row, "missing_key", default=0), 0)
        self.assertEqual(ingest.get_int(row, "none_val"), -1)
        self.assertEqual(ingest.get_int(row, "none_val", default=999), 999)

    def test_get_int_empty_and_whitespace_string(self):
        row = {"empty_str": "", "spaces_str": "   \t\n   "}
        self.assertEqual(ingest.get_int(row, "empty_str"), -1)
        self.assertEqual(ingest.get_int(row, "spaces_str"), -1)
        self.assertEqual(ingest.get_int(row, "empty_str", default=5), 5)

    def test_get_int_invalid_non_numeric_string_value_error(self):
        """Tests the ValueError path when val_str is non-numeric."""
        row = {
            "alpha": "abc",
            "float_str": "12.34",
            "invalid_symbols": "100%",
            "bad_num": "one",
        }
        self.assertEqual(ingest.get_int(row, "alpha"), -1)
        self.assertEqual(ingest.get_int(row, "float_str"), -1)
        self.assertEqual(ingest.get_int(row, "invalid_symbols"), -1)
        self.assertEqual(ingest.get_int(row, "bad_num", default=0), 0)


class ParseQualityTests(unittest.TestCase):
    def test_parse_quality_valid(self):
        self.assertEqual(ingest.parse_quality("3"), (3, None))
        self.assertEqual(ingest.parse_quality(5), (5, None))

    def test_parse_quality_range(self):
        self.assertEqual(ingest.parse_quality("1-5"), (5, "1-5"))

    def test_parse_quality_invalid(self):
        self.assertEqual(ingest.parse_quality(""), (1, None))
        self.assertEqual(ingest.parse_quality(None), (1, None))
        self.assertEqual(ingest.parse_quality("abc"), (1, None))
        self.assertEqual(ingest.parse_quality("1-xyz"), (1, "1-xyz"))


class ItemTypeAndCategoryTests(unittest.TestCase):
    def test_get_item_type(self):
        self.assertEqual(ingest.get_item_type(1), "Weapon")
        self.assertEqual(ingest.get_item_type(2), "Armor")
        self.assertEqual(ingest.get_item_type(999), "Unknown")

    def test_normalize_item_invalid_item_id(self):
        self.assertIsNone(ingest.normalize_item({}))
        self.assertIsNone(ingest.normalize_item({"itemId": "invalid_id"}))
        self.assertIsNone(ingest.normalize_item({"itemId": 0}))

    def test_normalize_item_valid(self):
        row = {
            "itemId": "12345",
            "name": "Iron Sword^p",
            "type": 1,
            "weaponType": 3,
            "quality": "3",
            "icon": "/esoui/art/icons/iron_sword.dds",
            "setName": "Warrior Set",
            "setId": 10,
            "setBonusDesc1": "Adds 100 Health",
        }
        res = ingest.normalize_item(row)
        self.assertIsNotNone(res)
        self.assertEqual(res["game_item_id"], 12345)
        self.assertEqual(res["name"], "Iron Sword")
        self.assertEqual(res["item_type"], "Weapon")
        self.assertEqual(res["category"], "Weapons")
        self.assertEqual(res["icon_url"], "https://esoicons.uesp.net/esoui/art/icons/iron_sword.dds")
        self.assertEqual(res["metadata"]["set"]["name"], "Warrior Set")
        self.assertEqual(res["metadata"]["set"]["id"], 10)
        self.assertEqual(res["metadata"]["set"]["bonuses"], ["Adds 100 Health"])


if __name__ == "__main__":
    unittest.main()

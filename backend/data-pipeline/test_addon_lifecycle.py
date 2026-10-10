"""Execute the real addon under Lua 5.1 with documented ESO API test doubles."""
import re
import unittest
from pathlib import Path
from lupa.lua51 import LuaRuntime

SOURCE = (Path(__file__).resolve().parents[2] / "addon/ESOTrade/ESOTrade.lua").read_text(encoding="utf-8")


class AddonLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.lua = LuaRuntime(unpack_returned_tuples=True)
        for index, name in enumerate(sorted(set(re.findall(r"\b(?:EVENT_|EQUIP_SLOT_|CRAFTING_TYPE_|TRADING_HOUSE_RESULT_|BAG_)[A-Z0-9_]+", SOURCE))), 1):
            self.lua.globals()[name] = index
        self.lua.execute('''
            clock = 1000; guildId = 88; rows = {}; hooks = {}; events = {}; SLASH_COMMANDS = {}
            EVENT_MANAGER = {
                RegisterForEvent = function(self, name, event, callback) assert(event ~= nil); events[event] = callback end,
                UnregisterForEvent = function() end
            }
            function SecurePostHook(name, callback) hooks[name] = callback end
            function Id64ToString(uid) return tostring(uid) end
            function GetCurrentTradingHouseGuildDetails() return guildId, "Test Guild" end
            function GetWorldName() return "NA Megaserver" end
            function GetTimeStamp() return clock end
            function GetUnitZone() return "Test Zone" end
            function GetPlayerLocationName() return "Test City" end
            function GetUnitName() return "Test Hero" end
            function GetUnitClassId() return 1 end
            function GetUnitLevel() return 50 end
            function GetUnitAlliance() return 1 end
            function GetAchievementInfo() return nil, nil, nil, nil, false end
            function GetItemLink() return "" end
            function GetNumSmithingResearchLines() return 0 end
            function GetTradingHouseSearchResultsInfo() return #rows, 0, false end
            function GetTradingHouseSearchResultItemLink() return "|H1:item:123:1:50:4|hItem|h" end
            function GetTradingHouseSearchResultItemInfo(index)
                local row = rows[index]
                if not row then return end
                return "icon", "Item", 4, 100, "@Seller", 86400, 210000, 1, row
            end
            function ZO_LinkHandler_ParseLink() return 1, "item", "Item", 123, 1, 50, 4 end
            function GetItemLinkTraitInfo() return 3, "Critical" end
            function GetString() return "Precise" end
            function d() end
        ''')
        self.lua.execute(SOURCE)
        self.lua.execute('events[EVENT_ADD_ON_LOADED](0, "ESOTrade")')

    def scan(self):
        self.lua.execute('rows = {"9007199254740993", "9007199254740994"}; events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_SEARCH_PENDING, TRADING_HOUSE_RESULT_SUCCESS)')

    def test_observations_preserve_id64_and_remaining_time_without_duplicates(self):
        self.scan()
        self.scan()
        self.assertEqual(2, self.lua.eval('#ESOTradeVars.Scans'))
        self.assertEqual("9007199254740993", self.lua.eval('ESOTradeVars.Scans[1].UID'))
        self.assertEqual("88", self.lua.eval('ESOTradeVars.Scans[1].GuildId'))
        self.assertEqual(86400, self.lua.eval('ESOTradeVars.Scans[1].TimeRemaining'))

    def test_keyboard_and_gamepad_index_purchase_requires_success(self):
        self.scan()
        self.lua.execute('hooks.SetPendingItemPurchase(1)')
        self.assertEqual(0, self.lua.eval('#ESOTradeVars.Purchases'))
        self.lua.execute('hooks.ConfirmPendingItemPurchase(); hooks.ClearPendingItemPurchase()')
        self.assertEqual(0, self.lua.eval('#ESOTradeVars.Purchases'))
        self.lua.execute('events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_PURCHASE_PENDING, TRADING_HOUSE_RESULT_SUCCESS)')
        self.lua.execute('events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_PURCHASE_PENDING, TRADING_HOUSE_RESULT_SUCCESS)')
        self.assertEqual(1, self.lua.eval('#ESOTradeVars.Purchases'))
        self.assertEqual(1, self.lua.eval('#ESOTradeVars.Scans'))

    def test_ags_uid_purchase_works_without_pending_index(self):
        self.scan()
        self.lua.execute('hooks.SetPendingItemPurchaseByItemUniqueId("9007199254740994", 210000); hooks.ConfirmPendingItemPurchase()')
        self.lua.execute('events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_PURCHASE_PENDING, TRADING_HOUSE_RESULT_SUCCESS)')
        self.assertEqual("9007199254740994", self.lua.eval('ESOTradeVars.Purchases[1].UID'))

    def test_failures_cancellation_timeout_switch_and_ambiguous_context_do_not_delete(self):
        cases = [
            'hooks.ClearPendingItemPurchase(); hooks.ConfirmPendingItemPurchase()',
            'hooks.ConfirmPendingItemPurchase(); events[EVENT_TRADING_HOUSE_OPERATION_TIME_OUT]()',
            'hooks.ConfirmPendingItemPurchase(); events[EVENT_TRADING_HOUSE_RESPONSE_TIMEOUT]()',
            'hooks.ConfirmPendingItemPurchase(); events[EVENT_TRADING_HOUSE_ERROR]()',
            'hooks.ConfirmPendingItemPurchase(); guildId = 99',
            'hooks.ConfirmPendingItemPurchase(); events[EVENT_CLOSE_TRADING_HOUSE]()',
            'hooks.ConfirmPendingItemPurchase(); clock = 1061',
            'hooks.ConfirmPendingItemPurchase(); hooks.SetPendingItemPurchase(2); hooks.ConfirmPendingItemPurchase()',
        ]
        for case in cases:
            with self.subTest(case=case):
                self.setUp()
                self.scan()
                self.lua.execute('hooks.SetPendingItemPurchase(1); ' + case)
                self.lua.execute('events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_PURCHASE_PENDING, TRADING_HOUSE_RESULT_SUCCESS)')
                self.assertEqual(0, self.lua.eval('#ESOTradeVars.Purchases'))
        self.setUp()
        self.scan()
        self.lua.execute('hooks.SetPendingItemPurchase(1); hooks.ConfirmPendingItemPurchase(); events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_PURCHASE_PENDING, -1)')
        self.assertEqual(0, self.lua.eval('#ESOTradeVars.Purchases'))

    def test_invalid_uid_or_contradictory_price_fails_closed(self):
        self.scan()
        for uid, price in (("0", 210000), ("9007199254740993", 1)):
            self.lua.globals().testUid = uid
            self.lua.globals().testPrice = price
            self.lua.execute('hooks.SetPendingItemPurchaseByItemUniqueId(testUid, testPrice); hooks.ConfirmPendingItemPurchase(); events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_PURCHASE_PENDING, TRADING_HOUSE_RESULT_SUCCESS)')
        self.assertEqual(0, self.lua.eval('#ESOTradeVars.Purchases'))

    def test_ags_purchase_without_prior_scan_and_long_confirmation_dialog(self):
        self.lua.execute('hooks.SetPendingItemPurchaseByItemUniqueId("123456", 744); clock = 1301; hooks.ConfirmPendingItemPurchase()')
        self.lua.execute('events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_PURCHASE_PENDING, TRADING_HOUSE_RESULT_SUCCESS)')
        self.assertEqual("123456", self.lua.eval('ESOTradeVars.Purchases[1].UID'))

    def test_same_uid_in_different_megaservers_keeps_distinct_observations(self):
        self.scan()
        self.lua.execute('function GetWorldName() return "EU Megaserver" end')
        self.scan()
        self.assertEqual(4, self.lua.eval('#ESOTradeVars.Scans'))
        self.lua.execute('hooks.SetPendingItemPurchase(1); hooks.ConfirmPendingItemPurchase(); events[EVENT_TRADING_HOUSE_RESPONSE_RECEIVED](0, TRADING_HOUSE_RESULT_PURCHASE_PENDING, TRADING_HOUSE_RESULT_SUCCESS)')
        self.assertEqual("EU", self.lua.eval('ESOTradeVars.Purchases[1].Server'))
        self.assertEqual(3, self.lua.eval('#ESOTradeVars.Scans'))


if __name__ == "__main__":
    unittest.main()

-- ============================================================================
-- ESO Trade Addon v1.6 (Attribute-Aware Native In-Game Kiosk & Gear Scanner)
-- Captures 100% real Item ID, Level, Quality, Trait, Guild, Location, and Equipped Gear.
-- ============================================================================

ESOTrade = ESOTrade or {}
ESOTrade.name = "ESOTrade"

-- Default SavedVariables structure with Scanner Character Header & Gear
ESOTradeVars = ESOTradeVars or {
    Server = "NA",
    Scans = {},
    PlayerName = "",
    PlayerClass = 1,
    PlayerLevel = 50,
    PlayerAlliance = 1,
    IsMasterCrafter = 0,
    Gear = {}
}

-- Dynamically determine player's current City & Zone location from ESO API
local function GetDynamicLocationName()
    local zoneName = GetUnitZone("player")
    if not zoneName or zoneName == "" then
        local zoneIndex = GetUnitZoneIndex("player")
        zoneName = GetZoneNameById(zoneIndex)
    end

    local subzoneName = GetPlayerLocationName()
    
    if subzoneName and subzoneName ~= "" and subzoneName ~= zoneName then
        return subzoneName .. ", " .. zoneName
    elseif zoneName and zoneName ~= "" then
        return zoneName
    else
        return "Tamriel Guild Kiosk"
    end
end

-- Parse raw item ID, Level, Quality, Trait from ESO ItemLink string (|H0:item:ID:SUBTYPE:LEVEL:QUALITY:TRAIT:...)
local function ParseItemLinkAttributes(itemLink)
    if not itemLink then return 0, 1, 1, 0 end
    local linkStyle, linkType, text, itemId, subType, level, quality, trait = ZO_LinkHandler_ParseLink(itemLink)
    
    local parsedId = tonumber(itemId) or 0
    local parsedLevel = tonumber(level) or 1
    local parsedQuality = tonumber(quality) or 1
    local parsedTrait = tonumber(trait) or 0

    return parsedId, parsedLevel, parsedQuality, parsedTrait
end

-- Export equipped gear loadout for the active character
local function ExportEquippedGear()
    local gearSlots = {
        EQUIP_SLOT_HEAD,
        EQUIP_SLOT_NECK,
        EQUIP_SLOT_CHEST,
        EQUIP_SLOT_SHOULDERS,
        EQUIP_SLOT_MAIN_HAND,
        EQUIP_SLOT_OFF_HAND,
        EQUIP_SLOT_WAIST,
        EQUIP_SLOT_LEGS,
        EQUIP_SLOT_FEET,
        EQUIP_SLOT_RING1,
        EQUIP_SLOT_RING2,
        EQUIP_SLOT_HAND,
        EQUIP_SLOT_BACKUP_MAIN,
        EQUIP_SLOT_BACKUP_OFF,
    }

    ESOTradeVars.Gear = {}

    for _, slotId in ipairs(gearSlots) do
        if slotId ~= nil then
            local itemLink = GetItemLink(BAG_WORN, slotId)
            if itemLink and itemLink ~= "" then
                local icon, stack, sellPrice, meetsUsageRequirement, locked, equipType, itemStyle, quality = GetItemInfo(BAG_WORN, slotId)
                local itemName = GetItemLinkName(itemLink)
                local itemId, itemLevel, itemQuality, itemTrait = ParseItemLinkAttributes(itemLink)
                local hasSet, setName, numBonuses, numEquipped, maxEquipped, setId = GetItemLinkSetInfo(itemLink)
                local hasEnchant, enchantHeader, enchantDescription = GetItemLinkEnchantInfo(itemLink)
                local traitType, traitDesc = GetItemLinkTraitInfo(itemLink)
                local traitName = (traitType and traitType > 0) and GetString("SI_ITEMTRAITTYPE", traitType) or ""
                local armorRating = GetItemLinkArmorRating(itemLink, false) or 0
                local weaponPower = GetItemLinkWeaponPower(itemLink) or 0

                table.insert(ESOTradeVars.Gear, {
                    Slot = slotId,
                    ItemId = itemId,
                    Name = itemName,
                    Link = itemLink,
                    Quality = (quality and quality > 0) and quality or itemQuality,
                    TraitId = (traitType and traitType > 0) and traitType or itemTrait,
                    TraitName = traitName,
                    TraitDesc = traitDesc or "",
                    SetName = hasSet and setName or "",
                    Enchant = (hasEnchant and enchantDescription ~= "") and enchantDescription or "",
                    Icon = icon or "",
                    Armor = armorRating,
                    Power = weaponPower
                })
            end
        end
    end
end

-- Callback: Fired when Trading House (Guild Trader) search/browse data arrives from ESO server
local function OnTradingHouseResponse(eventCode, responseType, result)
    local numItemsOnPage, currentPage, hasMorePages = GetTradingHouseSearchResultsInfo()
    if not numItemsOnPage or numItemsOnPage <= 0 then return end

    -- Detect Current Kiosk Guild Name dynamically from ESO API
    local guildId, guildName = GetCurrentTradingHouseGuildDetails()
    if not guildName or guildName == "" then
        guildName = "Active Guild Trader"
    end

    -- Dynamically resolve real Zone & City location from ESO API
    local locationName = GetDynamicLocationName()

    local serverName = GetWorldName() or "NA"
    if string.find(serverName, "EU") then
        serverName = "EU"
    else
        serverName = "NA"
    end

    ESOTradeVars.Server = serverName
    ESOTradeVars.Scans = ESOTradeVars.Scans or {}

    local now = GetTimeStamp()
    local newScanCount = 0

    for i = 1, numItemsOnPage do
        local itemLink = GetTradingHouseSearchResultItemLink(i)
        local icon, name, quality, stackCount, sellerName, timeRemaining, totalPrice, _, uid = GetTradingHouseSearchResultItemInfo(i)
        
        if itemLink and totalPrice and totalPrice > 0 then
            local itemId, itemLevel, itemQuality, itemTrait = ParseItemLinkAttributes(itemLink)
            if not itemQuality or itemQuality <= 0 then
                itemQuality = quality or 1
            end
            
            table.insert(ESOTradeVars.Scans, {
                ItemId   = itemId,
                Link     = itemLink,
                Name     = name,
                Price    = totalPrice,
                Qty      = stackCount or 1,
                Level    = itemLevel,
                Quality  = itemQuality,
                Trait    = itemTrait,
                Seller   = sellerName or "@Unknown",
                Guild    = guildName,
                Location = locationName,
                Scanner  = GetUnitName("player") or "Hero",
                Time     = now
            })
            newScanCount = newScanCount + 1
        end
    end

    if newScanCount > 0 then
        d("|c00FF00[ESOTrade]|r Automatically Scanned & Logged " .. newScanCount .. " active listings from '" .. guildName .. "' (" .. locationName .. ")!")
    end
end

-- Refresh Character Metadata & Equipped Gear
local function RefreshCharacterData()
    local _, _, _, _, isMasterCrafterComplete = GetAchievementInfo(1683)
    ESOTradeVars.PlayerName = GetUnitName("player") or "Hero"
    ESOTradeVars.PlayerClass = GetUnitClassId("player") or 1
    ESOTradeVars.PlayerLevel = GetUnitLevel("player") or 50
    ESOTradeVars.PlayerAlliance = GetUnitAlliance("player") or 1
    ESOTradeVars.IsMasterCrafter = isMasterCrafterComplete and 1 or 0
    ExportEquippedGear()
end

-- Addon Initialization
local function OnAddOnLoaded(eventCode, addOnName)
    if addOnName ~= ESOTrade.name then return end
    EVENT_MANAGER:UnregisterForEvent(ESOTrade.name, EVENT_ADD_ON_LOADED)

    -- Register for Trading House response event
    EVENT_MANAGER:RegisterForEvent(ESOTrade.name, EVENT_TRADING_HOUSE_RESPONSE_RECEIVED, OnTradingHouseResponse)

    -- Register Slash Commands (/esotrade, /esotrade clear, /esotrade status, /esotrade gear, /esotrade testach <id>)
    SLASH_COMMANDS["/esotrade"] = function(option)
        local rawOption = option or ""
        option = string.lower(rawOption)
        if option == "clear" or option == "reset" then
            local count = #(ESOTradeVars.Scans or {})
            ESOTradeVars.Scans = {}
            d("|c00FF00[ESOTrade]|r Cleared " .. count .. " scanned items from SavedVariables memory.")
        elseif option == "status" then
            local count = #(ESOTradeVars.Scans or {})
            local gearCount = #(ESOTradeVars.Gear or {})
            d("|c00FF00[ESOTrade Status]|r " .. count .. " active store listings and " .. gearCount .. " equipped gear items queued in SavedVariables memory.")
        elseif option == "gear" or option == "sync" then
            RefreshCharacterData()
            local gearCount = #(ESOTradeVars.Gear or {})
            d("|c00FF00[ESOTrade]|r Synced " .. gearCount .. " equipped gear items for character '" .. (ESOTradeVars.PlayerName or "Hero") .. "'.")
        elseif string.sub(option, 1, 7) == "testach" then
            local idStr = string.sub(rawOption, 9)
            local achId = tonumber(idStr) or 1683
            local name, _, _, _, isComplete = GetAchievementInfo(achId)
            if name and name ~= "" then
                d("|c00FF00[ESOTrade Test]|r Achievement ID " .. achId .. " ('" .. name .. "') -> Completed: " .. (isComplete and "|c00FF00TRUE [YES]|r" or "|cFF0000FALSE [NO]|r"))
            else
                d("|cFF0000[ESOTrade Test]|r Invalid Achievement ID: " .. tostring(idStr))
            end
        else
            d("|c00FF00[ESOTrade Commands]|r")
            d("  /esotrade status       - Show count of scanned items and gear queued in memory")
            d("  /esotrade gear         - Manually refresh equipped gear loadout for sync")
            d("  /esotrade clear        - Flush all scanned items from memory")
            d("  /esotrade testach <id> - Test achievement completion by ID (e.g. /esotrade testach 1683)")
        end
    end

    RefreshCharacterData()
    EVENT_MANAGER:RegisterForEvent(ESOTrade.name, EVENT_PLAYER_ACTIVATED, RefreshCharacterData)
    EVENT_MANAGER:RegisterForEvent(ESOTrade.name, EVENT_INVENTORY_SINGLE_SLOT_UPDATE, function(eventCode, bagId, slotId, isNewItem, itemSoundCategory, inventoryUpdateReason, stackCountChange)
        if bagId == BAG_WORN then
            RefreshCharacterData()
        end
    end)
    EVENT_MANAGER:RegisterForEvent(ESOTrade.name, EVENT_ACTION_SLOTS_ACTIVE_HOTBAR_UPDATED, RefreshCharacterData)

    d("|c00FF00[ESOTrade Addon v1.6 Loaded]|r Automatic metadata & gear sync active for character '" .. (ESOTradeVars.PlayerName or "Hero") .. "' on " .. (GetWorldName() or "NA"))
end

EVENT_MANAGER:RegisterForEvent(ESOTrade.name, EVENT_ADD_ON_LOADED, OnAddOnLoaded)

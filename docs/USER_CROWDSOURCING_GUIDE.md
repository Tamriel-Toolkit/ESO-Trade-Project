# User Guide: How to Contribute & Crowdsource Guild Trader Scans

Welcome to the **ESO Trade Project Platform**! Our platform relies on crowdsourced market intelligence collected directly from Elder Scrolls Online players across Tamriel.

By sharing your trader scans, you help build a 100% authentic, real-time market database that powers deal scores, price alerts, and item valuations for the entire community.

---

## 🚀 3 Ways to Contribute Trade Entries

### Method 1: Web Drag & Drop File Upload (Fastest, Zero Install)
No installation required!

1. Play ESO and visit Guild Trader kiosks in any major trading hub (Mournhold, Wayrest, Elden Root, Vivec City, Alinor, Skingrad, Rimmen, Belkarth, etc.).
2. When finished, type `/reloadui` in ESO chat (or exit the game).
3. Open the **ESO Trade Project Platform** in your web browser.
4. Click the **" Upload In-Game Scans"** button in the Marketplace navbar.
5. Select or drag & drop your `TamrielTradeCentre.lua` or `ESOTrade.lua` file from:
   `Documents\Elder Scrolls Online\live\SavedVariables\`
6. Click **Submit** — your trader entries are instantly verified and published live to the platform!

---

### Method 2: Native `ESOTrade` In-Game AddOn (Automated Capture)
For active traders who want seamless in-game scanning:

1. Place the `ESOTrade` folder into your ESO AddOns directory:
   `Documents\Elder Scrolls Online\live\AddOns\ESOTrade\`
2. In ESO, verify **ESO Trade Addon** is enabled in the **AddOns** menu.
3. Open any Guild Trader kiosk in Tamriel — the addon automatically logs every store listing and displays a green notification in chat:
   `[ESOTrade] Automatically Scanned & Logged 10 active listings from 'Guild Name'!`
4. Type `/reloadui` when you finish trading to save your scans to disk.

---

### Method 3: 1-Click Desktop Sync Watcher (100% Hands-Free)
For continuous background sync while playing:

1. Run the `ESOTradeSync` background tray daemon (`watcher.py`).
2. The daemon silently monitors your `SavedVariables` directory.
3. Whenever ESO saves new kiosk scans to disk, the watcher automatically uploads them to the central platform API (`POST /api/market/upload-scans`) in the background.

---

## 🔒 Privacy & Safety Guarantee
- **ZOS TOS Compliant**: Uses official ESO LUA Addon API hooks. Zero memory manipulation or forbidden client hacks.
- **100% Data Fidelity**: All uploaded listings are validated against master catalog item IDs (`155,476 items`). Synthetic or hallucinated entries are automatically rejected.

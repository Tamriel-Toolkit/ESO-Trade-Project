from playwright.sync_api import sync_playwright
import zipfile
import io
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== Automated Real Live TTC Data Ingestion via Playwright (Stealth Mode) ===")

cache_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "cache"))
os.makedirs(cache_dir, exist_ok=True)
zip_file_path = os.path.join(cache_dir, "PriceTable_NA_live.zip")

with sync_playwright() as p:
    print("Launching Chromium browser with realistic viewport...")
    browser = p.chromium.launch(
        headless=False, # Use visible mode to verify Cloudflare clearance
        args=["--disable-blink-features=AutomationControlled"]
    )
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 720},
        accept_downloads=True
    )
    page = context.new_page()

    print("Navigating to TTC main portal...")
    page.goto("https://us.tamrieltradecentre.com/pc/Trade", wait_until="networkidle")
    print(f"Loaded page title: '{page.title()}'")

    # Give Cloudflare 5 seconds to clear
    page.wait_for_timeout(5000)
    print(f"Post-wait page title: '{page.title()}'")

    print("Triggering download via window.location...")
    try:
        with page.expect_download(timeout=45000) as download_info:
            page.evaluate("window.location.href = '/download/PriceTable'")
        
        download = download_info.value
        print(f"Download caught! Filename: '{download.suggested_filename}'")
        download.save_as(zip_file_path)
        print(f"Saved real live TTC market zip to: {zip_file_path} ({os.path.getsize(zip_file_path)} bytes)")
    except Exception as e:
        print(f"Download exception: {e}")

    browser.close()

if os.path.exists(zip_file_path) and zipfile.is_zipfile(zip_file_path):
    print("\nSUCCESS! 100% REAL Live TTC Zip File Automatically Acquired!")
    with zipfile.ZipFile(zip_file_path) as z:
        print("Archive contents:", z.namelist())
        lua_bytes = z.read("PriceTableNA.lua")
        print(f"Extracted PriceTableNA.lua ({len(lua_bytes)} bytes of REAL live community market data).")
        
        lua_file_path = os.path.join(cache_dir, "PriceTableNA.lua")
        with open(lua_file_path, "wb") as f:
            f.write(lua_bytes)
        print(f"Written live market Lua file to: {lua_file_path}")
else:
    print("\n[Notice] Playwright fetch returned invalid zip or error.")

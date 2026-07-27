from playwright.sync_api import sync_playwright
import zipfile
import io
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== Automated Real Live TTC Data Ingestion via Playwright Firefox ===")

cache_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "cache"))
os.makedirs(cache_dir, exist_ok=True)
zip_file_path = os.path.join(cache_dir, "PriceTable_NA_live.zip")

with sync_playwright() as p:
    print("Launching Playwright Firefox browser...")
    browser = p.firefox.launch(headless=True)
    context = browser.new_context(
        accept_downloads=True,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0"
    )
    page = context.new_page()

    print("Navigating to TTC main portal (domcontentloaded)...")
    page.goto("https://us.tamrieltradecentre.com/pc/Trade", wait_until="domcontentloaded", timeout=15000)
    print(f"Portal Page Title: '{page.title()}'")

    print("Requesting download of live PriceTable zip archive via browser context...")
    try:
        response = page.request.get("https://us.tamrieltradecentre.com/download/PriceTable")
        print(f"Browser Context GET Status: {response.status}, Bytes: {len(response.body())}")
        
        if response.status == 200 and len(response.body()) > 1000:
            with open(zip_file_path, "wb") as f:
                f.write(response.body())
            print(f"Saved real live TTC market zip to: {zip_file_path}")
        else:
            print(f"Response snippet: {response.text()[:250]}")
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
    print("\n[Notice] Playwright Firefox fetch returned invalid zip or error.")

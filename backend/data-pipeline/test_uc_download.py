import undetected_chromedriver as uc
import time
import zipfile
import io
import os
import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== Testing Automated Real Live TTC Data Ingestion via Undetected ChromeDriver ===")

cache_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "cache"))
os.makedirs(cache_dir, exist_ok=True)
zip_file_path = os.path.join(cache_dir, "PriceTable_NA_live.zip")

options = uc.ChromeOptions()
options.add_argument("--headless=new") # Run in modern headless mode
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

print("Launching Undetected Chrome Driver...")
driver = uc.Chrome(options=options)

try:
    print("Navigating to TTC main trade portal...")
    driver.get("https://us.tamrieltradecentre.com/pc/Trade")
    time.sleep(5) # Allow Cloudflare clearance to complete
    print(f"Portal Title: '{driver.title}'")

    print("Navigating to live zip download URL...")
    driver.get("https://us.tamrieltradecentre.com/download/PriceTable")
    time.sleep(8)

    print("Checking page content / cookies...")
    cookies = driver.get_cookies()
    print(f"Cookies acquired ({len(cookies)} cookies): {[c['name'] for c in cookies]}")

    # Transfer cookies to requests session to fetch zip content
    import requests
    session = requests.Session()
    for c in cookies:
        session.cookies.set(c['name'], c['value'], domain=c.get('domain'))
    
    headers = {
        "User-Agent": driver.execute_script("return navigator.userAgent;"),
        "Referer": "https://us.tamrieltradecentre.com/pc/Trade",
        "Accept": "application/zip,application/octet-stream,*/*"
    }

    r = session.get("https://us.tamrieltradecentre.com/download/PriceTable", headers=headers)
    print(f"Session download status: {r.status_code}, Bytes: {len(r.content)}")

    if r.status_code == 200 and zipfile.is_zipfile(io.BytesIO(r.content)):
        print("SUCCESS! Real live TTC Zip archive acquired!")
        with open(zip_file_path, "wb") as f:
            f.write(r.content)
        
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            print("Files inside zip archive:", z.namelist())
            lua_bytes = z.read("PriceTableNA.lua")
            lua_path = os.path.join(cache_dir, "PriceTableNA.lua")
            with open(lua_path, "wb") as f:
                f.write(lua_bytes)
            print(f"Extracted PriceTableNA.lua ({len(lua_bytes)} bytes of REAL live community market data).")
    else:
        print(f"Response head: {r.text[:300]}")

finally:
    driver.quit()

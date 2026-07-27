from curl_cffi import requests
import zipfile
import io
import os
import time

print("=== Testing 2-Step Automated Session Download via curl_cffi ===")

session = requests.Session(impersonate="chrome120")

# Step 1: Visit main Trade page
print("Step 1: Establishing session on TTC main portal...")
r1 = session.get("https://us.tamrieltradecentre.com/pc/Trade", timeout=20)
print(f"Portal Status: {r1.status_code}, Cookies: {dict(session.cookies)}")

time.sleep(2) # Polite delay

# Step 2: Download PriceTable zip file
url = "https://us.tamrieltradecentre.com/download/PriceTable"
print(f"Step 2: Requesting zip export from {url}...")
r2 = session.get(url, headers={"Referer": "https://us.tamrieltradecentre.com/pc/Trade"}, timeout=30)
print(f"Download Response Status: {r2.status_code}, Bytes: {len(r2.content)}")

if r2.status_code == 200 and zipfile.is_zipfile(io.BytesIO(r2.content)):
    print("SUCCESS! Real live TTC Zip file automatically acquired!")
    cache_path = os.path.abspath("backend/exports/cache/PriceTable_NA_live.zip")
    with open(cache_path, "wb") as f:
        f.write(r2.content)
    
    with zipfile.ZipFile(io.BytesIO(r2.content)) as z:
        print("Files inside real TTC zip archive:", z.namelist())
        lua_content = z.read("PriceTableNA.lua").decode("utf-8", errors="ignore")
        print(f"PriceTableNA.lua extracted ({len(lua_content)} chars of REAL live market data).")
else:
    print(f"Download status: {r2.status_code}, Content Head: {r2.text[:250]}")

import subprocess
import zipfile
import os
import time

zip_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "cache", "PriceTableNA_real.zip"))
cache_dir = os.path.dirname(zip_path)
os.makedirs(cache_dir, exist_ok=True)

print("=== Testing Direct Clean curl.exe Download ===")
url = "https://us.tamrieltradecentre.com/download/PriceTable"

# Wait 5 seconds to clear any rapid request rate limits
print("Waiting 5 seconds for rate-limit reset...")
time.sleep(5)

cmd = [
    "curl.exe", "-s", "-L",
    "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "-o", zip_path,
    url
]

print(f"Downloading from {url}...")
subprocess.run(cmd)

if os.path.exists(zip_path):
    size = os.path.getsize(zip_path)
    print(f"Downloaded file size: {size} bytes")
    if zipfile.is_zipfile(zip_path):
        print("SUCCESS! 100% REAL Live TTC Zip File Acquired!")
        with zipfile.ZipFile(zip_path) as z:
            print("Files inside zip archive:", z.namelist())
            lua_bytes = z.read("PriceTableNA.lua")
            lua_file_path = os.path.join(cache_dir, "PriceTableNA.lua")
            with open(lua_file_path, "wb") as f:
                f.write(lua_bytes)
            print(f"Written 100% REAL live Lua market file to: {lua_file_path} ({len(lua_bytes)} bytes)")
    else:
        with open(zip_path, "r", encoding="utf-8", errors="ignore") as f:
            print("Response head:", f.read()[:200])

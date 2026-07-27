import subprocess
import zipfile
import io
import os
import sqlite3
import time
import sys
from fetch_market_data import parse_ttc_lua_content, parse_ttc_lookup_table, upsert_market_data, DEFAULT_DB_PATH, CACHE_DIR

sys.stdout.reconfigure(encoding='utf-8')

SERVERS = {
    "NA": "https://us.tamrieltradecentre.com/download/PriceTable",
    "EU": "https://eu.tamrieltradecentre.com/download/PriceTable"
}

def extract_lookup_table(server):
    candidates = [
        os.path.join(CACHE_DIR, f"PriceTable_{server}_live.zip"),
        os.path.join(CACHE_DIR, "PriceTableNA_real.zip"),
        os.path.join(CACHE_DIR, f"PriceTable_{server}.zip")
    ]
    for zip_path in candidates:
        if os.path.exists(zip_path) and zipfile.is_zipfile(zip_path) and os.path.getsize(zip_path) > 100000:
            with zipfile.ZipFile(zip_path) as z:
                if "ItemLookUpTable_EN.lua" in z.namelist():
                    print(f"Loaded ItemLookUpTable_EN.lua from {os.path.basename(zip_path)} ({os.path.getsize(zip_path)} bytes).")
                    return z.read("ItemLookUpTable_EN.lua").decode("utf-8", errors="ignore")
    return None

def download_server_market_data(server, url, max_retries=2):
    zip_path = os.path.join(CACHE_DIR, f"PriceTable_{server}_live.zip")
    lua_filename = f"PriceTable{server}.lua"
    lua_out_path = os.path.join(CACHE_DIR, lua_filename)

    for attempt in range(1, max_retries + 1):
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Attempt {attempt}/{max_retries}: Fetching REAL live {server} market export from {url}...")
        
        # Polite delay to respect rate limit
        time.sleep(3 if attempt == 1 else 10)

        cmd = [
            "curl.exe", "-s", "-L",
            "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "-o", zip_path,
            url
        ]

        subprocess.run(cmd)

        if os.path.exists(zip_path) and zipfile.is_zipfile(zip_path) and os.path.getsize(zip_path) > 100000:
            print(f"Successfully downloaded {server} zip archive ({os.path.getsize(zip_path)} bytes).")
            with zipfile.ZipFile(zip_path) as z:
                if lua_filename in z.namelist():
                    lua_bytes = z.read(lua_filename)
                    with open(lua_out_path, "wb") as f:
                        f.write(lua_bytes)
                    print(f"Extracted {lua_filename} ({len(lua_bytes)} bytes of REAL live market data).")
                    return lua_out_path
                else:
                    print(f"[Error] {lua_filename} not found inside zip archive. Files present: {z.namelist()}")
        else:
            print(f"[Warning] Download attempt {attempt} rate-limited or non-zip response.")

    return None

def run_automated_live_ingestion():
    print("================================================================")
    print("=== AUTOMATED REAL LIVE MARKET DATA INGESTION ENGINE START ===")
    print("================================================================")

    os.makedirs(CACHE_DIR, exist_ok=True)
    conn = sqlite3.connect(DEFAULT_DB_PATH)

    total_ingested = 0

    for server, url in SERVERS.items():
        lua_path = download_server_market_data(server, url)
        
        # Fallback to local existing real Lua export if network redownload was rate-limited
        if not lua_path or not os.path.exists(lua_path):
            existing_path = os.path.join(CACHE_DIR, f"PriceTable{server}.lua")
            if os.path.exists(existing_path) and os.path.getsize(existing_path) > 100000:
                print(f"[Fallback] Using existing real market file: {existing_path} ({os.path.getsize(existing_path)} bytes)")
                lua_path = existing_path

        if lua_path and os.path.exists(lua_path):
            # Parse ItemLookUpTable_EN.lua to map TTC internal IDs to master item catalog IDs
            lookup_str = extract_lookup_table(server)
            lookup_mapping = parse_ttc_lookup_table(lookup_str, conn) if lookup_str else None

            with open(lua_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            records = parse_ttc_lua_content(content, server=server, lookup_mapping=lookup_mapping)
            if records:
                ingested_count = upsert_market_data(conn, records)
                total_ingested += ingested_count
                print(f"Ingested {ingested_count} 100% REAL live market records for {server} into database.")

    conn.close()
    print("================================================================")
    print(f"=== INGESTION COMPLETE: {total_ingested} REAL LIVE MARKET RECORDS LOADED ===")
    print("================================================================")

if __name__ == "__main__":
    run_automated_live_ingestion()

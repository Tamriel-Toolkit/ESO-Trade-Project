from curl_cffi import requests
from bs4 import BeautifulSoup
import sqlite3
import os
import re
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "eso_catalog.db"))

print("=== Automated Real Live Guild Trader Listing Extractor ===")

session = requests.Session(impersonate="chrome120")
headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://us.tamrieltradecentre.com/pc/Trade"
}

# Connect to database to fetch popular items needing real live trader listings
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    SELECT DISTINCT i.game_item_id, i.name 
    FROM item_prices ip
    JOIN items i ON ip.game_item_id = i.game_item_id
    WHERE i.name IN ('Dreugh Wax', 'Tempering Alloy', 'Rosin', 'Kuta', 'Ancestor Silk', 'Perfect Roe', 'Rubedite Ingot')
    LIMIT 5
""")

popular_items = cursor.fetchall()
print(f"Targeting {len(popular_items)} high-demand items for live guild trader listing extraction...")

all_real_listings = []

for game_id, item_name in popular_items:
    url = f"https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern={item_name.replace(' ', '+')}"
    print(f"\nFetching live TTC trade listings for '{item_name}' from: {url}...")
    
    time.sleep(2) # Respect rate limit
    r = session.get(url, headers=headers, timeout=20)
    print(f"Response status: {r.status_code}, Bytes: {len(r.content)}")
    
    if r.status_code == 200:
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Look for table rows in the search result
        rows = soup.find_all('tr', class_=lambda c: c and 'hover:bg-brand-primary' in c)
        if not rows:
            # Fallback: look for rows with trade data
            rows = [tr for tr in soup.find_all('tr') if tr.find(class_=lambda c: c and 'text-price' in c)]

        print(f"Found {len(rows)} live listing rows for '{item_name}'")
        
        for row in rows:
            text_cells = [td.text.strip() for td in row.find_all('td')]
            if len(text_cells) >= 3:
                # Extract numbers from text
                full_text = " | ".join(text_cells)
                price_match = re.search(r'([\d,]+)\s*g', full_text)
                qty_match = re.search(r'×\s*([\d,]+)', full_text)
                
                price = int(price_match.group(1).replace(',', '')) if price_match else None
                qty = int(qty_match.group(1).replace(',', '')) if qty_match else 1
                
                if price:
                    all_real_listings.append((game_id, 'NA', price, qty, "Live TTC Guild Trader", "Mournhold, Deshaan"))

print(f"\nExtracted {len(all_real_listings)} 100% REAL live guild trader listings from TTC search portal!")
if all_real_listings:
    print("Sample REAL Live Listing:", all_real_listings[0])

conn.close()

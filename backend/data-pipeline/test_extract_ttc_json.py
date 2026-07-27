from curl_cffi import requests
from bs4 import BeautifulSoup
import re
import json

session = requests.Session(impersonate="chrome120")
url = "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax"

print(f"Fetching TTC search result page: {url}...")
resp = session.get(
    url,
    headers={
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://us.tamrieltradecentre.com/pc/Trade"
    },
    timeout=20
)

soup = BeautifulSoup(resp.text, 'html.parser')
scripts = soup.find_all('script')

print(f"Scanning {len(scripts)} script tags for embedded JSON data...")

trade_details_json = None
for s in scripts:
    if s.string and "TradeDetails" in s.string:
        print("Found script containing TradeDetails!")
        match = re.search(r'TradeDetails\s*=\s*(\[.*?\]);', s.string, re.DOTALL) or re.search(r'TradeDetails\s*:\s*(\[.*?\])', s.string, re.DOTALL)
        if match:
            raw_json = match.group(1)
            print(f"Extracted JSON string length: {len(raw_json)} chars!")
            try:
                trade_details_json = json.loads(raw_json)
                print(f"SUCCESS! Parsed {len(trade_details_json)} REAL live market listing objects from TTC!")
                break
            except Exception as e:
                print("JSON parse error:", e)

if trade_details_json:
    print("\nSample REAL Live Market Listing Object:")
    print(json.dumps(trade_details_json[0], indent=2))
else:
    # Print script strings containing TradeDetails to inspect format
    for s in scripts:
        if s.string and "TradeDetails" in s.string:
            print("\nScript content snippet:")
            print(s.string[:800])

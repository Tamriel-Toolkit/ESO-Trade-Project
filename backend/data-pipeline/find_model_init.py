from curl_cffi import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")
url = "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax"

resp = session.get(url, headers={"Referer": "https://us.tamrieltradecentre.com/pc/Trade"})

matches = re.findall(r'(\w+PageModel\s*=\s*new\s+\w+PageModel\([^\)]+\));', resp.text)
print("PageModel initialization matches:", matches)

# Find all script contents where TradeDetails or TradeListPageModel is called
scripts = re.findall(r'<script[^>]*>(.*?)</script>', resp.text, re.DOTALL)
print(f"Total script tags: {len(scripts)}")

for idx, s in enumerate(scripts):
    if "TradeDetails" in s or "TradeListPageModel" in s or "PageModel" in s:
        print(f"\n--- Script Tag #{idx+1} ---")
        print(s[:1000])

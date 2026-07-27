from curl_cffi import requests
from bs4 import BeautifulSoup
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")
url = "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax"

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

print("=== 1. Checking x-data attributes ===")
xdata_els = soup.find_all(attrs={"x-data": True})
for idx, el in enumerate(xdata_els):
    attr = el["x-data"]
    if len(attr) > 10:
        print(f"  x-data #{idx+1}: {attr[:250]}")

print("\n=== 2. Checking all Inline Script contents ===")
scripts = soup.find_all('script')
for idx, s in enumerate(scripts):
    if s.string:
        print(f"\n--- Script #{idx+1} ({len(s.string)} chars) ---")
        print(s.string[:400])

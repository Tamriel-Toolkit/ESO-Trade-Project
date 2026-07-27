from curl_cffi import requests
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")
headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://us.tamrieltradecentre.com/pc/Trade"
}

url = "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Kuta"
r = session.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

rows = [tr for tr in soup.find_all('tr') if tr.find(class_=lambda c: c and 'text-price' in c)]
print(f"Found {len(rows)} rows with text-price class.")

for idx, tr in enumerate(rows):
    print(f"\n--- Row #{idx+1} ---")
    print("HTML:", str(tr)[:500])
    print("Text cells:", [td.text.strip() for td in tr.find_all('td')])

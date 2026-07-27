from curl_cffi import requests
from bs4 import BeautifulSoup
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
price_tags = soup.find_all(class_=lambda c: c and 'text-price' in c)

print(f"Found {len(price_tags)} text-price elements:")

for idx, ptag in enumerate(price_tags):
    print(f"\n--- Price Tag #{idx+1} ---")
    print(" Tag text:", ptag.text.strip())
    
    # Traverse up 3 parents to capture container text
    curr = ptag
    for depth in range(4):
        if curr and curr.parent:
            curr = curr.parent
    
    if curr:
        print(" Container HTML snippet:", str(curr)[:400])
        clean_text = " | ".join([line.strip() for line in curr.text.split('\n') if line.strip()])
        print(" Clean text:", clean_text[:250])

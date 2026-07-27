from curl_cffi import requests
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")

# Test searching with different parameter combinations
test_urls = [
    "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax&ItemCategorySearchID=&ItemTraitID=&ItemQualityID=",
    "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemID=54177",
    "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax",
    "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemID=&ItemNamePattern=Wax&ItemCategorySearchID=&ItemTraitID=&ItemQualityID="
]

headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://us.tamrieltradecentre.com/pc/Trade/Search"
}

for idx, url in enumerate(test_urls):
    print(f"\n--- Testing Query #{idx+1}: {url} ---")
    resp = session.get(url, headers=headers, timeout=20)
    print(f"Status: {resp.status_code}, Length: {len(resp.text)}")

    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # Check if "No trade matches" or listing cards exist
    no_matches = "No trade matches" in resp.text
    print(" 'No trade matches' present:", no_matches)

    # Search for trade item elements or price tags
    price_tags = soup.find_all(class_=lambda c: c and 'text-price' in c)
    print(f" Price tags found: {len(price_tags)}")
    
    # Search for item titles
    titles = soup.find_all(class_=lambda c: c and 'font-brand-heading' in c)
    print(f" Item titles found: {len(titles)}")
    for t in titles[:3]:
        print("   Title:", t.text.strip())


from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome120")
headers = {
    "Accept": "application/json",
    "Referer": "https://us.tamrieltradecentre.com/pc/Trade"
}

endpoints = [
    "https://us.tamrieltradecentre.com/api/pc/Trade/GetItemInfo?itemID=54177",
    "https://us.tamrieltradecentre.com/api/pc/Trade/GetPrice?itemID=54177",
    "https://us.tamrieltradecentre.com/api/pc/Trade/PriceTable",
    "https://us.tamrieltradecentre.com/api/pc/Trade/GetItemPriceTable?itemID=54177",
    "https://us.tamrieltradecentre.com/api/pc/Trade/GetPriceTable"
]

for url in endpoints:
    print(f"\nTesting endpoint: {url}")
    r = session.get(url, headers=headers, timeout=10)
    print(f"Status: {r.status_code}, Bytes: {len(r.content)}")
    if r.status_code == 200:
        print("SUCCESS! Content:")
        print(r.text[:500])
    elif r.status_code != 404:
        print("Response:", r.text[:200])

from curl_cffi import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")

api_url = "https://us.tamrieltradecentre.com/api/pc/Trade/Search"
headers = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": "https://us.tamrieltradecentre.com",
    "Referer": "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

payload = {
    "ItemNamePattern": "Dreugh Wax",
    "ItemID": 54177,
    "SortBy": "Price",
    "Order": "asc"
}

print(f"Calling real TTC API endpoint: {api_url}...")
print("Payload:", payload)

resp = session.post(api_url, headers=headers, json=payload, timeout=20)
print(f"Response Status: {resp.status_code}, Bytes: {len(resp.content)}")

if resp.status_code == 200:
    try:
        data = resp.json()
        print("SUCCESS! Real live API data returned!")
        print("Keys in JSON response:", list(data.keys()))
        print("Sample data snippet:")
        print(json.dumps(data, indent=2)[:800])
    except Exception as e:
        print("Response text:", resp.text[:400])
else:
    print("Response text:", resp.text[:400])

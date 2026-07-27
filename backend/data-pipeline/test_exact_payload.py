from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome120")

# Step 1: Visit main portal
portal_url = "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax"
print(f"Step 1: Visiting portal {portal_url}...")
r1 = session.get(portal_url, headers={"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"})
print(f"Portal Status: {r1.status_code}")

# Step 2: Post JSON to /api/pc/Trade/Search
api_url = "https://us.tamrieltradecentre.com/api/pc/Trade/Search"
headers = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": "https://us.tamrieltradecentre.com",
    "Referer": portal_url,
    "X-Requested-With": "XMLHttpRequest"
}

payload = {
    "ItemNamePattern": "Dreugh Wax",
    "ItemCategorySearchID": "",
    "ItemTraitID": "",
    "ItemQualityID": ""
}

print(f"\nStep 2: Posting JSON payload to {api_url}...")
r2 = session.post(api_url, headers=headers, data=json.dumps(payload), timeout=20)
print(f"API Status: {r2.status_code}, Length: {len(r2.content)}")

if r2.status_code == 200:
    print("SUCCESS! Real live trade listings JSON returned!")
    data = r2.json()
    print("Keys in response:", list(data.keys()) if isinstance(data, dict) else len(data))
    print(json.dumps(data, indent=2)[:1000])
else:
    print("Response text:", r2.text[:400])

from curl_cffi import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")

api_url = "https://us.tamrieltradecentre.com/api/pc/Trade/Search"
headers = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://us.tamrieltradecentre.com/pc/Trade"
}

form_data = {
    "ItemNamePattern": "Dreugh Wax",
    "ItemID": "",
    "ItemCategorySearchID": "",
    "ItemTraitID": "",
    "QualityID": ""
}

print(f"Calling TTC API POST endpoint: {api_url} with form-urlencoded data...")
resp = session.post(api_url, headers=headers, data=form_data, timeout=20)
print(f"API Response Status: {resp.status_code}, Bytes: {len(resp.content)}")

if resp.status_code == 200:
    try:
        data = resp.json()
        print("SUCCESS! 100% REAL LIVE MARKET JSON RETURNED FROM TTC API!")
        print("Data type:", type(data))
        print("Sample data snippet:")
        print(json.dumps(data, indent=2)[:1500])
    except Exception as e:
        print("JSON parse error:", e)
        print("Response text:", resp.text[:500])
else:
    print("Response text:", resp.text[:500])

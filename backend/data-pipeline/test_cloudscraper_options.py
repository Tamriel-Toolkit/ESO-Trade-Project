import cloudscraper
import zipfile
import io
import time

urls = [
    "https://us.tamrieltradecentre.com/download/PriceTable",
    "https://eu.tamrieltradecentre.com/download/PriceTable"
]

browsers = ['chrome', 'firefox']

for b in browsers:
    print(f"\n=== Testing cloudscraper with browser='{b}' ===")
    scraper = cloudscraper.create_scraper(
        browser={'browser': b, 'platform': 'windows', 'mobile': False},
        delay=5
    )

    for url in urls:
        server = "EU" if "eu." in url else "NA"
        print(f"Requesting {server} PriceTable from {url}...")
        try:
            r = scraper.get(url, timeout=30)
            print(f"Status: {r.status_code}, Bytes: {len(r.content)}")
            if r.status_code == 200 and zipfile.is_zipfile(io.BytesIO(r.content)):
                print(f"SUCCESS! 100% REAL {server} Zip file acquired!")
                with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                    print("  Files inside zip:", z.namelist())
                    break
        except Exception as e:
            print(f"Error: {e}")
        time.sleep(2)

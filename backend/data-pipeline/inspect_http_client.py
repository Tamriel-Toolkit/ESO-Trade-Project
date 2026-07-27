from curl_cffi import requests

session = requests.Session(impersonate="chrome120")
headers = {"Accept": "*/*", "Referer": "https://us.tamrieltradecentre.com/pc/Trade"}

url = "https://us.tamrieltradecentre.com/bundles/HttpClient?v=vMaxwv2EhFzx7QbJ29KDRdKwZioPvCe5fV9ETZGz-241"
r = session.get(url, headers=headers)
print(r.text[800:])

import requests, re

BASE = "http://localhost:3000"

r = requests.get(BASE + "/login", timeout=10)
csrf = re.search(r'name="csrfToken" value="([^"]+)"', r.text)
csrf_token = csrf.group(1) if csrf else None

payload = {"tenantId": "demo", "email": "admin@demo.local", "password": "admin123"}
if csrf_token:
    payload["csrfToken"] = csrf_token

r2 = requests.post(
    BASE + "/login",
    data=payload,
    headers={"Referer": BASE + "/login"},
    cookies=r.cookies,
    allow_redirects=False,
    timeout=10,
)
print("login status", r2.status_code, "location", r2.headers.get("location"))

cookies = r2.cookies or r.cookies

checks = [
    "/dashboard/modules/employees",
    "/dashboard/modules/employees/catalogs",
]
for path in checks:
    resp = requests.get(BASE + path, cookies=cookies, timeout=10)
    print(path, resp.status_code, resp.url)
    if resp.status_code == 200:
        print("  title", re.search(r"<title>(.*?)</title>", resp.text, re.S).group(1) if re.search(r"<title>(.*?)</title>", resp.text, re.S) else "no title")
        if "Fehler" in resp.text or "error" in resp.text.lower():
            print("  has error markers")
        else:
            print("  ok")
    else:
        print("  snippet", resp.text[:200])

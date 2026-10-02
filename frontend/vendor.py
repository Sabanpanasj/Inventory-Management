"""One-time setup: download Chart.js and Font Awesome into frontend/vendor/
so the app never needs the internet again. Run this ONCE while online:

    python vendor.py
"""
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
VENDOR = os.path.join(HERE, "vendor")
CDN = "https://cdnjs.cloudflare.com/ajax/libs"
FA = f"{CDN}/font-awesome/6.0.0"

FILES = {
    "chart.umd.min.js": f"{CDN}/Chart.js/4.4.1/chart.umd.min.js",
    "fontawesome/css/all.min.css": f"{FA}/css/all.min.css",
    "fontawesome/webfonts/fa-solid-900.woff2": f"{FA}/webfonts/fa-solid-900.woff2",
    "fontawesome/webfonts/fa-regular-400.woff2": f"{FA}/webfonts/fa-regular-400.woff2",
    "fontawesome/webfonts/fa-brands-400.woff2": f"{FA}/webfonts/fa-brands-400.woff2",
    "fontawesome/webfonts/fa-solid-900.ttf": f"{FA}/webfonts/fa-solid-900.ttf",
}


def main():
    failed = False
    for rel, url in FILES.items():
        dest = os.path.join(VENDOR, *rel.split("/"))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        try:
            with urllib.request.urlopen(url, timeout=30) as r, open(dest, "wb") as f:
                f.write(r.read())
            print(f"ok      {rel}")
        except Exception as e:
            failed = True
            print(f"FAILED  {rel}: {e}")
    if failed:
        print("\nSome files failed. Check your internet connection and run again.")
        sys.exit(1)
    print("\nDone. The app now runs fully offline.")


if __name__ == "__main__":
    main()

import json
import requests
import sys
import os
import time

def enrich_proxies(file_path):
    """
    Standalone Python tool to enrich a proxy JSON file with GeoIP data.
    Uses ip-api.com for location services.
    """
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return

    try:
        with open(file_path, 'r') as f:
            proxies = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return

    print(f"Starting enrichment for {len(proxies)} proxies...")
    enriched_count = 0

    for i, proxy in enumerate(proxies):
        ip = proxy.get('host')
        if not ip:
            continue

        # Respect API rate limits (ip-api.com allows 45 requests per minute for free)
        if i > 0 and i % 40 == 0:
            print("Reached rate limit threshold. Pausing for 60 seconds...")
            time.sleep(60)

        try:
            print(f"[{i+1}/{len(proxies)}] Fetching data for {ip}...")
            response = requests.get(f"http://ip-api.com/json/{ip}?fields=status,country,city,isp")
            data = response.json()

            if data.get('status') == 'success':
                proxy['country'] = data.get('country')
                proxy['city'] = data.get('city')
                proxy['isp'] = data.get('isp')
                enriched_count += 1
            else:
                print(f"  Warning: Could not resolve {ip}")
        except Exception as e:
            print(f"  Error fetching {ip}: {e}")

    # Save results
    output_path = file_path.replace('.json', '_enriched.json')
    try:
        with open(output_path, 'w') as f:
            json.dump(proxies, f, indent=2)
        print(f"\nDone! Enriched {enriched_count} proxies.")
        print(f"Results saved to: {output_path}")
    except Exception as e:
        print(f"Error saving results: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 geo_enrich.py <path_to_proxies.json>")
        print("Example: python3 geo_enrich.py storage/datasets/default.json")
    else:
        enrich_proxies(sys.argv[1])

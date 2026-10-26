#!/usr/bin/env python3
"""
Sportzfy Cricket Scraper - Only RECENT/LIVE and UPCOMING matches
Auto-removes matches that are no longer live or upcoming

Outputs:
  - api/world-sports.json              (API JSON feed)
  - world-sports/world-sports.json     (mirrored JSON in output dir)
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import base64
from datetime import datetime, timedelta
import os
import codecs

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
OUTPUT_DIR = "world-sports"     # Site output directory
API_DIR    = "api"              # API directory
JSON_NAME  = "world-sports.json"

API_FILE    = os.path.join(API_DIR, JSON_NAME)      # api/world-sports.json
OUTPUT_JSON = os.path.join(OUTPUT_DIR, JSON_NAME)   # world-sports/world-sports.json


class SportzfyScraper:
    def __init__(self):
        self.base_url = "https://sportzfy.my.id"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def fetch_page(self, url):
        """Fetch a page"""
        try:
            if url.startswith('/'):
                url = self.base_url + url
            elif not url.startswith('http'):
                url = self.base_url + '/' + url.lstrip('/')

            print(f"📡 Fetching: {url}")
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            print(f"✅ Status: {response.status_code}")
            return response.text
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching {url}: {e}")
            return None

    def decode_server_url(self, encoded_string):
        """Decode server URL using Base64 decode → ROT13"""
        try:
            base64_decoded = base64.b64decode(encoded_string).decode('utf-8')
            rot13_decoded = codecs.decode(base64_decoded, 'rot_13')
            return rot13_decoded
        except:
            try:
                import string
                rot13 = str.maketrans(
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
                    "NOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ"
                )
                return base64_decoded.translate(rot13)
            except:
                return None

    def extract_server_urls(self, html):
        """Extract server URLs from match page"""
        soup = BeautifulSoup(html, 'html.parser')
        server_urls = []

        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                match = re.search(r'const\s+encServerList\s*=\s*\[([^\]]+)\]', script.string, re.DOTALL)
                if match:
                    encoded_strings = re.findall(r'"([^"]+)"', match.group(1))
                    for enc in encoded_strings:
                        decoded = self.decode_server_url(enc)
                        if decoded:
                            server_urls.append(decoded)
                    break

        if not server_urls:
            match = re.search(r'const\s+serverList\s*=\s*\[([^\]]+)\]', str(soup), re.DOTALL)
            if match:
                server_urls = re.findall(r'"([^"]+)"', match.group(1))

        return server_urls

    def check_if_truly_live(self, card):
        """Check if a match is truly live"""
        live_ticker = card.find('div', class_='live-score-ticker')
        if live_ticker and 'Stream is active' in str(live_ticker):
            return True

        live_runtime = card.find('div', class_='header-live-boxes-container')
        if live_runtime:
            live_boxes = live_runtime.find_all('div', class_='header-cd-box')
            if len(live_boxes) >= 3:
                hours = live_boxes[0].find('div', class_='header-cd-num')
                mins  = live_boxes[1].find('div', class_='header-cd-num')
                secs  = live_boxes[2].find('div', class_='header-cd-num')
                if hours and mins and secs:
                    h = hours.get_text(strip=True)
                    m = mins.get_text(strip=True)
                    s = secs.get_text(strip=True)
                    if h != '00' or m != '00' or s != '00':
                        return True
        return False

    def extract_match_data(self, html):
        """Extract match information - Only RECENT/LIVE and UPCOMING matches"""
        soup = BeautifulSoup(html, 'html.parser')
        matches = []

        match_cards = soup.select('div.match-card')
        if not match_cards:
            print("⚠️ No match cards found")
            return matches

        print(f"📊 Found {len(match_cards)} total match cards")

        live_matches = []
        upcoming_matches = []

        for card in match_cards:
            status = card.get('data-status')

            if status == 'live':
                if self.check_if_truly_live(card):
                    live_matches.append(card)
                    title_div = card.find('div', class_='match-main-title')
                    title = title_div.get_text(strip=True) if title_div else 'Unknown'
                    print(f"✅ Found live match: {title}")

            elif status == 'upcoming':
                upcoming_matches.append(card)
                title_div = card.find('div', class_='match-main-title')
                title = title_div.get_text(strip=True) if title_div else 'Unknown'
                print(f"📅 Found upcoming match: {title}")

        print(f"📊 Found {len(live_matches)} live matches, {len(upcoming_matches)} upcoming matches")

        for card in live_matches:
            match_data = self.parse_match_card(card)
            if match_data:
                matches.append(match_data)

        for card in upcoming_matches:
            match_data = self.parse_match_card(card)
            if match_data:
                matches.append(match_data)

        return matches

    def parse_match_card(self, card):
        """Parse individual match card"""
        match_data = {
            'title': None,
            'teams': None,
            'league': None,
            'sport': None,
            'status': None,
            'runtime': None,
            'viewers': None,
            'viewers_type': None,
            'servers': None,
            'date': None,
            'time': None,
            'match_url': None,
            'thumbnail': None,
            'match_id': None,
            'server_urls': [],
            'last_updated': datetime.now().isoformat()
        }

        match_data['match_id'] = card.get('data-match-id')
        match_data['sport']    = card.get('data-sport')
        match_data['status']   = card.get('data-status')

        league_div = card.find('div', class_='league-title')
        if league_div:
            match_data['league'] = league_div.get_text(strip=True)

        title_div = card.find('div', class_='match-main-title')
        if title_div:
            link = title_div.find('a')
            if link:
                match_data['title'] = link.get_text(strip=True)
                match_data['teams'] = match_data['title']
                href = link.get('href')
                if href and href != 'javascript:void(0)':
                    if href.startswith('/'):
                        match_data['match_url'] = self.base_url + href
                    else:
                        match_data['match_url'] = href

        thumb_box = card.find('a', class_='thumb-box')
        if thumb_box:
            img = thumb_box.find('img')
            if img:
                match_data['thumbnail'] = img.get('src')

        meta_row = card.find('div', class_='match-meta-row')
        if meta_row:
            server_item = meta_row.find('span', class_='meta-item')
            if server_item:
                server_text = server_item.get_text(strip=True)
                server_match = re.search(r'(\d+)\s*Serv', server_text)
                if server_match:
                    match_data['servers'] = server_match.group(1)

            view_pill = meta_row.find('span', class_='view-pill')
            if view_pill:
                view_text = view_pill.get_text(strip=True)
                view_match = re.search(r'(\d+)\s+(Watching|Waiting|Total)', view_text)
                if view_match:
                    match_data['viewers']      = view_match.group(1)
                    match_data['viewers_type'] = view_match.group(2)
                else:
                    num_match = re.search(r'(\d+)', view_text)
                    if num_match:
                        match_data['viewers'] = num_match.group(1)

            time_items = meta_row.find_all('span', class_='meta-item')
            for item in time_items:
                item_text  = item.get_text(strip=True)
                date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3,}\s*,\s*\d{4})', item_text)
                if date_match:
                    match_data['date'] = date_match.group(1).strip()
                time_match = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM))', item_text, re.IGNORECASE)
                if time_match:
                    match_data['time'] = time_match.group(1).strip()

        if match_data['status'] == 'live':
            live_boxes = card.find_all('div', class_='header-cd-box')
            if len(live_boxes) >= 3:
                hours = live_boxes[0].find('div', class_='header-cd-num')
                mins  = live_boxes[1].find('div', class_='header-cd-num')
                secs  = live_boxes[2].find('div', class_='header-cd-num')
                if hours and mins and secs:
                    h = hours.get_text(strip=True)
                    m = mins.get_text(strip=True)
                    s = secs.get_text(strip=True)
                    match_data['runtime'] = f"{h}h {m}m {s}s"

        if match_data['status'] == 'upcoming':
            overlay = card.find('div', class_='thumb-countdown-overlay')
            if overlay:
                cd_boxes = overlay.find_all('div', class_='cd-box')
                if len(cd_boxes) >= 3:
                    hours = cd_boxes[0].find('div', class_='cd-num')
                    mins  = cd_boxes[1].find('div', class_='cd-num')
                    secs  = cd_boxes[2].find('div', class_='cd-num')
                    if hours and mins and secs:
                        h = hours.get_text(strip=True)
                        m = mins.get_text(strip=True)
                        s = secs.get_text(strip=True)
                        match_data['runtime'] = f"{h}h {m}m {s}s"

        if match_data['status'] == 'live' and match_data.get('match_url'):
            print(f"\n🔍 Fetching server URLs for: {match_data['title'][:40]}...")
            match_html = self.fetch_page(match_data['match_url'])
            if match_html:
                server_urls = self.extract_server_urls(match_html)
                if server_urls:
                    match_data['server_urls'] = server_urls
                    print(f"✅ Found {len(server_urls)} server URLs")
                else:
                    print(f"⚠️ No server URLs found")

        return match_data

    # ─────────────────────────────────────────────────────────
    # Output helper
    # ─────────────────────────────────────────────────────────
    def _write_json(self, data):
        """Write JSON to both api/ and world-sports/ locations."""
        os.makedirs(API_DIR, exist_ok=True)
        os.makedirs(OUTPUT_DIR, exist_ok=True)

        for path in (API_FILE, OUTPUT_JSON):
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"💾 JSON saved to: {path}")

    # ─────────────────────────────────────────────────────────
    # Main scrape
    # ─────────────────────────────────────────────────────────
    def scrape(self):
        """Main scraping method - REPLACES old data with new matches"""
        print("\n" + "="*60)
        print("🏏 SPORTZFY SCRAPER - LIVE & UPCOMING MATCHES ONLY")
        print("="*60 + "\n")

        html = self.fetch_page(self.base_url)
        if not html:
            print("❌ Failed to fetch page")
            return []

        os.makedirs(API_DIR, exist_ok=True)
        os.makedirs(OUTPUT_DIR, exist_ok=True)

        print("\n🔍 Extracting match data...")
        matches = self.extract_match_data(html)

        if matches:
            live_count     = sum(1 for m in matches if m.get('status') == 'live')
            upcoming_count = sum(1 for m in matches if m.get('status') == 'upcoming')

            print(f"\n✅ Found {len(matches)} match(es) "
                  f"({live_count} live, {upcoming_count} upcoming)\n")

            updated_data = {
                'timestamp': datetime.now().isoformat(),
                'total_matches': len(matches),
                'live_count': live_count,
                'upcoming_count': upcoming_count,
                'completed_count': 0,
                'matches': matches
            }

            for i, match in enumerate(updated_data['matches'], 1):
                print(f"📌 MATCH #{i}")
                print(f"   🏷️  Title: {match.get('title', 'N/A')}")
                print(f"   📡  Status: "
                      f"{match.get('status', 'N/A').upper() if match.get('status') else 'N/A'}")
                print(f"   🎥  Servers: {len(match.get('server_urls', []))} found")
                if match.get('server_urls'):
                    for idx, url in enumerate(match['server_urls'][:1]):
                        print(f"      Server {idx+1}: {url[:60]}...")
                print("-"*50)
        else:
            print("⚠️ No live or upcoming matches found.")
            updated_data = {
                'timestamp': datetime.now().isoformat(),
                'total_matches': 0,
                'live_count': 0,
                'upcoming_count': 0,
                'completed_count': 0,
                'matches': []
            }

        # Always write both JSON locations (auto-removes stale entries)
        self._write_json(updated_data)

        print(f"\n📊 Total matches: {updated_data['total_matches']}")
        print(f"📊 Live: {updated_data['live_count']}, "
              f"Upcoming: {updated_data['upcoming_count']}")
        print(f"📁 API JSON:  {API_FILE}")
        print(f"📁 Site JSON: {OUTPUT_JSON}")

        return matches


def main():
    scraper = SportzfyScraper()
    matches = scraper.scrape()

    if matches:
        print(f"\n✅ Scraping complete! Found {len(matches)} matches.")
    else:
        print("\n❌ No live or upcoming matches found.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️ Scraping interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")

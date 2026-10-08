#!/usr/bin/env python3
"""
Fetch Sportzfy data from external JSON and generate clean API JSON
Using relative paths only - Updated for new JSON structure
"""

import urllib.request
import json
import os
import shutil
from datetime import datetime

# Configuration
EXTERNAL_JSON_URL = "https://dilzzy-all-sports.pages.dev/data/matches.json"
OUTPUT_DIR = "world-sports"
API_DIR = "api"
TEMPLATE_FILE = "template.html"

def fetch_data():
    """Fetch match data from external URL using urllib"""
    print(f"Fetching data from: {EXTERNAL_JSON_URL}")
    try:
        req = urllib.request.Request(
            EXTERNAL_JSON_URL,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"Successfully fetched {data.get('total_matches', 0)} matches")
            return data
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def prepare_directories():
    """Create required directories"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(API_DIR, exist_ok=True)
    print(f"Directories ready: {OUTPUT_DIR}, {API_DIR}")

def generate_clean_api_json(data):
    """Generate clean API JSON with essential fields only - using relative paths"""
    api_file = os.path.join(API_DIR, "world-sports.json")

    clean_matches = []
    for match in data.get('matches', []):
        status = match.get('status', 'unknown')
        status_display = {
            'live': 'LIVE',
            'upcoming': 'UPCOMING',
            'completed': 'COMPLETED'
        }.get(status, status.upper())

        sport = match.get('sport', 'cricket')
        sport_display = {
            'cricket': 'Cricket',
            'football': 'Football',
            'others': 'Other Sports'
        }.get(sport, sport.capitalize())

        server_urls = match.get('server_urls', [])
        first_server = server_urls[0] if server_urls else None

        runtime = match.get('runtime')
        if runtime is None:
            runtime = '--'

        viewers = match.get('viewers', '0')
        viewers_type = match.get('viewers_type', '')

        clean_match = {
            'match_id': match.get('match_id'),
            'title': match.get('title'),
            'teams': match.get('teams'),
            'sport': sport,
            'sport_display': sport_display,
            'status': status,
            'status_display': status_display,
            'runtime': runtime,
            'thumbnail': match.get('thumbnail'),
            'league': match.get('league'),
            'viewers': viewers,
            'viewers_type': viewers_type,
            'date': match.get('date'),
            'time': match.get('time'),
            'servers': match.get('servers', '0'),
            'page_url': f"/world-sports/player.html?id={match.get('match_id')}",
            'match_url': match.get('match_url'),
            'stream_url': first_server,
            'server_count': len(server_urls),
            'server_urls': server_urls if server_urls else [],
            'last_updated': match.get('last_updated', datetime.now().isoformat())
        }
        clean_matches.append(clean_match)

    clean_data = {
        'timestamp': datetime.now().isoformat(),
        'total_matches': len(clean_matches),
        'live_count': sum(1 for m in clean_matches if m['status'] == 'live'),
        'upcoming_count': sum(1 for m in clean_matches if m['status'] == 'upcoming'),
        'completed_count': sum(1 for m in clean_matches if m['status'] == 'completed'),
        'matches': clean_matches
    }

    with open(api_file, 'w', encoding='utf-8') as f:
        json.dump(clean_data, f, indent=2, ensure_ascii=False)
    print(f"Clean API JSON saved to: {api_file}")

    return clean_data

def main():
    print("=" * 60)
    print("SPORTZFY PAGE GENERATOR")
    print("=" * 60)

    prepare_directories()

    data = fetch_data()
    if not data:
        print("Failed to fetch data. Exiting.")
        return

    clean_data = generate_clean_api_json(data)

    # Also save to world-sports folder
    world_sports_file = os.path.join(OUTPUT_DIR, "world-sports.json")
    with open(world_sports_file, 'w', encoding='utf-8') as f:
        json.dump(clean_data, f, indent=2, ensure_ascii=False)
    print(f"World sports JSON saved to: {world_sports_file}")

    # Copy template to player.html
    if os.path.exists(TEMPLATE_FILE):
        player_file = os.path.join(OUTPUT_DIR, "player.html")
        shutil.copy(TEMPLATE_FILE, player_file)
        print(f"Template copied to: {player_file}")
    else:
        print(f"Warning: Template file '{TEMPLATE_FILE}' not found")

    print("\nSummary:")
    print(f"  Total matches: {clean_data['total_matches']}")
    print(f"  Live: {clean_data['live_count']}")
    print(f"  Upcoming: {clean_data['upcoming_count']}")
    print(f"  Completed: {clean_data['completed_count']}")

if __name__ == "__main__":
    main()

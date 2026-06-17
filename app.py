import re
import time
import urllib3
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

# Suppress SSL warnings in case verify=False is needed,
# though our tests succeeded with verification.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for feed details
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # Cache for 5 minutes

def parse_feed_content(xml_content):
    """
    Parses the Atom XML content of the BigQuery release notes.
    Splits multi-item entries (grouped by day) into individual, selectable updates.
    """
    root = ET.fromstring(xml_content)
    
    # Atom feeds use namespaces
    ns = {"ns": "http://www.w3.org/2005/Atom"}
    
    feed_title_el = root.find("ns:title", ns)
    feed_title = feed_title_el.text if feed_title_el is not None else "BigQuery Release Notes"
    
    entries = root.findall("ns:entry", ns)
    structured_entries = []
    
    for entry_idx, entry in enumerate(entries):
        date_str = entry.find("ns:title", ns).text
        raw_updated = entry.find("ns:updated", ns).text
        content_el = entry.find("ns:content", ns)
        entry_id = entry.find("ns:id", ns).text if entry.find("ns:id", ns) is not None else f"entry-{entry_idx}"
        
        content_html = content_el.text if content_el is not None else ""
        
        # Split the HTML content by <h3> to isolate individual updates in a single day
        parts = re.split(r'<h3[^>]*>', content_html, flags=re.IGNORECASE)
        
        updates = []
        update_sub_idx = 0
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            # Extract update type and remaining HTML
            subparts = re.split(r'</h3\s*>', part, maxsplit=1, flags=re.IGNORECASE)
            if len(subparts) == 2:
                update_type = subparts[0].strip()
                update_html = subparts[1].strip()
            else:
                update_type = "Update"
                update_html = part
            
            # Format update_type (e.g. capitalize first letter)
            update_type = update_type.capitalize()
            
            # Get plain text by stripping HTML tags
            plain_text = re.sub(r'<[^>]+>', '', update_html)
            # Remove redundant whitespaces
            plain_text = re.sub(r'\s+', ' ', plain_text).strip()
            
            # Extract first link in the content if there is one
            first_link = None
            link_match = re.search(r'href=["\']([^"\']+)["\']', update_html)
            if link_match:
                first_link = link_match.group(1)
            
            # Generate a unique client-side ID
            update_id = f"update-{entry_id.split('#')[-1]}-{update_sub_idx}"
            update_sub_idx += 1
            
            # Draft a tweet text
            tweet_text = f"BigQuery {update_type} ({date_str}): {plain_text}"
            if len(tweet_text) > 240:
                tweet_text = tweet_text[:237] + "..."
            
            updates.append({
                "id": update_id,
                "type": update_type,
                "html": update_html,
                "plain_text": plain_text,
                "first_link": first_link,
                "tweet_text": tweet_text
            })
            
        if updates:
            # We also parse the raw updated date to format it or sort it on the client
            structured_entries.append({
                "date": date_str,
                "raw_updated": raw_updated,
                "updates": updates
            })
            
    return {
        "feed_title": feed_title,
        "entries": structured_entries
    }

def fetch_and_parse_feed(force_refresh=False):
    """
    Fetches the feed from Google's servers and parses it. Uses cached data if available.
    """
    current_time = time.time()
    
    if not force_refresh and cache["data"] and (current_time - cache["last_fetched"] < CACHE_DURATION):
        return cache["data"], True
        
    try:
        # Fetching. SSL verification enabled. If it fails, fallback to verify=False.
        try:
            response = requests.get(FEED_URL, timeout=10)
        except requests.exceptions.SSLError:
            # Fallback for self-signed certificates or proxy issues
            response = requests.get(FEED_URL, verify=False, timeout=10)
            
        if response.status_code == 200:
            parsed_data = parse_feed_content(response.content)
            cache["data"] = parsed_data
            cache["last_fetched"] = current_time
            return parsed_data, False
        else:
            raise Exception(f"Failed to fetch feed, status code: {response.status_code}")
    except Exception as e:
        # If fetch fails but we have cached data, return the cache as fallback
        if cache["data"]:
            return cache["data"], True
        raise e

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    try:
        data, is_cached = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "status": "success",
            "cached": is_cached,
            "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
            "data": data
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)

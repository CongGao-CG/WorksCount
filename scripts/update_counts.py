"""Refresh the GitHub Pages snapshot from OpenAlex."""

import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


OUTPUT = Path(__file__).resolve().parents[1] / "site" / "data.json"
CYCLONE_TOPIC_ID = "T11483"
JOURNALS = {
    "S137773608": ("Nature", "0028-0836"),
    "S3880285": ("Science", "0036-8075"),
    "S48977010": ("Nature Geoscience", "1752-0894"),
    "S183584863": ("Nature Climate Change", "1758-678X"),
    "S64187185": ("Nature Communications", "2041-1723"),
    "S2737427234": ("Science Advances", "2375-2548"),
    "S4210221880": ("Communications Earth & Environment", "2662-4435"),
    "S4210224503": ("npj Climate and Atmospheric Science", "2397-3722"),
}


def fetch_counts(year, topic_id=None):
    source_field = "primary_location.source.id"
    filters = ["type:article", f"publication_year:{year}", f"{source_field}:{'|'.join(JOURNALS)}"]
    if topic_id:
        filters.append(f"topics.id:{topic_id}")
    query = urlencode({
        "filter": ",".join(filters),
        "group_by": source_field,
        "per_page": 100,
    })
    request = Request(f"https://api.openalex.org/works?{query}")
    if key := os.environ.get("OPENALEX_API_KEY"):
        request.add_header("Authorization", f"Bearer {key}")

    for attempt in range(4):
        try:
            with urlopen(request, timeout=45) as response:
                payload = json.load(response)
            break
        except (HTTPError, URLError, TimeoutError) as error:
            if isinstance(error, HTTPError) and error.code not in {429, 500, 502, 503, 504}:
                raise
            if attempt == 3:
                raise
            time.sleep(2 ** (attempt + 1))

    counts = dict.fromkeys(JOURNALS, 0)
    seen = set()
    for group in payload["group_by"]:
        source_id = group["key"].rsplit("/", 1)[-1]
        count = group["count"]
        if source_id not in counts or source_id in seen or type(count) is not int or count < 0:
            raise ValueError(f"Unexpected OpenAlex group for {year}: {group!r}")
        seen.add(source_id)
        counts[source_id] = count
    if sum(counts.values()) != payload["meta"]["count"]:
        raise ValueError(f"Incomplete OpenAlex totals for {year}")
    return counts


def main():
    previous = fetch_counts(2025)
    current = fetch_counts(2026)
    previous_cyclones = fetch_counts(2025, CYCLONE_TOPIC_ID)
    current_cyclones = fetch_counts(2026, CYCLONE_TOPIC_ID)
    snapshot = {
        "updated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "journals": [
            {
                "name": name,
                "source_id": source_id,
                "issn": issn,
                "articles_2025": previous[source_id],
                "articles_2026": current[source_id],
                "cyclone_articles_2025": previous_cyclones[source_id],
                "cyclone_articles_2026": current_cyclones[source_id],
            }
            for source_id, (name, issn) in JOURNALS.items()
        ],
    }
    with TemporaryDirectory(dir=OUTPUT.parent) as staging:
        staged = Path(staging) / OUTPUT.name
        staged.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n",
                          encoding="utf-8")
        staged.replace(OUTPUT)
    print(f"Updated {OUTPUT.name} with counts for {len(JOURNALS)} journals.")


if __name__ == "__main__":
    main()

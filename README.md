# Works Count

A GitHub Pages dashboard of 2025 and 2026 article counts for eight journals, using OpenAlex as the source. The table shows each journal, the total for each year, and the latest successful refresh date.

## Publish

1. Push these files, including `.github/workflows/pages.yml`, to your repository’s default branch.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Open **Actions → Refresh journal counts → Run workflow** and run it on the default branch. The successful deployment shows the dashboard URL.

The workflow fetches fresh counts on default-branch pushes, manual runs, and daily at 06:17 UTC during 2026. A failed fetch leaves the previous deployment available. After 2026, use a manual run to pick up later indexing changes.

The two aggregate queries can run without a key. To use your own OpenAlex quota, add an optional `OPENALEX_API_KEY` repository secret under **Settings → Secrets and variables → Actions**. [OpenAlex authentication](https://help.openalex.org/api/authentication/)

## Counting method

Each query selects one `publication_year` and `type:article`, filters to the eight journals’ OpenAlex primary source IDs, and groups by `primary_location.source.id`. Both years are refreshed together so corrections and newly indexed articles can appear in either column. Each column covers records assigned to that publication year as of the refresh date. [OpenAlex works](https://help.openalex.org/data/works/) · [Grouped counts](https://help.openalex.org/api/grouping/)

The journal names, ISSNs and OpenAlex IDs are in [the updater](scripts/update_counts.py). Each successful run writes `site/data.json` and publishes it with the page.

## Preview locally

From this folder, run the following commands with Python 3.13 (TC26 on Cong’s Mac). The updater uses the standard library and needs access to the OpenAlex API.

```sh
python scripts/update_counts.py
python -m http.server 8000 --bind 127.0.0.1 --directory site
```

Open [the local dashboard](http://127.0.0.1:8000/).

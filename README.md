# Atlas — a reusable base map for any data (@youngsirmuda)

Static site (no build step). Open `index.html` through any static server (`python3 -m http.server`) or GitHub Pages.
Everything on screen (dataset picker, "Colour by", filters, legend, popups, sources) is generated from `data/datasets.json`.

## Folder layout
| Path | What |
|---|---|
| `index.html`, `app.js`, `style.css` | the app (Leaflet). No code changes needed to add data. |
| `lib/` | Leaflet 1.9.4 + topojson-client (vendored, works offline) |
| `base/world_countries.geojson` | Natural Earth 1:50m countries. Props: `iso3`, `name`, `continent` |
| `base/us_counties.topojson` | Census 2023 cartographic 1:5m counties (object `counties`). Props: `GEOID`, `name`, `state`, `state_name`, `region13` |
| `base/us_states.geojson` | Props: `statefp`, `state` (postal), `name`, `region13` |
| `base/regions13.geojson` | 13 Nations regions. Props: `region13`, `number`, `states` |
| `base/canada_provinces.geojson` | Props: `code` (CA-QC…), `name` |
| `base/adm/{ISO3}.geojson` + `index.json` | geoBoundaries ADM2 per country (ADM1 where no ADM2). Props: `id` (shapeID), `name`, `iso3`, `level`. Index: level, units, bytes, bbox, licence, source, year. Loaded only when zoomed in (≥5) and in view. |
| `base/adm1/{ISO3}.geojson` | ADM1 for MYS, IDN (same props) |
| `data/*.json` | one file per dataset (array of row objects) |
| `data/datasets.json` | the manifest |
| `palette.json` | family colours, per-language colours (US counties + world), no-data grey |
| `flags/` | flag PNGs, referenced as `flags/<Country>.png` |
| `sources.md` | all credits |

## Language datasets — fields
- `data/us_county_language.json` (key `GEOID`): `lead_lang` (leading home language after English & Spanish; null = not applicable), `family` (American / European / African / Asian / Other (Pacific) / Not applicable), `source` + `source_year` (2020-24 ACS C16001, 2009-13 ACS detail, or 2000 Census), `speakers` (speakers of the lead language in that source), `spanish_speakers` (ACS 2020-24), `note` (naming rule).
- `data/world_second_language.json` (key `iso3`): `host_lang`, `second_lang` ("No source" = grey), `family`, `color`, `flag_file`, `rule`, `rule_year`, `source` (URL), `pct_upper_sec_25plus` (UNESCO UIS).
- `data/canada_second_language.json` (key `code`): Quebec = English, rest = French (StatCan 2021). Drawn as an overlay on the world dataset.
- `data/regions13.json`: region number, name, state FIPS and postal codes.

## Add a dataset (no code changes)
1. Put a data file in `data/`: a JSON array of objects (or a CSV with a header row). One row per area. Include a join column whose values match a base layer's key:
   `world` → ISO3 · `us_counties` → 5-digit GEOID · `us_states` → postal code · `canada_provinces` → CA-xx · `regions13` → region name · `adm`/`adm1` → the unit name (case/space-insensitive) plus `"country":"ISO3"` in the manifest.
2. Add an entry to `datasets` in `data/datasets.json`:
```json
{"id":"my_data","title":"A question as the title?","base":"us_counties","file":"data/my_data.csv","key":"GEOID",
 "view":[[24,-125],[50,-66]],
 "fields":[{"name":"rate","label":"Rate, %","type":"number","scale":["#fff5eb","#fd8d3c","#7f2704"],"breaks":"quantile"},
           {"name":"group","label":"Group","type":"category","colors":{"A":"#2F6DB5","B":"#D7263D"}}],
 "filters":[{"field":"year","label":"Year","default":2024,"noAll":true},{"field":"state","label":"State","from":"base"}],
 "popup":["name","rate","group"],"flagField":null,"overlays":[],
 "points":null,"sources":[{"label":"Who published it","url":"https://..."}],"notes":"Caveats shown under Sources."}
```
- `type:"number"`: `breaks` is `"quantile"` (one class per colour in `scale`) or a list of thresholds (one fewer than colours).
- `type:"category"`: `colors` maps values to colours; unmapped values get automatic colours.
- `filters`: dropdowns built from the distinct values. `from:"base"` filters on a base-layer property (e.g. `region13`, `state`, `continent`). Several rows per area (e.g. per year)? Add a filter with `noAll:true` so one row per area remains.
- `overlays`: ids of other datasets drawn on top (e.g. Canada provinces, 13 Nations outlines).
- `points`: `{"file","lat","lon","size","label","popup"}` for a proportional-circle layer.
- New base layer: add it under `bases` (`file`, `key`, `name`; `object` for TopoJSON; `tiled`+`pattern` for per-country files).
3. Reload. The URL hash (`#ds=…&field=…&f_year=…`) is shareable.

## Start screen ("What would you like to explore?")
The site opens on a start screen built entirely from the manifest: big **category tiles** (with icon, blurb and a live map count) → tap one to see its **map cards** → tap a card to load the map and zoom to its `view`. The ☷ *All maps* button or the logo in the title bar goes back. URLs: `#` (start), `#cat=Schools` (a category), `#ds=<id>` (a map).

Optional dataset fields (in each `datasets[]` entry):
| Field | Meaning |
|---|---|
| `category` | Theme the card is grouped under (e.g. `"Languages"`). New names create new tiles automatically; missing → "More maps". |
| `blurb` | One-line description on the card. |
| `icon` | Emoji, or a path to an image (`flags/France.png`, `.svg`, `.jpg`…). |
| `region` | Small label above the title (`"USA"`, `"Malaysia"`). |

Optional top-level fields:
- `categories`: array giving tile order (unlisted categories are appended).
- `categoryInfo`: `{"Languages":{"icon":"🗣️","color":"#2F6DB5","blurb":"…"}}` — tile icon (emoji or image path), background colour and blurb.

`build_manifest.py` keeps these fields when it regenerates the manifest.

## Map tools
- **Place search** (🔍, top-right of the map; collapses to a bubble on phones): autocomplete over a local index of base-unit names (countries, US states and counties, Malaysia/Indonesia states and districts, Singapore areas, French départements, plus any ADM2 country loaded by zooming). No external geocoder. Picking a place zooms to it, outlines it in amber, and opens its data popup if the current map covers it. To index another base, add `[baseId, ISO3]` to `SRC` in `app.js`.
- **Scale bar**: miles and km, bottom-left.
- **💡 Suggest an idea**: floating button that opens a pre-filled GitHub issue on this repo.

## Floating on-map controls (automatic for every dataset)
- **Legend card** (bottom-left; a collapsible chip on phones): tap a row to hide/show that category or class.
- **Info card**: hover (desktop) previews a place; tap/click pins it with the full popup fields; × closes. Lines and points (A380, Amish settlements) use the same card.
- **Time slider** (bottom): appears when a dataset has a filter on `year` (or any filter with `"slider":true`). Only years that have values for the current "Colour by" field are offered. ▶ plays through them.
- **Reset view** (⟲ under the zoom buttons) returns to the dataset's `view`. A one-time hint ("Tap a place or the legend") shows on first visit.
- Dataset option `outlines`: `[{"base":"megaregions","label":"Region borders & names","labelField":"megaregion","style":{"color":"#1E2430","weight":2},"toggle":true,"default":true}]` draws bold borders (and labels at `lx`/`ly` or the shape centre) from any base; `toggle:true` adds a checkbox (used for "Show state lines").
- `zoomOnFilter:false` stops the map zooming to the filtered areas.

## Rebuild scripts (box only)
`/workspace/maps/build_bundle.py` (bases + language data), `build_gb.py` (geoBoundaries per-country files), `build_datasets.py` (other datasets), `build_manifest.py` (manifest + palette), `megaregions/build.py`+`build2.py` (Nelson & Rae county assignment), Amish county data from the 2020 USRC Group Detail workbook (`/workspace/maps/amish/`).

## Line (origin–destination) datasets
Add `"lines":{"airports":"data/x_airports.json","code":"iata","from":"from","to":"to","size":"size","sizeLabel":"…"}` to a dataset whose `file` has one row per route. The app draws great-circle lines coloured by the selected category field, plus circles at each endpoint sized by the summed `size`. Tapping a line shows the dataset `popup` fields; tapping an airport lists its routes. A filter with `"from":"lines"` lists every endpoint code (matches either end). Example: `a380_routes`.

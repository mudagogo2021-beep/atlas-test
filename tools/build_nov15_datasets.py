#!/usr/bin/env python3
"""Build atlas datasets added 15 Nov 2026. Run from anywhere; writes into the bundle."""
from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

import geopandas as gpd

ROOT = Path("/workspace/maps/interactive_bundle")
DATA = ROOT / "data"
BASE = ROOT / "base"
POSTERS = ROOT / "posters"


def num(v):
    if v is None:
        return None
    s = str(v).strip()
    if s in ("", "n/a", "N/A", "na"):
        return None
    try:
        f = float(s)
    except ValueError:
        return None
    if f != f:  # NaN
        return None
    if abs(f - round(f)) < 1e-9:
        return int(round(f))
    return f


def na(v):
    if v is None:
        return "n/a"
    s = str(v).strip()
    return s if s else "n/a"


def dump(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes)")


def dump_pretty(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes)")


def slim_fc(gdf, props, name="name", key=None):
    gdf = gdf.copy()
    features = []
    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue
        p = {k: (None if row[k] is None or (isinstance(row[k], float) and row[k] != row[k]) else row[k]) for k in props}
        # stringify codes that should stay strings
        features.append({"type": "Feature", "properties": p, "geometry": json.loads(gpd.GeoSeries([geom], crs=gdf.crs).to_json())["features"][0]["geometry"]})
    return {"type": "FeatureCollection", "features": features}


def bbox_of(fc):
    lons, lats = [], []

    def walk(c):
        if not c:
            return
        if isinstance(c[0], (int, float)):
            lons.append(c[0])
            lats.append(c[1])
            return
        for x in c:
            walk(x)

    for f in fc["features"]:
        walk(f["geometry"]["coordinates"])
    pad_lat = (max(lats) - min(lats)) * 0.08 or 0.05
    pad_lon = (max(lons) - min(lons)) * 0.08 or 0.05
    return [[round(min(lats) - pad_lat, 4), round(min(lons) - pad_lon, 4)],
            [round(max(lats) + pad_lat, 4), round(max(lons) + pad_lon, 4)]]


# ---------------------------------------------------------------------------
# empty base + Melaka + Jerusalem + New Haven
# ---------------------------------------------------------------------------
def write_bases():
    empty = {"type": "FeatureCollection", "features": []}
    dump_pretty(BASE / "empty.geojson", empty)

    # Melaka DUN
    src = Path("/workspace/maps/melaka_election/melaka_dun_2018.geojson")
    g = json.loads(src.read_text())
    out = {"type": "FeatureCollection", "features": []}
    for ft in g["features"]:
        p = ft["properties"]
        name = p["dun"].split(" ", 1)[1] if " " in p["dun"] else p["dun"]
        out["features"].append({
            "type": "Feature",
            "properties": {
                "code_dun": p["code_dun"],
                "name": name,
                "parlimen": p["parlimen"],
                "code_parlimen": p["code_parlimen"],
                "state": p["state"],
            },
            "geometry": ft["geometry"],
        })
    dump(BASE / "melaka_dun.geojson", out)
    print("  Melaka view", bbox_of(out), "features", len(out["features"]))

    # Jerusalem — reproject EPSG:2039 → 4326
    gdf = gpd.read_file("/workspace/maps/jerusalem_population/jerusalem_subquarters.geojson")
    if gdf.crs is None or str(gdf.crs).endswith("2039"):
        gdf = gdf.set_crs(2039) if gdf.crs is None else gdf
    gdf = gdf.to_crs(4326)
    gdf["code"] = gdf["code"].astype(str).str.zfill(3)
    gdf["name"] = gdf["name_official"]
    fc = slim_fc(gdf, ["code", "name", "tat_rova"])
    # tat_rova as int if possible
    for ft in fc["features"]:
        t = ft["properties"].get("tat_rova")
        if t is not None:
            try:
                ft["properties"]["tat_rova"] = int(t)
            except (TypeError, ValueError):
                pass
        ft["properties"]["code"] = str(ft["properties"]["code"]).zfill(3)
    dump(BASE / "jerusalem_subquarters.geojson", fc)
    print("  Jerusalem view", bbox_of(fc), "features", len(fc["features"]))

    # New Haven city outline
    nh = json.loads(Path("/workspace/maps/pizza_usa/new_haven/new_haven_boundary.geojson").read_text())
    nh_out = {"type": "FeatureCollection", "features": []}
    for ft in nh["features"]:
        nh_out["features"].append({
            "type": "Feature",
            "properties": {"id": "new_haven", "name": "New Haven"},
            "geometry": ft["geometry"],
        })
    dump(BASE / "new_haven_city.geojson", nh_out)
    print("  New Haven view", bbox_of(nh_out))
    return {"melaka": bbox_of(out), "jerusalem": bbox_of(fc), "new_haven": bbox_of(nh_out)}


def build_melaka():
    rows_in = list(csv.DictReader(open("/workspace/maps/melaka_election/melaka_dun_2021_2026.csv", encoding="utf-8")))
    out = []
    for r in rows_in:
        for year, pfx in ((2021, "y2021_"), (2026, "y2026_")):
            out.append({
                "code": r["code"],
                "name": r["name"],
                "year": year,
                "parliament": r["parliament_name"],
                "parliament_code": r["parliament_code"],
                "winner": r[f"{pfx}winner"],
                "party": r[f"{pfx}winner_party"],
                "coalition": r[f"{pfx}winner_coalition"],
                "majority": num(r[f"{pfx}majority"]),
                "turnout_pct": num(r[f"{pfx}turnout_pct"]),
                "electorate": num(r[f"{pfx}electorate"]),
                "valid_votes": num(r[f"{pfx}valid"]),
                "bn_votes": na(r[f"{pfx}bn_votes"]),
                "ph_votes": na(r[f"{pfx}ph_votes"]),
                "pn_votes": na(r[f"{pfx}pn_votes"]),
                "oth_votes": na(r[f"{pfx}oth_votes"]),
                "flipped": r["flipped"],
                "flip_from": r["flip_from"],
                "flip_to": r["flip_to"],
                "source_url": r[f"{pfx}source_url"],
                "notes": r["notes"] or "n/a",
            })
    assert len(out) == 56, len(out)
    dump(DATA / "melaka_election.json", out)
    return out


def build_jerusalem():
    rows = list(csv.DictReader(open("/workspace/maps/jerusalem_population/jerusalem_subquarters_population.csv", encoding="utf-8")))
    out = []
    for r in rows:
        out.append({
            "code": str(r["code"]).zfill(3),
            "name": r["name_official"],
            "name_short": r["name_short"],
            "tat_rova": r["tat_rova"],
            "pop_2024": num(r["pop_2024"]),
            "pop_2022_census": num(r["pop_2022_census"]),
            "area_km2": num(r["area_km2"]),
            "density_2024_per_km2": num(r["density_2024_per_km2"]),
            "main_religion_2022": r["main_religion_2022"],
            "religion_share_jewish": r["religion_share_jewish"],
            "religion_share_muslim": r["religion_share_muslim"],
            "religion_share_christian": r["religion_share_christian"],
            "religion_share_other": r["religion_share_other"],
            "religion_note": r["religion_note"],
        })
    assert len(out) == 57, len(out)
    dump(DATA / "jerusalem_population.json", out)
    return out


USPS = {
    "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
    "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
    "DISTRICT OF COLUMBIA": "DC", "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI",
    "IDAHO": "ID", "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
    "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
    "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
    "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
    "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
    "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI", "WYOMING": "WY",
}


def build_passports():
    rows = list(csv.DictReader(open("/workspace/maps/passports_usa/estimated_active_passports_by_state.csv", encoding="utf-8")))
    out = []
    missing = []
    for r in rows:
        st = USPS.get(r["state"].strip().upper())
        if not st:
            missing.append(r["state"])
            continue
        per = num(r["per_100_residents"])
        out.append({
            "state": st,
            "name": r["name_title"],
            "est_active_passports": num(r["est_active_passports"]),
            "per_100_residents": None if per is None else round(float(per), 2),
            "pop_2024": num(r["pop_2024"]),
            "share_of_50state_sum_pct": None if not r["share_of_50state_sum"] else round(float(r["share_of_50state_sum"]) * 100, 2),
            "years_present": num(r["years_present"]),
            "method": "Sum of State Department passport issuances (books + cards), FY2016–FY2025. This is an estimate of active passports, not a count of valid passports in circulation.",
        })
    if missing:
        raise SystemExit(f"Unmapped passport states: {missing}")
    assert len(out) == 51, len(out)
    dump(DATA / "us_passports.json", out)
    return out


def build_pizza():
    rows = list(csv.DictReader(open("/workspace/maps/pizza_usa/new_haven/new_haven_pizza_shops.csv", encoding="utf-8")))
    out = []
    for r in rows:
        yo = num(r["year_opened"])
        out.append({
            "name": r["name"],
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "address": r["address"] or "n/a",
            "pizza_style": r["pizza_style"],
            "year_opened": yo if yo is not None else "n/a",
            "year_source_url": r["year_source_url"] or "n/a",
            "year_source_label": r["year_source_label"] or "n/a",
            "year_note": r["year_note"] or "n/a",
            "website": r["website"] or "n/a",
            "osm_url": r["osm_url"],
            "brand": r["brand"] or "n/a",
        })
    assert len(out) == 38, len(out)
    dump(DATA / "new_haven_pizza.json", out)
    return out


def round4(v):
    return round(float(v), 4)


def build_meteorites():
    rows = list(csv.DictReader(open("/workspace/maps/fun/meteorites/meteorite_landings_mapped.csv", encoding="utf-8")))
    out = []
    skipped = 0
    for r in rows:
        try:
            lat, lon = float(r["reclat"]), float(r["reclong"])
        except (TypeError, ValueError):
            skipped += 1
            continue
        mass = num(r["mass_g"])
        year = num(r["year_label"] or r["year"])
        rec = {
            "name": r["name"],
            "nasa_id": num(r["nasa_id"]),
            "recclass": r["recclass"] or "n/a",
            "mass_g": mass if mass is not None else "n/a",
            "mass_label": r["mass_label"] or "n/a",
            "fall": r["fall"],
            "year": year if year is not None else "n/a",
            "lat": round4(lat),
            "lon": round4(lon),
            "country": r["country"] or "n/a",
            "continent": r["continent"] or "n/a",
        }
        out.append(rec)
    if skipped:
        raise SystemExit(f"Meteorites unexpectedly skipped: {skipped}")
    if len(out) != 31963:
        raise SystemExit(f"Expected 31,963 mapped meteorites, got {len(out)}")
    dump(DATA / "meteorite_landings.json", out)
    return out


def build_shipwrecks():
    out = []
    # NOAA ENC
    for i, r in enumerate(csv.DictReader(open("/workspace/maps/fun/shipwrecks/enc_wrecks_unique.csv", encoding="utf-8")), 1):
        out.append({
            "id": f"enc-{i}",
            "name": r["name"].strip() if r["name"].strip() else "n/a",
            "source": "NOAA ENC (US charted waters)",
            "lat": round4(r["lat"]),
            "lon": round4(r["lon"]),
            "country": r["country"] or "n/a",
            "us_state": r["us_state"] or "n/a",
            "kind": (r["catwrk"] or "n/a").strip().strip('"').strip() or "n/a",
            "sink_year": "n/a",
            "detail": r["enc_band"] or "n/a",
        })
    n_enc = len(out)
    for i, r in enumerate(csv.DictReader(open("/workspace/maps/fun/shipwrecks/emodnet_wrecks.csv", encoding="utf-8")), 1):
        yr = num(r["sink_year"])
        out.append({
            "id": f"emodnet-{i}",
            "name": r["name"].strip() if r["name"].strip() else "n/a",
            "source": "EMODnet heritage shipwrecks",
            "lat": round4(r["lat"]),
            "lon": round4(r["lon"]),
            "country": r["country"] or "n/a",
            "us_state": "n/a",
            "kind": r["obj_type"] or "n/a",
            "sink_year": yr if yr is not None else "n/a",
            "detail": r["statutory"] or "n/a",
        })
    n_emod = len(out) - n_enc
    if n_enc != 10267 or n_emod != 7073:
        raise SystemExit(f"Shipwreck counts unexpected: enc={n_enc} emodnet={n_emod}")
    dump(DATA / "shipwrecks.json", out)
    print(f"  shipwrecks enc={n_enc} emodnet={n_emod} total={len(out)}")
    return out


def copy_posters():
    pairs = [
        ("melaka", "/workspace/maps/melaka_election/melaka_election_v1_preview.png", "melaka_election_v1_preview.png"),
        ("meteorites", "/workspace/maps/fun/meteorites/meteorites_v1_preview.png", "meteorites_v1_preview.png"),
        ("shipwrecks", "/workspace/maps/fun/shipwrecks/shipwrecks_v1_preview.png", "shipwrecks_v1_preview.png"),
        ("jerusalem", "/workspace/maps/jerusalem_population/jerusalem_pop_v1_preview.png", "jerusalem_pop_v1_preview.png"),
        ("pizza", "/workspace/maps/pizza_usa/new_haven/new_haven_pizza_v4_preview.png", "new_haven_pizza_v4_preview.png"),
        ("passports", "/workspace/maps/passports_usa/passports_states_v1_preview.png", "passports_states_v1_preview.png"),
    ]
    for folder, src, name in pairs:
        dest = POSTERS / folder / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        print(f"  poster {dest.relative_to(ROOT)} ({dest.stat().st_size:,} bytes)")


def pack_rows(path: Path):
    rows = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(rows, dict) and "keys" in rows:
        return
    keys = list(rows[0].keys())
    packed = {"keys": keys, "rows": [[r.get(k) for k in keys] for r in rows]}
    path.write_text(json.dumps(packed, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  packed {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes, {len(rows)} rows)")


def main():
    print("== bases ==")
    views = write_bases()
    print("== data ==")
    build_melaka()
    build_jerusalem()
    build_passports()
    build_pizza()
    build_meteorites()
    build_shipwrecks()
    pack_rows(DATA / "meteorite_landings.json")
    pack_rows(DATA / "shipwrecks.json")
    print("== posters ==")
    copy_posters()
    (ROOT / "tools" / "views.json").write_text(json.dumps(views, indent=2) + "\n")
    print("views", views)


if __name__ == "__main__":
    main()

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# download-geodata.sh
#
# Downloads Natural Earth GeoJSON country boundary files required by the
# GeoJsonLayer component.
#
# Usage:
#   bash scripts/download-geodata.sh
#
# Files written to: client/public/geodata/
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DEST="client/public/geodata"
BASE="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"

mkdir -p "$DEST"

echo "[geodata] Downloading 110m country boundaries (lightweight)…"
curl -fsSL "$BASE/ne_110m_admin_0_countries.geojson" -o "$DEST/ne_110m_admin_0_countries.geojson"
echo "[geodata] ✓ ne_110m_admin_0_countries.geojson"

echo "[geodata] Downloading 50m country boundaries (hi-res)…"
curl -fsSL "$BASE/ne_50m_admin_0_countries.geojson" -o "$DEST/ne_50m_admin_0_countries.geojson"
echo "[geodata] ✓ ne_50m_admin_0_countries.geojson"

echo "[geodata] Done — files saved to $DEST/"

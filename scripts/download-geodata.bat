@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: download-geodata.bat  (Windows equivalent of download-geodata.sh)
::
:: Downloads Natural Earth GeoJSON country boundary files required by the
:: GeoJsonLayer component.
::
:: Usage (from repo root):
::   scripts\download-geodata.bat
::
:: Requires curl (bundled with Windows 10 1803+).
:: ─────────────────────────────────────────────────────────────────────────────

set DEST=client\public\geodata
set BASE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson

if not exist "%DEST%" mkdir "%DEST%"

echo [geodata] Downloading 110m country boundaries (lightweight)...
curl -fsSL "%BASE%/ne_110m_admin_0_countries.geojson" -o "%DEST%\ne_110m_admin_0_countries.geojson"
echo [geodata] OK ne_110m_admin_0_countries.geojson

echo [geodata] Downloading 50m country boundaries (hi-res)...
curl -fsSL "%BASE%/ne_50m_admin_0_countries.geojson" -o "%DEST%\ne_50m_admin_0_countries.geojson"
echo [geodata] OK ne_50m_admin_0_countries.geojson

echo [geodata] Done - files saved to %DEST%\

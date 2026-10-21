#!/usr/bin/env bash
# Builds app/data.js from companies.xlsx, checks the app, and zips it into an
# EasySignage custom app package with index.html at the root.
#
#   ./scripts/package.sh            -> dist/building-directory.zip
#                                      + downloads/building-directory.zip
#
# downloads/ is committed so people can download a ready-made zip from
# GitHub; dist/ is a local build folder.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
OUT="$ROOT/dist/building-directory.zip"
DOWNLOAD="$ROOT/downloads/building-directory.zip"

echo "Building data from companies.xlsx"
python3 "$ROOT/scripts/build-data.py"

"$ROOT/scripts/check.sh" "$APP"

mkdir -p "$ROOT/dist"
rm -f "$OUT"
(cd "$APP" && zip -r -q -X "$OUT" . -x '.DS_Store' '*/.DS_Store' 'Thumbs.db' '*.gitkeep' 'README.md')

mkdir -p "$ROOT/downloads"
cp "$OUT" "$DOWNLOAD"

echo "Created $OUT"
echo "Copied to $DOWNLOAD (commit it to update the download link)"
echo "Next: upload it under Media in EasySignage, add it to a playlist, assign the playlist to a screen."

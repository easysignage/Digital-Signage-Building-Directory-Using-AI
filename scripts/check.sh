#!/usr/bin/env bash
# Checks an EasySignage custom app folder for common problems before you zip it.
#
#   ./scripts/check.sh examples/clock
#
# Errors (exit 1) will break the app on screens. Warnings are worth a look.

set -u

APP="${1:-}"
if [ -z "$APP" ] || [ ! -d "$APP" ]; then
  echo "Usage: $0 <app-folder>"
  exit 2
fi

# Prints a file with comments removed, so notes in comments don't trigger checks.
code_of() {
  perl -0pe 's{<!--.*?-->}{}gs; s{/\*.*?\*/}{}gs; s{(^|[\s;{}(,])//[^\n]*}{$1}g' "$1"
}
has() { code_of "$2" | grep -qE -- "$1"; }

errors=0
warnings=0
err()  { echo "  ERROR: $*"; errors=$((errors + 1)); }
warn() { echo "  WARN:  $*"; warnings=$((warnings + 1)); }

echo "Checking $APP"

# 1. index.html must be at the top level of the package.
if [ ! -f "$APP/index.html" ]; then
  err "index.html is missing from the top level of the folder."
fi

# Files that end up in the zip (same exclusions as package.sh).
files=$(cd "$APP" && find . -type f ! -name '.DS_Store' ! -name 'Thumbs.db' ! -name 'README.md' ! -path '*/.git/*' | sed 's|^\./||')
web_files=$(echo "$files" | grep -E '\.(html?|css|js)$' || true)

for f in $web_files; do
  path="$APP/$f"

  # 2. Scripts must be classic scripts, not ES modules.
  if has '<script[^>]*type=["'"'"']?module' "$path"; then
    err "$f uses type=\"module\". Use a plain <script src> so it runs on older players."
  fi

  # 3. Root-absolute paths break inside a zip. Use relative paths.
  if has '(src|href)=["'"'"']/[^/]' "$path" || has 'url\(["'"'"']?/[^/]' "$path"; then
    err "$f references a root-absolute path (\"/...\"). Use relative paths like \"images/a.png\"."
  fi

  # 4. Remote resources do not work offline.
  if has '(src|href)=["'"'"']?(https?:)?//' "$path" || has 'url\(["'"'"']?(https?:)?//' "$path"; then
    warn "$f loads a remote resource. It will not show when the screen is offline; bundle it instead."
  fi
  if has '@import[^;]*(https?:)?//' "$path"; then
    warn "$f @imports a remote stylesheet (e.g. web fonts). Bundle the font files instead."
  fi
done

# 5. Modern JS and CSS that older webviews (Chromium ~53) cannot run.
for f in $(echo "$files" | grep -E '\.js$' || true); do
  path="$APP/$f"
  case "$f" in *.min.js) continue ;; esac
  if has '=>' "$path"; then warn "$f uses arrow functions (=>). Older players need ES5: use function () {}."; fi
  if has '`' "$path"; then warn "$f uses template literals. Older players need string concatenation."; fi
  if has '^\s*(let|const)\s' "$path"; then warn "$f uses let/const. Prefer var for older players."; fi
  if has '(^|[^.a-zA-Z])(async |await )' "$path"; then warn "$f uses async/await, which older players do not support."; fi
  if has '\?\.|\?\?' "$path"; then warn "$f uses ?. or ??, which older players do not support."; fi
  if has 'fetch\(["'"'"'][^h/]' "$path"; then warn "$f fetch()es a local file. That fails under file:// on many players; load data as a .js file instead."; fi
  if has 'BroadSignObject' "$path"; then err "$f reads BroadSignObject, which EasySignage removed. Use EasySignage.read()."; fi
done
for f in $(echo "$files" | grep -E '\.css$|\.html?$' || true); do
  path="$APP/$f"
  if has 'display:\s*grid' "$path"; then warn "$f uses CSS grid. Older players need flexbox."; fi
  if has 'clamp\(' "$path"; then warn "$f uses clamp(), which older players do not support."; fi
  if has '(^|[;{ ])gap:' "$path"; then warn "$f uses gap. Older players ignore it with flexbox; use margins."; fi
  if has 'font-size:\s*(1?[0-9]|2[0-3])(\.[0-9]+)?px' "$path"; then warn "$f sets text below 24px. It is hard to read on a screen; use the theme sizes (--text-xs is the minimum)."; fi
  if has 'font-weight:\s*[123]00' "$path"; then warn "$f uses a thin font weight (100-300), which disappears at a distance. Use 400 or 700."; fi
done

# 6. Anything that looks like a secret. Custom apps are copied to every screen
#    and can be read by anyone with access to the device, so never ship keys.
if grep -rIliE '(api[_-]?key|secret|password|passwd|bearer |authorization|access[_-]?token|sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16})' \
     --exclude=easysignage.js "$APP" >/dev/null 2>&1; then
  for f in $(grep -rIliE '(api[_-]?key|secret|password|passwd|bearer |authorization|access[_-]?token|sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16})' --exclude=easysignage.js "$APP"); do
    warn "${f#$APP/} may contain a key, token or password. Do not put secrets in a custom app."
  done
fi

# 7. Reader present and loaded.
if [ -f "$APP/index.html" ] && ! grep -q 'easysignage.js' "$APP/index.html"; then
  warn "index.html does not load easysignage.js. You only need it if you read player attributes."
fi

# 8. Package size.
size_kb=$(du -sk "$APP" | cut -f1)
if [ "$size_kb" -gt 102400 ]; then
  warn "Folder is $((size_kb / 1024)) MB. Large packages take longer to download to every screen."
fi

echo "  $errors error(s), $warnings warning(s)"
[ "$errors" -eq 0 ]

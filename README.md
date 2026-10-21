# Digital Signage Building Directory (built with AI)

An offline [EasySignage](https://easysignage.com) **custom app** that shows a
building directory (tenant list) on digital signage screens. One package is
uploaded once and every screen decides **which buildings to list** and
**whether it is a touchscreen** from its **player tags**.

It follows the rules and starter template from
[easysignage/Digital-Signage-Custom-Apps](https://github.com/easysignage/Digital-Signage-Custom-Apps):
offline, ES5 JavaScript, bundled assets, signage theme, no secrets.

> **Built with AI:** this app is built by an AI agent using the
> [prompt below](#build-it-with-an-ai-agent). Copy it into Claude Code,
> Codex, Cursor or Copilot to build or rebuild the app yourself.

## Sample logo

The header shows the building management logo from
[`app/images/building-logo.png`](app/images/building-logo.png).

> **Note:** the included **Elevate Building Management** logo is a **sample
> logo** for demonstration only. It does not belong to a real company.
> Replace `app/images/building-logo.png` with your own logo (PNG or SVG,
> about 720 px wide, ideally on a white or transparent background) and keep
> the same file name, or update the `<img>` in `app/index.html`. The logo sits
> on a white card so it stays readable on the dark, light and high-contrast
> themes.

---

## Contents

- [Sample logo](#sample-logo)
- [What it does](#what-it-does)
- [Data: companies.xlsx](#data-companiesxlsx)
- [Player tags](#player-tags)
- [Display mode (non-touch)](#display-mode-non-touch)
- [Touch mode](#touch-mode)
- [Layout and design](#layout-and-design)
- [Project structure](#project-structure)
- [Updating the listings](#updating-the-listings)
- [Preview in a browser](#preview-in-a-browser)
- [Package and upload](#package-and-upload)
- [Build it with an AI agent](#build-it-with-an-ai-agent)
- [Technical rules](#technical-rules)
- [Acceptance checklist](#acceptance-checklist)

---

## What it does

| Screen type | Behaviour |
|---|---|
| **Display (default)** | Shows the companies for the buildings this screen is tagged with, sorted A–Z, one page at a time. Pages change automatically every ~10 seconds with a "Page 2 of 4" indicator. No interaction. |
| **Touchscreen** (`touchscreen` tag) | Pages through the listing like a display screen, with a **hand icon and "Tap to start"** prompt. A tap opens search with a built-in on-screen keyboard and filters; tapping a company opens a **details page**. After a period of no activity it goes back to the paging listing. |

Examples:

- A screen in the lobby of Building 1 with tag `building1` shows only Building 1 tenants.
- A screen at the campus entrance with tags `building1`, `building2`, `building3` (or `all`) shows every tenant, grouped/labelled by building.
- A kiosk with tags `building2` and `touchscreen` shows Building 2 tenants with search and company details.

---

## Data: companies.xlsx

The listings live in [`companies.xlsx`](companies.xlsx) at the repo root.

- **One sheet per building.** The sheet name is the building ID used in tags:
  `building1`, `building2`, `building3`. Add a sheet (e.g. `building4`) to add
  a building; no code change needed.
- **Row 1 is the header.** Columns:

| Column | Required | Example | Used for |
|---|---|---|---|
| Company Name | yes | Harborview Capital Partners | Listing, search, details title |
| Floor | yes | 1 | Listing, details |
| Suite | yes | 101 | Listing, details |
| Category | yes | Finance | Category filter (touch), details |
| Phone | no | (555) 300-1000 | Details page |
| Website | no | www.harborview.example.com | Details page (text only, not a link) |

Optional columns the app should support if present (shown on the details page
only, ignored when empty): `Description`, `Hours`, `Email`, `Logo` (a file name
inside `images/logos/`).

- Blank rows are skipped. Extra unknown columns are ignored.
- Building display name: derived from the sheet name (`building1` → "Building 1").

Because custom apps **cannot read files at runtime** (no `fetch()` of local
files on players), the Excel file is converted to `app/data.js` by a build
script before packaging. The app never reads the `.xlsx` directly.

---

## Player tags

Set these on each player in EasySignage (**Screens → player → Tags**).
The app reads them with `EasySignage.read()`.

### How tags are matched

EasySignage tags are `key:value` pairs, and `tags.all` holds all of them as one
comma-separated string (e.g. `"building1:yes,touchscreen:true"`). The app
builds a list of **tokens** from every tag **key and value** (from `tags.all`
and from each entry in `tags`), trimmed and lowercased, then looks for
building IDs and keywords among them. So all of these work the same way:

| On the player | Meaning |
|---|---|
| key `building1` (any value) | show Building 1 |
| key `building` = `building1` | show Building 1 |
| key `location` = `building2` | show Building 2 |
| keys `building1`, `building3` | show Buildings 1 and 3 |
| any key or value `all` / `all-buildings` | show every building |
| any key or value `touchscreen` or `touch` | enable touch mode |

Rules:

- A building is shown if **any token equals its sheet name** (case-insensitive).
- If **no building matches** (no tags, typo, unknown building), show **all
  buildings** so the screen is never blank. For the first 5 minutes a small
  yellow line at the bottom of the screen says so and lists the tags the
  player actually sent, so a wrong or missing tag is easy to spot.
- Tags are read from the injected player object **and** the URL query, in
  any shape (object keys, `key:value` lists, arrays, JSON strings).
- When more than one building is shown, each row shows a small building label
  and the building filter appears in touch mode.
- Tag keys are case-sensitive in EasySignage, but the app compares lowercased
  tokens so `Building1` and `building1` both work.
- At most 20 tags reach a device.

### Other optional tags

| Tag | Values | Default | Effect |
|---|---|---|---|
| `theme` | `dark`, `light`, `contrast` | `dark` | Colour palette (handled by `theme.js`) |
| `accent` | hex colour, e.g. `0057b8` | theme default | Brand colour (handled by `theme.js`) |
| `title` | text | `Building Directory` | Heading at the top |
| `page_seconds` | number 5–60 | `10` | Seconds per page in display mode |
| `idle_seconds` | number 15–600 | `60` | Touch mode: return to the "Tap to start" listing after this much inactivity |

---

## Display mode (non-touch)

- Header: building management logo, title, building name(s), current time (HH:MM, updated once a minute).
- Body: companies sorted A–Z by name. Each row: **Company name**, *Category*,
  **Floor**, **Suite** (and building label when several buildings are shown).
- Rows per page are calculated from the available height so text stays at
  least `--text-sm`/`--text-md` size; never shrink below `--text-xs`.
- If everything fits on one page, no paging.
- Otherwise auto-page every `page_seconds` with a slow fade (≥ 400 ms) and a
  "Page X of Y" indicator. Loops forever.
- One `setInterval` drives clock and paging. No DOM growth over time
  (re-use row elements). Must run for days.
- `cursor: none`, no hover effects, `overflow: hidden`.

## Touch mode

Enabled when any tag key or value is `touchscreen` or `touch`. Screens
without the tag ignore taps completely.

**Tap to start**

- The screen starts like display mode (auto-paging list) with an accent
  badge floating at the **top-left of the list**, just under the header: a
  slowly pressing hand icon and **"Tap to start"**. It covers only the
  column labels, never a company.
- A tap anywhere opens touch mode. The opening tap only opens it; it never
  presses a key or a company underneath.

**Home / list screen**

- Search field at the top showing what was typed, with a clear (×) button.
- **Built-in on-screen keyboard** (A–Z, 0–9, space, backspace, clear). Do
  not rely on the device's system keyboard; kiosk players usually have none.
  Keys at least 64 px tall on 1080p, with visible pressed state.
- **Category chips** (All + each category found in the shown buildings) and,
  when more than one building is shown, **building chips**.
- Search is case-insensitive, matches anywhere in company name and category,
  ignores punctuation, and filters as you type (no "go" button needed).
- Results list scrolls by **swipe/drag** or via large **▲ / ▼ page buttons**
  (both). Show "N results". Show a friendly "No companies match "xyz"" state
  with a Clear button.
- Tap targets at least 64 px tall. Use `touchstart`/`click` handling that works
  with both touch and mouse (for preview), and avoids double-firing.

**Details page** (tap a company)

- Large company name, building, floor, suite, category.
- Phone, website, email, hours and description when present (website shown as
  text; never navigate away from the app).
- Logo from `images/logos/` if the `Logo` column names one, else an initials
  badge in the accent colour.
- Big **Back** button. Optional "You are here → Floor X" style wayfinding line.

**Idle reset**

- After `idle_seconds` with no touch, clear search and filters, close the
  details page and go back to the auto-paging list with the "Tap to start"
  prompt.

Touch mode relaxes the "no interaction" signage rule only for the touch
controls; everything else (theme, safe area, legibility) still applies.

---

## Layout and design

Built on the EasySignage signage theme (`theme.css`, `theme.js`, bundled
Atkinson Hyperlegible font):

- Dark background by default; contrast at least 4.5:1, target 7:1.
- Everything inside the 5% overscan-safe area (`.screen`).
- Text sized with `--text-*` variables; nothing below `--text-xs`; no thin
  weights; mixed case.
- **Landscape and portrait** both supported. Detect from `panel.resolution`
  or the window size. Portrait: single column, keyboard docked at the bottom
  in touch mode. Landscape: list on the left, keyboard/filters on the right
  in touch mode; two-column list allowed in display mode when there are many
  rows.
- Slow fades only; nothing flashes; respect `prefers-reduced-motion`.
- `<html lang="en">`, `alt` text on images.
- All tag/data strings rendered with `textContent`, never `innerHTML`.

---

## Project structure

```
.
├── README.md
├── companies.xlsx            ← edit listings here (one sheet per building)
├── scripts/
│   ├── build-data.py         ← companies.xlsx → app/data.js
│   ├── check.sh              ← EasySignage checks (ES5, paths, secrets), from the SDK
│   └── package.sh            ← build data, run checks, zip app/ → dist/building-directory.zip
├── app/                      ← the custom app (zip root = this folder's contents)
│   ├── index.html            ← entry point
│   ├── easysignage.js        ← copied unchanged from the EasySignage SDK
│   ├── theme.css             ← signage theme (from the SDK)
│   ├── theme.js              ← applies theme / accent tags (from the SDK)
│   ├── fonts/                ← Atkinson Hyperlegible + OFL.txt
│   ├── data.js               ← GENERATED: window.APP_DATA = {...}
│   ├── common.js             ← shared helpers (DOM, sorting, search, drag scroll)
│   ├── tags.js               ← tag → buildings / touchscreen parsing
│   ├── directory.js          ← display mode: list + auto paging
│   ├── touch.js              ← touch mode: keyboard, search, filters, details, idle
│   ├── app.js                ← bootstrap: read panel, choose mode
│   ├── style.css
│   └── images/
│       ├── building-logo.png ← SAMPLE building management logo (replace with yours)
│       └── logos/            ← optional company logos
└── dist/                     ← packaged zip (git-ignored)
```

`app/data.js` format:

```js
window.APP_DATA = {
  generated: "2026-10-21T12:00:00Z",
  buildings: [
    {
      id: "building1",
      name: "Building 1",
      companies: [
        { name: "Harborview Capital Partners", floor: "1", suite: "101",
          category: "Finance", phone: "(555) 300-1000",
          website: "www.harborviewcapitalpar.example.com",
          description: "", hours: "", email: "", logo: "" }
      ]
    }
  ]
};
```

---

## Updating the listings

1. Edit `companies.xlsx` (add/remove rows, or add a sheet for a new building).
2. Rebuild and package:
   ```bash
   ./scripts/package.sh
   ```
3. Upload the new `dist/building-directory.zip` in EasySignage (replace the
   existing media item). Screens update on their next sync.

`build-data.py` needs Python 3 and `openpyxl`:

```bash
pip3 install openpyxl
```

---

## Preview in a browser

Serve the app folder and pass test tags in the URL:

```bash
cd app && python3 -m http.server 8000
```

| Scenario | URL |
|---|---|
| Building 1, display | `http://localhost:8000/?resolution=1920x1080&tags.building=building1` |
| All buildings, display | `http://localhost:8000/?resolution=1920x1080&tags.all=all` |
| Buildings 1 + 3, portrait | `http://localhost:8000/?resolution=1080x1920&tags.building1=yes&tags.building3=yes` |
| Touch kiosk, Building 2 | `http://localhost:8000/?resolution=1080x1920&tags.building=building2&tags.touchscreen=true` |
| Touch, all, light theme | `http://localhost:8000/?resolution=1920x1080&tags.all=all,touchscreen&tags.theme=light` |
| No tags (fallback) | `http://localhost:8000/` |

Resize the window to check landscape and portrait.

---

## Package and upload

```bash
./scripts/package.sh       # → dist/building-directory.zip (index.html at the zip root)
```

In EasySignage:

1. **Media → Upload** `dist/building-directory.zip`.
2. Add it to a **playlist** and assign the playlist to the **screens**.
3. Add tags to each player, e.g. `building1`, or `building1` + `touchscreen`,
   or `all`.

---

## Build it with an AI agent

Use this prompt with Claude Code, Codex, Cursor, Copilot or any coding agent,
run from the root of this repository. For best results, first install the
EasySignage custom app skill:

```
/plugin marketplace add easysignage/Digital-Signage-Custom-Apps
/plugin install easysignage-custom-apps@easysignage
```

Copy the prompt:

```text
Build an EasySignage custom app: an offline building directory for digital signage screens.

Follow the EasySignage custom app rules and starter from
https://github.com/easysignage/Digital-Signage-Custom-Apps (use the
easysignage-custom-app skill if installed; otherwise read its
skills/easysignage-custom-app/SKILL.md, references/, docs/best-practices.md
and templates/starter/). Copy easysignage.js, theme.css, theme.js and fonts/
from that repo's sdk/ folder unchanged. Follow the full spec in this
repository's README.md; this prompt summarises it.

HARD RULES
- App lives in app/; index.html at the zip root; all assets bundled; relative paths only.
- ES5 only (var, function(){}; no arrow functions, let/const, template literals,
  classes, async/await, ?. or ??). Plain <script src>, never type="module".
- No CSS grid, clamp() or flex gap. Flexbox + CSS variables.
- No fetch()/XHR of local files: data is shipped as app/data.js (window.APP_DATA).
- No secrets, no remote URLs, no CDNs.
- Render all data and tag strings with textContent.
- Use the signage theme: --text-* sizes, nothing below --text-xs, 5% safe area,
  dark default, contrast >= 4.5:1, slow fades, support `theme` and `accent` tags.
- Works in landscape and portrait, and with no tags at all.

DATA
- Source: companies.xlsx in the repo root. One sheet per building; the sheet
  name (building1, building2, building3, ...) is the building ID.
  Columns: Company Name, Floor, Suite, Category, Phone, Website; optional
  Description, Hours, Email, Logo (file in app/images/logos/).
- Write scripts/build-data.py (Python 3 + openpyxl) that converts every sheet
  into app/data.js: window.APP_DATA = { generated, buildings: [{ id, name
  ("building1" -> "Building 1"), companies: [{ name, floor, suite, category,
  phone, website, description, hours, email, logo }] }] }. Skip blank rows,
  ignore unknown columns, all values as strings.
- Write scripts/package.sh that runs build-data.py, checks the app (ES5 / no
  absolute or remote URLs / no fetch), and zips the contents of app/ into
  dist/building-directory.zip with index.html at the root. Add dist/ to .gitignore.

TAGS (read with EasySignage.read())
- Build a list of lowercase, trimmed tokens from every tag key AND value: split
  tags.all on "," then each part on ":", and also add every key/value of the
  tags object (so URL previews without tags.all still work).
- A building is shown if any token equals its id. Tokens "all" or
  "all-buildings" show every building. If nothing matches, show all buildings
  (never a blank screen) and console.warn.
- Touch mode is on if any token equals "touchscreen".
- Optional tags: title (default "Building Directory"), page_seconds (default 10,
  clamp 5-60), idle_seconds (default 60, clamp 15-600), theme, accent.
- Put this parsing in app/tags.js as small pure functions.

DISPLAY MODE (default, no touch)
- Header: logo, title, building name(s), clock HH:MM (format by hand, no Intl).
- Companies sorted A-Z; row = name, category, floor, suite, plus a building
  label when more than one building is shown.
- Compute rows per page from available height; if it all fits, no paging;
  otherwise auto-page every page_seconds with a slow fade and "Page X of Y".
  Landscape may use two columns when there are many rows.
- One setInterval for clock + paging; reuse DOM nodes; must run for days.
- cursor: none, overflow: hidden, no hover.

TOUCH MODE (tag "touchscreen" or "touch"; without it, taps are ignored)
- Start in the display-mode paging list with a badge floating at the top-left
  of the list (under the header, over the column labels only): an inline SVG
  hand icon (slow press animation) and "Tap to start". Any tap opens touch
  mode without pressing anything underneath; idle returns to this screen.
- Search field + built-in on-screen keyboard (A-Z, 0-9, space, backspace,
  clear); do not depend on the system keyboard. Filter as you type,
  case-insensitive, matching company name and category, ignoring punctuation.
- Category chips (All + categories present) and building chips when more than
  one building is shown. "N results" and an empty state with a Clear button.
- Results scroll by drag/swipe and by large up/down buttons.
- Tap a company -> details page: name, building, floor, suite, category, and
  phone, website (text only, never navigate), email, hours, description when
  present; logo or an initials badge in the accent colour; big Back button.
- Idle reset: after idle_seconds without input, clear search/filters, close
  details, and return to the "Tap to start" paging list.
- Tap targets >= 64px on 1080p; handle touch and mouse without double firing.
- Landscape: list left, keyboard + filters right. Portrait: list on top,
  keyboard docked at the bottom.

FILES
app/index.html, app/easysignage.js, app/theme.css, app/theme.js, app/fonts/,
app/data.js (generated), app/common.js, app/tags.js, app/directory.js,
app/touch.js, app/app.js, app/style.css, app/images/building-logo.png,
scripts/build-data.py, scripts/check.sh, scripts/package.sh.

LOGO
- Show the building management logo (app/images/building-logo.png, a sample
  logo; use the file the user provides) at the left of the header on a white
  rounded card so it reads on every theme, with alt text.

VERIFY
- Run build-data.py and package.sh.
- Serve app/ with `python3 -m http.server` and check these URLs in landscape
  (1920x1080) and portrait (1080x1920):
  ?tags.building=building1
  ?tags.all=all
  ?tags.building1=yes&tags.building3=yes
  ?tags.building=building2&tags.touchscreen=true
  (no query string)
- Confirm: correct buildings shown, paging works, search/keyboard/filters,
  details page, Back, idle reset, no console errors, no clipped text.
- Finish with: the tags to set on each player, preview URLs, and upload steps
  (Media -> upload zip -> add to playlist -> assign to screen).
```

---

## Technical rules

Summary of the EasySignage custom app rules this app must follow (full
details in the
[best practices](https://github.com/easysignage/Digital-Signage-Custom-Apps/blob/main/docs/best-practices.md)):

- `index.html` at the top level of the zip; all assets bundled; relative paths.
- ES5 JavaScript and classic `<script src>` tags (players include older Tizen,
  webOS and BrightSign webviews).
- Flexbox, no CSS grid / `clamp()` / flex `gap`.
- No `fetch()` of local files; data in `data.js`.
- **Never** put API keys, tokens or passwords in the app; it is copied to every screen.
- Read player data only through `EasySignage.read()` from `easysignage.js`.

---

## Acceptance checklist

- [ ] `building1` tag shows only Building 1; two building tags show both; `all` shows all
- [ ] No tags / unknown tag → all buildings, never blank
- [ ] Adding a `building4` sheet and rebuilding shows Building 4 with tag `building4`, no code change
- [ ] Display mode auto-pages with "Page X of Y"; no paging when it all fits
- [ ] `touchscreen` tag enables search, on-screen keyboard, category/building chips
- [ ] Tapping a company opens details; Back returns; idle reset works
- [ ] Landscape and portrait look right at 1920×1080 and 1080×1920, nothing clipped
- [ ] No console errors; ES5 only; no remote/absolute URLs; no secrets
- [ ] `dist/building-directory.zip` has `index.html` at the root
- [ ] Runs for hours without memory growth (single interval, DOM reused)

---

## Links

- EasySignage custom apps docs: https://easysignage.com/help/custom-apps/digital-signage-custom-apps/
- Custom apps SDK, examples and AI skills: https://github.com/easysignage/Digital-Signage-Custom-Apps
- Upload media: https://easysignage.com/help/apps/digital-signage-upload-media/

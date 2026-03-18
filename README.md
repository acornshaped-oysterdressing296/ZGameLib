<div align="center">

<h1>
  <img src="https://img.shields.io/badge/-ZGameLib-7c3aed?style=for-the-badge&logoColor=white" alt="ZGameLib" height="40"/>
</h1>

<p><strong>A beautiful, free, open-source personal game library for Windows.</strong><br/>
Track, organize, rate and launch every game you own — Steam, Epic, GOG, and custom — from one sleek desktop app.</p>

<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-7c3aed?style=flat-square" alt="MIT License"/></a>
  <img src="https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D4?style=flat-square&logo=windows" alt="Windows"/>
  <img src="https://img.shields.io/badge/Version-0.6.0-22c55e?style=flat-square" alt="v0.6.0"/>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/Built%20with-Tauri%202-FFC131?style=flat-square" alt="Tauri 2"/></a>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/Rust-backend-CE422B?style=flat-square&logo=rust" alt="Rust"/>
</p>

<p>
  <a href="https://zsync.eu/zgamelib/"><strong>🌐 Website</strong></a> &nbsp;·&nbsp;
  <a href="https://zsync.eu/zgamelib/app/ZGameLib_0.6.0_x64_en-US.msi"><strong>⬇ Download MSI</strong></a> &nbsp;·&nbsp;
  <a href="https://zsync.eu/zgamelib/app/ZGameLib_0.6.0_x64-setup.exe"><strong>⬇ Download EXE</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/TheHolyOneZ/ZGameLib"><strong>GitHub</strong></a>
</p>

</div>

---

## Preview

> Recorded on v0.3.0. Newer versions include per-page search, mod loader, cleaner layout, and more improvements.

<div align="center">

[![ZGameLib Preview](https://img.youtube.com/vi/rlqUUqAPOxU/maxresdefault.jpg)](https://www.youtube.com/watch?v=rlqUUqAPOxU)

</div>

---

## Download

| Installer | Format | Notes |
|-----------|--------|-------|
| [ZGameLib_0.6.0_x64_en-US.msi](https://zsync.eu/zgamelib/app/ZGameLib_0.6.0_x64_en-US.msi) | `.msi` | **Recommended** — Windows Installer |
| [ZGameLib_0.6.0_x64-setup.exe](https://zsync.eu/zgamelib/app/ZGameLib_0.6.0_x64-setup.exe) | `.exe` | NSIS alternative installer |

> **Windows SmartScreen:** On first launch you may see *"Windows protected your PC"* — click **More info → Run anyway**. This is expected for unsigned indie apps.

---

## Table of Contents

- [Features](#features)
  - [Library & Scanning](#-library--scanning)
  - [Game Launching & Playtime](#-game-launching--playtime)
  - [Game Detail Panel](#-game-detail-panel)
  - [Mod Loader](#-mod-loader)
  - [Game Spin Wheel](#-game-spin-wheel)
  - [Statistics](#-statistics)
  - [Themes](#-themes--7-built-in)
  - [System Integration](#-system-integration)
  - [Data & Privacy](#-data--privacy)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Scanner Details](#scanner-details)
- [External Integrations](#external-integrations)
- [Project Structure](#project-structure)
- [Building from Source](#building-from-source)
- [License](#license)

---

## Features

### 📚 Library & Scanning

<table>
<tr>
<td width="50%" valign="top">

**Auto-scanning**
- One-click scan for all four platforms simultaneously
- Per-platform individual scan buttons
- Optional **auto-scan on startup**
- Detects new games and skips existing ones

**Duplicate Management**
- **Remove Duplicates** button collapses entries sharing the same name
- Non-destructive — hidden, not deleted
- Toggle show/hide hidden games instantly
- Resets automatically on app restart

**Cover Art Resolution Chain**
1. Steam CDN portrait (`library_600x900.jpg`)
2. GOG product API
3. Steam SearchApps (fallback for Epic/GOG/Custom)
4. Exe icon extraction (last resort)
5. Placeholder

</td>
<td width="50%" valign="top">

**Views & Sorting**
- **Grid view** — configurable 3–6 columns
- **Dense list view** — compact rows with all info
- Sort by: name · rating · last played · date added · playtime · **custom order**
- Ascending / descending toggle
- **Drag-and-drop reordering** — select "Custom Order" sort to drag cards into any order; persisted to the database

**Filtering**
- Filter by platform: All / Steam / Epic / GOG / Custom
- Filter by status (any custom status)
- Filter by cover art: Has Cover / Missing Cover (sidebar, with counts)
- Favorites-only toggle
- Minimum rating slider
- Tag-based filtering
- Date range filtering (date added from/to)

**Per-Page Search Bar**
- Contextual to each page (Library, Favorites, Recently Played)
- Live result counter
- <kbd>/</kbd> hotkey focuses search from anywhere
- Scope toggle inside search input — name only or name + description
- "No games match" empty state with one-click **Clear Filters**
- Scroll-to-top floating button after 400 px of scroll

**Context Menu & Health**
- **Right-click** any game card or list row → Play · Open Folder · Favorite · Pin · Copy Name · View Details · **Delete**
- **Exe health badge** — amber warning icon on cards when the executable is missing
- Loading skeleton grid while library loads

**Weekly Playtime Goal**
- Set a weekly playtime target in hours at the top of the Library page
- Animated progress bar with current week's playtime
- "Goal reached! 🎉" state; persists across sessions

</td>
</tr>
</table>

---

### 🚀 Game Launching & Playtime

<table>
<tr>
<td width="33%" valign="top">

**🟦 Steam**
- Launches via `steam://run/{appId}`
- Full Steam Overlay support
- Polls `tasklist` up to **120 seconds** for process detection

</td>
<td width="33%" valign="top">

**⬛ Epic Games**
- Launches via Epic URI with `silent=true`
- Epic Online Services (EOS) auth works correctly
- Essential for EOS games like Fortnite
- Polls up to **180 seconds** for process

</td>
<td width="33%" valign="top">

**⬜ GOG / Custom**
- Direct executable spawn
- Full process monitoring from launch
- Instant playtime tracking start

</td>
</tr>
</table>

**Playtime Tracking**
- A background thread monitors the launched process
- Records elapsed minutes when the process exits
- Updates `last_played` timestamp on launch
- Fires a `game-session-ended` event to the frontend on exit
- **Minimize on launch** — ZGameLib hides to tray with a 400 ms delay (for window focus handoff), then auto-restores when the game exits

---

### 🎮 Game Detail Panel

A slide-in drawer (500 px wide) that opens without navigating away from your library.

<table>
<tr>
<td valign="top">

**Info Tab**
- Edit game name inline (shows "Saved ✓" flash on save)
- Toggle favorite (heart icon)
- Quick-action buttons: Play · Open Folder · Delete
- Stats grid: total playtime · rating · date added · last played · **HLTB main story hours · completionist hours**
- **10-star rating** (interactive, 1–10 scale; fire icon 🔥 appears when rating ≥ 8)
- **Quick rate** — 10-button rating row appears on game card hover (no need to open the panel)
- **Custom status buttons** — your defined statuses, color-coded
- **Tags** — add/remove inline; comma or Enter to confirm
- **Description** — freeform textarea, editable inline; truncated at 200 chars with "Show more / Show less"
- **Custom fields** — add arbitrary key/value metadata per game; stored per-game in the database
- **Time-to-beat** — click the clock icon to fetch HowLongToBeat data; main story and completionist hours shown in the stats grid; cached in DB
- **Notes** section (see below)

</td>
<td valign="top">

**Screenshots Tab** *(label shows count, e.g. "Screenshots (6)")*
- Fetches all Steam screenshots for the game
- Masonry grid layout
- Full-screen lightbox
- Per-screenshot actions: Copy Path · Open File · Open Folder · Export

**History Tab** *(label shows count, e.g. "History (3)")*
- Lists the last 50 play sessions for the game
- Shows start time, duration, and date

**Mods Tab**
- Appears when an install directory is configured
- BepInEx / MelonLoader detection + install/uninstall
- Full mod list with file sizes
- Add mod via file picker, remove with one click
- Open mods folder in Explorer

</td>
</tr>
</table>

**Notes**
- Timestamped notes per game — full history preserved
- Inline editor per note (edit / delete)
- New note textarea at the bottom
- <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save a new note

**Cover**
- Click the cover image → full-size **lightbox overlay** with spring animation
- Hover the cover → "Change Cover" button appears for replacing it
- Cover search: browse Steam's portrait database by name, click to apply instantly

---

### 🔧 Mod Loader

Supports both major Unity modding frameworks, integrated directly in the game detail panel.

<table>
<tr>
<td width="50%" valign="top">

**BepInEx** *(C# mods for Unity Mono games)*
- One-click install: fetches the latest x64 ZIP from GitHub Releases, extracts to the game directory, creates `BepInEx/plugins/`
- Uninstall: removes `BepInEx/` folder + hook files (`winhttp.dll`, `doorstop_config.ini`, etc.)
- Mod location: `{installDir}/BepInEx/plugins/*.dll`

</td>
<td width="50%" valign="top">

**MelonLoader** *(IL2CPP & Mono mods)*
- One-click install: downloads `MelonLoader.x64.zip` from GitHub Releases and extracts it
- Uninstall: removes `MelonLoader/` folder
- Mod location: `{installDir}/Mods/*.dll`
- Includes an AV false-positive warning (expected for mod loaders)

</td>
</tr>
</table>

**Shared Mod Management**
- List view of all installed `.dll` mods with file sizes
- Add a mod: native file picker → copies DLL to the correct folder
- Remove a mod: single click, immediate
- Open mods folder directly in Windows Explorer

---

### 🎡 Game Spin Wheel

Can't decide what to play? Let the wheel decide.

<table>
<tr>
<td width="50%" valign="top">

**Wheel**
- SVG donut wheel with dynamic radial gradient segments
- 60-color palette — each game gets a unique color slot
- Tick marks around the outer ring
- Pointer triangle fixed at the top
- Smooth animated spin with easing: `cubic-bezier(0.08, 0.82, 0.12, 1.0)`
- Travels 6–10 full rotations before landing
- Confetti animation on winner reveal

</td>
<td width="50%" valign="top">

**Controls**
- Filter pool: All · Steam · Epic · GOG · Custom · Favorites
- Free-text search to include only matching games
- **Exclude last winner** toggle
- Pool preview: first 5 game covers + "+X more"
- Pool size counter

**Result Card**
- Winner game cover (full size)
- Platform badge · Star rating · Playtime
- **Play Now** button
- **Spin Again** button
- **Exclude This Game** button

**History**
- Last 8 spins remembered in the session
- Spin counter badge
- Quick-select from history

</td>
</tr>
</table>

---

### 📊 Statistics

<table>
<tr>
<td>

| Card | What it shows |
|------|--------------|
| Total Games | Full library count |
| Total Playtime | Summed across all games |
| Average Rating | Mean of rated games |
| Favorites | Count of hearted games |
| Completed | Count with Completed status |
| Rated | Count with any rating |

All stat cards are **clickable** — each navigates to the Library with the relevant filter or sort pre-applied.

</td>
<td>

- **Platform breakdown** — horizontal proportion bars: Steam · Epic · GOG · Custom (clickable)
- **Status breakdown** — pill badges per custom status with counts (clickable)
- **Rating distribution** — horizontal bar chart showing game count per rating (1–10)
- **Completion rate** — circular SVG progress ring (completed / total)
- **Top 5 rated games** — ranked list with cover thumbnails and star display
- Staggered entrance animations

</td>
</tr>
</table>

---

### 🎨 Themes — 7 Built-In

| # | Theme | Accent | Base Background |
|---|-------|--------|----------------|
| 1 | **Dark** *(default)* | 🟣 Purple | `#07060b` |
| 2 | **AMOLED** | 🟣 Purple | `#000000` pure black |
| 3 | **Nord** | 🔵 Frost blue | `#2e3440` |
| 4 | **Catppuccin Mocha** | 🪻 Mauve / Lavender | `#1e1e2e` |
| 5 | **Dracula** | 🌸 Pink / Red | `#282a36` |
| 6 | **Gruvbox** | 🟠 Warm orange | `#282828` |
| 7 | **Tokyo Night** | 💙 Blue cyan | `#1a1b26` |

All themes are implemented as **CSS custom properties** (`--accent-200` through `--accent-900`). Every accent color, gradient, glow, glass effect, and border throughout the entire UI responds to the active theme — not just backgrounds.

<details>
<summary><strong>CSS Design System (click to expand)</strong></summary>

**Glass Effects**
- `.glass` — `backdrop-filter: blur(20px)` with frosted border
- `.glass-strong` — enhanced opacity variant
- `.glass-sidebar` — sidebar-specific frosted panel

**Glow Effects**
- `.glow-purple` — accent-colored box shadow
- `.glow-sm` — subtle glow for hover states
- `.glow-inner` — inward glow for inputs

**Cards**
- `.card-lift` — hover translate-Y transform
- `.card-shine` — gradient shine overlay on hover
- `.border-gradient` — animated gradient border

**Buttons**
- `.btn-primary` — gradient fill with glow
- `.btn-ghost` — glass morphism border style
- `.btn-icon` — compact square icon button

**Inputs**
- `.input-glass` — semi-transparent with accent border on focus

**Animations**
- `fadeIn`, `slideUp`, `scaleIn`, `shimmer` keyframes
- Default easing via Framer Motion throughout

**Measurements**
- Card border radius: `14px`
- Modal border radius: `20px`
- Sidebar glass blur: `20px`

</details>

---

### 🖥 System Integration

- **System tray icon** — left-click to show/focus; right-click menu: Show · Quit
- **Close to tray** — ✕ hides the window rather than exiting
- **Launch on Windows startup** — writes `HKEY_CURRENT_USER\...\Run\ZGameLib` via the Windows registry
- **Start minimized** — launches directly to tray without showing the window

---

### 🔒 Data & Privacy

- All data lives in **SQLite** at `%APPDATA%\zgamelib\zgamelib.db` — no external services
- **Export library** — full JSON dump: ratings, tags, notes, playtime, cover paths, statuses
- **Export as CSV** — spreadsheet-compatible export with proper quoting (id, name, platform, status, rating, playtime, date, tags)
- **Export Filtered** — export only the currently visible/filtered subset as JSON; button shows active count
- **Import / restore** — JSON file re-import; skips exact duplicates
- **Trash bin** — deleted games are soft-deleted and recoverable from Settings → Data; permanent delete available
- **Portable mode** — by default the database lives in `%APPDATA%\zgamelib\`. To enable portable mode (e.g. for a USB drive):
  1. Go to the folder containing `zgamelib.exe`
  2. Create an empty file named `portable.flag` there (right-click → New → Text Document → rename it, or run `New-Item portable.flag` in PowerShell)
  3. Launch the app — the database and settings will now be stored in the same folder as the exe
  > Make sure the file is named exactly `portable.flag` with no `.txt` extension. If Windows is hiding extensions, check via View → Show → File name extensions.
- **Zero telemetry. Zero accounts. Zero cloud.**
- The only network calls made are: cover art fetching (Steam CDN / GOG / Steam SearchApps), HLTB lookup (on user request), mod installer downloads from GitHub, and the update check against `zsync.eu` — all explicitly user-initiated or one-time at startup

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| <kbd>/</kbd> | Focus the search bar on any page |
| <kbd>N</kbd> | Open the Add Game modal |
| <kbd>F</kbd> | Toggle favorite on the currently open game |
| <kbd>Escape</kbd> | Close the detail panel or any overlay |
| <kbd>?</kbd> | Show / hide the keyboard shortcuts help overlay |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | Save a new note in the notes editor |

---

## Tech Stack

<table>
<tr>
<th>Layer</th>
<th>Technology</th>
<th>Version</th>
</tr>
<tr>
<td>Desktop shell</td>
<td><a href="https://tauri.app">Tauri 2</a> — Rust + WebView2</td>
<td>2.x</td>
</tr>
<tr>
<td>Frontend framework</td>
<td>React + TypeScript</td>
<td>18.3.1</td>
</tr>
<tr>
<td>Build tool</td>
<td>Vite</td>
<td>6.0.3</td>
</tr>
<tr>
<td>Styling</td>
<td>Tailwind CSS + CSS custom properties</td>
<td>3.4.14</td>
</tr>
<tr>
<td>Animations</td>
<td>Framer Motion</td>
<td>11.11.11</td>
</tr>
<tr>
<td>State management</td>
<td>Zustand</td>
<td>5.0.1</td>
</tr>
<tr>
<td>Server state / caching</td>
<td>TanStack Query (React Query)</td>
<td>5.59.0</td>
</tr>
<tr>
<td>UI primitives</td>
<td>Radix UI — Dialog, Dropdown, Select, Slider, Tooltip, Popover</td>
<td>latest</td>
</tr>
<tr>
<td>Icons</td>
<td>Lucide React</td>
<td>0.460.0</td>
</tr>
<tr>
<td>Routing</td>
<td>React Router</td>
<td>v6</td>
</tr>
<tr>
<td>Database</td>
<td>SQLite via <code>rusqlite</code> — bundled, no install required</td>
<td>0.32</td>
</tr>
<tr>
<td>HTTP (Rust)</td>
<td><code>ureq</code> — cover art, APIs, update checks</td>
<td>latest</td>
</tr>
<tr>
<td>Windows APIs</td>
<td><code>winreg</code> — Steam/Epic/GOG registry reads + startup entry</td>
<td>latest</td>
</tr>
<tr>
<td>Async runtime</td>
<td>Tokio</td>
<td>latest</td>
</tr>
<tr>
<td>Archive handling</td>
<td><code>zip</code> — BepInEx / MelonLoader extraction</td>
<td>latest</td>
</tr>
</table>

**All Rust crates:** `tauri 2` · `rusqlite` · `serde` · `serde_json` · `uuid` · `chrono` · `walkdir` · `tokio` · `anyhow` · `dirs` · `open` · `ureq` · `zip` · `winreg` · `base64`

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Frontend  (React + TypeScript)              │
│                                                              │
│   Pages                 Components              Stores       │
│   ─────                 ──────────              ──────       │
│   / Library             Layout (Sidebar,        useGameStore │
│   /favorites            Topbar, PageSearch)     · games[]    │
│   /recent               Library (GameCard,      · filters    │
│   /stats                GameGrid,               · sort       │
│   /spin                 GameListRow)            · viewMode   │
│   /settings             GameDetail (drawer)     · hiddenIds  │
│                         ModLoaderPanel                       │
│                         Spin Wheel (SVG)        useUIStore   │
│                         Stats Dashboard         · toasts     │
│                         Settings                · modals     │
│                         AddGameModal            · statuses   │
│                         CoverSearchModal        · logs       │
│                                                 · update     │
│   Hooks: useGames (TanStack Query mutations)                 │
│          useCover (smart cover cache, max 4 concurrent)      │
│          useFilteredGames (memoized filter + sort)           │
└──────────────────────────┬───────────────────────────────────┘
                           │  Tauri IPC  (invoke / listen events)
┌──────────────────────────▼───────────────────────────────────┐
│                   Backend  (Rust + Tauri 2)                   │
│                                                              │
│   commands/games.rs     — Game & Note CRUD                   │
│   commands/scanner.rs   — Steam / Epic / GOG / custom scan   │
│   commands/launcher.rs  — process spawn, playtime tracking   │
│   commands/modloader.rs — BepInEx / MelonLoader management   │
│   commands/settings.rs  — settings, import/export, updates   │
│                                                              │
│   db/schema.rs          — CREATE TABLE + INDEX statements    │
│   db/queries.rs         — all SQL read/write operations      │
│   models.rs             — shared Rust structs                │
│   lib.rs                — Tauri builder, tray, IPC reg.      │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│           SQLite  (%APPDATA%\zgamelib\zgamelib.db)            │
│           tables:  games  ·  notes  ·  settings  ·  sessions │
└──────────────────────────────────────────────────────────────┘
```

### State Management in Detail

<details>
<summary><strong>useGameStore — full shape</strong></summary>

```ts
// State
games: Game[]
selectedGameId: string | null
search: string
sortKey: 'name' | 'rating' | 'last_played' | 'date_added' | 'playtime_mins'
sortAsc: boolean
viewMode: 'grid' | 'list'
filters: {
  platform: 'all' | 'steam' | 'epic' | 'gog' | 'custom'
  status: GameStatus | 'all'
  favoritesOnly: boolean
  minRating: number
  tags: string[]
}
hiddenIds: string[]   // duplicate-hidden game IDs
showHidden: boolean   // toggle visibility of hidden games

// Actions
setGames · updateGame · removeGame · addGame
setSelectedGameId · setSearch · setSortKey · setSortAsc
setViewMode · setFilter · resetFilters
hideGames · toggleShowHidden · restoreAllHidden
```

</details>

<details>
<summary><strong>useUIStore — full shape</strong></summary>

```ts
// State
toasts: Toast[]                     // auto-remove after 3.5 s
isAddGameOpen: boolean
isDetailOpen: boolean
isScanning: boolean
confirmDialog: { open, title, onConfirm } | null
customStatuses: StatusConfig[]      // user-defined status list
logs: LogEntry[]                    // max 500 entries, levels: info | ok | warn | error
logPanelOpen: boolean
pendingUpdate: Update | null

// Actions
addToast · removeToast
setAddGameOpen · setDetailOpen · setScanning
openConfirm · closeConfirm
setCustomStatuses
addLog · clearLogs · setLogPanelOpen
setPendingUpdate
```

</details>

---

## Database Schema

### `games`

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `id` | TEXT | PK | UUID |
| `name` | TEXT | NOT NULL | Display name |
| `platform` | TEXT | | `steam` \| `epic` \| `gog` \| `custom` |
| `exe_path` | TEXT | | Absolute path to executable |
| `install_dir` | TEXT | | Game root directory |
| `cover_path` | TEXT | | Local path or remote URL |
| `description` | TEXT | | User-editable description |
| `rating` | REAL | | `0`–`10` (0 = unrated) |
| `status` | TEXT | | `none` \| `backlog` \| `playing` \| `completed` \| `dropped` \| `on_hold` |
| `is_favorite` | BOOL | | Favorites flag |
| `playtime_mins` | INTEGER | | Tracked playtime in minutes |
| `last_played` | TEXT | | ISO 8601 timestamp |
| `date_added` | TEXT | | ISO 8601 timestamp |
| `steam_app_id` | INTEGER | UNIQUE | Steam numeric app ID |
| `epic_app_name` | TEXT | UNIQUE | Epic catalog item ID |
| `tags` | TEXT | | JSON array of strings |
| `sort_order` | INTEGER | | Manual drag-sort order |
| `deleted_at` | TEXT | | ISO 8601 — set when soft-deleted; `NULL` = active |
| `is_pinned` | INTEGER | NOT NULL DEFAULT 0 | Pinned to top of library |
| `custom_fields` | TEXT | NOT NULL DEFAULT '{}' | JSON map of user-defined key/value metadata |
| `hltb_main_mins` | INTEGER | | HowLongToBeat main story time in minutes |
| `hltb_extra_mins` | INTEGER | | HowLongToBeat completionist time in minutes |

Indexes: `platform` · `is_favorite` · `status` · `last_played`

### `notes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID |
| `game_id` | TEXT FK | References `games.id` |
| `content` | TEXT | Note body |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

Index: `game_id`

### `sessions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID |
| `game_id` | TEXT FK | References `games.id` |
| `started_at` | TEXT | ISO 8601 — session start time |
| `ended_at` | TEXT | ISO 8601 — session end time |
| `duration_mins` | INTEGER | Rounded minutes played |

Index: `game_id`

### `settings`  *(key-value store)*

| Key | Values | Default | Description |
|-----|--------|---------|-------------|
| `theme` | `dark` \| `amoled` \| `nord` \| `catppuccin` \| `dracula` \| `gruvbox` \| `tokyonight` | `dark` | UI theme |
| `default_view` | `grid` \| `list` | `grid` | Default library view |
| `grid_columns` | `3`–`6` | `4` | Grid column count |
| `steam_path` | path string | auto | Steam install override |
| `epic_path` | path string | auto | Epic manifests path override |
| `custom_statuses` | JSON array | built-ins | User-defined status list |
| `auto_scan` | `true` \| `false` | `false` | Scan all platforms on startup |
| `show_playtime_on_cards` | `true` \| `false` | `true` | Show playtime badge on game cards |
| `minimize_on_launch` | `true` \| `false` | `true` | Hide window when launching a game |
| `start_minimized` | `true` \| `false` | `false` | Launch to tray silently |
| `close_to_tray` | `true` \| `false` | `true` | ✕ hides rather than exits |
| `autostart` | `true` \| `false` | `false` | Register in Windows startup |

---

## Scanner Details

### 🟦 Steam
Reads `libraryfolders.vdf` to discover all Steam library locations, then parses every `steamapps/appmanifest_*.acf` manifest file. Cover art fetched from:
```
https://cdn.steamstatic.com/steam/apps/{appId}/library_600x900.jpg
```

### ⬛ Epic Games
Reads `C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests\*.item` JSON files. Each manifest contains `AppName`, `DisplayName`, `InstallLocation`, and `LaunchExecutable`. Launched via:
```
com.epicgames.launcher://apps/{AppName}?action=launch&silent=true
```

### ⬜ GOG
Reads `HKEY_LOCAL_MACHINE\SOFTWARE\GOG.com\Games` from the Windows registry. Cover art fetched from:
```
https://api.gog.com/products/{id}
```
Falls back to Steam SearchApps if GOG's API returns nothing useful.

### 📁 Custom / Bulk Folder Scan

Walks up to **6 directory levels deep** looking for executables using this priority chain:

| Priority | Rule |
|----------|------|
| 1 | Exe name fuzzy-matches the folder / game name |
| 2 | Known launcher pattern (`launcher.exe`, `gamelaunch.exe`, etc.) |
| 3 | Root-level exe (depth 1) |
| 4 | Largest exe in tree (must be > 5 MB) |
| 5 | UE4/UE5 Shipping exe — last resort fallback |

**Minimum size threshold:** 500 KB (filters out helper tools)

**Skip-list** (names/patterns that are always ignored): `UnityCrashHandler`, `CrashReporter`, `CEFHelper`, `vcredist`, `dxsetup`, `dotnet`, `VC_redist`, `EAC`, `BEService`, `steamwebhelper`, `unins`, `setup`, `install`, `update`, and many more.

**Skipped directories:** `saves` · `logs` · `screenshots` · `redist` · `__redist` · `support` · `tools`

---

## External Integrations

| Service | Used For | Triggered By |
|---------|---------|-------------|
| Steam CDN | Portrait cover art for Steam games | Auto on scan |
| Steam SearchApps API | Cover search by name (Epic / GOG / Custom) | Auto + Cover Search modal |
| GOG Product API | Cover art + metadata for GOG games | Auto on scan |
| GitHub Releases API | Latest BepInEx x64 ZIP download | User clicks Install BepInEx |
| GitHub Releases API | Latest MelonLoader x64 ZIP download | User clicks Install MelonLoader |
| HowLongToBeat | Time-to-beat estimates (main story + completionist) | User clicks clock icon in Game Detail |
| Tauri Updater | Checks `https://zsync.eu/zgamelib/update.json` with Minisign public key | App startup |

---

## Project Structure

```
ZGameLib/
│
├── build-release.ps1               # PowerShell production build script (recommended)
├── package.json                    # npm deps + scripts
├── vite.config.ts                  # Vite dev server on port 1420
├── tailwind.config.ts              # Custom accent color system, animations
├── tsconfig.json                   # TypeScript compiler config
├── index.html                      # HTML entry, Inter font
│
├── src/                            # React + TypeScript frontend
│   ├── main.tsx                    # React entry point, QueryClient setup
│   ├── App.tsx                     # Router definition + Layout wrapper
│   ├── index.css                   # Global styles, all 7 themes as CSS vars
│   │
│   ├── pages/
│   │   ├── Library.tsx             # Main view: RecentlyPlayed carousel + game grid/list
│   │   ├── Favorites.tsx           # is_favorite=true filtered view
│   │   ├── RecentlyPlayed.tsx      # last_played DESC, 12 games, time-ago badges
│   │   ├── Stats.tsx               # Statistics dashboard with animated cards
│   │   ├── Spin.tsx                # SVG randomizer wheel with history & controls
│   │   └── Settings.tsx            # Full settings: theme, behavior, statuses, data, about
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx          # Root shell: sidebar + topbar + outlet + portals
│   │   │   ├── Sidebar.tsx         # Nav links, platform/status filters, overview stats
│   │   │   ├── Topbar.tsx          # Log panel toggle, Remove Duplicates, Scan, Add Game
│   │   │   └── PageSearch.tsx      # Per-page search + sort + view toggle bar
│   │   │
│   │   ├── library/
│   │   │   ├── GameCard.tsx        # 3:4 cover, overlay Play/Fav/Folder, platform badge, 🔥 on ≥8
│   │   │   ├── GameGrid.tsx        # Responsive CSS grid, handles both view modes
│   │   │   ├── GameListRow.tsx     # Compact row: thumbnail, name+status, tags, playtime, rating
│   │   │   ├── PinnedRow.tsx       # Horizontal strip of pinned games shown above the main grid
│   │   │   └── RecentlyPlayed.tsx  # Horizontal scrollable carousel (max 12 games)
│   │   │
│   │   ├── game/
│   │   │   ├── GameDetail.tsx      # Slide-in drawer with Info / Screenshots / Mods tabs
│   │   │   ├── GameNotes.tsx       # Note list + inline edit + new note (Ctrl+Enter to save)
│   │   │   └── ModLoaderPanel.tsx  # BepInEx/MelonLoader install, mod list, add/remove
│   │   │
│   │   ├── modals/
│   │   │   ├── AddGameModal.tsx    # Single exe picker or bulk folder scan
│   │   │   ├── CoverSearchModal.tsx# Search Steam by name, 4-col grid, click to apply
│   │   │   └── ConfirmModal.tsx    # Yes/No dialog with error-style accent
│   │   │
│   │   └── ui/
│   │       ├── Badge.tsx           # Platform / tag pill badges
│   │       ├── PlatformBadge.tsx   # Icon + label badge for Steam / Epic / GOG / Custom
│   │       ├── StarRating.tsx      # Interactive 10-star rating widget
│   │       ├── Icons.tsx           # 40+ custom SVG icons
│   │       ├── GameContextMenu.tsx # Right-click portal menu: Play, Folder, Fav, Pin, Copy, Details
│   │       ├── Toast.tsx           # Bottom-right toasts (3.5 s auto-dismiss, max visible)
│   │       ├── LogPanel.tsx        # Right-side scan log (max 500 entries, auto-scroll)
│   │       ├── EmptyState.tsx      # Centered placeholder with action button
│   │       ├── GlassCard.tsx       # Frosted glass effect card wrapper
│   │       └── ErrorBoundary.tsx   # React error boundary with fallback UI
│   │
│   ├── store/
│   │   ├── useGameStore.ts         # Games, filters, sort, view, hiddenIds, savedFilters (Zustand)
│   │   └── useUIStore.ts           # Toasts, modals, custom statuses, logs, update (Zustand)
│   │
│   ├── hooks/
│   │   ├── useGames.ts             # TanStack Query mutations + scan operations
│   │   └── useCover.ts             # Smart cover loader: cache, queue (max 4 concurrent), cancel
│   │
│   └── lib/
│       ├── tauri.ts                # Typed wrappers for every Tauri IPC command
│       ├── types.ts                # TypeScript interfaces: Game, Note, AppSettings, StatusConfig…
│       └── utils.ts                # Formatters, platform color maps, time-ago, constants
│
└── src-tauri/                      # Tauri + Rust backend
    ├── tauri.conf.json             # App ID, window (1400×900, min 1000×700), CSP, updater, bundle
    ├── Cargo.toml                  # Rust crate deps
    ├── build.rs                    # Tauri build script
    │
    └── src/
        ├── main.rs                 # Entry point — calls lib::run()
        ├── lib.rs                  # Tauri builder, system tray, window events, IPC registration
        ├── models.rs               # Game, Note, AppSettings, CoverCandidate structs
        │
        ├── commands/
        │   ├── games.rs            # CRUD for games, notes, sessions; trash/restore/purge; toggle pin
        │   ├── scanner.rs          # Steam/Epic/GOG/custom scan, cover fetch, bulk cover auto-fetch
        │   ├── launcher.rs         # Process spawn, playtime + session tracking, minimize/restore
        │   ├── modloader.rs        # BepInEx + MelonLoader install/uninstall + mod management
        │   └── settings.rs         # get/save settings, export/import library, update check
        │
        └── db/
            ├── schema.rs           # CREATE TABLE + CREATE INDEX statements
            └── queries.rs          # All SQL operations (CRUD, filter, upsert)
```

---

## Building from Source

### Prerequisites

- [Rust](https://rustup.rs/) stable toolchain (MSVC target — `x86_64-pc-windows-msvc`)
- [Node.js](https://nodejs.org/) 18+
- npm (bundled with Node)
- Windows 10 or 11 with WebView2 runtime
  *(pre-installed on Win11; available via Windows Update or [direct download](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) on Win10)*

### Development

```bash
# Clone
git clone https://github.com/TheHolyOneZ/ZGameLib.git
cd ZGameLib

# Install frontend dependencies
npm install

# Launch dev build (Vite hot-reload on :1420 + Tauri window)
npx tauri dev
```

Rust source changes trigger a full backend recompile. Frontend changes hot-reload instantly.

### Production Build

```powershell
# Recommended — use the included build script
.\build-release.ps1
```

Or manually:

```bash
npx tauri build
```

Output directory: `src-tauri/target/release/bundle/`

```
bundle/
├── msi/   ZGameLib_0.6.0_x64_en-US.msi
└── nsis/  ZGameLib_0.6.0_x64-setup.exe

```

### Frontend Only

```bash
npm run vite:dev    # Vite dev server (no Tauri window)
npm run vite:build  # Build frontend → dist/
```

---

## License

MIT License — see [LICENSE](LICENSE).

```
Copyright (c) 2026 TheHolyOneZ
```

Free to use, modify, and distribute. No warranty.

---

<div align="center">

Made by **[TheHolyOneZ](https://github.com/TheHolyOneZ)**

If you find it useful, a GitHub star goes a long way. ⭐

</div>

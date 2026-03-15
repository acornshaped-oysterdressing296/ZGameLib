# ZGameLib

**A beautiful, free, open-source personal game library for Windows.**

Track, organize, rate and launch every game you own — Steam, Epic Games, GOG and custom executables — all from one sleek app built with Tauri 2 + React.

![ZGameLib Screenshot](og-image.png)

---

## Download

| Installer | Link |
|-----------|------|
| Windows Installer (.msi) — **Recommended** | [ZGameLib_0.1.0_x64_en-US.msi](https://zsync.eu/zgamelib/app/ZGameLib_0.1.0_x64_en-US.msi) |
| NSIS Installer (.exe) — Alternative | [ZGameLib_0.1.0_x64-setup.exe](https://zsync.eu/zgamelib/app/ZGameLib_0.1.0_x64-setup.exe) |

> **Windows SmartScreen note:** On first launch Windows may show a "Windows protected your PC" warning because the app is unsigned. Click **"More info"** → **"Run anyway"**. This is normal for indie open-source apps.

---

## Features

### Library & Scanning
- **Auto-scan** Steam, Epic Games, GOG, and custom folders in one click
- Detects new games automatically, skips duplicates
- **Intelligent executable detection** — prioritises name-matched launchers over shipping/UE4 binaries, minimum 500 KB threshold, extensive skip-list for crash reporters and tools
- **Cover art**: Steam CDN (portrait), GOG API, Steam SearchApps fallback for Epic/GOG, exe icon extraction as last resort
- Grid view (3–6 configurable columns) and dense list view
- Sort by name, rating, playtime, last played, or date added
- Filter by platform, custom status, and free-text search

### Launching
- **Steam** — `steam://run/{appId}` URI protocol, native Steam overlay
- **Epic Games** — `com.epicgames.launcher://apps/{appName}?action=launch&silent=true` URI for proper EOS authentication
- **GOG / Custom** — direct executable launch with playtime monitoring
- Minimize ZGameLib when a game starts, auto-restore when it exits

### Game Details
- Full detail panel (slide-in drawer)
- Edit game name and description inline
- **10-star rating system**
- **Custom status labels** — drag-to-reorder, color picker, fully user-defined (Backlog, Playing, Completed, Dropped, On Hold…)
- **Tags** — add/remove inline tags for any game
- **Notes** — timestamped notes per game, edit and delete
- **Screenshot gallery** — browse all Steam screenshots in-app, masonry grid, full-screen viewer
- **Cover search** — search Steam's database by name, pick from results, applied instantly

### Game Spin Wheel
- Randomizer wheel for when you can't decide what to play
- Filter pool: all, by platform (Steam/Epic/GOG/Custom), favorites, or free search
- Donut SVG wheel with gradient segments, per-segment colors, tick marks
- Confetti animation on winner reveal
- Launch winner directly from the result card

### Stats Page
- Total games, total playtime, average rating
- Favorites count, completed count, rated count
- Platform breakdown bars (Steam / Epic / GOG / Custom)
- Status breakdown (per custom status)
- Top 5 rated games

### Themes — 7 built-in
| Theme | Accent Color | Background |
|-------|-------------|------------|
| Dark (default) | Purple | #07060b |
| AMOLED | Purple | Pure black |
| Nord | Frost blue | #2e3440 |
| Catppuccin Mocha | Mauve / Lavender | #1e1e2e |
| Dracula | Pink / Red | #282a36 |
| Gruvbox | Warm orange | #282828 |
| Tokyo Night | Blue | #1a1b26 |

All themes use CSS custom properties — every accent color, gradient, glow, and border in the app responds to the theme. Not just backgrounds.

### System Integration
- System tray icon — right-click to restore or quit
- Close to tray (clicking ✕ hides the window)
- Launch on Windows startup
- Start minimized to tray

### Data
- All data stored locally in SQLite (`AppData\Roaming\zgamelib\`)
- Export entire library as JSON (ratings, tags, notes, playtime, cover paths)
- Import/restore from JSON backup
- Zero telemetry, zero accounts, zero cloud

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri 2](https://tauri.app) (Rust + WebView2) |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Animations | Framer Motion |
| State | Zustand |
| Data fetching | TanStack Query |
| Database | SQLite via `rusqlite` (bundled) |
| HTTP | `ureq` (Rust, cover art + Steam API) |
| Windows APIs | `winreg` (Steam/Epic/GOG registry), `winapi` flags |

### Rust crates
`tauri 2`, `rusqlite`, `serde`, `serde_json`, `uuid`, `chrono`, `walkdir`, `tokio`, `anyhow`, `dirs`, `open`, `ureq`, `winreg`

---

## Building from Source

### Prerequisites
- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) or npm

```bash
# Clone
git clone https://github.com/TheHolyOneZ/ZGameLib.git
cd ZGameLib

# Install frontend dependencies
npm install

# Development (hot-reload)
npx tauri dev

# Production build (outputs MSI + NSIS to src-tauri/target/release/bundle/)
npx tauri build
```

---

## Project Structure

```
ZGameLib/
├── src/                        # React frontend
│   ├── pages/
│   │   ├── Library.tsx         # Main game grid + list
│   │   ├── Spin.tsx            # Game spin wheel
│   │   ├── Stats.tsx           # Library statistics
│   │   ├── Settings.tsx        # Settings page
│   │   ├── Favorites.tsx       # Favorites view
│   │   └── RecentlyPlayed.tsx  # Recently played
│   ├── components/
│   │   ├── layout/             # Sidebar, Topbar
│   │   ├── library/            # GameCard, GameListRow, RecentlyPlayed
│   │   ├── game/               # GameDetail, GameNotes
│   │   ├── modals/             # AddGameModal, CoverSearchModal, ConfirmModal
│   │   └── ui/                 # Badge, Toast, StarRating, EmptyState, Icons
│   ├── store/
│   │   ├── useGameStore.ts     # Game list + filters + view mode (Zustand)
│   │   └── useUIStore.ts       # UI state, toasts, custom statuses
│   ├── hooks/
│   │   ├── useGames.ts         # CRUD + scan operations
│   │   └── useCover.ts         # Cover URL resolution + cache
│   ├── lib/
│   │   ├── tauri.ts            # All Tauri command wrappers
│   │   ├── types.ts            # TypeScript types (Game, AppSettings, etc.)
│   │   └── utils.ts            # Helpers, formatters, platform color maps
│   └── index.css               # Global styles, CSS variables, all 7 themes
│
├── src-tauri/src/              # Rust backend
│   ├── commands/
│   │   ├── scanner.rs          # Steam/Epic/GOG/custom game scanning
│   │   ├── launcher.rs         # Game launch + playtime tracking
│   │   ├── cover.rs            # Cover art fetch, search, base64 encode
│   │   ├── settings.rs         # Settings load/save
│   │   └── data.rs             # Import/export library JSON
│   ├── db/
│   │   └── queries.rs          # All SQLite queries (games, notes, settings)
│   ├── models.rs               # Rust structs (Game, AppSettings, Note, etc.)
│   └── lib.rs                  # Tauri app setup, command registration
│
└── tailwind.config.ts          # Tailwind config with CSS-var accent colors
```

---

## Scanner Details

The auto-scanner covers:

**Steam** — reads `libraryfolders.vdf` to find all library paths, then scans `steamapps/*.acf` manifests. Fetches portrait cover from `https://cdn.steamstatic.com/steam/apps/{id}/library_600x900.jpg`.

**Epic Games** — reads `C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests\*.item` JSON files. Launches via Epic URI so Epic Online Services (EOS) authentication works correctly (fixes games like Fortnite).

**GOG** — reads Windows registry under `HKLM\SOFTWARE\GOG.com\Games`. Fetches cover from GOG's product API (`api.gog.com/products/{id}`), falls back to Steam SearchApps.

**Custom / Bulk folder scan** — scans subfolders for executables. Exe selection priority:
1. Exe whose name matches the folder/game name
2. Known launcher pattern (`launcher.exe`, `gamelaunch.exe`, etc.)
3. Root directory exe
4. Largest exe > 5 MB
5. Shipping exe (UE4/UE5 fallback — last resort)

Skipped: crash reporters, web helpers, redistributables, anti-cheat tools, editors, SDKs.

---

## License

MIT License — see [LICENSE](LICENSE).

```
Copyright (c) 2025 TheHolyOneZ
```

Free to use, modify, and distribute. No warranty.

---

## Made by

**[TheHolyOneZ](https://github.com/TheHolyOneZ)**

If you find it useful, a GitHub star goes a long way. ⭐

# Changelog

## [0.6.0] — 2026-03-17

### Fixed
- **Process tracking fallback for Steam/Epic** — when the launched game process is never found within the polling window, the session is now properly closed with 0 minutes and the UI restores correctly; previously the background thread would silently exit leaving the app in a tracking state
- **Cover cache race condition** — multiple components mounting simultaneously for the same game no longer trigger parallel fetches; a per-key in-flight deduplication guard prevents redundant requests; cache capacity raised from 200 to 500 entries
- **Input length validation** — `name` is capped at 255 characters, `description` at 10,000, `tags` limited to 100 items each ≤ 50 characters; the backend rejects out-of-range values with a descriptive error rather than storing them silently
- **No keyboard navigation on game cards** — cards now have `tabIndex={0}`, `role="button"`, and respond to Enter / Space, making the library navigable without a mouse
- **Focus not trapped in modals** — Tab key could previously escape the Game Detail panel and Cover Search modal; a keyboard trap now constrains focus to the active overlay while it is open
- **PowerShell injection in icon extraction** — icon extraction no longer interpolates file paths into the PowerShell command string; paths are now passed via `ZGAMELIB_EXE_PATH` and `ZGAMELIB_DEST_PATH` environment variables, eliminating a potential command injection vector
- **Empty catch blocks in GameListRow** — launch and open-folder errors were silently swallowed; both now display an error toast with the failure message
- **Cover cache memory leak** — the in-memory cover URL cache now uses LRU eviction (max 200 entries); previously it grew unboundedly for large libraries
- **Non-atomic cover downloads** — cover images are now written to a `.tmp` file first and renamed atomically, preventing corrupt partial writes on crash or error
- **Folder scan walk limit** — the custom folder scanner now hard-caps at 10,000 file system entries to prevent runaway walks on deeply nested or large drives
- **Exe icon not refreshing after game update** — the icon cache key now includes the file's modification time (`mtime`); replacing a game's exe now shows the new icon on next launch
- **Game detail shows stale data after switching games** — the detail panel now invalidates and refetches game data when `selectedGameId` changes, preventing stale reads between rapid game switches
- **Auto-scan not triggering on startup** — `scan` was missing from the `useEffect` dependency array in `Layout.tsx`; auto-scan now fires reliably on app start when enabled
- **Cover placeholder constant duplicated** — `COVER_PLACEHOLDER` was defined independently in `RecentlyPlayed` and `PinnedRow`; both now import from the shared `@/lib/utils` module
- **Missing aria labels on scan-related topbar buttons** — scan log toggle and remove-duplicates button now have `aria-label` attributes for screen readers

### Added
- **Drag-and-drop reordering** — a new "Custom Order" sort option enables Framer Motion `Reorder` drag-and-drop for the game grid; dragging a card updates `sort_order` in the database for all affected games in a single batch transaction; order persists across sessions
- **Time-to-beat estimates (HLTB)** — a clock icon button in the Game Detail panel fetches HowLongToBeat data for the game (main story and completionist hours); results are cached in the database (`hltb_main_mins`, `hltb_extra_mins`) and displayed in the stats grid
- **Custom fields** — users can define arbitrary key/value metadata per game (text values); field editor in the Info tab with add/edit/delete; stored as a JSON map in the database under `custom_fields`
- **Global keyboard shortcuts** — `?` toggles a keyboard shortcut help overlay; `N` opens the Add Game modal; `F` toggles favorite on the currently open game; `Escape` closes the detail panel or any overlay; global `keydown` listener in `Layout.tsx`
- **Portable mode** — if a file named `portable.flag` exists next to `zgamelib.exe` at startup, the database and settings are stored in the same directory as the exe instead of `%APPDATA%\zgamelib`; useful for USB drives or self-contained installs
- **Duplicate removal confirmation** — clicking "Remove Duplicates" in the topbar now shows a confirm dialog listing how many games will be hidden before acting; previously it applied the change instantly with no warning
- **Cover lightbox** — clicking the game cover image in the detail panel now opens a full-size lightbox overlay instead of jumping straight to the cover search modal; a separate "Change Cover" button on the hover overlay handles cover replacement
- **Quick rate from game card** — a row of 10 rating buttons appears at the bottom of a game card on hover, allowing ratings to be set without opening the detail panel; the active rating is highlighted
- **Empty library illustration** — the first-run / empty-library state now shows an animated gamepad SVG illustration with orbiting sparkle dots and an accent glow, replacing the previous blank panel
- **Trash bin / soft delete** — deleting a game moves it to trash (`deleted_at` timestamp) instead of hard-deleting it; restore or permanently delete from a new Trash section in Settings → Data; "Empty Trash" purges all at once — backwards-compatible via `ALTER TABLE`
- **Pinned games row** — right-click any game → Pin to show it in a dedicated "Pinned" strip at the top of the Library; pin state persists to the database
- **Session history** — each game launch records a session row (`started_at`, `ended_at`, `duration_mins`) in a new `sessions` table; view the last 50 sessions per game in a new History tab in the Game Detail panel
- **Bulk auto-fetch missing covers** — new "Fetch Missing Covers" button in Settings → Data; fetches covers for all games that have no cover art (Steam games via CDN, others via name search); reports updated/failed counts
- **Platform badge component** — dedicated `PlatformBadge` component with platform icons (Steam / Epic / GOG / Custom) used consistently across GameCard, GameListRow, GameDetail, and Spin pages
- **Collapsible sidebar** — sidebar can be collapsed to a 62 px icon-only strip; collapses with a spring animation; collapse toggle moved to the header (always visible); state persists across sessions via `localStorage`
- **Sort direction toggle** — ascending/descending sort button added to the PageSearch bar
- **Theme hover preview** — hovering a theme button in Settings instantly previews it; the previous theme restores on mouse-out if not confirmed
- **Delete option in right-click context menu** — "Delete" entry with red styling and a visual divider separator added to the `GameContextMenu`
- **Weekly playtime goal** (`GoalBar`) — collapsible goal widget at the top of the Library page; set a target in hours, animated progress bar shows current week's playtime; "Goal reached!" state with green color; persists via `localStorage`
- **Search scope toggle** — small `A` / `A+` toggle embedded inside the search input; switches between searching game name only vs. name + description
- **Cover art filter** — "Has Cover" and "Missing Cover" filter buttons in the sidebar under a dedicated Cover Art section (consistent with Platform/Status styling); shows counts; replaces the old cluttered buttons in the search bar
- **Export library as CSV** — new button in Settings → Data exports the full library as a `.csv` file with proper quoting; fields: id, name, platform, status, rating, playtime\_mins, date\_added, is\_favorite, tags
- **Export Filtered** — new button in Settings → Data exports only the currently visible/filtered games as JSON; button label shows the active count (e.g. "Export Filtered (12)")
- **"Saved ✓" flash indicator** — editing a game's name, description, or rating now flashes a brief "Saved ✓" indicator in the detail panel's tab bar using `AnimatePresence`
- **Scroll-to-top button** — a floating ↑ button appears after scrolling 400 px on the Library, Favorites, and Recently Played pages; smooth animated entrance/exit
- **Tab counts in game detail** — Screenshots and History tab labels now show live counts (e.g. "Screenshots (6)", "History (3)")
- **Description expand/collapse** — long game descriptions are truncated at 200 characters with a "Show more / Show less" toggle in the game detail Info tab
- **Cover search empty state** — the cover search modal now shows "No covers found for 'X'" with a helpful hint ("Try a shorter name or remove subtitles") instead of a blank panel before searching

### Changed
- Version bumped to **0.6.0**
- `delete_game` command is now a soft delete; hard delete is `permanent_delete_game`
- Sidebar collapse toggle moved from the bottom to the header row (always accessible regardless of window height)
- About section in Settings spans full grid width (was half-width like other cards)
- Cover art filter and search scope controls moved out of the search bar into proper locations (sidebar and inside search input respectively) for a cleaner topbar

---

## [0.5.0] — 2026-03-17

### Fixed
- **UI no longer freezes during scan / bulk add / single add** — all scan commands (`scan_steam_games`, `scan_epic_games`, `scan_gog_games`, `scan_all_games`, `scan_folder_for_games`) are now `async` and run on `tokio::task::spawn_blocking`; this frees Tauri's command handler thread pool so navigation, settings, game detail, and all other interactions remain fully responsive while scans run in the background
- **Bulk Add no longer blocks the screen** — the Add Game modal closes immediately when a bulk scan starts; the scan runs in the background with a toast on completion instead of holding the modal open with a blocking backdrop overlay
- **Concurrent scan guard** — an `AtomicBool` (`SCAN_RUNNING`) prevents two folder scans from executing simultaneously; a second attempt returns an error immediately instead of corrupting state
- **Scanner DB transactions** — all four scan functions (Steam, Epic, GOG, Custom) now wrap their DB writes in `BEGIN`/`COMMIT` transactions, preventing partial inserts on failure
- **Top-rated cover images in Stats** — cover thumbnails now load correctly via the `useCover` hook instead of raw file paths (which Tauri's webview cannot display)

### Added
- **Loading beam** — a glowing accent-colored animated bar appears at the very top of the window during any background operation (scan, bulk add); uses the active theme's accent color with a soft glow, fades out smoothly when the operation completes
- **`isBulkAdding` state** — new `useUIStore` field tracks background bulk-add operations separately from platform scans
- **Executable health check** — game cards show an amber warning badge when the game's `.exe` file is missing or was moved; backed by a new `check_exe_health` Tauri command
- **Date range filters** — filter the library by date added (from/to); new `dateAddedFrom` and `dateAddedTo` fields in the filter store
- **Rating distribution chart** — horizontal bar chart on the Stats page showing how many games you rated at each score (1–10)
- **Completion rate tracker** — circular SVG progress ring on the Stats page showing what percentage of your library is marked "Completed"
- **Right-click context menu** — right-click any game card or list row to get a portal-rendered context menu with: Play, Open Folder, Toggle Favorite, Copy Name, View Details
- **Loading skeleton** — a pulsing placeholder grid appears while the library is loading for the first time
- **Toast progress bar** — toasts now show a shrinking progress bar at the bottom indicating time remaining before auto-dismiss
- **Empty search state** — when filters return no results, a dedicated "No games match your filters" view appears with a one-click "Clear Filters" button
- **Clickable stats** — every card, platform bar, and status tile on the Stats page is now clickable and navigates to the Library with the corresponding filter/sort pre-applied

### Changed
- **`DbState` now uses `Arc<Mutex<Connection>>`** — the database connection wrapper is `Arc`-wrapped so it can be safely cloned into background `tokio` tasks without blocking the Tauri IPC thread pool
- Version bumped to **0.5.0**

---

## [0.4.1] — 2026-03-16

### Fixed — Backlog (14 issues)

**Critical**
- `useScreenshotUrl` — rewrote async API call with `useState` + `useEffect` and unmount cleanup flag; was called directly in render causing memory leaks and stale renders
- `useCover` — replaced boolean `cancelled` closure flag with a generation counter ref to correctly guard all async callbacks after unmount; fixes race conditions when components unmount mid-fetch
- Playtime double-count race condition — added `ActivePids` struct (`Mutex<HashSet<u32>>`) in launcher.rs; a second tracker thread is now skipped if the PID is already being watched
- VDF parser — rewrote `parse_vdf_value` as a proper state-machine that respects `\"` escaped quotes; fixes Steam game names containing quote characters being parsed incorrectly

**Real bugs / anti-patterns**
- `window.location.reload()` in `AddGameModal` — replaced with `queryClient.invalidateQueries` + `close()`; full page reloads destroyed all React state inside the SPA
- `useUIStore.getState()` in render — replaced with `useUIStore((s) => s.customStatuses)` selector hook in `GameCard`, `GameListRow`, and `GameDetail`; components were not re-rendering on status changes
- Filtering logic duplication — removed duplicate filter/sort logic from the store, canonical implementation kept in `useFilteredGames` hook only
- Settings validation — `grid_columns` value is now clamped to `1..=8` in `save_settings`; out-of-range values like `0` or `99` were silently saved and broke the grid layout

**Code quality**
- Custom base64 encoder — removed hand-rolled 70-line implementation; replaced with `base64 = "0.22"` crate and `STANDARD.encode()`
- `md5_simple` renamed to `fnv_hash` — function was computing an FNV-1a hash, not MD5; misleading name corrected
- `CoverSearchModal` double fetch — added `fetchCache` ref (URL → base64 map); `fetchUrlAsBase64` is no longer called twice for the same cover URL on selection
- Search debounce — search dispatch now goes through a 150 ms `useEffect` debounce; every keystroke was triggering a full store filter pass
- `app.default_window_icon().unwrap()` — replaced with `.expect("app icon missing")` for a clear panic message at startup
- `Math.random()` for IDs — replaced `Math.random().toString(36).slice(2)` with `crypto.randomUUID()` for toast and log IDs in `useUIStore`

### Fixed — User-reported

- **Settings version display** — hardcoded `v0.4.0` label in Settings page corrected to `v0.4.1`
- **Status edit mode — color swatch closes edit** — clicking a color swatch triggered `onBlur` on the label input and collapsed edit mode; fixed with `onMouseDown={(e) => e.preventDefault()}` on all swatch buttons
- **Status edit mode — typing one character closes edit** — `updateStatus` was called on every keystroke, updating `status.key` which changed the `Reorder.Item` key prop causing a remount and focus loss; fixed by buffering edits in local `editLabelValue` state and committing only on blur/Enter
- **Search bar X button positioning** — clear button was rendering below the input instead of inside it; fixed by replacing `top-1/2 -translate-y-1/2` with `inset-y-0 my-auto` for reliable vertical centering

### Added

- **Remove Duplicates** — new icon button in the topbar that hides duplicate games (case-insensitive name match, keeps first occurrence); hidden games are stored in-memory and restored on app restart or via the toggle
- **Hidden games toggle** — pill indicator appears in the page search bar when duplicates are hidden; click to show/hide them with animated eye icon
- **Screenshot tab enhancements** — per-screenshot hover overlay with: Copy Path, Open File, Open Folder, Export/Download; improved lightbox with close button, Escape key support, and bottom action bar (Copy path · Open folder · Export)
- **Page-level search bar** — search, game count, sort controls, and grid/list toggle moved from the topbar into each page (Library, Favorites, Recently Played) as a contextual header; topbar is now a lean action strip
- **Scan Games promoted** — "Scan Games" is now a full labeled button (alongside "Add Game") in the topbar instead of a bare icon

---

## [0.4.0] — 2026-03-16

### Added
- **Mod Loader support** — new "Mods" tab in the game detail panel (visible for any game with an install directory)
  - Detect whether BepInEx or MelonLoader is already installed in the game folder
  - One-click install for BepInEx (fetches latest release from GitHub, extracts to game directory)
  - One-click install for MelonLoader (fetches latest installer from GitHub, runs silently with `--auto --arch x64`)
  - Mod list — shows all `.dll` files in the plugins/mods folder with name and file size
  - Add Mod button — file picker for `.dll` files, copies them to the correct folder automatically
  - Remove mod button per entry
  - Open Folder button — opens BepInEx/plugins or Mods directory in Explorer
  - Mod folder is detected automatically based on which loader is installed

### Changed
- CSP enabled in `tauri.conf.json` (was `null`)
- Devtools removed from production window config

---

## [0.3.0] — Initial public release

- Game library management (Steam, Epic, GOG, custom)
- Auto-scanner for installed games
- Playtime tracking
- Cover art with multi-source fallback
- Glassmorphic UI with 7 themes
- Notes, tags, custom statuses, ratings
- Spin page (random game picker)
- Stats page
- In-app updater
- System tray support
- Import/export library

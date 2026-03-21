mod models;
mod db;
mod commands;

use db::{DbState, IgdbTokenState, init_db, queries};
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use commands::{games, scanner, launcher, settings, modloader, collections, logger};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logger::init();
    let conn = init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())

        .manage(DbState(Arc::new(Mutex::new(conn))))
        .manage(IgdbTokenState::new())
        .manage(launcher::ActivePids::new())
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show ZGameLib", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("app icon missing").clone())
                .menu(&menu)
                .tooltip("ZGameLib")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            {
                let db = app.state::<DbState>();
                let lock = db.0.lock();
                if let Ok(conn) = lock {
                    let wx = queries::get_setting(&conn, "window_x").and_then(|v| v.parse::<i32>().ok());
                    let wy = queries::get_setting(&conn, "window_y").and_then(|v| v.parse::<i32>().ok());
                    let ww = queries::get_setting(&conn, "window_width").and_then(|v| v.parse::<u32>().ok());
                    let wh = queries::get_setting(&conn, "window_height").and_then(|v| v.parse::<u32>().ok());
                    if let (Some(x), Some(y), Some(w), Some(h)) = (wx, wy, ww, wh) {
                        if x >= 0 && y >= 0 {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
                                let _ = win.set_size(tauri::PhysicalSize::new(w, h));
                            }
                        }
                    }
                }
            }

            {
                let db = app.state::<DbState>();
                let lock = db.0.lock();
                if let Ok(conn) = lock {
                    let reminders_enabled = queries::get_setting(&conn, "playtime_reminders")
                        .map(|v| v != "false").unwrap_or(true);
                    if reminders_enabled {
                        let threshold_str = {
                            let dt = chrono::Utc::now() - chrono::Duration::days(30);
                            dt.to_rfc3339()
                        };
                        let mut stmt_opt = conn.prepare(
                            "SELECT name, last_played FROM games WHERE last_played IS NOT NULL AND last_played < ?1 AND playtime_mins > 0 AND deleted_at IS NULL ORDER BY last_played ASC LIMIT 1"
                        ).ok();
                        if let Some(stmt) = stmt_opt.as_mut() {
                            let row = stmt.query_row(rusqlite::params![threshold_str], |r| {
                                Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
                            }).ok();
                            if let Some((name, last_played_str)) = row {
                                let days = chrono::Utc::now()
                                    .signed_duration_since(
                                        chrono::DateTime::parse_from_rfc3339(&last_played_str)
                                            .unwrap_or_else(|_| chrono::DateTime::parse_from_rfc3339("2000-01-01T00:00:00Z").unwrap())
                                            .with_timezone(&chrono::Utc)
                                    )
                                    .num_days();
                                let msg = format!("You haven't played {} in {} days", name, days);
                                if let Some(win) = app.get_webview_window("main") {
                                    let _ = win.emit("playtime-reminder", msg);
                                }
                            }
                        }
                    }
                }
            }

            {
                let db = app.state::<DbState>();
                let lock = db.0.lock();
                if let Ok(conn) = lock {
                    let completed = queries::get_setting(&conn, "onboarding_completed")
                        .map(|v| v == "true")
                        .unwrap_or(false);
                    if !completed {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.emit("start-onboarding", ());
                        }
                    }
                }
            }

            {
                let db = app.state::<DbState>();
                let lock = db.0.lock();
                if let Ok(conn) = lock {
                    let current_version = env!("CARGO_PKG_VERSION");
                    let last_seen = queries::get_setting(&conn, "last_seen_version").unwrap_or_default();
                    if last_seen != current_version {
                        if last_seen.is_empty() || last_seen.starts_with("0.") {
                            let _ = queries::set_setting(&conn, "onboarding_completed", "false");
                        }
                        let _ = queries::set_setting(&conn, "last_seen_version", current_version);
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.emit("show-whats-new", current_version);
                        }
                    }
                }
            }

            let start_min = {
                let db = app.state::<DbState>();
                let lock = db.0.lock();
                lock.ok()
                    .and_then(|conn| queries::get_setting(&conn, "start_minimized"))
                    .map(|v| v == "true")
                    .unwrap_or(false)
            };
            if start_min {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.minimize();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let db = app.state::<DbState>();
                let close_to_tray = {
                    let lock = db.0.lock();
                    lock.ok()
                        .and_then(|conn| queries::get_setting(&conn, "close_to_tray"))
                        .map(|v| v == "true")
                        .unwrap_or(false)
                };
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
                let db = app.state::<DbState>();
                let lock = db.0.lock();
                if let Ok(conn) = lock {
                    if let Ok(pos) = window.outer_position() {
                        let _ = queries::set_setting(&conn, "window_x", &pos.x.to_string());
                        let _ = queries::set_setting(&conn, "window_y", &pos.y.to_string());
                    }
                    if let Ok(size) = window.outer_size() {
                        let _ = queries::set_setting(&conn, "window_width", &size.width.to_string());
                        let _ = queries::set_setting(&conn, "window_height", &size.height.to_string());
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            games::get_all_games,
            games::get_game,
            games::create_game,
            games::update_game,
            games::delete_game,
            games::permanent_delete_game,
            games::restore_game,
            games::purge_trash,
            games::get_trashed_games,
            games::toggle_favorite,
            games::toggle_pinned,
            games::check_exe_health,
            games::get_notes,
            games::create_note,
            games::update_note,
            games::delete_note,
            games::get_sessions,
            games::reorder_games,
            games::fetch_hltb_data,
            games::get_weekly_playtime,
            games::batch_update_games,
            games::get_library_growth,
            games::fetch_igdb_metadata,
            games::clear_igdb_data,
            collections::get_collections,
            collections::create_collection,
            collections::rename_collection,
            collections::delete_collection,
            collections::get_collection_games,
            collections::add_game_to_collection,
            collections::remove_game_from_collection,
            collections::get_collections_for_game,
            collections::update_collection_description,
            scanner::scan_steam_games,
            scanner::scan_epic_games,
            scanner::scan_gog_games,
            scanner::scan_all_games,
            scanner::scan_folder_for_games,
            scanner::set_game_cover,
            scanner::extract_exe_icon,
            scanner::find_cover_in_dir,
            scanner::read_image_base64,
            scanner::fetch_url_as_base64,
            scanner::search_game_covers,
            scanner::get_game_screenshots,
            scanner::fetch_missing_covers,
            launcher::launch_game,
            launcher::launch_steam_game,
            launcher::launch_epic_game,
            launcher::open_game_folder,
            launcher::stop_tracking,
            launcher::stop_game,
            settings::get_settings,
            settings::save_settings,
            settings::export_library,
            settings::export_library_csv,
            settings::export_games_by_ids,
            settings::import_library,
            settings::save_file,
            settings::check_for_update,
            settings::open_url,
            settings::is_portable_mode,
            settings::sync_steam_playtime,
            settings::pull_uninstalled_steam_games,
            settings::save_setting,
            settings::get_year_in_review,
            logger::get_log_contents,
            modloader::check_modloader_status,
            modloader::install_bepinex,
            modloader::uninstall_bepinex,
            modloader::install_melonloader,
            modloader::uninstall_melonloader,
            modloader::open_mods_folder,
            modloader::install_mod,
            modloader::delete_mod,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

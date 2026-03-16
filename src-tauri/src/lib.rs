mod models;
mod db;
mod commands;

use db::{DbState, init_db, queries};
use std::sync::Mutex;
use commands::{games, scanner, launcher, settings, modloader};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(DbState(Mutex::new(conn)))
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show ZGameLib", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
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
            }
        })
        .invoke_handler(tauri::generate_handler![
            games::get_all_games,
            games::get_game,
            games::create_game,
            games::update_game,
            games::delete_game,
            games::toggle_favorite,
            games::get_notes,
            games::create_note,
            games::update_note,
            games::delete_note,
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
            launcher::launch_game,
            launcher::launch_steam_game,
            launcher::launch_epic_game,
            launcher::open_game_folder,
            settings::get_settings,
            settings::save_settings,
            settings::export_library,
            settings::import_library,
            settings::save_file,
            settings::check_for_update,
            settings::open_url,
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

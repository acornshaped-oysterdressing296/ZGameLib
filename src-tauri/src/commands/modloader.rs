use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

// ── helpers ────────────────────────────────────────────────────────────────

fn p(install_dir: &str, sub: &str) -> PathBuf {
    Path::new(install_dir).join(sub)
}

fn is_bepinex_installed(install_dir: &str) -> bool {
    p(install_dir, "BepInEx").exists()
}

fn is_melonloader_installed(install_dir: &str) -> bool {
    p(install_dir, "MelonLoader").exists()
}

fn bepinex_plugins_dir(install_dir: &str) -> PathBuf {
    p(install_dir, "BepInEx").join("plugins")
}

fn melonloader_mods_dir(install_dir: &str) -> PathBuf {
    p(install_dir, "Mods")
}

fn list_mods(dir: &PathBuf) -> Vec<ModInfo> {
    if !dir.exists() { return vec![]; }
    let mut mods = vec![];
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().map(|e| e == "dll").unwrap_or(false) {
                mods.push(ModInfo {
                    name: p.file_stem().unwrap_or_default().to_string_lossy().to_string(),
                    file_name: p.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    size_bytes: entry.metadata().map(|m| m.len()).unwrap_or(0),
                });
            }
        }
    }
    mods
}

fn emit_log(app: &AppHandle, level: &str, message: &str) {
    #[derive(serde::Serialize, Clone)]
    struct LogEvent { level: String, message: String }
    let _ = app.emit("scan-log", LogEvent { level: level.to_string(), message: message.to_string() });
}

fn fetch_json(url: &str) -> Result<serde_json::Value, String> {
    let mut body = String::new();
    ureq::get(url)
        .set("User-Agent", "ZGameLib")
        .call()
        .map_err(|e| e.to_string())?
        .into_reader()
        .read_to_string(&mut body)
        .map_err(|e| e.to_string())?;
    serde_json::from_str(&body).map_err(|e| e.to_string())
}

fn download_bytes(url: &str) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    ureq::get(url)
        .set("User-Agent", "ZGameLib")
        .call()
        .map_err(|e| e.to_string())?
        .into_reader()
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    Ok(bytes)
}

// ── types ──────────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, Clone)]
pub struct ModLoaderStatus {
    pub bepinex_installed: bool,
    pub melonloader_installed: bool,
    pub mods_folder: Option<String>,
    pub mods: Vec<ModInfo>,
}

#[derive(Debug, serde::Serialize, Clone)]
pub struct ModInfo {
    pub name: String,
    pub file_name: String,
    pub size_bytes: u64,
}

// ── commands ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn check_modloader_status(install_dir: String) -> Result<ModLoaderStatus, String> {
    let bepinex = is_bepinex_installed(&install_dir);
    let melonloader = is_melonloader_installed(&install_dir);

    // If both somehow installed, prefer BepInEx for the mods folder
    let (mods_folder, mods) = if bepinex {
        let dir = bepinex_plugins_dir(&install_dir);
        (Some(dir.to_string_lossy().to_string()), list_mods(&dir))
    } else if melonloader {
        let dir = melonloader_mods_dir(&install_dir);
        (Some(dir.to_string_lossy().to_string()), list_mods(&dir))
    } else {
        (None, vec![])
    };

    Ok(ModLoaderStatus { bepinex_installed: bepinex, melonloader_installed: melonloader, mods_folder, mods })
}

#[tauri::command]
pub fn install_bepinex(app: AppHandle, install_dir: String) -> Result<(), String> {
    emit_log(&app, "info", "Fetching latest BepInEx release from GitHub...");

    let release = fetch_json("https://api.github.com/repos/BepInEx/BepInEx/releases/latest")?;

    let assets = release["assets"].as_array().ok_or("No assets in release")?;
    let asset = assets.iter().find(|a| {
        let name = a["name"].as_str().unwrap_or("");
        name.contains("x64") && name.ends_with(".zip") && !name.to_lowercase().contains("unix")
    }).ok_or("BepInEx x64 zip not found in release")?;

    let url = asset["browser_download_url"].as_str().ok_or("No download URL")?;
    let version = release["tag_name"].as_str().unwrap_or("unknown");
    emit_log(&app, "info", &format!("Downloading BepInEx {}...", version));

    let bytes = download_bytes(url)?;
    emit_log(&app, "info", "Extracting to game directory...");

    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let out = Path::new(&install_dir).join(file.name());
        if file.name().ends_with('/') {
            fs::create_dir_all(&out).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut f = fs::File::create(&out).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut f).map_err(|e| e.to_string())?;
        }
    }

    fs::create_dir_all(bepinex_plugins_dir(&install_dir)).map_err(|e| e.to_string())?;
    emit_log(&app, "ok", "BepInEx installed successfully!");
    Ok(())
}

#[tauri::command]
pub fn uninstall_bepinex(install_dir: String) -> Result<(), String> {
    // Remove BepInEx folder
    let bepinex_dir = p(&install_dir, "BepInEx");
    if bepinex_dir.exists() {
        fs::remove_dir_all(&bepinex_dir).map_err(|e| e.to_string())?;
    }
    // Remove hook DLLs and config files BepInEx places at game root
    for file in &["winhttp.dll", "doorstop_config.ini", ".doorstop_version", "changelog.txt"] {
        let path = p(&install_dir, file);
        if path.exists() { let _ = fs::remove_file(path); }
    }
    Ok(())
}

#[tauri::command]
pub fn install_melonloader(app: AppHandle, install_dir: String) -> Result<(), String> {
    emit_log(&app, "info", "Fetching MelonLoader releases from GitHub...");

    // Use /releases list — MelonLoader ships as pre-releases so /latest often misses them
    let releases = fetch_json("https://api.github.com/repos/LavaGang/MelonLoader/releases?per_page=10")?;
    let releases_arr = releases.as_array().ok_or("Unexpected response from GitHub")?;

    // Find the first non-draft release that has MelonLoader.x64.zip
    // We use the zip directly — the GUI installer has no reliable silent CLI mode
    let (asset_url, version) = releases_arr.iter()
        .filter(|r| !r["draft"].as_bool().unwrap_or(false))
        .find_map(|r| {
            let assets = r["assets"].as_array()?;
            let asset = assets.iter().find(|a| {
                a["name"].as_str().unwrap_or("") == "MelonLoader.x64.zip"
            })?;
            let url = asset["browser_download_url"].as_str()?.to_string();
            let ver = r["tag_name"].as_str().unwrap_or("unknown").to_string();
            Some((url, ver))
        })
        .ok_or("MelonLoader.x64.zip not found in any recent release")?;

    emit_log(&app, "info", &format!("Downloading MelonLoader {}...", version));
    let bytes = download_bytes(&asset_url)?;

    emit_log(&app, "info", "Extracting MelonLoader to game directory...");
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let out = Path::new(&install_dir).join(file.name());
        if file.name().ends_with('/') {
            fs::create_dir_all(&out).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut f = fs::File::create(&out).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut f).map_err(|e| e.to_string())?;
        }
    }

    // Pre-create Mods/ and Plugins/ — MelonLoader creates these on first game launch
    // but we want them visible immediately in the panel
    fs::create_dir_all(melonloader_mods_dir(&install_dir)).map_err(|e| e.to_string())?;
    fs::create_dir_all(p(&install_dir, "Plugins")).map_err(|e| e.to_string())?;

    emit_log(&app, "ok", "MelonLoader installed successfully!");
    Ok(())
}

#[tauri::command]
pub fn uninstall_melonloader(install_dir: String) -> Result<(), String> {
    // Remove MelonLoader folder
    let ml_dir = p(&install_dir, "MelonLoader");
    if ml_dir.exists() {
        fs::remove_dir_all(&ml_dir).map_err(|e| e.to_string())?;
    }
    // Remove hook files MelonLoader places at game root
    for file in &["version.dll", "dobby.dll"] {
        let path = p(&install_dir, file);
        if path.exists() { let _ = fs::remove_file(path); }
    }
    Ok(())
}

#[tauri::command]
pub fn open_mods_folder(install_dir: String) -> Result<(), String> {
    let folder = if is_bepinex_installed(&install_dir) {
        let dir = bepinex_plugins_dir(&install_dir);
        fs::create_dir_all(&dir).ok();
        dir
    } else if is_melonloader_installed(&install_dir) {
        let dir = melonloader_mods_dir(&install_dir);
        fs::create_dir_all(&dir).ok();
        dir
    } else {
        return Err("No mod loader installed".to_string());
    };
    open::that(&folder).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_mod(install_dir: String, source_path: String) -> Result<ModInfo, String> {
    let mods_folder = if is_bepinex_installed(&install_dir) {
        bepinex_plugins_dir(&install_dir)
    } else if is_melonloader_installed(&install_dir) {
        melonloader_mods_dir(&install_dir)
    } else {
        return Err("No mod loader installed".to_string());
    };

    fs::create_dir_all(&mods_folder).map_err(|e| e.to_string())?;
    let source = Path::new(&source_path);
    let file_name = source.file_name().ok_or("Invalid path")?.to_string_lossy().to_string();
    let dest = mods_folder.join(&file_name);
    fs::copy(source, &dest).map_err(|e| e.to_string())?;

    Ok(ModInfo {
        name: source.file_stem().unwrap_or_default().to_string_lossy().to_string(),
        file_name,
        size_bytes: dest.metadata().map(|m| m.len()).unwrap_or(0),
    })
}

#[tauri::command]
pub fn delete_mod(install_dir: String, file_name: String) -> Result<(), String> {
    let mods_folder = if is_bepinex_installed(&install_dir) {
        bepinex_plugins_dir(&install_dir)
    } else if is_melonloader_installed(&install_dir) {
        melonloader_mods_dir(&install_dir)
    } else {
        return Err("No mod loader installed".to_string());
    };
    fs::remove_file(mods_folder.join(&file_name)).map_err(|e| e.to_string())
}

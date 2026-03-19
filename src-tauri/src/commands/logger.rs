use std::io::Write;

static LOG_BUFFER: std::sync::OnceLock<std::sync::Mutex<Vec<String>>> = std::sync::OnceLock::new();

pub fn init() {
    let _ = LOG_BUFFER.set(std::sync::Mutex::new(Vec::new()));
}

fn log_path() -> Option<std::path::PathBuf> {
    dirs::data_dir().map(|d| d.join("zgamelib").join("logs").join("app.log"))
}

pub fn log_error(message: &str) {
    let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ");
    let entry = format!("[{}] [ERROR] {}", timestamp, message);
    if let Some(buf) = LOG_BUFFER.get() {
        if let Ok(mut v) = buf.lock() {
            v.push(entry.clone());
            if v.len() > 1000 { v.drain(0..200); }
        }
    }
    if let Some(path) = log_path() {
        if let Ok(meta) = std::fs::metadata(&path) {
            if meta.len() > 1_000_000 {
                let p3 = path.with_file_name("app.3.log");
                let p2 = path.with_file_name("app.2.log");
                let p1 = path.with_file_name("app.1.log");
                if p3.exists() { let _ = std::fs::remove_file(&p3); }
                if p2.exists() { let _ = std::fs::rename(&p2, p3); }
                if p1.exists() { let _ = std::fs::rename(&p1, p2); }
                let _ = std::fs::rename(&path, p1);
            }
        }
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
            let _ = writeln!(f, "{}", entry);
        }
    }
}

#[tauri::command]
pub fn get_log_contents() -> Vec<String> {
    if let Some(buf) = LOG_BUFFER.get() {
        if let Ok(v) = buf.lock() {
            if !v.is_empty() {
                let len = v.len();
                let start = if len > 200 { len - 200 } else { 0 };
                return v[start..].to_vec();
            }
        }
    }
    if let Some(path) = log_path() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            let lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();
            let len = lines.len();
            let start = if len > 200 { len - 200 } else { 0 };
            return lines[start..].to_vec();
        }
    }
    vec![]
}

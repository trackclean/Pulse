use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

#[derive(Serialize)]
pub struct BpmResult {
    pub bpm: Option<f32>,
    pub confidence: f32,
}

#[tauri::command]
pub async fn detect_bpm(app: tauri::AppHandle, path: String) -> Result<BpmResult, String> {
    tauri::async_runtime::spawn_blocking(move || detect_bpm_sync(&app, &path))
        .await
        .map_err(|e| e.to_string())?
}

fn detect_bpm_sync(app: &tauri::AppHandle, path: &str) -> Result<BpmResult, String> {
    let aubio_path = resolve_aubiotrack_path(app)
        .ok_or_else(|| {
            #[cfg(target_os = "linux")]
            return "BPM detection requires aubio-tools. Install it with: sudo apt-get install aubio-tools".to_string();

            #[cfg(not(target_os = "linux"))]
            {
                let candidates = aubiotrack_candidates();
                let exe_dir = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|d| d.display().to_string()))
                    .unwrap_or_else(|| "<unknown>".to_string());
                format!(
                    "aubiotrack binary not found. Searched for {:?} in resource dir, CWD/binaries, {}/binaries, and {}",
                    candidates, exe_dir, exe_dir
                )
            }
        })?;

    let mut cmd = Command::new(&aubio_path);
    cmd.arg(path);

    // On Windows: ensure libaubio-5.dll is findable by the child process.
    // The DLL lives next to aubiotrack in the same binaries/ directory.
    // Also add the parent directory (resource root) as a fallback in case the DLL
    // ends up at a different level (e.g. older installs or different bundling configs).
    #[cfg(target_os = "windows")]
    {
        if let Some(exe_dir) = aubio_path.parent() {
            let current_path = std::env::var("PATH").unwrap_or_default();
            let mut dll_search_dirs = vec![exe_dir.display().to_string()];
            if let Some(parent) = exe_dir.parent() {
                dll_search_dirs.push(parent.display().to_string());
            }
            let extra = dll_search_dirs.join(";");
            cmd.env("PATH", format!("{};{}", extra, current_path));
        }
    }

    // Suppress console window on Windows when spawning from a GUI app
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd.output().map_err(|e| {
        #[cfg(target_os = "windows")]
        {
            let err_str = e.to_string();
            if e.raw_os_error() == Some(126) || err_str.contains("not found") || err_str.contains("cannot find") {
                return format!(
                    "VCRUNTIME_MISSING: BPM detection failed because the Visual C++ Runtime is not installed. \
                     Please download and install it from: https://aka.ms/vs/17/release/vc_redist.x64.exe"
                );
            }
        }
        format!("Failed to run aubiotrack at '{}': {}", aubio_path.display(), e)
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "aubiotrack failed (exit code {:?}, path '{}'): {}",
            output.status.code(), aubio_path.display(), stderr
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    let timestamps: Vec<f32> = stdout
        .lines()
        .filter_map(|line| line.trim().parse::<f32>().ok())
        .filter(|&t| t > 0.0)
        .collect();

    if timestamps.len() < 3 {
        return Ok(BpmResult { bpm: None, confidence: 0.0 });
    }

    let mut intervals: Vec<f32> = timestamps
        .windows(2)
        .map(|w| w[1] - w[0])
        .filter(|&iv| iv > 0.05 && iv < 4.0)
        .collect();

    if intervals.is_empty() {
        return Ok(BpmResult { bpm: None, confidence: 0.0 });
    }

    intervals.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let median_interval = intervals[intervals.len() / 2];

    if median_interval <= 0.0 {
        return Ok(BpmResult { bpm: None, confidence: 0.0 });
    }

    let raw_bpm = 60.0 / median_interval;

    // Candidate ratios to try
    let candidates = [
        raw_bpm,
        raw_bpm * 2.0,
        raw_bpm / 2.0,
        raw_bpm * 2.0 / 3.0,
        raw_bpm * 3.0 / 2.0,
        raw_bpm * 3.0 / 4.0,  // ADD: fixes 190 -> 142
        raw_bpm * 4.0 / 3.0,  // ADD: fixes 101 -> 134
    ];

    // Score candidates using a Gaussian centered at 140 BPM (typical music production range)
    // sigma=0.5 in log2 space means values from ~100-200 BPM score well
    let score_bpm = |b: f32| -> f32 {
        if b < 60.0 || b > 200.0 {
            return f32::NEG_INFINITY;
        }
        let log_ratio = (b / 140.0_f32).log2();
        (-0.5 * (log_ratio / 0.5_f32).powi(2)).exp()
    };

    // Prefer the raw BPM only if it scores within 90% of the best candidate.
    // This threshold is tight enough to correct subdivision detections (e.g. hi-hats
    // at 170 BPM when the real tempo is 126) via the 3/4 ratio candidate, while
    // loose enough not to incorrectly "correct" already-accurate raw values.
    let best_candidate = candidates
        .iter()
        .copied()
        .filter(|&b| b >= 60.0 && b <= 200.0)
        .max_by(|&a, &b| {
            score_bpm(a)
                .partial_cmp(&score_bpm(b))
                .unwrap_or(std::cmp::Ordering::Equal)
        })
        .unwrap_or(raw_bpm);

    let raw_score = score_bpm(raw_bpm);
    let best_score = score_bpm(best_candidate);

    let bpm = if raw_score >= best_score * 0.9 {
        raw_bpm // raw is good enough, keep it
    } else {
        best_candidate
    };

    let bpm = bpm.clamp(20.0, 400.0);

    let tolerance = median_interval * 0.05;
    let consistent = intervals
        .iter()
        .filter(|&&iv| (iv - median_interval).abs() < tolerance)
        .count();
    let mut confidence = (consistent as f32 / intervals.len() as f32).clamp(0.0, 1.0);

    // Cap confidence for very small sample sets — too few intervals to be reliable
    if intervals.len() <= 3 {
        confidence = confidence.min(0.5);
    }

    Ok(BpmResult {
        bpm: Some((bpm * 10.0).round() / 10.0),
        confidence,
    })
}

fn aubiotrack_candidates() -> Vec<&'static str> {
    let mut names = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if cfg!(target_arch = "x86_64") {
            names.push("aubiotrack-x86_64-pc-windows-msvc.exe");
        } else if cfg!(target_arch = "aarch64") {
            names.push("aubiotrack-aarch64-pc-windows-msvc.exe");
        }
        names.push("aubiotrack.exe");
    }

    #[cfg(target_os = "macos")]
    {
        if cfg!(target_arch = "aarch64") {
            names.push("aubiotrack-aarch64-apple-darwin");
        }
        if cfg!(target_arch = "x86_64") {
            names.push("aubiotrack-x86_64-apple-darwin");
        }
        names.push("aubiotrack");
    }

    #[cfg(target_os = "linux")]
    {
        if cfg!(target_arch = "aarch64") {
            names.push("aubiotrack-aarch64-unknown-linux-gnu");
        }
        if cfg!(target_arch = "x86_64") {
            names.push("aubiotrack-x86_64-unknown-linux-gnu");
        }
        names.push("aubiotrack");
    }

    names
}

fn resolve_aubiotrack_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    use tauri::Manager;

    let candidates = aubiotrack_candidates();

    for name in candidates {
        // Strategy 1: resolve via Resource base directory
        if let Some(p) = app
            .path()
            .resolve(
                format!("binaries/{}", name),
                tauri::path::BaseDirectory::Resource,
            )
            .ok()
            .filter(|p| p.exists())
        {
            return Some(p);
        }

        // Strategy 1.5: relative to current working directory (dev mode)
        if let Ok(cwd) = std::env::current_dir() {
            let candidate = cwd.join("binaries").join(name);
            if candidate.exists() {
                return Some(candidate);
            }
        }

        // Strategy 2: relative to the app executable
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                let candidate = parent.join("binaries").join(name);
                if candidate.exists() {
                    return Some(candidate);
                }
            }
        }

        // Strategy 3: next to the executable directly
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                let candidate = parent.join(name);
                if candidate.exists() {
                    return Some(candidate);
                }
            }
        }
    }

    None
}

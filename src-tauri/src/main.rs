// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  // Commands are registered in src-tauri/src/lib.rs.
  clean_track_buddy_lib::run()
}

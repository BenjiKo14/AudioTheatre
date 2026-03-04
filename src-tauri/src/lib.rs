use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let bytes = include_bytes!("../icons/128x128.png");
      let img = image::load_from_memory(bytes)
        .expect("icône invalide")
        .to_rgba8();
      let (w, h) = image::GenericImageView::dimensions(&img);
      let icon = tauri::image::Image::new_owned(img.into_raw(), w, h);
      window.set_icon(icon)?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application")
}

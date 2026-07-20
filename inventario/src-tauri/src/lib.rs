#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Dejar que Tauri maneje la ruta de la base de datos
    // "sqlite:inventario.db" se crea en el directorio de datos de la app
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

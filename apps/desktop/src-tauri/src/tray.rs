use tauri::image::Image;
use tauri::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Wry};

use crate::events::TRAY_NEW_NOTE_EVENT;
use crate::windows::show_main_window;

const TRAY_ICON: &[u8] = include_bytes!("../icons/tray-template.png");
const NEW_NOTE_ID: &str = "new-note";
const OPEN_ID: &str = "open";
const QUIT_ID: &str = "quit";
const TRAY_ID: &str = "fr-notes-tray";

pub fn install_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_menu(app)?;
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(Image::from_bytes(TRAY_ICON)?)
        .icon_as_template(true)
        .tooltip("FR Notes")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_menu_event)
        .build(app)?;
    Ok(())
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let new_note = MenuItem::with_id(app, NEW_NOTE_ID, "Nova nota", true, None::<&str>)?;
    let open = MenuItem::with_id(app, OPEN_ID, "Abrir FR Notes", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, QUIT_ID, "Sair", true, None::<&str>)?;
    Menu::with_items(app, &[&new_note, &open, &separator, &quit])
}

fn handle_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        NEW_NOTE_ID => {
            show_main_window(app);
            let _ = app.emit(TRAY_NEW_NOTE_EVENT, ());
        }
        OPEN_ID => show_main_window(app),
        QUIT_ID => app.exit(0),
        _ => {}
    }
}

pub fn set_tray_title(app: &AppHandle, title: Option<String>) -> Result<(), String> {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return Ok(());
    };
    tray.set_title(title.filter(|text| !text.trim().is_empty()))
        .map_err(|error| error.to_string())
}

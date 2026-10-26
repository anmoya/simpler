use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const MAX_SOURCE_BYTES: u64 = 12 * 1024 * 1024;
const MAX_PIXELS: u64 = 8_000_000;
static PREVIEW_IN_PROGRESS: Mutex<()> = Mutex::new(());

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImageRequest {
    workspace_path: String,
    image_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImagePreview {
    name: String,
    size_bytes: u64,
    width: u32,
    height: u32,
    data_url: String,
}

pub(super) fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .is_some_and(|extension| {
            super::IMPORTABLE_IMAGE_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str())
        })
}

fn resolve_image(request: &ImageRequest) -> Result<PathBuf, String> {
    let workspace = Path::new(&request.workspace_path);
    super::ensure_workspace_folder(workspace)?;
    let path = super::resolve_workspace_path(workspace, &request.image_path)?;
    let root = workspace
        .canonicalize()
        .map_err(|error| format!("Workspace no disponible: {error}"))?;
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("Imagen no disponible: {error}"))?;
    if !canonical.starts_with(&root) {
        return Err("La imagen debe estar dentro del Workspace".to_string());
    }
    super::resolve_workspace_path(&root, &super::relative_workspace_path(&root, &canonical))?;
    if !is_image(&path) || !is_image(&canonical) || !canonical.is_file() {
        return Err("Formato de imagen no admitido".to_string());
    }
    Ok(canonical)
}

pub(super) fn preview(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let _permit = PREVIEW_IN_PROGRESS
        .lock()
        .map_err(|_| "No se pudo preparar la vista previa".to_string())?;
    let request: ImageRequest = serde_json::from_value(payload)
        .map_err(|_| "workspacePath and imagePath are required".to_string())?;
    let path = resolve_image(&request)?;
    let file =
        fs::File::open(&path).map_err(|error| format!("No se pudo leer la imagen: {error}"))?;
    let size_bytes = file.metadata().map_err(|error| error.to_string())?.len();
    if size_bytes > MAX_SOURCE_BYTES {
        return Err("Imagen demasiado grande para la vista previa (máximo 12 MiB). Puedes abrirla externamente.".to_string());
    }
    // Bound the actual read as well as metadata: the file can grow after stat.
    let mut bytes = Vec::new();
    file.take(MAX_SOURCE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;
    if bytes.len() as u64 > MAX_SOURCE_BYTES {
        return Err("Imagen demasiado grande para la vista previa".to_string());
    }
    let format = image::guess_format(&bytes)
        .map_err(|_| "Imagen dañada o formato no admitido".to_string())?;
    if !matches!(
        format,
        image::ImageFormat::Png
            | image::ImageFormat::Jpeg
            | image::ImageFormat::Gif
            | image::ImageFormat::WebP
            | image::ImageFormat::Bmp
    ) {
        return Err("Formato de imagen no admitido".to_string());
    }
    let (width, height) = image::ImageReader::with_format(Cursor::new(&bytes), format)
        .into_dimensions()
        .map_err(|error| format!("No se pudo previsualizar la imagen: {error}"))?;
    if width == 0 || height == 0 || u64::from(width) * u64::from(height) > MAX_PIXELS {
        return Err("Dimensiones demasiado grandes para la vista previa (máximo 8 millones de píxeles). Puedes abrirla externamente.".to_string());
    }
    let mut reader = image::ImageReader::with_format(Cursor::new(&bytes), format);
    let mut limits = image::Limits::default();
    limits.max_alloc = Some(32 * 1024 * 1024);
    reader.limits(limits);
    let decoded = reader
        .decode()
        .map_err(|error| format!("No se pudo previsualizar la imagen: {error}"))?;
    // A static raster also bounds animated formats and never executes active content.
    let mut png = Cursor::new(Vec::new());
    decoded
        .write_to(&mut png, image::ImageFormat::Png)
        .map_err(|error| error.to_string())?;
    serde_json::to_value(ImagePreview {
        name: Path::new(&request.image_path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned(),
        size_bytes,
        width,
        height,
        data_url: format!(
            "data:image/png;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(png.into_inner())
        ),
    })
    .map_err(|error| error.to_string())
}

pub(super) fn open_external(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let request: ImageRequest = serde_json::from_value(payload)
        .map_err(|_| "workspacePath and imagePath are required".to_string())?;
    let path = resolve_image(&request)?;
    let mut signature = [0u8; 32];
    let count = fs::File::open(&path)
        .and_then(|mut file| file.read(&mut signature))
        .map_err(|error| format!("No se pudo leer la imagen: {error}"))?;
    let format = image::guess_format(&signature[..count])
        .map_err(|_| "El archivo no es una imagen admitida".to_string())?;
    if !matches!(
        format,
        image::ImageFormat::Png
            | image::ImageFormat::Jpeg
            | image::ImageFormat::Gif
            | image::ImageFormat::WebP
            | image::ImageFormat::Bmp
    ) {
        return Err("Formato de imagen no admitido".to_string());
    }
    // Explicit user action; only a validated raster path is passed, never a URL or shell text.
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|error| format!("No se pudo abrir la imagen externamente: {error}"))?;
    #[cfg(not(target_os = "linux"))]
    return Err("La apertura externa de imágenes solo está disponible en Linux".to_string());
    Ok(serde_json::json!({}))
}

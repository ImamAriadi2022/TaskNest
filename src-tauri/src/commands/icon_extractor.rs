use std::path::{Path, PathBuf};
use windows::core::{Interface, HSTRING, PCWSTR};
use windows::Win32_UI_Shell::{IShellLinkW, SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
use windows::Win32_System_Com::{CoCreateInstance, CoInitialize, CLSCTX_INPROC_SERVER, IPersistFile, STGM_READ};
use windows::Win32_Graphics_Gdi::{
    GetDIBits, GetObjectW, CreateCompatibleDC, SelectObject, DeleteObject, DeleteDC,
    BITMAP, BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS, HDC, HBITMAP
};
use windows::Win32_UI_WindowsAndMessaging::{GetIconInfo, DestroyIcon, HICON, PrivateExtractIconsW};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use image::{ImageBuffer, Rgba};
use std::io::Cursor;

// Helper to resolve shortcut paths
pub fn resolve_lnk(lnk_path: &Path) -> Result<PathBuf, String> {
    unsafe {
        let _ = CoInitialize(None);
        
        let shell_link: IShellLinkW = CoCreateInstance(
            &windows::Win32_UI_Shell::ShellLink,
            None,
            CLSCTX_INPROC_SERVER,
        ).map_err(|e| format!("Failed to create ShellLink COM: {}", e))?;
        
        let persist_file: IPersistFile = shell_link.cast()
            .map_err(|e| format!("Failed to cast to IPersistFile: {}", e))?;
            
        let path_str = lnk_path.to_string_lossy().to_string();
        let wide_path: Vec<u16> = path_str.encode_utf16().chain(std::iter::once(0)).collect();
        
        persist_file.Load(PCWSTR(wide_path.as_ptr()), STGM_READ)
            .map_err(|e| format!("Failed to load lnk file: {}", e))?;
            
        let mut buffer = [0u16; 260];
        shell_link.GetPath(&mut buffer, std::ptr::null_mut(), 0)
            .map_err(|e| format!("Failed to get shortcut target path: {}", e))?;
            
        let len = buffer.iter().position(|&x| x == 0).unwrap_or(buffer.len());
        let target = String::from_utf16(&buffer[..len])
            .map_err(|e| format!("Failed to decode UTF-16 path: {}", e))?;
            
        Ok(PathBuf::from(target))
    }
}

// Convert HICON to Base64 PNG data URL
pub fn hicon_to_base64(hicon: HICON) -> Result<String, String> {
    unsafe {
        let mut icon_info = windows::Win32_UI_WindowsAndMessaging::ICONINFO::default();
        if !GetIconInfo(hicon, &mut icon_info).as_bool() {
            return Err("Failed to get icon info".to_string());
        }

        // Clean up handles when we are done
        let _color_bmp_guard = scopeguard::guard(icon_info.hbmColor, |h| {
            if !h.is_invalid() { let _ = DeleteObject(h); }
        });
        let _mask_bmp_guard = scopeguard::guard(icon_info.hbmMask, |h| {
            if !h.is_invalid() { let _ = DeleteObject(h); }
        });

        let hbitmap = if !icon_info.hbmColor.is_invalid() {
            icon_info.hbmColor
        } else if !icon_info.hbmMask.is_invalid() {
            icon_info.hbmMask
        } else {
            return Err("No bitmap found in icon".to_string());
        };

        let mut bitmap = BITMAP::default();
        let size = std::mem::size_of::<BITMAP>() as i32;
        if GetObjectW(hbitmap, size, Some(&mut bitmap as *mut BITMAP as *mut _)) == 0 {
            return Err("Failed to get bitmap object".to_string());
        }

        let width = bitmap.bmWidth;
        let height = bitmap.bmHeight;

        let hdc = CreateCompatibleDC(None);
        let _dc_guard = scopeguard::guard(hdc, |h| {
            if !h.is_invalid() { let _ = DeleteDC(h); }
        });

        // Setup bitmap info header
        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // Negative height for top-down bitmap
                biPlanes: 1,
                biBitCount: 32,
                biCompression: 0, // BI_RGB
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: Default::default(),
        };

        let mut buf = vec![0u8; (width * height * 4) as usize];
        let old_obj = SelectObject(hdc, hbitmap);
        
        let lines_copied = GetDIBits(
            hdc,
            hbitmap,
            0,
            height as u32,
            Some(buf.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        if old_obj != None {
            SelectObject(hdc, old_obj);
        }

        if lines_copied == 0 {
            return Err("Failed to get bits from bitmap".to_string());
        }

        // Convert BGRA to RGBA
        for pixel in buf.chunks_mut(4) {
            if pixel.len() == 4 {
                let b = pixel[0];
                let r = pixel[2];
                pixel[0] = r;
                pixel[2] = b;
                // Preserve alpha channel. If all alpha are 0 (monochrome or failed alpha), set to 255.
            }
        }
        
        // Ensure alpha channel is not entirely transparent
        let mut has_alpha = false;
        for pixel in buf.chunks(4) {
            if pixel.len() == 4 && pixel[3] > 0 {
                has_alpha = true;
                break;
            }
        }
        if !has_alpha {
            for pixel in buf.chunks_mut(4) {
                if pixel.len() == 4 {
                    pixel[3] = 255;
                }
            }
        }

        // Create ImageBuffer and encode to PNG in memory
        let img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_raw(width as u32, height as u32, buf)
            .ok_ok().ok_or("Failed to create image buffer")?;

        let mut png_bytes = Vec::new();
        let mut cursor = Cursor::new(&mut png_bytes);
        
        img_buf.write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| format!("Failed to encode PNG: {}", e))?;

        let base64_str = BASE64.encode(&png_bytes);
        Ok(format!("data:image/png;base64,{}", base64_str))
    }
}

// Main logic to get icon from path
pub fn get_icon_from_path(path_str: &str) -> Result<String, String> {
    let path = Path::new(path_str);
    
    // Resolve shortcut if it is a .lnk
    let target_path = if path.extension().map_or(false, |ext| ext.eq_ignore_ascii_case("lnk")) {
        resolve_lnk(path).unwrap_or_else(|_| PathBuf::from(path_str))
    } else {
        PathBuf::from(path_str)
    };

    let target_path_str = target_path.to_string_lossy().to_string();
    let wide_target_path: Vec<u16> = target_path_str.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        // Method 1: PrivateExtractIconsW to get high resolution icon (e.g. 48x48)
        let mut hicon_array = [HICON::default(); 1];
        let mut icon_id_array = [0u32; 1];
        
        let extracted_count = PrivateExtractIconsW(
            PCWSTR(wide_target_path.as_ptr()),
            0,
            48, // Request 48x48 icon
            48,
            Some(hicon_array.as_mut_ptr()),
            Some(icon_id_array.as_mut_ptr()),
            1,
            0,
        );

        if extracted_count > 0 && !hicon_array[0].is_invalid() {
            let hicon = hicon_array[0];
            let res = hicon_to_base64(hicon);
            let _ = DestroyIcon(hicon);
            if res.is_ok() {
                return res;
            }
        }

        // Method 2: Fallback to SHGetFileInfoW
        let mut shfi = SHFILEINFOW::default();
        let size = std::mem::size_of::<SHFILEINFOW>() as u32;
        let flags = SHGFI_ICON | SHGFI_LARGEICON;

        let result = SHGetFileInfoW(
            PCWSTR(wide_target_path.as_ptr()),
            0,
            Some(&mut shfi as *mut SHFILEINFOW),
            size,
            flags,
        );

        if result != 0 && !shfi.hIcon.is_invalid() {
            let res = hicon_to_base64(shfi.hIcon);
            let _ = DestroyIcon(shfi.hIcon);
            res
        } else {
            Err("Failed to extract icon using both methods".to_string())
        }
    }
}

// Simple extension trait to convert Option to Result
trait OptionExt<T> {
    fn ok_ok(self) -> Option<T>;
}
impl<T> OptionExt<T> for Option<T> {
    fn ok_ok(self) -> Option<T> { self }
}

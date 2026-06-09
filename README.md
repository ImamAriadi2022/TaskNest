# TaskNest 🚀

TaskNest adalah aplikasi desktop launcher dan manager premium berbasis **Tauri v2 + React + TypeScript + Vite**. Aplikasi ini dirancang untuk merapikan workspace Anda dengan mengelompokkan berbagai aplikasi dan tools Windows ke dalam folder kategori kustom yang cantik dan efisien.

Aplikasi ini menggunakan desain modern dengan antarmuka borderless transparan berbasis efek kaca (acrylic-glass), performa super cepat, dan penggunaan memori (RAM) yang sangat rendah berkat teknologi Tauri.

---

## ✨ Fitur Utama

- 🎨 **Antarmuka Premium (Acrylic-Glass UI):** Desain modern transparan borderless yang menyatu dengan estetika Windows.
- 🪟 **Window Control Custom:**
  - **Draggable Window:** Window dapat digeser/dipindahkan ke mana saja dengan menahan dan menyeret area kosong di header (`data-tauri-drag-region`).
  - **Minimize Window:** Mengecilkan aplikasi langsung ke Taskbar menggunakan tombol kontrol minus (`-`) native.
  - **Window Focus:** Aplikasi berada pada level fokus normal (tidak selalu di paling depan / *always on top*), sehingga tidak menutupi aktivitas Anda di aplikasi lain.
- 🔍 **Pemindaian Aplikasi Terinstal Otomatis (Smart Apps Scanner):**
  - Tidak perlu lagi membuka dialog File Explorer secara manual untuk mencari path `.exe`.
  - Klik **"Tambah Aplikasi"**, aplikasi akan otomatis memindai shortcut `.lnk` di **Start Menu** (Global & User) dan **Desktop** Anda secara rekursif.
  - Cari dan tambahkan aplikasi Anda secara instan menggunakan pencarian real-time (filter).
  - *Fallback* manual ("Pilih File Manual") tetap tersedia jika Anda membutuhkannya.
- 🖼️ **Ekstraksi Ikon Otomatis (Native Icon Extractor):**
  - Mengambil ikon asli berkualitas tinggi langsung dari berkas `.exe` atau pintasan `.lnk` menggunakan API Windows Shell native di Rust.
- ⭐ **Favorit & Riwayat Terakhir:**
  - Pin aplikasi favorit Anda ke dashboard utama.
  - Lihat riwayat 5 aplikasi yang terakhir kali Anda buka untuk peluncuran lebih cepat.

---

## 📦 Download Aplikasi (Executable `.exe`)

Anda dapat mengunduh berkas executable siap pakai (tanpa perlu install Rust/Node.js) langsung di halaman release:

👉 **[Download TaskNest Terbaru (Releases)](https://github.com/ImamAriadi2022/TaskNest/releases)**

Unduh berkas `tauri-app_0.1.0_x64-setup.exe` atau berkas standalone `.exe` lainnya yang terdaftar di halaman tersebut, jalankan instaler, dan mulailah merapikan workspace Anda!

---

## 🛠️ Persyaratan Sistem (Untuk Pengembangan & Build)

Jika Anda ingin menjalankan atau melakukan build source code ini secara lokal, pastikan perangkat Anda memiliki:

1. **Node.js** (Versi 18 ke atas disarankan)
2. **Rust & Cargo** (Gunakan [Rustup](https://rustup.rs/) untuk instalasi)
3. **C++ Build Tools untuk Windows** (Dibutuhkan oleh Rust compiler, instal melalui Visual Studio Installer dengan memilih beban kerja "Desktop development with C++")

---

## 🚀 Panduan Pengembangan Lokal

Ikuti langkah-langkah berikut untuk menjalankan aplikasi dalam mode development:

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/ImamAriadi2022/TaskNest.git
   cd TaskNest
   ```

2. **Instal dependensi NPM:**
   ```bash
   npm install
   ```

3. **Jalankan aplikasi dalam mode dev:**
   ```bash
   npm run tauri dev
   ```
   *Perintah ini akan menyalakan server Vite untuk frontend dan meluncurkan jendela aplikasi Tauri yang terhubung dengan hot-reload.*

---

## 🏗️ Panduan Kompilasi (Build ke `.exe`)

Untuk melakukan kompilasi mandiri ke berkas executable produksi (`.exe`):

1. **Jalankan perintah build:**
   ```bash
   npm run tauri build
   ```

2. **Hasil Build:**
   Setelah proses kompilasi selesai, berkas installer `.exe` dapat Anda temukan di direktori:
   `src-tauri/target/release/bundle/msi/` atau `src-tauri/target/release/bundle/nsis/`

---

## 📂 Struktur Proyek

* `src/` - Kode frontend React (TypeScript + Vite + Tailwind CSS v3)
  * `services/tauri.ts` - Penghubung API frontend dengan backend Tauri
  * `App.tsx` - Komponen antarmuka utama
* `src-tauri/` - Kode backend Rust & Konfigurasi Tauri
  * `src/commands/` - Fungsi-fungsi sistem native (peluncur aplikasi, ekstraksi ikon, dan pemindaian shortcuts)
  * `capabilities/default.json` - Pengaturan perizinan API (drag, minimize, dll) untuk window Tauri
  * `tauri.conf.json` - Konfigurasi utama aplikasi desktop (ukuran window, build settings, metadata bundle)

---

## 🤝 Kontribusi

Kontribusi selalu diterima! Jika Anda menemukan bug atau ingin menambahkan fitur baru, silakan ajukan *Issue* atau buat *Pull Request*.

Made with ❤️ by [Imam Ariadi](https://github.com/ImamAriadi2022).

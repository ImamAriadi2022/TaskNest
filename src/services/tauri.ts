import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppConfig } from "../types";

// Check if we are running inside Tauri
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
};

// Fallback LocalStorage config key
const LOCAL_STORAGE_KEY = "tasknest_config_fallback";

const DEFAULT_CONFIG: AppConfig = {
  version: "1.0.0",
  folders: [
    {
      id: "dev-folder",
      name: "Development",
      icon: "Code",
      apps: [
        {
          id: "mock-vscode",
          name: "VS Code",
          path: "C:\\Program Files\\Microsoft VS Code\\Code.exe",
          icon: "default-code"
        }
      ]
    },
    {
      id: "gaming-folder",
      name: "Gaming",
      icon: "Gamepad2",
      apps: []
    }
  ],
  favorites: ["mock-vscode"],
  recent: []
};

export async function loadConfig(): Promise<AppConfig> {
  if (isTauri()) {
    try {
      const configStr = await invoke<string>("load_config");
      return JSON.parse(configStr);
    } catch (error) {
      console.error("Failed to load config from Tauri:", error);
      return DEFAULT_CONFIG;
    }
  } else {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  if (isTauri()) {
    try {
      await invoke("save_config", { configJson: JSON.stringify(config) });
    } catch (error) {
      console.error("Failed to save config to Tauri:", error);
    }
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  }
}

export async function extractIcon(path: string): Promise<string> {
  if (isTauri()) {
    try {
      return await invoke<string>("extract_icon", { path });
    } catch (error) {
      console.error("Failed to extract icon:", error);
      throw error;
    }
  } else {
    // Return a dummy SVG icon in web context
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>`;
  }
}

export async function launchApp(path: string): Promise<void> {
  if (isTauri()) {
    try {
      await invoke("launch_app", { path });
    } catch (error) {
      console.error("Failed to launch app:", error);
      alert(`Gagal menjalankan aplikasi: ${error}`);
    }
  } else {
    console.log("Mock Launch Application:", path);
    alert(`Mock Launching: ${path}`);
  }
}

export async function selectExecutable(): Promise<string | null> {
  if (isTauri()) {
    try {
      return await invoke<string | null>("select_executable");
    } catch (error) {
      console.error("Failed to select executable:", error);
      return null;
    }
  } else {
    // Web fallback: ask for mock path or return null
    const path = prompt("Masukkan path file executable/shortcut mock (Windows format):", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
    return path;
  }
}

export interface InstalledApp {
  name: string;
  path: string;
}

export async function getInstalledApps(): Promise<InstalledApp[]> {
  if (isTauri()) {
    try {
      return await invoke<InstalledApp[]>("get_installed_apps");
    } catch (error) {
      console.error("Failed to get installed apps:", error);
      return [];
    }
  } else {
    // Return mock apps in web context
    return [
      { name: "Google Chrome", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
      { name: "Visual Studio Code", path: "C:\\Users\\Mock\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe" },
      { name: "Steam", path: "C:\\Program Files (x86)\\Steam\\Steam.exe" },
      { name: "Notepad", path: "C:\\Windows\\notepad.exe" },
      { name: "Discord", path: "C:\\Users\\Mock\\AppData\\Local\\Discord\\Update.exe" }
    ];
  }
}

export async function minimizeWindow(): Promise<void> {
  if (isTauri()) {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize window:", error);
    }
  } else {
    console.log("Mock Minimize Window");
  }
}


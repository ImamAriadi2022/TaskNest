export interface AppInfo {
  id: string;
  name: string;
  path: string;
  icon: string; // Base64 data URL
}

export interface Folder {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  apps: AppInfo[];
}

export interface AppConfig {
  version: string;
  folders: Folder[];
  favorites: string[]; // Array of app IDs (or path-based IDs)
  recent: string[]; // Array of app IDs
}

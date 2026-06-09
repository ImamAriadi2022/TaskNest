import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Trash2, Edit, Star, X, ChevronLeft, ChevronRight,
  FolderPlus, ArrowRight, CornerDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  loadConfig, saveConfig, extractIcon, launchApp, selectExecutable 
} from "./services/tauri";
import { AppConfig, Folder as FolderType, AppInfo } from "./types";
import { FolderIcon, AVAILABLE_ICONS } from "./components/FolderIcon";

function App() {
  const [config, setConfig] = useState<AppConfig>({
    version: "1.0.0",
    folders: [],
    favorites: [],
    recent: []
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  // Folder Dialog states
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderIcon, setFolderIcon] = useState("Folder");
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load config on mount
  useEffect(() => {
    async function init() {
      const data = await loadConfig();
      setConfig(data);
      setLoading(false);
    }
    init();
  }, []);

  // Save config helper
  const updateConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig);
    await saveConfig(newConfig);
  };

  // Folder CRUD operations
  const handleOpenCreateFolder = () => {
    setEditingFolderId(null);
    setFolderName("");
    setFolderIcon("Folder");
    setIsFolderModalOpen(true);
  };

  const handleOpenEditFolder = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setFolderName(folder.name);
    setFolderIcon(folder.icon);
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    let updatedFolders = [...config.folders];

    if (editingFolderId) {
      // Edit mode
      updatedFolders = updatedFolders.map(f => 
        f.id === editingFolderId 
          ? { ...f, name: folderName, icon: folderIcon } 
          : f
      );
    } else {
      // Create mode
      const newFolder: FolderType = {
        id: `folder-${Date.now()}`,
        name: folderName,
        icon: folderIcon,
        apps: []
      };
      updatedFolders.push(newFolder);
    }

    await updateConfig({
      ...config,
      folders: updatedFolders
    });

    setIsFolderModalOpen(false);
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Apakah Anda yakin ingin menghapus folder ini beserta semua aplikasi di dalamnya?")) {
      const updatedFolders = config.folders.filter(f => f.id !== folderId);
      
      // Cleanup favorites & recent list
      const folderApps = config.folders.find(f => f.id === folderId)?.apps.map(a => a.id) || [];
      const updatedFavorites = config.favorites.filter(id => !folderApps.includes(id));
      const updatedRecent = config.recent.filter(id => !folderApps.includes(id));

      await updateConfig({
        ...config,
        folders: updatedFolders,
        favorites: updatedFavorites,
        recent: updatedRecent
      });

      if (activeFolderId === folderId) {
        setActiveFolderId(null);
      }
    }
  };

  // Folder Reordering
  const handleMoveFolder = async (index: number, direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation();
    const newFolders = [...config.folders];
    const targetIndex = direction === "left" ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newFolders.length) {
      // Swap folders
      const temp = newFolders[index];
      newFolders[index] = newFolders[targetIndex];
      newFolders[targetIndex] = temp;

      await updateConfig({
        ...config,
        folders: newFolders
      });
    }
  };

  // Add Application using Native file selector and Icon extraction
  const handleAddApplication = async (folderId: string) => {
    try {
      const filePath = await selectExecutable();
      if (!filePath) return; // User cancelled

      // Extract file name
      // Normalizes path separators for Windows
      const cleanPath = filePath.replace(/\//g, "\\");
      const parts = cleanPath.split("\\");
      const fileNameWithExt = parts[parts.length - 1];
      const appName = fileNameWithExt.replace(/\.(exe|lnk)$/i, "");

      // Extract Icon
      let appIcon = "";
      try {
        appIcon = await extractIcon(cleanPath);
      } catch (err) {
        console.error("Failed to extract app icon, using default:", err);
        // Default app icon (SVG representation)
        appIcon = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>`;
      }

      const newApp: AppInfo = {
        id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: appName,
        path: cleanPath,
        icon: appIcon
      };

      const updatedFolders = config.folders.map(f => {
        if (f.id === folderId) {
          return {
            ...f,
            apps: [...f.apps, newApp]
          };
        }
        return f;
      });

      await updateConfig({
        ...config,
        folders: updatedFolders
      });

    } catch (error) {
      console.error("Failed to add application:", error);
      alert("Gagal menambahkan aplikasi.");
    }
  };

  const handleRemoveApplication = async (folderId: string, appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Hapus aplikasi ini dari folder?")) {
      const updatedFolders = config.folders.map(f => {
        if (f.id === folderId) {
          return {
            ...f,
            apps: f.apps.filter(a => a.id !== appId)
          };
        }
        return f;
      });

      const updatedFavorites = config.favorites.filter(id => id !== appId);
      const updatedRecent = config.recent.filter(id => id !== appId);

      await updateConfig({
        ...config,
        folders: updatedFolders,
        favorites: updatedFavorites,
        recent: updatedRecent
      });
    }
  };

  // Launch app and record recent
  const handleLaunchApp = async (app: AppInfo) => {
    await launchApp(app.path);
    
    // Add to recent (avoid duplicates, cap at 5)
    let updatedRecent = [app.id, ...config.recent.filter(id => id !== app.id)];
    if (updatedRecent.length > 5) {
      updatedRecent = updatedRecent.slice(0, 5);
    }

    await updateConfig({
      ...config,
      recent: updatedRecent
    });
  };

  // Toggle favorite
  const handleToggleFavorite = async (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updatedFavorites;
    if (config.favorites.includes(appId)) {
      updatedFavorites = config.favorites.filter(id => id !== appId);
    } else {
      updatedFavorites = [...config.favorites, appId];
    }

    await updateConfig({
      ...config,
      favorites: updatedFavorites
    });
  };

  // Find App helper
  const findAppById = (appId: string): { app: AppInfo; folder: FolderType } | null => {
    for (const folder of config.folders) {
      const app = folder.apps.find(a => a.id === appId);
      if (app) return { app, folder };
    }
    return null;
  };

  // Search results
  const searchResults: Array<{ app: AppInfo; folder: FolderType }> = [];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    config.folders.forEach(folder => {
      folder.apps.forEach(app => {
        if (app.name.toLowerCase().includes(q) || folder.name.toLowerCase().includes(q)) {
          searchResults.push({ app, folder });
        }
      });
    });
  }

  const activeFolder = config.folders.find(f => f.id === activeFolderId);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-medium">Memuat TaskNest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-slate-950/80 backdrop-blur-win border border-win-border rounded-xl shadow-win p-6 text-win-text select-none flex flex-col font-segoe overflow-y-auto">
      
      {/* Header & Search */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            TN
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-white">TaskNest</h1>
        </div>
        
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            isEditMode 
              ? "bg-blue-600 border-blue-500 text-white" 
              : "bg-win-hover border-win-border hover:bg-win-active text-slate-300"
          }`}
        >
          {isEditMode ? "Selesai" : "Edit Folder"}
        </button>
      </header>

      {/* Global Search Bar */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Cari aplikasi atau folder..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-900/60 border border-win-border rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Conditional Content: Search Results or Dashboard */}
      {searchQuery.trim() ? (
        // Search Results Screen
        <div className="flex-1">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Hasil Pencarian</h2>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {searchResults.map(({ app, folder }) => (
                <div 
                  key={app.id}
                  onClick={() => handleLaunchApp(app)}
                  className="flex flex-col items-center p-3 rounded-xl bg-slate-900/30 border border-win-border hover:bg-win-hover cursor-pointer group transition-all"
                >
                  <img src={app.icon} alt={app.name} className="h-10 w-10 mb-2 object-contain group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-center truncate w-full text-slate-200">{app.name}</span>
                  <span className="text-[10px] text-slate-400 flex items-center mt-1">
                    <CornerDownRight size={8} className="mr-1" /> {folder.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              Tidak ada aplikasi yang cocok dengan "{searchQuery}"
            </div>
          )}
        </div>
      ) : (
        // Standard Dashboard
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Favorites Section */}
          {config.favorites.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Aplikasi Favorit</h2>
              <div className="grid grid-cols-5 gap-3">
                {config.favorites.map(favId => {
                  const fav = findAppById(favId);
                  if (!fav) return null;
                  return (
                    <div 
                      key={fav.app.id}
                      onClick={() => handleLaunchApp(fav.app)}
                      className="relative flex flex-col items-center p-2.5 rounded-xl bg-slate-900/40 border border-win-border hover:bg-win-hover cursor-pointer group transition-all"
                    >
                      <img src={fav.app.icon} alt={fav.app.name} className="h-10 w-10 mb-2 object-contain group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-medium text-center truncate w-full text-slate-200">{fav.app.name}</span>
                      <button 
                        onClick={(e) => handleToggleFavorite(fav.app.id, e)}
                        className="absolute top-1 right-1 p-0.5 rounded-full text-yellow-500 hover:scale-110 transition-transform"
                      >
                        <Star size={10} fill="currentColor" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Folders Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kategori Folder</h2>
              <button 
                onClick={handleOpenCreateFolder}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                <FolderPlus size={14} /> Tambah Folder
              </button>
            </div>

            {config.folders.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {config.folders.map((folder, index) => (
                  <div 
                    key={folder.id}
                    onClick={() => setActiveFolderId(folder.id)}
                    className="group relative flex flex-col items-center p-4 rounded-2xl bg-slate-900/50 border border-win-border hover:bg-win-hover/60 hover:border-win-border*2 cursor-pointer transition-all duration-200"
                  >
                    {/* Folder Icon / Preview */}
                    <div className="relative h-14 w-14 mb-3 rounded-2xl bg-slate-950/60 border border-win-border flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform shadow-inner">
                      {folder.apps.length > 0 ? (
                        // Mini App Previews (Grid 2x2)
                        <div className="grid grid-cols-2 gap-1.5 p-2 w-full h-full">
                          {folder.apps.slice(0, 4).map(app => (
                            <img 
                              key={app.id} 
                              src={app.icon} 
                              alt={app.name} 
                              className="h-full w-full object-contain rounded"
                            />
                          ))}
                          {folder.apps.length === 0 && <FolderIcon name={folder.icon} size={24} />}
                        </div>
                      ) : (
                        <FolderIcon name={folder.icon} size={28} />
                      )}
                      
                      {/* Apps Count Badge */}
                      {folder.apps.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-blue-600 text-[9px] font-bold text-white shadow-md">
                          {folder.apps.length}
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-slate-200 text-center tracking-tight truncate w-full">
                      {folder.name}
                    </span>

                    {/* Edit mode controls */}
                    {isEditMode ? (
                      <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex flex-col items-center justify-center gap-2 p-2">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Kelola</span>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={(e) => handleOpenEditFolder(folder, e)}
                            className="p-1.5 rounded-lg bg-win-hover hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit size={12} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                            className="p-1.5 rounded-lg bg-win-hover hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {/* Order controls */}
                        <div className="flex gap-2 mt-1">
                          <button 
                            disabled={index === 0}
                            onClick={(e) => handleMoveFolder(index, "left", e)}
                            className={`p-1 rounded ${index === 0 ? "text-slate-700 cursor-not-allowed" : "text-slate-400 hover:text-white"}`}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button 
                            disabled={index === config.folders.length - 1}
                            onClick={(e) => handleMoveFolder(index, "right", e)}
                            className={`p-1 rounded ${index === config.folders.length - 1 ? "text-slate-700 cursor-not-allowed" : "text-slate-400 hover:text-white"}`}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Quick Launch Overlay on Hover
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={12} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 border border-dashed border-win-border rounded-2xl text-sm">
                Belum ada folder. Klik "Tambah Folder" untuk membuat folder baru.
              </div>
            )}
          </div>

          {/* Recent Applications Section */}
          {config.recent.length > 0 && (
            <div className="mt-auto pt-4 border-t border-win-border">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Terakhir Dibuka</h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {config.recent.map(recentId => {
                  const item = findAppById(recentId);
                  if (!item) return null;
                  return (
                    <div 
                      key={item.app.id}
                      onClick={() => handleLaunchApp(item.app)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/30 border border-win-border hover:bg-win-hover cursor-pointer group transition-all shrink-0 max-w-[150px]"
                    >
                      <img src={item.app.icon} alt={item.app.name} className="h-6 w-6 object-contain group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-medium truncate text-slate-300">{item.app.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== FOLDER DETAIL MODAL / POPUP ==================== */}
      <AnimatePresence>
        {activeFolder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-sm rounded-2xl bg-slate-900 border border-win-border shadow-2xl p-5 flex flex-col max-h-[500px]"
            >
              {/* Folder Header */}
              <div className="flex items-center justify-between pb-3 border-b border-win-border mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="text-blue-500">
                    <FolderIcon name={activeFolder.icon} size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{activeFolder.name}</h3>
                </div>
                <button 
                  onClick={() => setActiveFolderId(null)}
                  className="p-1 rounded-lg hover:bg-win-hover text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Folder Apps Grid */}
              <div className="flex-1 overflow-y-auto mb-4 pr-1">
                {activeFolder.apps.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {activeFolder.apps.map(app => {
                      const isFav = config.favorites.includes(app.id);
                      return (
                        <div 
                          key={app.id}
                          onClick={() => handleLaunchApp(app)}
                          className="relative flex flex-col items-center p-3 rounded-xl bg-slate-950/40 border border-win-border hover:bg-win-hover cursor-pointer group transition-all"
                        >
                          <img src={app.icon} alt={app.name} className="h-12 w-12 mb-2 object-contain group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] font-medium text-center truncate w-full text-slate-300">{app.name}</span>
                          
                          {/* App Hover Actions */}
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => handleToggleFavorite(app.id, e)}
                              className={`p-0.5 rounded-full transition-transform hover:scale-110 ${isFav ? "text-yellow-500" : "text-slate-400 hover:text-yellow-500"}`}
                              title={isFav ? "Hapus dari Favorit" : "Tambah ke Favorit"}
                            >
                              <Star size={10} fill={isFav ? "currentColor" : "none"} />
                            </button>
                            <button 
                              onClick={(e) => handleRemoveApplication(activeFolder.id, app.id, e)}
                              className="p-0.5 rounded-full text-slate-400 hover:text-red-500 transition-transform hover:scale-110"
                              title="Hapus"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Folder ini kosong. Tambahkan aplikasi di bawah.
                  </div>
                )}
              </div>

              {/* Add App Button */}
              <button 
                onClick={() => handleAddApplication(activeFolder.id)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/10 transition-all active:scale-95"
              >
                <Plus size={14} /> Tambah Aplikasi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== CREATE / EDIT FOLDER MODAL ==================== */}
      <AnimatePresence>
        {isFolderModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xs rounded-2xl bg-slate-900 border border-win-border shadow-2xl p-5"
            >
              <h3 className="text-sm font-semibold text-white mb-4">
                {editingFolderId ? "Edit Folder" : "Buat Folder Baru"}
              </h3>
              
              <form onSubmit={handleSaveFolder} className="flex flex-col gap-4">
                {/* Folder Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nama Folder</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="Contoh: Development"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-win-border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Folder Icon Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ikon Folder</label>
                  <div className="grid grid-cols-5 gap-2 max-h-[120px] overflow-y-auto p-1.5 bg-slate-950 border border-win-border rounded-lg">
                    {AVAILABLE_ICONS.map(iconName => (
                      <button
                        type="button"
                        key={iconName}
                        onClick={() => setFolderIcon(iconName)}
                        className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                          folderIcon === iconName 
                            ? "bg-blue-600 text-white" 
                            : "bg-transparent text-slate-400 hover:bg-win-hover hover:text-white"
                        }`}
                      >
                        <FolderIcon name={iconName} size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    className="px-3 py-1.5 bg-transparent hover:bg-win-hover border border-win-border text-slate-300 rounded-lg text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-md"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default App;

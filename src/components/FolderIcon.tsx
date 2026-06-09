import React from "react";
import * as Icons from "lucide-react";

interface FolderIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const FolderIcon: React.FC<FolderIconProps> = ({ name, className, size = 24 }) => {
  // Dynamically resolve icon component from lucide-react
  const IconComponent = (Icons as any)[name];
  
  if (!IconComponent) {
    // Fallback if icon name doesn't exist
    return <Icons.Folder className={className} size={size} />;
  }
  
  return <IconComponent className={className} size={size} />;
};

// List of icons available to pick for folders
export const AVAILABLE_ICONS = [
  "Folder",
  "Code",
  "Gamepad2",
  "Briefcase",
  "Wrench",
  "Settings",
  "Flame",
  "Heart",
  "Smile",
  "Music",
  "Book",
  "FileText",
  "Cloud",
  "Compass",
  "Layout",
  "Terminal",
  "Globe",
  "Image",
  "Film",
  "Database"
];

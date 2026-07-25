import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Shield,
  ClipboardList,
  UserCog,
  FileText,
  Settings,
  Building2,
  Layers,
  Calendar,
  Plane,
  Trash2,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Shield,
  ClipboardList,
  UserCog,
  FileText,
  Settings,
  Building2,
  Layers,
  Calendar,
  Plane,
  Trash2,
};

export type SidebarItem = {
  name: string;
  href: string;
  iconKey: string;
};

type SidebarProps = {
  visibleItems?: SidebarItem[];
};

export { default } from "./SidebarClient";
export type { SidebarProps };
export type { SidebarItem };

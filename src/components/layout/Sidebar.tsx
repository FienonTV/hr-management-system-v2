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
  CalendarDays,
  Plane,
  Trash2,
  Tag,
  FileStack,
  Award,
  Truck,
} from "lucide-react";
import SidebarClient from "./SidebarClient";

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
  CalendarDays,
  Plane,
  Trash2,
  Tag,
  FileStack,
  Award,
  Truck,
};

export type SidebarItem = {
  name: string;
  href: string;
  iconKey: string;
};

type SidebarProps = {
  visibleItems?: SidebarItem[];
};

export default function Sidebar({ visibleItems }: SidebarProps) {
  return <SidebarClient visibleItems={visibleItems} />;
}

export type { SidebarProps };

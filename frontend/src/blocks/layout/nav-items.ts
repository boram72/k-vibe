import {
  Map,
  Wand2,
  Route,
  Radar,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  key: string;
  path: string;
  icon: LucideIcon;
  labelKey: string;
}

/**
 * Single source of truth for primary navigation.
 * Add/remove/reorder tabs here — BottomNav and SidebarNav both render from this array.
 */
export const NAV_ITEMS: NavItem[] = [
  // { key: "home", path: "", icon: Home, labelKey: "home.title" },
  { key: "map", path: "map", icon: Map, labelKey: "map.title" },
  {
    key: "analyze",
    path: "analyze",
    icon: ScanSearch,
    labelKey: "analyze.nav_title",
  },
  {
    key: "persona",
    path: "persona",
    icon: Wand2,
    labelKey: "persona.nav_title",
  },
  { key: "route", path: "route", icon: Route, labelKey: "route.title" },
  { key: "radar", path: "radar", icon: Radar, labelKey: "radar.title" },
];

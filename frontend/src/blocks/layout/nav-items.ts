import {
  Map,
  Wand2,
  Route,
  // Radar, // 2026-09: 레이더 메뉴 숨김과 함께 미사용 처리 — 되살릴 때 같이 복구
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
  // 2026-09: 페르소나(K-pop 팬 여행) 중심 정체성과 맞지 않는다는 팀 의견으로 내비게이션에서만
  // 숨김. RadarPage/라우트/API 연동은 그대로 남겨둬서 필요해지면 이 줄만 복구하면 됨.
  // { key: "radar", path: "radar", icon: Radar, labelKey: "radar.title" },
];

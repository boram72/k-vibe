import {
  Map,
  // Wand2, // 2026-09: 페르소나 메뉴 숨김과 함께 미사용 처리 — 되살릴 때 같이 복구
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
  // 2026-09: 페르소나 카드가 홈 화면 핵심 진입점(PersonaPicker)으로 옮겨가면서
  // 사이드바/하단바 메뉴에서는 숨김. 라우트(/persona)와 로직은 그대로 남겨서
  // 홈 카드 클릭 시 이동은 계속 동작하고, 필요해지면 이 줄만 복구하면 됨.
  // {
  //   key: "persona",
  //   path: "persona",
  //   icon: Wand2,
  //   labelKey: "persona.nav_title",
  // },
  { key: "route", path: "route", icon: Route, labelKey: "route.title" },
  { key: "radar", path: "radar", icon: Radar, labelKey: "radar.title" },
];

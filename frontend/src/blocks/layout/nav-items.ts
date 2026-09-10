import {
  Home,
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
  { key: "home", path: "", icon: Home, labelKey: "home.title" },
  { key: "map", path: "map", icon: Map, labelKey: "map.title" },
  {
    key: "analyze",
    path: "analyze",
    icon: ScanSearch,
    labelKey: "analyze.nav_title",
  },
  // 2026-09 태스크보드 2번: PR #11로 숨겼던 페르소나 메뉴 원복(대화로 확정).
  {
    key: "persona",
    path: "persona",
    icon: Wand2,
    labelKey: "persona.nav_title",
  },
  { key: "route", path: "route", icon: Route, labelKey: "route.title" },
  // 2026-09 서비스 컨셉 변경(PR #16): 편의시설 레이더의 실데이터 정확도가 낮고,
  // "스타의 루트를 따라가보자"는 서비스 컨셉과 기능 자체가 동떨어진다는 판단으로
  // 내비게이션에서만 숨김. RadarPage/라우트/API 연동은 그대로 남겨둬서 필요해지면
  // 이 줄만 복구하면 됨.
  // { key: "radar", path: "radar", icon: Radar, labelKey: "radar.title" },
];

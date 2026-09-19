export interface TourStep {
  // data-tour 속성값으로 실제 화면 요소를 찾는다. 데스크탑/모바일처럼 같은
  // 값을 가진 요소가 여러 개 있을 수 있어(사이드바 vs 하단 내비 등),
  // 그 중 실제로 화면에 보이는(getBoundingClientRect가 0이 아닌) 요소를 쓴다.
  target: string
  titleKey: string
  bodyKey: string
  // true면 하이라이트가 클릭을 가로채지 않고 실제 요소로 그대로 전달한다 —
  // 그 안의 버튼/링크를 실제로 누르면 그 자리에서 바로 다음 단계로 넘어간다
  // (기본은 false: "다음" 버튼으로만 진행하는 안전한 방식). 사용자가 실제로
  // 뭔가를 고르는 게 자연스러운 단계(예: 페르소나 카드 선택)에서만 켠다.
  clickThrough?: boolean
  // clickThrough가 true일 때만 의미 있음. 기본(true)은 그 안 버튼/링크를
  // 그냥 클릭하기만 해도 다음 단계로 넘어간다. 드래그처럼 "클릭 이벤트"가
  // 아니라 다른 신호로 완료를 판단해야 하는 단계(예: 순서 바꾸기)는 false로
  // 두고, 그 화면이 직접 useTourStore().next(...)를 호출해서 넘긴다.
  advanceOnClick?: boolean
  // 드래그 손잡이 옆에 위아래로 까딱이는 화살표 힌트를 보여준다 — "드래그를
  // 어떻게 하는지 모르겠다"는 피드백(사용자 요청)에 대응. 이 투어 단계에서만
  // 보이는 시각적 힌트일 뿐, 실제 편집 화면(투어 밖)에는 영향 없다.
  dragHint?: boolean
}

export const HOME_TOUR_KEY = 'home'
export const MAP_TOUR_KEY = 'map'
export const PERSONA_TOUR_KEY = 'persona'
export const ROUTE_TOUR_KEY = 'route'
export const ANALYZE_TOUR_KEY = 'analyze'

export const HOME_TOUR_STEPS: TourStep[] = [
  { target: 'home-nav', titleKey: 'tour.home_nav_title', bodyKey: 'tour.home_nav_body' },
  { target: 'home-cta', titleKey: 'tour.home_cta_title', bodyKey: 'tour.home_cta_body' },
  { target: 'home-saved', titleKey: 'tour.home_saved_title', bodyKey: 'tour.home_saved_body' },
  { target: 'home-persona', titleKey: 'tour.home_persona_title', bodyKey: 'tour.home_persona_body' },
  { target: 'home-topbar-utils', titleKey: 'tour.home_topbar_title', bodyKey: 'tour.home_topbar_body' },
  { target: 'home-tour-button', titleKey: 'tour.home_replay_title', bodyKey: 'tour.home_replay_body' },
]

export const MAP_TOUR_STEPS: TourStep[] = [
  { target: 'map-search', titleKey: 'tour.map_search_title', bodyKey: 'tour.map_search_body' },
  { target: 'map-saved', titleKey: 'tour.map_saved_title', bodyKey: 'tour.map_saved_body' },
  { target: 'map-attractions', titleKey: 'tour.map_attractions_title', bodyKey: 'tour.map_attractions_body' },
  { target: 'map-filter', titleKey: 'tour.map_filter_title', bodyKey: 'tour.map_filter_body' },
  { target: 'map-locate', titleKey: 'tour.map_locate_title', bodyKey: 'tour.map_locate_body' },
  { target: 'map-list', titleKey: 'tour.map_list_title', bodyKey: 'tour.map_list_body' },
]

export const PERSONA_TOUR_STEPS: TourStep[] = [
  { target: 'persona-grid', titleKey: 'tour.persona_grid_title', bodyKey: 'tour.persona_grid_body', clickThrough: true },
  { target: 'persona-exclude', titleKey: 'tour.persona_exclude_title', bodyKey: 'tour.persona_exclude_body', clickThrough: true },
]

// 드래그(순서 바꾸기)는 클릭 이벤트가 안 나므로(dnd-kit이 실제 드래그 후엔
// click을 억제함) advanceOnClick: false로 두고, RoutePage.tsx의
// handleDragEnd가 성공 시 직접 useTourStore().next(...)를 호출해서 넘긴다.
// pointer-events는 clickThrough:true로 계속 실제 손잡이에 전달되므로 진짜
// 드래그 자체는 그대로 동작한다.
export const ROUTE_TOUR_STEPS: TourStep[] = [
  { target: 'route-drag-handle', titleKey: 'tour.route_drag_title', bodyKey: 'tour.route_drag_body', clickThrough: true, advanceOnClick: false, dragHint: true },
  { target: 'route-complete', titleKey: 'tour.route_complete_title', bodyKey: 'tour.route_complete_body', clickThrough: true },
  { target: 'route-location-check', titleKey: 'tour.route_location_title', bodyKey: 'tour.route_location_body' },
  { target: 'route-actions', titleKey: 'tour.route_actions_title', bodyKey: 'tour.route_actions_body' },
]

// 인기 영상 썸네일 단계는 clickThrough로 둬서 실제로 눌러보면(썸네일 클릭 시
// URL 입력창이 채워짐) 그 자리에서 바로 다음 단계로 넘어간다 — 페르소나/
// 루트 투어와 같은 "실제로 해볼 수 있게" 패턴(사용자 요청).
export const ANALYZE_TOUR_STEPS: TourStep[] = [
  { target: 'analyze-url-input', titleKey: 'tour.analyze_input_title', bodyKey: 'tour.analyze_input_body' },
  { target: 'analyze-submit', titleKey: 'tour.analyze_submit_title', bodyKey: 'tour.analyze_submit_body' },
  { target: 'analyze-popular-videos', titleKey: 'tour.analyze_popular_title', bodyKey: 'tour.analyze_popular_body', clickThrough: true },
  { target: 'analyze-tutorial-button', titleKey: 'tour.analyze_tutorial_title', bodyKey: 'tour.analyze_tutorial_body' },
]

export const TOUR_REGISTRY: Record<string, TourStep[]> = {
  [HOME_TOUR_KEY]: HOME_TOUR_STEPS,
  [MAP_TOUR_KEY]: MAP_TOUR_STEPS,
  [PERSONA_TOUR_KEY]: PERSONA_TOUR_STEPS,
  [ROUTE_TOUR_KEY]: ROUTE_TOUR_STEPS,
  [ANALYZE_TOUR_KEY]: ANALYZE_TOUR_STEPS,
}

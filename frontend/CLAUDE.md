# K-Vibe Tracker — Frontend (refactoring-k-vibe)

## Overview
K-Culture 관광 앱 프론트엔드. 한국을 방문하는 외국인 관광객 대상.
기존 `k-vibe-tracker` (Next.js 14 monorepo)에서 프론트엔드만 완전 분리한 프로젝트.
백엔드와 **API로만 통신** — 백엔드를 교체해도 API 스펙만 맞으면 동작.

## Working Directory
`/Users/boram/refactoring_project/refactoring-k-vibe/`

## Reference Documents
- `TalkFile_01_K-Vibe-Tracker_Architecture.html` — 전체 아키텍처 설계서
- `02_Sprint-Roadmap.html` — Sprint 0~7 개발 로드맵
- `plan.md` — 단계별 상세 구현 계획

---

## Tech Stack
| 역할 | 기술 |
|------|------|
| Framework | Vite 8 + React 19 + TypeScript 6 |
| UI | shadcn/ui (base-nova style) |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| i18n | react-i18next (messages/*.json) |
| Store | Zustand v5 |
| API | TanStack React Query v5 + axios(`src/api/client.ts`) |
| Icons | lucide-react + @tabler/icons-react |
| Theme | next-themes (shadcn 설치 시 자동 포함) |
| DnD | @dnd-kit/core — Step 10에서 설치 예정 |

---

## UI 반응형 원칙
**모든 UI는 반응형에 대응될 것.** 모바일/태블릿/데스크탑 뷰포트 전부 고려.
- 고정 px 대신 Tailwind 반응형 prefix(`sm:` `md:` `lg:`) 사용
- 기존 `#root { max-width: 448px }` 모바일 전용 셸은 Step 4 AppLayout 작업 시 반응형으로 재검토
- 새 블록/페이지 작성 시 최소 모바일(375px)~데스크탑(1280px+) 구간 확인

### ✅ LandingPage 반응형 재작업 완료 (Step 6c)
가로스크롤(모바일) ↔ 그리드(데스크탑) 전환 패턴 확정:
- 컨테이너: `w-full md:max-w-5xl` (모바일은 `max-w-sm` 없이 풀와이드 — 아래 패딩 통일 항목 참고)
- 가로스크롤 행: `-mx-4 flex overflow-x-auto px-4` → `md:mx-0 md:grid md:grid-cols-N md:overflow-visible md:px-0`
- 카드/스토리 아이템: `w-64 shrink-0` → `md:w-full md:shrink`
- 새 가로스크롤 섹션 추가 시 이 패턴 그대로 적용할 것

### ✅ 모바일 페이지 전체 패딩 통일 (전 페이지 점검, 사용자 요청)
**문제**: 7개 페이지 중 5개(Landing/Analyze/Persona/Route/Profile)가 모바일에서 `max-w-sm`(384px)로 폭을 캡했는데, Map/Radar는 캡 없이 풀와이드였음 — 384px보다 넓은 폰(예: 아이폰 프로맥스 430px, 갤럭시 등 다수 안드로이드)에서 5개 페이지만 좌우에 빈 거터가 생기고 Map/Radar는 화면을 꽉 채워서 메뉴별로 폭/패딩이 안 맞아 보였음. 추가로 Landing은 좌우 패딩값 자체도 `px-5`(20px)로 다른 페이지의 `px-4`(16px)와 달랐고, `map/category-filter.tsx`는 실제 부모(`px-4`)와 안 맞는 `-mx-5 px-5`를 그대로 쓰고 있어서 4px만큼 어긋나 있었음(`facility-filter-tabs.tsx`는 이미 한 번 고쳐졌지만 원본 `category-filter.tsx`는 안 고쳐져 있었음).
- 5개 페이지 컨테이너에서 모바일 `max-w-sm` 제거(데스크탑 `md:max-w-*`는 그대로 유지) → 전 페이지 모바일 좌우 패딩 `px-4`(16px)로 통일
- `LandingPage.tsx` 컨테이너 `px-5 py-6` → `px-4 py-4`, 거기 의존하던 `home-feed.tsx`의 가로스크롤 3행도 `-mx-5/px-5` → `-mx-4/px-4`로 같이 수정(부모 패딩 변경 시 자식의 보정값도 같이 바뀌어야 어긋나지 않음 — Radar 때와 동일 패턴)
- `map/category-filter.tsx`(MapPage 카테고리 칩 행)도 `-mx-5/px-5` → `-mx-4/px-4`로 수정
- 검증: Playwright로 7개 페이지 × 390px/430px 뷰포트에서 컨테이너 `left`/`paddingLeft`/가로 오버플로우 측정 → 전부 `paddingLeft: 16px`, `hasOverflow: false`로 일치 확인(Map만 의도적으로 0px, 지도 캔버스는 엣지투엣지가 맞음)

### ✅ TopBar 로고 아이콘 추가
- `src/assets/logo-icon.tsx`(`LogoIcon`) — `google-icon.tsx`와 동일 패턴(브랜드 아이콘을 `.tsx`로 export, lucide-react 아이콘처럼 import해서 씀). 원본 SVG(lucide sparkles 기반)에 있던 kebab-case 속성(`stroke-width` 등)을 React 표준 camelCase로, 하드코딩된 `width`/`height`는 제거하고 `className`으로만 크기 제어하도록 정리
- `top-bar.tsx`의 "K-Vibe" 텍스트 앞에 `<LogoIcon className="h-5 w-5 text-primary" />` 배치(`flex items-center gap-1.5`) — LandingPage도 동일 `TopBar` 컴포넌트를 그대로 재사용하므로 모든 페이지에 자동 반영

---

## Design System

### 테마
- shadcn zinc 기본 테마 그대로 사용 (커스텀 색상 없음)
- Light / Dark 토글 — `data-theme="dark"` on `<html>`
- Auto 모드: 일몰 후 dark, 일출 후 light (로컬 시간 기반)
- 수동 전환: TopBar의 shadcn `Switch` → `localStorage('k-vibe-theme')` 저장
- Zustand `useThemeStore`: `theme: 'light'|'dark'|'auto'` + `resolvedTheme: 'light'|'dark'`

### CSS 구조 (`src/index.css`)
- `@custom-variant dark (&:is([data-theme="dark"] *))` — `.dark` 클래스 아닌 data-theme 사용
- `:root` — shadcn zinc light 값
- `[data-theme="dark"]` — shadcn zinc dark 값
- `@theme inline` — shadcn 변수 → Tailwind 유틸리티 연결
- K-Vibe 전용 추가: `--color-crowd-low/mid/high`

### K-Vibe 전용 Tailwind 클래스
| 클래스 | 값 | 용도 |
|--------|----|------|
| `bg-crowd-low` / `text-crowd-low` | `#34D399` | 혼잡도 낮음 |
| `bg-crowd-mid` / `text-crowd-mid` | `#FBBF24` | 혼잡도 보통 |
| `bg-crowd-high` / `text-crowd-high` | `#F87171` | 혼잡도 높음 |

---

## Environment Variables (`.env.example` 참고)
```
VITE_API_BASE_URL      # 백엔드 API URL
VITE_SUPABASE_URL      # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY # Supabase anon key
VITE_KAKAO_MAP_KEY     # Kakao Maps JS API Key
```

## API 통신 원칙
- 모든 fetch 로직은 `src/api/` 에 집중
- 컴포넌트 직접 fetch/axios 호출 금지
- React Query hooks만 사용 (`useQuery`, `useMutation`)
- 백엔드 URL은 `VITE_API_BASE_URL` 환경변수로만 주입

---

## Component Architecture
```
src/components/ui/     ← shadcn 자동 생성 (건드리지 말 것)
src/components/
  inputs/              ← button, input, slider re-export 래퍼
  data-display/        ← badge, card, skeleton, avatar, separator, tabs re-export 래퍼
  overlays/            ← dialog, sheet, sonner, dropdown-menu re-export 래퍼
  feedback/            ← progress, switch re-export 래퍼
  (※ 래퍼 파일은 Step 4 시 병행 작성)

src/blocks/            ← 조합 단위 (컴포넌트 조합 → 기능 블록)
  layout/              app-layout✅(stub), top-bar, bottom-nav
  common/              crowd-badge, loading-skeleton, error-boundary
  auth/                login-modal
  landing/             language-switcher, feature-badge-list, trending-keywords
  map/                 map-container, category-filter, place-card, place-detail-sheet
  analyze/             youtube-url-input, thumbnail-preview, place-result-card, analyze-status
  persona/             step-indicator, category-card-grid, detail-card-grid, route-timeline
  route/               route-stats, route-spot-card, walking-time-badge
  radar/               facility-card, radius-slider-control, facility-filter-tabs
  profile/             user-card, saved-routes-list, settings-menu-list
```

---

## Pages & Routes
| Route | Page | Status |
|-------|------|--------|
| `/:locale` | LandingPage | 실구현 ✅ |
| `/:locale/map` | MapPage | 실구현 ✅ |
| `/:locale/analyze` | AnalyzePage | 실구현 ✅ |
| `/:locale/persona` | PersonaPage | 실구현 ✅ |
| `/:locale/route` | RoutePage | 실구현 ✅ |
| `/:locale/radar` | RadarPage | 실구현 ✅ |
| `/:locale/profile` | ProfilePage | 실구현 ✅ |

---

## 현재 파일 트리 (`src/`)
> Step 13(API Layer)까지 반영됨. 새 파일 추가 시 이 트리도 같이 업데이트할 것(파일구조가 진행상황을 못 따라가면 다음 세션이 헷갈림).
```
src/
├── App.tsx                        ← 최소 placeholder (라우터로 대체되어 미사용)
├── main.tsx                       ← RouterProvider + QueryClientProvider
├── index.css                      ← shadcn zinc 테마 + crowd 색상, #root 반응형, .scrollbar-hide/.scroll-fade-x
├── assets/
│   └── google-icon.tsx            ← GoogleIcon 컴포넌트(.tsx로 export, lucide-react 아이콘과 동일하게 import해서 쓰는 패턴 — lucide엔 브랜드 아이콘 없어서 직접 작성)
├── i18n/
│   └── index.ts                   ← i18next 초기화, SUPPORTED_LOCALES/LOCALE_META export
├── router/
│   ├── index.tsx                  ← createBrowserRouter, detectLocale()
│   └── LocaleGuard.tsx            ← locale 유효성 검사 + i18n 동기화
├── pages/
│   ├── LandingPage.tsx            ← 실구현 (TopBar+HomeFeed+TrendingKeywords+CTA, standalone)
│   ├── MapPage.tsx                ← 실구현 (지도+SpotListPanel+PlaceDetailSheet 조립, MapFocusState export)
│   ├── AnalyzePage.tsx            ← 실구현 (URL입력+로딩+결과리스트, useMutation)
│   ├── PersonaPage.tsx            ← 실구현 (3단계 위저드+결과, step state)
│   ├── RoutePage.tsx              ← 실구현 (통계+미니맵+위치확인+RouteStopList 조립, 데스크탑 `grid-cols-[1fr_480px]`)
│   ├── RadarPage.tsx              ← 실구현 (MapPage 스타일 고정높이 셸: 1층 반경/2층 필터 `shrink-0` + 3층 좌미니맵`shrink-0`/우목록`overflow-y-auto`, `grid-cols-[1fr_420px]`)
│   └── ProfilePage.tsx            ← 실구현 (헤더+저장한장소+현재루트+설정 조립, 데스크탑 `grid-cols-[1fr_360px]` 명시적 배치)
├── store/
│   ├── theme-store.ts             ← light/dark/auto
│   ├── sidebar-store.ts           ← 사이드바 접기/펴기
│   ├── page-help-store.ts         ← 페이지별 도움말 콘텐츠
│   ├── analyze-store.ts           ← 분석 결과 영속화(탭 이동해도 유지, 새로고침 시 초기화)
│   └── route-progress-store.ts    ← 루트 완료 스팟 ID(Zustand, localStorage `k-vibe-route-progress` 동기화) — RoutePage/ProfilePage가 같은 스토어 구독, 어느 쪽에서 토글해도 양방향 즉시 동기화 (Step12 후속)
├── blocks/
│   ├── layout/
│   │   ├── app-layout.tsx         ← 실구현 (TopBar+Sidebar+BottomNav+ErrorBoundary)
│   │   ├── top-bar.tsx            ← 로고+도움말+언어+테마+프로필(로그인 시 `useAuth()`의 이름 이니셜, 게스트면 기본 아이콘)
│   │   ├── bottom-nav.tsx         ← 모바일 하단 탭 (md:hidden)
│   │   ├── sidebar-nav.tsx        ← 데스크탑 사이드바 (hidden md:flex)
│   │   ├── nav-items.ts           ← NAV_ITEMS 배열 (단일 소스)
│   │   ├── help-button.tsx        ← 도움말 Dialog (콘텐츠 없으면 숨김)
│   │   └── language-dropdown.tsx  ← 언어 전환 (경로 세그먼트 교체)
│   ├── common/
│   │   ├── crowd-badge.tsx
│   │   ├── loading-skeleton.tsx   ← itemClassName prop 지원
│   │   ├── error-boundary.tsx
│   │   ├── place-card.tsx         ← 장소 카드 (홈피드 + MapPage 공용)
│   │   └── app-toaster.tsx        ← sonner Toaster, theme={resolvedTheme} 직접 전달
│   ├── landing/
│   │   ├── trending-keywords.tsx  ← `fetchTrendingKeywords()`는 `src/api/trending.ts`에서 import
│   │   ├── home-feed.tsx                       ← 실시간 서울 피드, `PersonaChip` 내부 포함(자체 `personaPreference` 읽음), 저장 토글은 `['saved-places']` 공유 쿼리/`useMutation(toggleSavedPlace)`. `fetchHomeFeedPlaces()`는 `src/api/places.ts`에서 import
│   │   ├── home-feed.data.ts                   ← `STORY_TOPICS`+`FEED_CATEGORIES`(UI 분류체계)만 — SEOUL_PLACES/fetchHomeFeedPlaces는 Step13에서 `src/api/places.ts`로 이동
│   │   └── persona-chip.tsx                    ← "Personalized for {persona}" 칩, `active` prop(파생상태)+`aria-pressed`로 on/off 시각 구분
│   ├── map/
│   │   ├── category-filter.tsx    ← 다중선택 7카테고리, collapsed prop(아이콘 전용)
│   │   ├── map-canvas.tsx         ← 실제 Kakao Maps SDK(`react-kakao-maps-sdk`) 렌더링, `VITE_KAKAO_MAP_KEY` 없거나 SDK 로드 실패 시 기존 퍼센트 좌표 핀 미리보기로 자동 폴백
│   │   ├── spot-list-panel.tsx    ← 검색+필터+목록+모바일스와이프+데스크탑접기 (MapPage에서 분리)
│   │   └── place-detail-sheet.tsx ← 저장/루트추가/공유, 데스크탑 Dialog/모바일 Sheet 분기
│   ├── analyze/
│   │   ├── url-input-card.tsx     ← URL입력+플랫폼감지+썸네일+예시URL
│   │   ├── analysis-loading.tsx   ← perceived progress 로딩 애니메이션
│   │   ├── analysis-result-list.tsx ← 결과카드+신뢰도바+개별선택 다이얼로그, 타입은 `src/api/analyze.ts`에서 import
│   │   └── analyze.data.ts        ← `EXAMPLE_URLS`만 — mock 분석결과/`fetchAnalysis()`는 Step13에서 `src/api/analyze.ts`로 이동
│   ├── persona/
│   │   ├── theme-step.tsx         ← Step1: 시작시간+테마 6개
│   │   ├── detail-step.tsx        ← Step2: 디테일 4개(단일선택)
│   │   ├── confirm-step.tsx       ← Step3: 선택 요약
│   │   └── route-result.tsx       ← 생성결과(통계+타임라인+추가/공유). `fetchScheduledRoute()`는 `src/api/routes.ts`에서 import
│   ├── route/
│   │   ├── route-mini-map.tsx     ← 퍼센트좌표 SVG, 핀 탭→Google Maps
│   │   ├── day-divider.tsx        ← "Day N" 날짜구분선
│   │   ├── route-location-check.tsx ← GPS 권한+다음 스팟까지 거리
│   │   ├── route-stop-card.tsx    ← 드래그핸들+완료토글+위치/외부링크/삭제+편집다이얼로그. 모바일 1층(액션버튼)/2층(인덱스+제목·메타) / 데스크탑 1줄, 두 레이아웃 분기
│   │   └── route-stop-list.tsx    ← DndContext+SortableContext+카드+구간표시 (RoutePage에서 분리, Step10 후속)
│   ├── radar/
│   │   ├── radius-slider.tsx      ← 반경 5단계 슬라이더
│   │   ├── facility-filter-tabs.tsx ← 9개 탭 단일선택(MapPage CategoryFilter와 달리 다중선택 아님)
│   │   ├── radar-map-preview.tsx  ← 퍼센트좌표 동심원+현위치핀+시설핀 미리보기, 핀 클릭→내부 지도 이동(`onViewOnInternalMap`)
│   │   ├── facility-card.tsx      ← 펼치기/접기형 카드, 내부지도(`MapPin`)/외부Google맵(`ExternalLink`) 버튼 2개 분리
│   │   └── facility-list.tsx      ← 로딩/에러/빈상태(반경확장 버튼)/목록 전부 담당 (처음부터 분리)
│   └── profile/
│       ├── login-modal.tsx        ← Google/Apple/Kakao OAuth 버튼(아이콘은 PROVIDER_BUTTONS 데이터에 직접 포함, FACILITY_TYPE_META와 동일 패턴)+게스트계속, 모바일/데스크탑 동일 UI
│       ├── profile-header.tsx     ← 아바타+이름/이메일(또는 게스트)+페르소나칩+통계+로그인·로그아웃 버튼(카드 하단 내부)
│       ├── saved-places-grid.tsx  ← 모바일2열/데스크탑4열, `useQuery(['saved-places'])` 직접 구독, 빈상태 시 지도이동 CTA
│       ├── current-route-card.tsx ← `readRouteDraft()`+`scheduleRoute()`+`useRouteProgressStore()`(RoutePage와 공유) — 진행률바+다음스팟(완료토글버튼 포함)+이어하기버튼(1개로 통합), 빈상태 시 지도이동 CTA
│       └── settings-list.tsx      ← 언어/알림 2행만(정적 표시, 실제 토글은 Step13+). 오프라인지도/지도데이터는 웹 지도API 자체에 기능이 없어 설계에서 완전 제외
├── components/
│   ├── ui/                        ← shadcn 14개 (건드리지 말 것)
│   ├── inputs/                    ← 빈 폴더 (필요해지면 작성)
│   ├── data-display/              ← 빈 폴더
│   ├── overlays/                  ← 빈 폴더
│   └── feedback/                  ← 빈 폴더
├── lib/
│   ├── utils.ts                   ← cn(), formatDistance(), formatTime()
│   ├── haversine.ts               ← 좌표 거리 계산 + walkingMinutes()
│   ├── youtube.ts                 ← YouTube/SNS URL 파싱, detectSnsPlatform()
│   ├── route-draft.ts             ← 루트 임시저장(localStorage `k-vibe-current-route`), addStopToRouteDraft/addStopsToRouteDraft/saveRouteDraft
│   ├── route-progress.ts          ← 완료 스팟 ID 저장/조회(localStorage `k-vibe-route-progress`)
│   ├── route-schedule.ts          ← scheduleRoute()(anchor전파+자정롤오버) + calculateRouteLegs()
│   ├── route-share.ts             ← base64url 인코딩/디코딩(공유URL) + buildGoogleMapsDirectionsUrl/PlaceUrl
│   ├── route-timing.ts            ← scheduleStops()(haversine 기반 시간계산, 테마무관 범용) + formatDuration
│   ├── persona-preference.ts      ← 위저드 선택 저장/조회 + 홈피드 카테고리 매핑
│   ├── use-current-location.ts    ← 브라우저 geolocation 3단계 폴백(GPS→마지막위치→서울) 공용 훅 (Map/Radar 공유)
│   ├── location-cache.ts          ← 마지막 위치 read/write(localStorage `k-vibe-last-known-location`, TTL 없음)
│   ├── radar-radius.ts            ← RADAR_RADIUS_STEPS(5단계) + getNextRadarRadius()
│   ├── facility-share.ts          ← buildGoogleMapsFacilityUrl()
│   ├── use-media-query.ts         ← 범용 미디어쿼리 훅 (JS 레벨 반응형 분기용)
│   ├── auth.ts                    ← mock 인증(localStorage `k-vibe-mock-session`), AuthUser/AuthProvider+getCurrentUser/loginWithProvider/logout (Step15에서 내부만 교체 예정)
│   ├── use-auth.ts                ← useAuth() 훅(`useQuery`+`useMutation`, TopBar/ProfilePage/LoginModal 공용), 로그인 성공 시 `mergeGuestSavedPlacesIntoUser` 호출
│   └── saved-places.ts            ← 저장한 장소(localStorage, 사용자별 버킷 `k-vibe-saved-places:{userId|guest}`), fetchSavedPlaces/toggleSavedPlace/mergeGuestSavedPlacesIntoUser
├── messages/
│   └── ko.json / en.json / ja.json / zh.json   ← landing/common/homeFeed/nav/categories/map/placeDetail/analyze/persona/route/radar/profile/login 네임스페이스
├── types/
│   ├── database.ts                ← Supabase 테이블 타입
│   ├── place.ts                   ← Place/CrowdLevel/PlaceCategory + PLACE_CATEGORIES(아이콘+라벨, 단일 소스)
│   ├── facility.ts                ← Facility/FacilityType/FacilityFilter + FACILITY_TYPE_META(아이콘+색상+pinBg+라벨, 단일 소스)
│   └── route-theme.ts             ← RouteTheme/ROUTE_THEME_OPTIONS(6테마×4디테일, 고정 분류체계)
├── api/                           ← Step13에서 신설. 전부 axios `apiClient`(client.ts)+`withFallback()` 패턴 — VITE_API_BASE_URL 없으면 즉시 mock, 있어도 호출 실패하면 mock(영구 폴백, 임시 코드 아님)
│   ├── client.ts                  ← apiClient(axios, baseURL=VITE_API_BASE_URL, timeout 8s) + withFallback()
│   ├── places.ts                  ← SEOUL_PLACES/EXTRA_PLACES + fetchHomeFeedPlaces()(파라미터 없음, 고정 피드) + fetchMapPlaces(query: PlaceQuery)(반경검색, hslee `/places` 규격과 통일) + DEFAULT_MAP_SEARCH_RADIUS(10km, 슬라이더 UI 없이 고정값)
│   ├── facilities.ts              ← FACILITY_BLUEPRINTS 9개(8타입)+FacilityQuery+fetchFacilities()
│   ├── analyze.ts                 ← MOCK_ANALYSIS_BY_LOCALE(4언어)+fetchAnalysis(url, locale)(videoId 아닌 원본 URL을 받음, hslee 규격과 통일)+AnalysisPlace/AnalysisResult 타입
│   ├── routes.ts                  ← ROUTE_TEMPLATES(24스팟)+fetchScheduledRoute(theme, detail, startTime, locale)
│   └── trending.ts                ← MOCK_KEYWORDS+fetchTrendingKeywords()(hslee에 대응 엔드포인트 없음, 영구 mock)
└── vite-env.d.ts                  ← ImportMetaEnv에 VITE_API_BASE_URL 등 타입 선언(Step13 신규, 이전엔 없었음)
```

---

## Execution Progress

### ✅ Step 1 — 프로젝트 초기화
- [x] Vite + React + TS 생성
- [x] 핵심 의존성 설치
- [x] vite.config.ts + tsconfig 경로 alias (`@/` → `./src/`)
- [x] Tailwind v4 설정 (index.css)
- [x] 폴더 구조 생성
- [x] 기존 파일 복사: lib/haversine.ts, lib/youtube.ts, lib/utils.ts, types/database.ts, messages/*.json
- [x] .env.example 생성

### ✅ Step 2 — shadcn 설치 + 컴포넌트 초기 세팅
- [x] shadcn init (style: base-nova, baseColor: neutral, Tailwind v4 감지)
- [x] 컴포넌트 14개 설치 → `src/components/ui/`
  - button, badge, card, dialog, sheet, slider, skeleton, tabs
  - sonner (toast 대체), progress, avatar, separator, dropdown-menu, switch
- [x] index.css — shadcn zinc 기본 테마, `[data-theme="dark"]` dark mode
- [x] App.css 삭제, App.tsx 정리
- [x] components.json alias 수정 (`@/` → `src/`) — shadcn 오설치 버그 수정
- [ ] src/components/{inputs,...}/ re-export 래퍼 — Step 4 병행 예정

### ✅ Step 3 — React Router + react-i18next
- [x] src/i18n/index.ts
- [x] src/router/LocaleGuard.tsx
- [x] src/router/index.tsx
- [x] src/pages/*.tsx (7개 stub)
- [x] src/blocks/layout/app-layout.tsx (stub)
- [x] src/main.tsx 업데이트

### ✅ Step 4 — AppLayout (TopBar + BottomNav/SidebarNav)
- [x] src/store/theme-store.ts — useThemeStore (light/dark/auto, data-theme 적용)
- [x] src/store/sidebar-store.ts — useSidebarStore (접기/펴기, localStorage 영구 저장)
- [x] src/blocks/layout/nav-items.ts — NAV_ITEMS 배열 (단일 소스)
- [x] src/blocks/layout/top-bar.tsx — 로고 + 테마 토글 버튼 + 프로필 아바타 + 사이드바 토글
- [x] src/blocks/layout/bottom-nav.tsx — 모바일 하단 탭 (md:hidden)
- [x] src/blocks/layout/sidebar-nav.tsx — 데스크탑 접이식 사이드바 (hidden md:flex)
- [x] src/blocks/layout/app-layout.tsx — 실구현 완료
- [x] src/index.css — `#root` 고정 max-width 448px 제거 (반응형 전환)
- [x] 라우팅: 모든 nav 링크는 상대경로(`to="map"`, `to="."` 등) 사용 — locale 변수 직접 다루지 않음
- [x] messages/*.json 4개 언어에 `persona.nav_title` 키 추가 (기존 `persona.title`이 `route.title`과 동일해 nav 라벨 중복 발견 → 수정)
- [x] Playwright headless 브라우저로 실제 동작 검증 (모바일/데스크탑 뷰포트, 다크모드, 사이드바 접기/펴기 영속성, 탭 이동, 콘솔 에러 없음)

> 미완료: src/components/{inputs,data-display,overlays,feedback}/ re-export 래퍼는 아직 작성 안 함 — 실제로 필요해지는 시점(각 페이지 구현 단계)으로 연기

### ✅ Step 5 — 공통 Blocks (common/)
- [x] messages/*.json (ko/en/ja/zh) — `common` 네임스페이스 추가 (crowd_low/mid/high, error_title/desc, retry_btn)
- [x] src/blocks/common/crowd-badge.tsx — shadcn Badge 기반, level별 dot+텍스트 색상
- [x] src/blocks/common/loading-skeleton.tsx — shadcn Skeleton 기반, variant: 'card'|'list' + count
- [x] src/blocks/common/error-boundary.tsx — class component, fallback UI(아이콘+제목+설명+재시도)
- [x] src/blocks/layout/app-layout.tsx — ErrorBoundary로 `<Outlet />` 래핑
- [x] Playwright로 실제 렌더링 검증 (CrowdBadge 3종, Skeleton, 에러 발생 시 fallback 표시 — 사이드바/탑바 유지되고 본문만 교체됨)

### ✅ Step 6 — LandingPage 단순화 + TopBar 패치
- [x] 원본 대비 단순화: 언어버튼/히어로/기능뱃지5개/하단로그인버튼/guest_notice 삭제 (트렌딩 키워드 + Explore CTA만 유지)
- [x] src/store/page-help-store.ts — 페이지별 도움말 콘텐츠 상태 (Zustand)
- [x] src/blocks/layout/help-button.tsx — TopBar 도움말 버튼+Dialog (콘텐츠 없으면 자동 숨김)
- [x] src/blocks/layout/language-dropdown.tsx — TopBar 언어 전환 (경로 세그먼트 교체, 하위 경로 유지)
- [x] src/i18n/index.ts — `LOCALE_META`(flag+label) export 추가
- [x] src/blocks/layout/top-bar.tsx — HelpButton + LanguageDropdown 추가
- [x] src/blocks/landing/trending-keywords.tsx + trending-keywords.data.ts (데이터 분리, 향후 API 교체 용이)
- [x] src/pages/LandingPage.tsx — TopBar(standalone) + ErrorBoundary + TrendingKeywords + Explore CTA, 도움말 등록
- [x] messages/*.json — `landing.help_title`/`help_body` 4개 언어 추가
- [x] Playwright 검증: 헤더 4개 아이콘 정상, 도움말 다이얼로그 표시, 언어 전환(/en→/ko) 정상, Explore→/map 이동, MapPage에서 도움말 버튼 자동 숨김 확인, 콘솔 에러 없음
- [x] base-ui 컴포넌트는 `asChild` 대신 `render` prop 사용 (shadcn 패턴 차이 확인)

### ✅ Step 6b — LandingPage 홈피드 추가 (hslee 브랜치 기준 재수정)
- [x] `origin/hslee` 브랜치(main보다 150+ 커밋 앞선 실제 완성 버전) 발견 및 조사 — 이후 작업은 hslee를 기준 참고
- [x] 하단탭 5탭/Profile 위치/페이지별 도움말 방식은 **변경 안 함** (hslee와 달라도 현재 구조 유지 결정)
- [x] src/types/place.ts — Place/CrowdLevel/PlaceCategory (Step 7 MapPage와 공유 예정)
- [x] src/blocks/common/place-card.tsx — CrowdBadge 재사용, 하트 저장 토글, 지도열기 버튼
- [x] src/blocks/landing/home-feed.data.ts — mock 장소 6개 + STORY_TOPICS, `fetchHomeFeedPlaces()` async 함수로 감쌈
- [x] src/blocks/landing/home-feed.tsx — 스토리 아이콘행 + 카테고리 필터 + 카드 가로스크롤, `useQuery`로 호출
- [x] src/blocks/landing/trending-keywords.data.ts — 동일하게 `fetchTrendingKeywords()` async로 전환, 컴포넌트도 `useQuery`로 변경
- [x] src/pages/LandingPage.tsx — HomeFeed 추가 (TopBar 다음, TrendingKeywords 위), `justify-center` 제거(콘텐츠 길어짐)
- [x] messages/*.json — `homeFeed` 네임스페이스, `common.save`/`unsave`, `map.filter_food`(원본에 누락되어 있던 키 발견·추가) 4개 언어
- [x] Playwright 검증: 스토리/카테고리 필터 정상, 저장 하트 토글 정상(article 기준 안정 셀렉터로 재검증), 콘솔 에러 없음
- [x] 버그 수정: `<Button render={<Link/>}>`는 `nativeButton={false}` 필요 (안 하면 접근성 경고)

### ✅ Step 6c — LandingPage 반응형 재작업
- [x] src/blocks/common/loading-skeleton.tsx — `itemClassName` prop 추가 (스켈레톤도 실제 카드와 동일 크기로 표시)
- [x] src/pages/LandingPage.tsx — `<main>` 컨테이너 `max-w-sm md:max-w-5xl`
- [x] src/blocks/landing/home-feed.tsx — 스토리행/필터행/카드행 3곳 `md:grid`(또는 `md:flex-wrap`) 분기, 가로스크롤은 모바일에서만
- [x] src/blocks/landing/trending-keywords.tsx — 자체 `max-w-sm` 제거 (부모 컨테이너에 위임)
- [x] Playwright로 모바일(390px)/데스크탑(1440px) 둘 다 스크린샷 검증 — 데스크탑에서 스토리 5개 한 줄, 카테고리 줄바꿈, 카드 4열 그리드로 스크롤 없이 표시 확인. 콘솔 에러 없음
- [x] **추가 수정**: LandingPage가 AppLayout 없이 standalone이라 SidebarNav/BottomNav가 전혀 없었음 → `src/pages/LandingPage.tsx`에 `SidebarNav`(데스크탑) + `BottomNav`(모바일) 직접 추가, AppLayout과 동일 구조로 통일
- [x] **Explore CTA 데스크탑 배치 변경**: 데스크탑에서는 본문 상단(subtitle과 같은 줄, 우측)에 버튼 노출 + 하단 버튼은 `md:hidden`. 모바일은 하단 버튼 그대로 유지

### ✅ Step 7 — MapPage
- [x] 원본 확인: `origin/hslee`의 map/page.tsx(646줄)+CategoryFilter+PlaceDetailModal+KakaoMapView 전부 검토
- [x] src/types/place.ts — `PlaceCategory`에 `'stay'` 추가, `PLACE_CATEGORIES`(아이콘+라벨키 단일 소스) + `getCategoryLabelKey()` 추가. home-feed.tsx의 중복 매핑 제거하고 이걸로 통일
- [x] src/lib/route-draft.ts — `addStopToRouteDraft()`/`readRouteDraft()`, localStorage 키 `k-vibe-current-route`(hslee와 동일, Step10 연동 대비). upsert 방식(기존 유지+중복 id만 교체) 확인됨
- [x] src/lib/use-current-location.ts — 브라우저 geolocation 공용 훅(실제 구현, 실패 시 서울 폴백). Map뿐 아니라 향후 Radar(Step11)도 재사용 예정이라 페이지 레벨이 아닌 lib로 분리
- [x] src/blocks/common/app-toaster.tsx + main.tsx 마운트 — sonner Toaster 최초 설치. `next-themes` 의존 코드라 `theme` prop을 우리 `useThemeStore`로 직접 오버라이드
- [x] src/index.css — `.scrollbar-hide` 유틸리티 추가, home-feed.tsx 기존 가로스크롤 3곳 + 신규 category-filter에 적용
- [x] src/blocks/map/category-filter.tsx — 다중선택 7카테고리, `PLACE_CATEGORIES` 기반
- [x] src/blocks/map/map-canvas.tsx — **퍼센트 좌표 기반 핀 미리보기**(hslee `pinPosition()` 로직 재사용). 실제 Kakao SDK 교체는 Step15 준비 작업으로 완료(아래 참고)
- [x] src/blocks/map/place-detail-sheet.tsx — shadcn Sheet(bottom), 저장/루트추가/공유. 도슨트·이미지갤러리·seen-in통계·TourAPI 실시간 fetch는 제외(범위 외)
- [x] src/blocks/map/map-page.data.ts — `home-feed.data.ts`의 `SEOUL_PLACES` export 재사용 + cafe/stay 2곳 추가, `fetchMapPlaces()`
- [x] src/pages/MapPage.tsx — 검색+카테고리필터+목록+지도+위치요청+상세시트+도움말 등록. 데스크탑 `grid-cols-[1fr_380px]` 분할 / 모바일 스택
- [x] messages/*.json — `map.filter_stay`/`search_placeholder`/`nearby_spots`/`no_places*`/`current_location`/`seoul_fallback`/`location_unavailable`/`refresh_location`/`open_analyzer`/`help_title`/`help_body`, `placeDetail.*` 4개 언어
- [x] Playwright 검증(데스크탑 1440px + 모바일 390px, geolocation mock 권한 부여): 카테고리 필터, 핀/리스트 클릭→상세시트, 저장 토글, 루트추가→localStorage 실제 저장 확인, 검색, 토스트 표시 — 전부 정상, 콘솔 에러 없음
- [x] 모바일에서는 맵+리스트가 AppLayout의 페이지 전체 스크롤을 공유(BottomNav는 고정 유지), 데스크탑은 맵 고정+우측 패널만 독립 스크롤 — 의도한 분할 동작 확인

#### Step 7 후속 — 저장 목록 필터 + 패널 접기/펴기 + 상세 위치 분기
- [x] 저장된 곳만 보기: 검색창 옆 하트 토글 버튼(카테고리 줄과는 분리 — 맥락 혼동 방지). `map.show_saved` 키
- [x] src/lib/use-media-query.ts — 범용 `useMediaQuery(query)` 훅 신규 (반응형 분기 JS 레벨에서 필요할 때 재사용)
- [x] 모바일: 주변 스팟 목록 펼침/접힘 — 포인터 스와이프. **`onPointerDown`/`onPointerUp` + `setPointerCapture` 필수**(안 하면 드래그가 핸들 영역 밖으로 나갈 때 pointerup이 다른 엘리먼트에서 발생해 핸들러 누락됨 — 실제로 겪은 버그). `touchstart/touchend`가 아닌 Pointer Events 사용(마우스 드래그로도 테스트 가능, 실 터치에도 동일 적용)
  - 접힘 시: 검색창+카테고리필터+"주변 스팟" 타이틀 묶음만 하단에 앵커로 유지, 목록 항목만 숨김. 지도가 `flex-1`로 확장
- [x] 데스크탑: 우측 패널 자체 접기/펴기 토글 버튼(`PanelRightClose`/`PanelRightOpen`). 접힘 시 패널 폭이 `380px`→`64px`(그리드 컬럼 자체를 변경), 카테고리는 `CategoryFilter`의 `collapsed` prop으로 세로 아이콘 전용 모드 + 저장필터 하트 아이콘만 남김
- [x] src/blocks/map/category-filter.tsx — `collapsed?: boolean` prop 추가 (세로 아이콘 전용 vs 기존 가로 라벨 pills)
- [x] src/blocks/map/place-detail-sheet.tsx — `useMediaQuery('(min-width: 768px)')`로 분기: 데스크탑은 `Dialog`(화면 중앙), 모바일은 기존 `Sheet`(하단). 이미지/배지/푸터 버튼 JSX는 `media`/`badges`/`footer` 변수로 공유해 중복 제거
- [x] messages/*.json — `map.collapse_panel`/`expand_panel` 4개 언어 추가
- [x] Playwright로 재검증: 모바일 스와이프 양방향(접힘→펼침) 좌표 보정 후 정상 확인, 데스크탑 패널 토글 정상, 상세 Dialog 화면 중앙 표시 확인. 콘솔 에러 없음

#### Step 7 후속 — MapPage 파일 분리
MapPage.tsx가 비대해져서 검색/필터/목록/스와이프/패널접기 로직 전체를 별도 블록으로 분리:
- [x] src/blocks/map/spot-list-panel.tsx (신규) — 검색창+카테고리필터+저장토글+타이틀+목록+모바일스와이프+데스크탑접기 전부 이전. 필터링 상태(`categories`/`search`/`showSavedOnly`/`isCollapsed`)는 MapPage가 소유하고 setter를 그대로 props로 전달(controlled), `places`(필터링된 결과)도 MapCanvas와 공유해야 해서 MapPage에 남김
- [x] src/pages/MapPage.tsx — 데이터 페칭(`useQuery`)+필터링 계산(`filtered`)+상태 보유 후 MapCanvas/SpotListPanel/PlaceDetailSheet 조립만 담당. 약 230줄 → 113줄로 축소
- [x] `SWIPE_THRESHOLD`을 40→20으로 조정(사용자 수정, 더 가벼운 스와이프로 반응)
- [x] Playwright 재검증: 분리 후에도 데스크탑 필터+패널접기, 모바일 스와이프 전부 정상, 콘솔 에러 없음

#### Step 7 버그 수정 — 모바일 접힘 시 앵커가 BottomNav에 가려짐
**원인**: `MapPage.tsx` 루트의 모바일 높이가 `h-[calc(100dvh-3.5rem)]`(TopBar 높이만 차감)였는데, 모바일에는 `BottomNav`(`h-16`=4rem, `md:hidden`)도 추가로 화면을 차지함. AppLayout의 `<main>`은 이미 TopBar+BottomNav 뺀 만큼만 공간이 있는데 MapPage가 그보다 4rem 더 큰 높이를 주장해서, `<main>`이 다시 스크롤 컨테이너가 되어 패널 접힘 시 카테고리 필터/타이틀 줄 하단이 BottomNav 영역과 겹쳐 잘려 보였음
- [x] 수정: `h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-3.5rem)]` — 모바일은 TopBar+BottomNav 둘 다 차감, 데스크탑은 BottomNav가 없으므로 TopBar만 차감
- [x] Playwright로 좌표 비교 검증: 하트버튼 하단(692.5px) < BottomNav 상단(780px) — 겹침 없음 확인. 스크린샷으로도 7개 카테고리+타이틀+카운트뱃지 전부 BottomNav 위에 온전히 표시됨 확인

### ✅ Step 8 — AnalyzePage
- [x] 페이지 컨셉 확정: SNS(유튜브 등) 영상에 등장한 장소를 찾는 기능. **실제 분석은 백엔드가 수행**(영상 분석 후 장소후보+신뢰도 응답) — 프론트는 그 응답 형태를 mock으로 흉내냄(Step13에서 `fetchAnalysis()` 내부만 실제 API 호출로 교체)
- [x] src/lib/youtube.ts — `detectSnsPlatform`/`SnsPlatform`/`isInstagramUrl`/`isHost` 추가
- [x] src/lib/route-draft.ts — `setRouteDraft(stops[])` 추가(일괄 저장), `RouteStop`에 `description?`/`tags?`
- [x] src/blocks/analyze/analyze.data.ts — mock 분석 결과(4개 언어, hslee `lib/analysis.ts` 포팅) + `fetchAnalysis()` + `EXAMPLE_URLS` export
- [x] src/blocks/analyze/url-input-card.tsx — URL입력+플랫폼감지+썸네일+분석버튼+예시URL
- [x] src/blocks/analyze/analysis-loading.tsx — **perceived progress**(타이머 기반, 마지막 단계에서 캡되어 멈춤, 실제 응답시간과 무관) — 실연동 시 이 컴포넌트는 안 건드리고 `fetchAnalysis()` 내부만 교체하면 됨. 주석으로 "서버가 실제 status 내려주면 `currentStep` prop으로 교체 가능"이라고 대비 표시
- [x] src/blocks/analyze/analysis-result-list.tsx — 결과 카드(신뢰도%바+사유)+source뱃지+지도보기/루트만들기
- [x] src/pages/AnalyzePage.tsx — `useMutation`으로 조립(클릭 트리거라 `useQuery`보다 적합), 3개 블록 조립 + 도움말 등록
- [x] **MapPage location.state 수신** — `navigate('../map', { state: { focusPlace, openDetail } })`로 일회성 핸드오프(`MapFocusState` export). 새로고침/다른탭 경유 시 자동 초기화(의도된 설계 — Analyze→Map 1회성 안내이고, "지도가 마지막 위치 기억"은 별개 기능이라고 판단)
- [x] messages/*.json — `analyze` 네임스페이스 전면 교체(4개 언어, hslee `ui-copy.ts` 원문 포팅, `{count}`→`{{count}}` react-i18next 보간 문법으로 변환), `map.analysis_result` 추가
- [x] **nav_title 분리**: `analyze.title`("SNS Spot Analyzer")을 하단탭 라벨로 같이 쓰니 모바일에서 2줄 줄바꿈 발생 → `analyze.nav_title`("SNS Analyzer", 짧은 버전) 신규 추가, `nav-items.ts`가 이걸 참조하도록 수정 (persona.nav_title과 동일 패턴)
- [x] **버그 수정 2건**: ① `bg-k-purple`/`text-k-purple` 등 Step6 zinc테마 단순화 때 제거된 토큰을 코드에 남겨 써서 빌드는 통과하나 색상 안 먹는 문제 → `bg-accent`/`text-primary` 등 표준 토큰으로 교체 ② lucide-react(v1.21)에 브랜드 아이콘(`Youtube`/`Instagram`) 없어서 빌드 에러 → `Video`/`Camera`로 대체 (다음에 브랜드 아이콘 필요하면 재확인할 것)
- [x] Playwright 검증: 예시URL 클릭→실제 YouTube 썸네일 로드 확인→로딩 애니메이션→결과 3건(신뢰도 92/87/78%)→결과 클릭 시 `/map`으로 이동+해당 좌표 포커스+상세시트 자동오픈 확인. "루트 만들기" 클릭 시 3장소 전체가 `localStorage('k-vibe-current-route')`에 정확히 저장되고 `/route`로 이동 확인. Instagram URL 감지(분석 버튼 비활성화) 확인. 데스크탑/모바일 둘 다, 콘솔 에러 없음

#### Step 8 후속 — 분석 결과 영속화 + 액션 UX 개선
- [x] **분석 상태 영속화**: 스팟 클릭→지도 이동 후 분석 탭으로 복귀하면 결과가 사라지는 문제 발견 → `src/store/analyze-store.ts`(Zustand) 신규, `url`/`result`를 컴포넌트 로컬 state 대신 스토어에 보관. `AnalyzePage`는 `mutation.data ?? storeResult`로 표시할 결과 결정. 새로고침 시엔 초기화(메모리 전용, 세션 내 편의 기능으로 충분하다고 판단)
- [x] **하단 액션바 고정**: 처음엔 `sticky`만 적용했으나 결과가 짧아 스크롤이 거의 없는 경우 화면 하단에 붙지 않고 콘텐츠 바로 아래 위치하는 문제 발견(엄밀히는 버그는 아니고 sticky의 정상 동작이지만, 항상 화면 하단에 보이길 원하는 요구와는 안 맞음) → `AnalyzePage.tsx` 루트를 `min-h-full flex flex-col`로, 콘텐츠 영역은 `flex-1`로 감싸 표준 "sticky footer" 패턴 적용. 콘텐츠가 짧을 때는 `flex-1`이 남는 공간을 채워 액션바가 화면 맨 아래로 밀려나고, 콘텐츠가 길어 스크롤될 때는 `sticky bottom-0`이 그대로 고정 — 두 경우 모두 자동으로 해결됨(JS로 BottomNav 높이 계산 불필요)
- [x] **버튼 의미 명확화 + 전체보기로 변경**: "지도에서 보기"가 실제로는 첫 번째 장소만 보여줘서 "루트 만들기"(이미 전체 추가)와 동작이 불일치했던 걸 발견 → 버튼을 전체 동작으로 통일: "View All on Map"(`analyze.view_all_on_map`, 신규 키)/"Add All to Route"(`analyze.build_route`, 문구만 교체). `MapPage.tsx`의 `MapFocusState.focusPlace`(단일) → `focusPlaces: Place[]`(복수)로 확장, `candidates`도 전체 배열을 병합하도록 수정
- [x] **개별 스팟 선택 팝업 추가**: 카드 클릭 시 선택지 없이 바로 지도로 이동하던 것을, "지도에서 보기"(`analyze.view_on_map`, 클릭한 장소만 포커스+상세시트 오픈)/"루트에 추가"(`analyze.add_to_route`, 신규 키, 해당 장소만 `addStopToRouteDraft`로 upsert, 페이지 이탈 없음) 2개 선택 가능한 `Dialog` 팝업으로 변경. 분석 페이지를 벗어나지 않고 장소 하나씩 빠르게 루트에 추가할 수 있는 경량 경로가 기존엔 없었던 공백을 메움
- [x] messages/*.json — `analyze.view_all_on_map`/`add_to_route`/`choose_action_hint` 4개 언어 추가, `build_route` 문구를 "Add All to Route"류로 교체
- [x] Playwright 검증: 짧은 결과에서도 액션바가 화면 맨 아래 고정, 스크롤 시에도 고정 유지, 개별 카드 클릭→팝업→"루트에 추가"(페이지 유지+토스트)/"지도에서 보기"(이동+상세시트 오픈) 각각 확인, "View All on Map" 클릭 시 분석된 3곳 전부 MapPage 후보 목록에 포함됨 확인. 콘솔 에러 없음

### ✅ Step 9 — PersonaPage
- [x] **컨셉 정정**: 기존 가정(테마→무드 다중선택→활동 다중선택)이 hslee와 다름을 발견 → 실제는 **테마(6개 중 1)→디테일(4개 중 1, 단일선택)→확인** 3단계. 디테일 선택은 실제 스팟 구성에 영향 없음(테마당 고정 4스팟, 24개 전체) — 순수 룩업 테이블 + haversine 기반 도보시간 계산으로 시작시간부터 각 스팟의 도착시간을 누적 산출하는 결정론적 알고리즘. AI/스코어링/랜덤 아님
- [x] `src/types/route-theme.ts` — `RouteTheme`/`ROUTE_THEME_OPTIONS`(6테마×4디테일, id+뱃지만. 라벨/설명은 i18n) — API로 안 바뀔 고정 분류체계라 `types/place.ts`와 동일 위치에 분리(persona.data.ts와 처음부터 분리 — "나중에 API 가져올 때 분리" 대신 "지금부터 분리"로 결정, 경계가 명확해서 파편화 아니라고 판단)
- [x] `src/lib/route-timing.ts` — `RouteStop`/`RoutePlan`/`ScheduledRoute` 타입 + `scheduleStops()`(haversine 기반 시간 계산, 테마 무관 범용이라 Step10 재정렬 시 재사용 가능) + `parseStartTime`/`formatDuration`. **title/summary는 여기서 안 만듦**(아래 순환참조 버그 참고)
- [x] `src/blocks/persona/persona.data.ts` — `ROUTE_TEMPLATES`(24스팟, hslee 그대로 영어 유지 — hslee 자체가 로케일 무관 영어라 Analyze처럼 4개언어로 번역 안 함) + `fetchScheduledRoute()`(Step13 교체 지점)
- [x] **순환참조 버그 발견·수정**: `route_summary_template`의 `{{duration}}`은 스팟 스케줄링이 끝나야 나오는 값인데, 처음엔 `fetchRoutePlan(theme, startTime, title, summary)`로 title/summary를 입력값으로 받게 설계해서 "summary 만들려면 duration 필요한데 duration은 plan에서 나옴" 순환이 생김 → lib/persona.data.ts를 "스케줄링만" 담당하게 분리, PersonaPage가 스케줄링 결과(duration) 받은 뒤 title/summary 조립하도록 순서 수정. 전체 코드베이스 재점검(`{{}}` 보간 4개, `useMutation` 1개) 결과 같은 패턴 추가 발견 없음
- [x] `src/lib/route-draft.ts` — `RouteStop`에 `stayMinutes?`/`startTime?` 추가, **`addStopsToRouteDraft()`(다중 upsert) 신규 추가 + `setRouteDraft()`(전체교체) 제거**. 이유: Map/Analyze/Persona가 같은 바스켓에 누적되는 구조인데 전체교체는 다른 출처에서 추가한 스팟을 날려버림 — AnalyzePage의 "루트에 모두 추가"도 같은 이유로 함께 수정
- [x] `src/lib/persona-preference.ts` — 위저드 선택 저장/조회 + 디테일/테마→홈피드 카테고리(`culture/food/fun/photo`) 매핑(디테일이 테마보다 우선), hslee `getPersonaFeedCategory` 포팅
- [x] `blocks/persona/theme-step.tsx`/`detail-step.tsx`/`confirm-step.tsx`/`route-result.tsx` + `pages/PersonaPage.tsx` 조립 — MapPage가 비대해졌던 교훈으로 처음부터 블록 분리
- [x] **루트 결과 버튼 2개로 확정**: "루트에 추가"(`addStopsToRouteDraft`로 병합, `/route`로 이동)+"공유"(navigator.share/clipboard fallback). "전체 초기화 후 반영" 버튼은 검토 후 제외 — 위험한 전체교체 액션을 가벼운 버튼으로 두기보다 Step10 편집 화면에 두는 게 안전하다고 판단(Step10에 메모 남김)
- [x] **홈피드 개인화**: `blocks/landing/persona-chip.tsx` 신규, `home-feed.tsx`에 `forceCategory`(`{category, nonce}` — 같은 카테고리 재탭해도 매번 재적용되도록 nonce 포함) prop 추가, `LandingPage`가 `readPersonaPreference()`로 칩 노출 + 탭 시 매핑된 카테고리를 기존 필터에 적용(새 UI 섹션 안 만들고 기존 카테고리 필터 재사용)
  - **아키텍처 버그 발견·재구조화(후속)**: `PersonaChip`이 `LandingPage`에 있었는데, 칩의 유일한 역할이 `HomeFeed`의 카테고리 필터를 트리거하는 것이라 부모(Landing)가 `forceCategory`+`nonce`로 자식(HomeFeed)에 신호를 내려보내는 간접구조가 생겨 있었음(블록 분리 의미가 약해짐) → **`PersonaChip`을 `HomeFeed` 내부로 이동**(헤더 행 다음, 스토리 아이콘 행 이전). `personaPreference`를 `HomeFeed`가 직접 `readPersonaPreference()`로 읽고, 칩 탭 시 자기 자신의 `category`/`activeStory` state를 바로 변경 — `forceCategory`/`nonce`/`ForceCategoryTrigger` 전부 제거(같은 컴포넌트 안이라 그 간접 신호 자체가 불필요해짐). `LandingPage`는 `<HomeFeed />`만 호출
  - **칩 토글(on/off) 추가**: 기존엔 칩이 항상 "탭하면 적용"만 가능하고 현재 적용 여부를 UI로 구분할 수 없었음 → `PersonaChip`에 `active` prop 추가(파생 상태: `category === getPersonaFeedCategory(preference)`로 계산, 별도 토글 state를 두지 않아 사용자가 다른 방식으로 카테고리를 바꿔도 항상 실제 상태와 일치). 다시 탭하면 `category`를 `'all'`로 되돌려 해제. `aria-pressed` + 활성 시 `bg-primary`(완전 채움)/비활성 시 `bg-primary/10`(10% 틴트)로 시각 구분. Playwright로 `getComputedStyle` 배경색 비교까지 해서 토글 동작 확인
- [x] **lint 에러 일괄 수정(사용자 요청, 손대지 않은 파일도 포함)**: 작업 중 발견된 `@typescript-eslint/no-unused-expressions`(`next.has(id) ? next.delete(id) : next.add(id)` 패턴, `home-feed.tsx`+`MapPage.tsx` 동일 버그 2곳 → if/else로 교체) + `react-hooks/set-state-in-effect`(`MapPage.tsx`의 `setSelectedPlace`를 `useState` lazy initializer로 전환 — `RoutePage.tsx`에서 썼던 패턴과 동일, `routerLocation.state`는 마운트 시점에 이미 동기적으로 사용 가능해서 effect 불필요/ `route-location-check.tsx`는 React 공식 문서가 권장하는 "prop 바뀔 때 전체 state 리셋" 패턴이라 effect 대신 `RoutePage.tsx`에서 `key={nextIncompleteStop?.id}` 부여로 해결, effect 자체 삭제) 전부 해결. `components/ui/`(shadcn 자동생성, 건드리지 말 것) 3개는 의도적으로 제외. `npx eslint src` 결과 그 3개만 남고 나머지 전부 클린
- [x] `home-feed.tsx` 모바일 카드 가로스크롤 우측 페이드 — 카드 행만 실제 콘텐츠가 넘쳐서(다른 2행은 안 넘침) 마지막 카드가 하트버튼까지 중간에서 잘려 보이던 것을 `.scroll-fade-x`(`index.css`, `mask-image` 우측 64px 그라디언트) 추가로 완화. 데스크탑은 `md:mask-none`으로 비활성화
- [x] `route-result.tsx` 리셋 버튼에 `title=` 속성 추가(기존 `aria-label` 텍스트 재사용) — "새로고침"과 "초기화" 혼동 방지
- [x] messages/*.json — `persona` 네임스페이스 전면 재작성(4개 언어, hslee `ui-copy.ts` 원문 그대로 포팅 — 테마/디테일 라벨+설명 36개 문자열×4언어 포함), `landing.personalized_for` 신규
- [x] Playwright 검증: 위저드 전체 플로우(테마→디테일→확인→생성→결과, 시작시간 변경 반영, 통계/타임라인 수치 정확), "루트에 추가" 시 기존 draft와 병합(교체 아님) 확인, 공유 클립보드 fallback 확인, 데스크탑/한국어 로케일 확인, 피드 개인화 칩 노출→탭→필터 적용 확인. 콘솔 에러 없음

### ✅ Step 10 — RoutePage
- [x] **컨셉 확장**: hslee는 단일 날짜(시작시간만)였지만, 대화로 **여러 날짜에 걸친 일정**(Triple 앱 스타일)으로 확장 결정. 각 스팟 시각은 기본적으로 이전 스팟과의 거리(도보/대중교통)+체류시간으로 자동 누적 계산되고, 사용자가 특정 스팟의 시각·날짜·체류시간을 직접 수정하면(시각/날짜 변경 시) 그 지점이 "고정점(anchor)"이 되어 이후 스팟들이 거기서부터 다시 누적됨. 날짜가 바뀌면 그 사이에 날짜 구분선("Day N · 날짜") 삽입. 자정을 넘기면 자동으로 다음 날짜로 롤오버
- [x] `src/lib/route-draft.ts` — `RouteStop`에 `date?`/`isAnchor?` 추가, `saveRouteDraft()`(편집기 자신이 저장, 전체교체) 신규 — Step9에서 위험하다고 뺀 `setRouteDraft`와는 다른 용도(다른 기능이 와서 기존 걸 덮어쓰는 게 아니라 편집기가 자기 문서를 저장하는 것)
- [x] `src/lib/route-schedule.ts` — `scheduleRoute()`(anchor 전파+자정롤오버+날짜구분선 계산), `calculateRouteLegs()`(도보/대중교통 구간, 2.5km 임계값). **버그 발견·수정**: 처음엔 두 함수가 서로 다른 이동시간 계산을 썼음(`scheduleRoute`는 순수 도보시간만, `calculateRouteLegs`는 대중교통 추정 포함) → 실제 표시되는 스팟 시각과 구간 라벨("Transit 28min")이 안 맞는 버그. `computeLegTravel()` 공통 헬퍼로 통합해 일치시킴(Playwright로 수치 직접 추출해서 검증)
- [x] `src/lib/route-progress.ts` — 완료 스팟 ID 저장/조회(`k-vibe-route-progress`)
- [x] `src/lib/route-share.ts` — base64url 인코딩/디코딩(공유 URL `?route=...`, 받는 사람이 실제로 루트를 가져올 수 있게 — 텍스트 공유만으론 안 된다고 판단해 포함 결정), `buildGoogleMapsDirectionsUrl`/`buildGoogleMapsPlaceUrl`
- [x] `@dnd-kit/core`+`@dnd-kit/sortable`+`@dnd-kit/utilities` 설치 — `PointerSensor`+`TouchSensor`로 모바일 터치 드래그, 위/아래 버튼도 접근성 보조로 함께 제공
- [x] `blocks/route/route-mini-map.tsx`(퍼센트좌표 SVG, 핀 탭→Google Maps), `day-divider.tsx`("Day N" 헤더), `route-location-check.tsx`(GPS 권한, 다음 스팟까지 실시간 거리), `route-stop-card.tsx`(드래그핸들+완료토글+위/아래+삭제+시각/날짜/체류시간 편집 다이얼로그+지도연동)
- [x] **체류시간 기본값도 사용자가 조정 가능**: `DEFAULT_STAY_MINUTES`(60분) 하드코딩이 아니라 RoutePage 상단에 입력 필드로 노출, `scheduleRoute()`가 파라미터로 받음
- [x] `pages/RoutePage.tsx` — `readRouteDraft()` 로드(또는 공유 URL 디코드) + dnd-kit + 통계(Stops/Done/Walking/Total) + 미니맵 + 위치확인카드 + 날짜구분선 포함 스팟 리스트 + 하단 액션바(지도전체보기/공유/초기화) + 빈 상태
- [x] **제외 결정**: AI 도슨트 연동(`/docent` 페이지가 로드맵에 없음), "샘플 스팟 추가" 더미 버튼(Map/Analyze/Persona 3곳에서 이미 진짜 스팟 추가 가능), 페르소나 페이지의 "전체초기화" 버튼은 여기 RoutePage로 이전(확인 다이얼로그 포함)
- [x] messages/*.json — `route` 네임스페이스 전면 재작성(4개 언어, hslee `ui-copy.ts` 기반 + 날짜구분선/시각편집 등 신규 키 추가), `common.cancel` 신규
- [x] Playwright 검증: 혼합 출처 스팟(체류시간 없는 것 포함) 스케줄링 정확성(수치 직접 추출해 검증), 드래그 재정렬 + 위/아래 버튼, 시각/날짜 편집→고정점+날짜구분선 생성 확인, 자정롤오버, 완료토글→새로고침해도 영속 확인, 삭제, 초기화(취소/확인 둘 다), 공유→클립보드 URL→새 컨텍스트에서 그 URL 열어 같은 루트 복원 확인, 지도연동(내부 네비게이션), 위치확인(GPS mock으로 실제 거리 계산 확인), 데스크탑/한국어 로케일. 콘솔 에러 없음

#### Step 10 후속 — RoutePage 데스크탑 분할 + 파일 분리 + 모바일 카드 정렬 수정
- [x] **데스크탑 레이아웃**: MapPage의 `grid-cols-[1fr_420px]` 패턴을 RoutePage에도 적용 — 상단 전체너비(통계 4칸), 좌측(1fr: 기본체류시간 입력+미니맵+위치확인카드), 우측(420px: 스팟리스트), 하단 전체너비(액션바). 컨테이너 `max-w-2xl` → `md:max-w-4xl`로 확장(다른 페이지는 전부 `md:max-w-2xl` 유지 — RoutePage만 2단 분할이 필요해서 의도적으로 다르게 적용한 예외)
- [x] **파일 분리**: `src/blocks/route/route-stop-list.tsx` 신규 — `DndContext`+`SortableContext`+스팟카드+구간(leg)표시 렌더링 블록을 RoutePage에서 분리. **상태(`stops`/`completedIds`/`defaultStayMinutes`)는 RoutePage가 그대로 소유, `handleDragEnd`/`toggleComplete`/`removeStop`/`viewStopOnMap`/`editSchedule` 콜백만 props로 전달** — `spot-list-panel.tsx`(Step7 후속)와 동일 패턴. `sensors`(드래그 감도 설정)는 RoutePage 상태와 무관해서 새 컴포넌트 내부로 완전히 이동
- [x] **RouteStopCard 모바일 정렬 버그 수정** (데스크탑은 기존에도 정상이었음, 모바일 전용 문제였음):
  1. 제목+혼잡도뱃지가 모바일에서 줄바꿈되던 문제 → `flex-wrap`→`flex-nowrap` + 제목에 `truncate`/`min-w-0` 적용. 공간 부족 시 제목이 말줄임 처리되고 뱃지는 항상 같은 줄에 고정
  2. 완료~삭제 액션 아이콘 4개가 모바일 폭에서 깨지던 문제(이름+뱃지 줄과 같은 행에서 공간을 다투던 게 원인) → 모바일은 액션 4개를 카드 내 별도 줄(3번째 줄, `md:hidden`)로 분리해 전체 카드 폭을 확보, 데스크탑은 기존처럼 한 줄 우측 정렬(`hidden md:flex`) 유지. 버튼 4개는 `completeBtn`/`viewOnMapBtn`/`externalLinkBtn`/`removeBtn` 변수로 한 번만 정의해 모바일/데스크탑 두 그룹에서 재사용(`BottomNav`/`SidebarNav`가 `NAV_ITEMS`를 각자 렌더링하는 것과 동일한 "양쪽 다 렌더링 후 `md:` 클래스로 한쪽만 표시" 패턴)
- [x] **하단 액션바 간격 버그 수정**: `grid grid-cols-4`(지도보기 2칸+공유 1칸+초기화 1칸) 구조에서 `size="icon"` 버튼(공유/초기화)이 칸 너비보다 작아 칸 안에 여백이 남고, 그 여백이 버튼 사이 간격처럼 보여 "공유-초기화" 간격이 "지도보기-공유" 간격보다 훨씬 커 보이던 문제 → `grid`→`flex`로 변경, 지도보기 버튼에 `flex-1`(남는 공간 전부 차지), 공유/초기화는 고정폭 유지. 이제 세 버튼 사이 간격이 `gap-2`로 균일
- [x] Playwright(시스템 Chrome, 임시 `playwright-core` 설치 후 검증 종료 시 제거) 검증: 모바일(390px) 제목+뱃지 한 줄 고정 및 말줄임 확인, 액션 4개 별도 줄로 정상 표시 확인, 데스크탑(1440px) 2단 분할 레이아웃 확인, 액션바 간격 균일 확인, 완료토글/삭제/드래그재정렬 실제 동작 확인(토스트+통계 갱신+DOM 반영), 콘솔 에러 없음

#### Step 10 후속 2 — lint 에러 수정 + 모바일 카드 여백 + 데스크탑 폭 재조정
- [x] **`react-hooks/set-state-in-effect` lint 에러 수정**: 마운트 effect가 `setStops`/`setCompletedIds`/`setHydrated`를 동기 호출하던 구조 → `useState(() => loadInitialRoute(searchParams))` lazy initializer로 전환(공유 URL 디코드/`readRouteDraft`/`readRouteProgress`는 순수 읽기라 렌더 중 호출 안전). 이 결과 첫 렌더부터 `stops`/`completedIds`가 항상 올바른 값이라 **`hydrated` 게이팅 state 자체가 불필요해져 완전히 제거**(초기 로딩 갭이 사라짐). `toast`/`setSearchParams`(URL의 `route` 파라미터 제거)처럼 진짜 부수효과만 마운트 effect에 남김
- [x] **모바일 카드 여백 부족 수정**: `route-stop-card.tsx` 전체적으로 비좁다는 피드백 → 처음엔 `md:` 분리로 모바일/데스크탑 패딩값을 따로 키웠으나, 이후 사용자가 카드 패딩을 `py-3` 단일값으로 직접 정리(현재 확정값, 모바일/데스크탑 모두 만족스러운 상태로 확인됨). 카드 사이 리스트 간격은 `space-y-2`→`space-y-3 md:space-y-2`(`route-stop-list.tsx`) 유지
- [x] **모바일 카드 정보 가독성 재구조화** (Step 10 후속 3에서 완료, 아래 참고)
- [x] **데스크탑 카드 가로폭 축소로 인한 텍스트 줄바꿈 버그 수정**: 분류/체류시간/시작시각 메타 행(`culture · Stay: 60min · Start: 10:00`)에 `flex-nowrap`/`whitespace-nowrap`이 없어서, 우측 패널이 420px로 좁아지자 `Stay:`/`60min`처럼 단어 중간에서 줄바꿈되던 버그 발견·수정. 근본 원인은 폭 자체가 부족했던 것이라 nowrap 추가와 함께 **우측 패널 420px→480px, 페이지 컨테이너 `md:max-w-4xl`→`md:max-w-6xl`로 확장**(사이드바~화면 우측 사이 낭비되던 여백을 줄이는 효과). 좌측 컬럼이 같이 넓어지면서 `RouteMiniMap`도 자동으로 더 크게 표시됨(별도 코드 수정 없이 부모 폭에 비례하는 `aspect-video w-full` 구조 덕분)
- [x] Playwright 재검증: 모바일(390px) 카드 여백 확대 확인, 데스크탑(1440px) 메타 행 한 줄 고정+미니맵 확대+사이드바~컨텐츠 간 여백 축소 확인, 완료토글/삭제/드래그재정렬 재확인, 공유 URL(`?route=...`) 디코드→localStorage 저장→URL 파라미터 제거 end-to-end 확인, 콘솔 에러 없음

#### Step 10 후속 3 — RouteStopCard 모바일 1층/2층 재구조화 + 체류시간 입력 버그
- [x] **데스크탑 적용 범위 확정**: 사용자 확인 결과 "데스크탑은 기존 1줄 레이아웃 유지, 모바일만 신규 구조" → `route-stop-card.tsx`에 모바일(`md:hidden`)/데스크탑(`hidden md:flex`) 두 분기를 완전히 분리. 액션버튼 4개(`completeBtn`/`viewOnMapBtn`/`externalLinkBtn`/`removeBtn`)는 변수로 한 번만 정의해 양쪽에서 재사용(`BottomNav`/`SidebarNav`와 동일한 "양쪽 다 렌더링+`md:`로 토글" 패턴)
- [x] **모바일 1층/2층 구조**: 드래그핸들(좌측 고정, 카드 전체높이) → 우측 정보영역에 **1층**(완료토글/지도보기/외부링크/삭제 4개 버튼, 우측정렬, 독립된 줄) + **2층**(좌: 인덱스원, 우: 상단 제목+혼잡도뱃지 / 하단 카테고리·체류시간·시작시간을 `text-xs text-muted-foreground`로). 카드 패딩은 모바일 `px-3 py-4`, 데스크탑은 `getComputedStyle`로 실제 렌더링 값(`px-2 py-3`) 확인 후 동일하게 명시 고정(기존 `p-2`+`py-3` 혼용으로 인한 모호성 제거)
- [x] **기본 체류시간 입력 0 처리 버그 수정** (`src/pages/RoutePage.tsx`): `Number('') || DEFAULT_STAY_MINUTES`가 빈 값을 즉시 60으로 되돌려 "610 만들고 6 지우기" 우회가 필요했던 문제 → `stayMinutesText`(raw 문자열 로컬 state) 신규 추가로 입력 표시와 `defaultStayMinutes`(스케줄링용 숫자)를 분리. 빈 값/중간값은 자유롭게 허용하고, 최소값(5) 클램핑과 빈 값일 때 60 폴백은 `onBlur`에서만 적용(타이핑 중엔 클램핑 없음)
- [x] Playwright 검증: 모바일(390px) 1층/2층 구조 렌더링 확인+1층 버튼 실제 클릭 동작(완료토글/삭제, 통계 갱신+DOM 반영) 확인, 데스크탑(1440px) 기존 1줄 레이아웃 동일 유지 확인, 체류시간 입력 "60"→전체삭제(빈값 유지, 즉시 60 안 됨)→"10" 타이핑(바로 "10", "610" 경유 없음)→blur(그대로 유지) 확인, 완전히 비운 채 blur 시 60 폴백 확인, 기존 기능(드래그재정렬/완료토글/삭제) 회귀 없음, 콘솔 에러 없음
- [ ] **메모** (구현 보류, Step13 진입 전 처리): localStorage 직접 호출(`route-draft.ts`/`route-progress.ts`/`persona-preference.ts`/`theme-store`/`sidebar-store` 등)이 여러 파일에 흩어져 있어 향후 DB 이전 시 빠짐없이 확인하기 어려움 — Step13 착수 전 `src/lib/local-storage-keys.ts` 같은 단일 레퍼런스로 키 목록 정리 고려

### ✅ Step 11 — RadarPage
- [x] **선행 작업 1 — `useCurrentLocation` 3단계 위치 폴백**: ① GPS 성공 → 좌표 사용+`localStorage('k-vibe-last-known-location')`에 저장 ② GPS 실패 → 저장된 마지막 위치 있으면 그걸 사용 ③ 그것도 없으면 서울 폴백(TTL 없음, 단순 유지). `src/lib/location-cache.ts`(read/write) 신규 + `use-current-location.ts` 수정. **`MapPage.tsx`는 코드 변경 없이 동일 훅을 그대로 재사용해 동일 혜택**(Playwright로 Map/Radar 둘 다 3단계 전부 end-to-end 검증: GPS성공→`Current Location`, GPS실패+캐시있음→`Last known location`, GPS실패+캐시없음→`Seoul (default)`)
  - **버그 발견·추가 수정(후속)**: 위치를 못 받아왔을 때 경고 토스트가 **2개씩** 뜨는 문제 발견 → 원인은 `main.tsx`의 `<StrictMode>`가 개발모드에서 마운트 effect를 의도적으로 2회 실행하는 것(React가 effect의 멱등성을 검증하기 위한 정상 동작) — `requestLocation()`을 가드 없이 마운트 effect에서 직접 호출해서 실패 시 토스트도 2번 호출됨. `RadarPage.tsx`/`MapPage.tsx` 양쪽 모두 `useRef` 가드(`didRequestLocationRef`)로 StrictMode의 synthetic 재마운트 시 두 번째 호출을 무시하도록 수정(ref는 그 재마운트 사이에도 값이 유지됨). Playwright로 두 페이지 모두 토스트 1개로 정상화 확인 + 3단계 폴백 전체 회귀 재검증 완료
- [x] **선행 작업 2 — 토스트가 TopBar를 가리는 문제 수정**: `app-toaster.tsx`에 `offset={{ top: 64 }}` + `closeButton` 추가(라이브러리 교체 없이 `sonner` v2 자체 prop으로 해결). Playwright로 토스트 bounding box `y=64`(TopBar 56px 아래) 확인 + `data-close-button` 존재 확인 — 전역 적용(모든 페이지 혜택)
  - **버그 발견·추가 수정(후속)**: 데스크탑은 고쳐졌지만 **모바일에서는 여전히 헤더를 가림** — `sonner`가 `@media (max-width:600px)`에서 `offset` 대신 별도의 `mobileOffset` prop을 쓰는 걸 놓쳤음(`offset`만 주면 모바일은 라이브러리 기본값 16px로 폴백). `mobileOffset={{ top: 64 }}`도 같이 추가해 해결. Playwright로 모바일(390px) bounding box `y=64`까지 재확인
- [x] **데이터 모델**: `src/types/facility.ts` — `Facility`/`FacilityType`/`FacilityFilter` + `FACILITY_TYPE_META`(8타입 아이콘+색상+i18n키 단일소스, `place.ts`와 동일 패턴). **버그 회피**: 핀 배경색을 `color`(text-*)에서 런타임 `.replace('text-','bg-')`로 만들면 Tailwind 정적분석이 못 잡아서 클래스가 생성 안 됨 → `pinBg`(bg-*) 필드를 처음부터 별도 리터럴로 분리
- [x] **Mock 데이터**: `src/blocks/radar/radar.data.ts` — hslee `FACILITY_BLUEPRINTS` 9개(8타입 커버, 좌표 오프셋 기반) 포팅 + `fetchFacilities()`(useQuery로 호출). `src/lib/radar-radius.ts`(반경 5단계+`getNextRadarRadius`) + `src/lib/facility-share.ts`(`buildGoogleMapsFacilityUrl`) 신규
- [x] **블록 분리(처음부터)**: `radius-slider.tsx`/`facility-filter-tabs.tsx`(9개 단일선택)/`radar-map-preview.tsx`(동심원+현위치핀+시설핀)/`facility-card.tsx`(펼치기형)/`facility-list.tsx`(로딩/에러/빈상태/목록 전부 담당, RadarPage는 데이터만 전달). **`onViewMap`/`onSelectFacility` 콜백 제거**: 처음에 hslee처럼 콜백+`window.open()` 패턴으로 설계했으나, 실제로는 지도 열기 버튼/핀을 전부 `<a href target="_blank">`로 구현해서 콜백이 빈 no-op이 되는 걸 발견 → 불필요한 prop 전부 삭제(앵커가 직접 처리)
- [x] **데스크탑 레이아웃**: RoutePage와 동일 패턴(`grid-cols-[1fr_420px]`, 컨테이너 `max-w-sm px-4 md:max-w-6xl`)
- [x] **모바일 레이아웃 버그 발견·수정**: 데스크탑 분할 컨테이너를 모바일에서도 `grid`(암묵적 단일 컬럼)로 두면, 컬럼 트랙이 `auto` 사이징이라 자식의 max-content 폭(필터탭의 가로스크롤 콘텐츠 911px)까지 늘어나 카드 전체가 화면 밖으로 넘치는 버그 발견(`min-w-0`만으로는 그리드 "auto" 트랙 사이징 자체를 못 막음) → 모바일은 `flex flex-col`(자식이 컨테이너 폭에 stretch), `md:` 부터만 `grid md:grid-cols-[1fr_420px]`로 전환해 해결. Playwright로 실제 좌표 측정(`getBoundingClientRect`)까지 해서 352px로 정확히 들어맞는 것 확인
- [x] **색상**: hslee의 브랜드 레드(`#FF3A5C`) 미사용, `primary`/`destructive`/`emerald-500` 등 기존 시맨틱 토큰+표준 Tailwind 팔레트로 대체
- [x] i18n: `radar` 네임스페이스 전면 재작성(4개 언어, placeholder 5개 키 폐기) + `map.last_known_location` 신규
- [x] Playwright 검증: 데스크탑(1440px)/모바일(390px) 레이아웃, 반경슬라이더(키보드 ArrowLeft로 단계 변경), 필터탭 단일선택, 카드 펼치기/접기, 빈 상태+반경확장 버튼(반경 늘려서 결과 다시 나오는 것까지 확인), 위치 3단계 폴백 전부, 토스트 위치/닫기버튼, 콘솔 에러 없음, 4개 언어 키 누락 없음(`radar` 네임스페이스 ko/ja/zh가 en과 키 1:1 일치 스크립트로 확인)
- [x] CLAUDE.md "새 페이지의 블록 분리 시점" 규칙 추가(주요 결정사항 표) — 처음부터 블록 단위로 시작, 나중에 분리하지 않기

#### Step 11 후속 — 데스크탑 레이아웃 재배치 + 맵 고정 스크롤 + 내부지도 이동 옵션
- [x] **레이아웃 재배치**: 기존엔 좌측 컬럼에 반경슬라이더+필터탭+미니맵이 같이 쌓여있었음 → 1층(전체너비: 반경슬라이더)/2층(전체너비: 필터탭)/3층(좌우분할: 좌=미니맵, 우=목록, 비율은 기존 `1fr_420px` 유지)으로 재배치. 데스크탑·모바일 동일 구조(모바일은 1~3층이 그냥 세로로 쌓임)
- [x] **모바일 필터탭 패딩 불일치 수정**: `facility-filter-tabs.tsx`가 `category-filter.tsx`의 `-mx-5 px-5`(20px)를 그대로 가져다 썼는데, RadarPage 컨테이너는 `px-4`(16px) — 좌우 패딩이 다른 컴포넌트들과 안 맞던 버그. `-mx-4 px-4`로 통일
- [x] **맵 고정 + 목록만 스크롤** (모바일+데스크탑 둘 다): MapPage처럼 페이지 자체를 고정 높이 셸로 전환(`h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-3.5rem)]`) — 헤더+반경+필터(1~2층)는 `shrink-0`, 3층의 좌(미니맵)는 `shrink-0`(스크롤 안 됨), 우(목록)만 `overflow-y-auto`. 모바일에서는 사용자가 직접 미니맵 영역에 `h-[35vh]` 고정값을 추가(맵이 화면을 너무 많이 차지하지 않도록) — 이에 맞춰 `radar-map-preview.tsx`의 내부 박스도 `aspect-square`(고정 비율)에서 `flex-1`(부모가 주는 높이를 그대로 채움)로 변경해 충돌 제거. Playwright로 `getBoundingClientRect` 비교까지 해서 리스트를 800px 스크롤해도 맵 타이틀의 좌표가 완전히 동일하게 유지되는 것 확인(데스크탑/모바일 둘 다)
- [x] **시설을 우리 앱 지도로 보는 옵션 추가**: 기존엔 시설 클릭 시 무조건 Google Maps로 외부 이동만 가능했음 → `RouteStopCard`와 동일한 아이콘 분리 패턴(`MapPin`=내부 이동, `ExternalLink`=외부 Google Maps) 적용. `facility-card.tsx`는 collapsed 행에 아이콘 버튼 2개(내부/외부), expanded 영역엔 2-그리드 버튼(내부/외부)로 확장. `radar-map-preview.tsx`의 핀은 기존 `<a href=Google Maps>`에서 `onClick`으로 내부 이동(`MapFocusState`로 `/map` 이동 + 상세시트 자동오픈, `RoutePage.viewStopOnMap()`과 동일 패턴)으로 전환. `RadarPage.tsx`에 `viewFacilityOnInternalMap()` 신규, `facility-card`/`facility-list`/`radar-map-preview`에 `onViewOnInternalMap` prop으로 전달
- [x] i18n: `radar.view_on_internal_map`/`radar.open_facility_map_short` 신규 4개 언어 추가
- [x] Playwright 검증: 1층/2층/3층 레이아웃 확인, 모바일 필터탭 패딩 일치 확인, 맵 고정+목록 스크롤(좌표 비교로 완전 고정 확인) 모바일/데스크탑 둘 다, 내부지도 이동 클릭→`/map` 이동+상세시트 자동오픈 확인(카드 버튼+맵 핀 총 16개 클릭 가능 요소 모두 동일 동작), 콘솔 에러 없음

### ✅ Step 12 — ProfilePage + LoginModal
- [x] **로그인 방식 확정**: OAuth만(ID/PW 폼 없음), provider는 **Google+Apple+Kakao** 3개(Facebook/GitHub/Naver/Instagram 제외 — Naver/Instagram은 Supabase 자체가 미지원이라는 걸 조사로 확인). 프론트 제1원칙("서버 교체 시 API 정책만 바꾸면 그대로 동작") 재확인 → `@supabase/supabase-js` 설치 안 함, 전부 mock으로 구현
- [x] `src/lib/auth.ts` — `AuthUser`/`AuthProvider`+`getCurrentUser()`/`loginWithProvider()`/`logout()`, mock은 localStorage(`k-vibe-mock-session`) 기반. 세 함수 모두 `async`로 선언(실제 OAuth는 리다이렉트 대기가 있는 진짜 비동기라 호출부 코드가 Step15에도 그대로 맞도록)
- [x] `src/lib/use-auth.ts` — `useQuery(getCurrentUser)`+`useMutation(loginWithProvider/logout)` 래퍼, TopBar/ProfilePage/LoginModal 전부 이 훅만 사용
- [x] `src/lib/saved-places.ts` — `fetchSavedPlaces()`/`toggleSavedPlace()`(localStorage). `MapPage.tsx`/`home-feed.tsx`의 로컬 `useState(new Set())` 저장 상태를 제거하고 `['saved-places']` 공유 쿼리키로 통일 — 셋 다 서로 import 안 하고 이 lib+쿼리키만 공유(`route-draft.ts`와 동일 구조)
- [x] `top-bar.tsx` 아바타 — `useAuth()`의 `user`로 로그인 시 이름 이니셜, 게스트면 기존 `User` 아이콘
- [x] `src/assets/google-icon.tsx` — Google 아이콘을 `.svg` 파일 대신 `.tsx`로 export(`GoogleIcon`), lucide-react 아이콘과 동일하게 import해서 쓰는 패턴으로 통일(lucide엔 브랜드 아이콘 없음 — Apple은 `Apple`로 존재, Kakao는 없어서 `MessageCircle`+브랜드컬러 `#FEE500`로 대체)
- [x] `blocks/profile/login-modal.tsx` — provider 3개 버튼(아이콘을 `PROVIDER_BUTTONS` 데이터 배열 안에 직접 포함, `FACILITY_TYPE_META`와 동일하게 "아이콘도 데이터의 일부"로 통일 — 별도 `ProviderIcon` 룩업 컴포넌트로 분리했다가 다시 합침)+게스트로 계속하기+로그인 없이도 가능한 기능 안내. 모바일/데스크탑 동일 UI(요구사항 확정)
- [x] `blocks/profile/profile-header.tsx` — 아바타+이름/이메일(또는 게스트)+페르소나칩+저장한장소/루트 통계+**로그인·로그아웃 버튼(카드 내부 하단)**
- [x] `blocks/profile/saved-places-grid.tsx` — 모바일 2열/데스크탑 4열, 4개 미리보기+전체보기 토글, 빈 상태 시 지도이동 CTA, 작은 하트 버튼으로 즉시 unsave
- [x] `blocks/profile/current-route-card.tsx` — `readRouteDraft()`+`scheduleRoute()` 재사용, 진행률바+다음스팟+이어하기 버튼, 빈 상태 시 지도이동 CTA
- [x] `blocks/profile/settings-list.tsx` — 언어/알림 2행(정적 표시). 오프라인지도·지도데이터는 검토 후 완전 제외(아래 "실제 구현" 참고)
- [x] `pages/ProfilePage.tsx` — 모바일 세로스택 / 데스크탑 `grid-cols-[1fr_360px]`(헤더는 우측 1행, 콘텐츠는 좌측 1~2행 `row-span-2`, 설정은 우측 2행 — `order` 대신 `col-start`/`row-start` 명시 배치)
- [x] `profile`/`login` i18n 네임스페이스 전면 작성(Step3 placeholder 8개 키 폐기), 4개 언어
- [x] **사용자별 저장 장소 분리(구현 중 발견)**: `k-vibe-saved-places` 단일 키였다면 로그아웃 후 다음 게스트가 이전 계정 데이터를 보는 문제 → `k-vibe-saved-places:{userId|guest}`로 버킷 분리 + `mergeGuestSavedPlacesIntoUser()`(로그인 성공 시 1회, guest 버킷→계정 버킷 병합 후 guest 비움). `use-auth.ts`의 로그인 mutation `onSuccess`에서 호출
- [x] **루트 완료 상태를 Zustand로 승격(구현 중 추가 요청)**: `src/store/route-progress-store.ts` 신규 — RoutePage의 로컬 `completedIds` state를 이 스토어로 이전, `current-route-card.tsx`도 같은 스토어 구독. 양쪽 어디서 토글해도 즉시 양방향 동기화(페이지 이동 없이도, 새로고침 없이도). `current-route-card.tsx`에 다음 스팟 완료 토글 버튼 추가
- [x] **버튼/CTA 정리**: "이어하기"+"편집" 중복 버튼(둘 다 `navigate('../route')`로 동일 동작) → 1개로 통합. "Create your first route" CTA 대상을 `../persona`→`../map`으로 변경(RoutePage 자신의 빈상태 문구가 지도를 먼저 언급하는 것과 통일, 첫 루트는 위저드보다 지도 탐색이 더 직관적이라고 판단)
- [x] Playwright 검증: 게스트→3개 provider 로그인→로그아웃 전체 플로우, 게스트 저장→로그인 시 병합→로그인 중 추가저장(둘 다 표시)→로그아웃 시 게스트 화면 깨끗함(이전 계정 데이터 안 보임)의 4단계 시나리오, Profile↔Route 완료토글 양방향 동기화+새로고침 영속, 버튼 1개 통합 확인, 모바일(390px)/데스크탑(1440px) 레이아웃, 콘솔 에러 없음. `npx tsc --noEmit`/`npx eslint src` 클린(shadcn `components/ui/` 3건 제외)

### ✅ Step 13 — API Layer
- [x] **사전조사**: `origin/hslee`의 `app/api/**` 라우트 전부 읽고 대조 — `GET /api/places`/`GET /api/facilities`(둘 다 TourAPI+mock 폴백, `lat&lng&radius&...&locale` 동일 규격)/`POST /api/analyze`(AI워커+mock폴백, `{youtube_url,locale}`)/`POST /api/routes/generate`(hslee도 mock뿐)/`GET /api/auth/callback`(Supabase OAuth, Step15 영역)/`GET /api/places/:contentId`(대응 기능 없음, 추가 안 함) 확인
- [x] `axios` 신규 설치, `src/api/client.ts` — `apiClient`(baseURL=`VITE_API_BASE_URL`, timeout 8s)+`withFallback(realCall, mockFallback)`: env 비어있으면 즉시 mock, 호출 실패해도 `console.warn`+mock(영구 폴백 패턴, Step15에서 지우는 임시 코드 아님 — hslee 실제 백엔드도 TourAPI 키 있어도 타임아웃나면 mock으로 빠지는 것과 동일 원리)
- [x] `src/vite-env.d.ts` 신규(이전에 없었음) — `ImportMetaEnv`에 `VITE_API_BASE_URL` 등 타입 선언
- [x] **파일 이동**(mock 데이터는 전부 보존, 옛 컨테이너 파일만 삭제): `src/api/places.ts`(SEOUL_PLACES+EXTRA_PLACES+fetchHomeFeedPlaces+fetchMapPlaces, map-page.data.ts 삭제/home-feed.data.ts는 STORY_TOPICS만 남김), `src/api/facilities.ts`(radar.data.ts 전체, 삭제), `src/api/analyze.ts`(MOCK_ANALYSIS_BY_LOCALE+fetchAnalysis+타입, analyze.data.ts는 EXAMPLE_URLS만 남김), `src/api/routes.ts`(persona.data.ts 전체, 삭제), `src/api/trending.ts`(trending-keywords.data.ts 전체, 삭제)
- [x] **의도적 시그니처 수정 2건**(새 기능 아니라 계약 버그 수정): `fetchAnalysis(videoId,locale)`→`fetchAnalysis(url,locale)`(hslee가 원본 URL을 받음, 내부에서 `extractVideoId`로 추출 — `AnalyzePage.tsx`도 `targetUrl` 그대로 전달하도록 수정) / `fetchScheduledRoute(theme,startTime)`→`fetchScheduledRoute(theme,detail,startTime,locale)`(hslee 규격엔 detail/locale도 있음, mock 본문은 안 쓰지만 실제 호출 가능하게 흘려보냄 — `PersonaPage.tsx`도 이미 있던 `detail`/`i18n.language` 같이 전달)
- [x] **MapPage·Facility API 규격 통일 — 구현 중 범위 확장**: Map(Step7, 고정 카탈로그+클라이언트 필터 컨셉이라 파라미터 없었음)과 Facility(Step11, 반경 슬라이더 실시간검색이 핵심이라 처음부터 파라미터화)의 mock 함수 모양이 서로 다르다는 게 hslee 대조 중 드러남 → Step15 충돌을 줄이기 위해 `fetchMapPlaces(query: PlaceQuery)`로 변경(`{lat,lng,radius,locale}`, mock 내부에서 `haversineKm()`으로 `distanceM` 재계산+반경필터+거리순 정렬, Facility의 `getMockFacilities`와 동일 패턴). `category`는 query에 안 넣음(MapPage 카테고리 필터가 처음부터 다중선택이라 단일 서버 파라미터로 표현 불가, 클라이언트 사이드 유지)
- [x] **UI(슬라이더)는 추가하지 않기로 결정**: 지금 지도는 줌/팬되는 실제 인터랙티브 지도가 아니라 퍼센트좌표 정적 미리보기라 Radar처럼 슬라이더를 넣는 게 어색함 → `DEFAULT_MAP_SEARCH_RADIUS=10000`(10km) 고정값 사용(SEOUL_CENTER 기준 mock 장소 8개 중 가장 먼 성수동~7.3km보다 여유). API 계약(`radius: number`)과 "그 값을 누가 만드는지"는 독립적인 결정이라, 나중에 실제 Kakao 지도가 들어와도 `fetchMapPlaces()` 시그니처는 안 바뀜 — **Step15 메모**: 그때는 `zoom_changed`/`dragend` 이벤트에서 `map.getBounds()`+`haversineKm()`으로 화면에 보이는 영역의 반경을 계산해서 넘기는 방식으로 교체
- [x] `fetchHomeFeedPlaces()`/Radar의 `radius-slider.tsx`/`radar-radius.ts`는 이번엔 손대지 않음(각각 반경 개념 없는 고정피드, Map에 슬라이더가 안 생겨서 공용화 불필요)
- [x] Playwright 검증: `VITE_API_BASE_URL`을 임시로 존재하지 않는 주소로 설정해 실제 호출 실패→`console.warn`(`[api] falling back to mock data: AxiosError: Network Error`)→mock 폴백 경로 직접 발생시켜 확인(화면은 정상 렌더링), env 원복 후 7페이지×모바일/데스크탑 스모크 테스트 콘솔 에러 없음, MapPage 카운트뱃지 8(변경 전과 동일) 확인, Analyze 예시URL→새 시그니처로 기존과 동일 결과 확인, Persona 위저드 전체플로우(테마→디테일→확인→생성)가 새 4-파라미터 시그니처로 정상 동작(4스팟 생성, 타이밍 정확) 확인. `npx tsc --noEmit`/`npx eslint src` 클린(shadcn 3건 제외)

### ✅ Step 14 — Zustand Store 연결 (검토 후 종료)
- [x] 원래 계획했던 `locale-store.ts`/`map-store.ts`/`auth-store.ts` 3개를 검토 — 셋 다 신규 구현 없이 다른 메커니즘으로 이미 충족됨을 확인하고 종료(상세 비교는 `plan.md` Step14 참고): locale은 URL 경로+`LocaleGuard.tsx`+i18next(Step3), map 중심좌표/선택장소는 `MapFocusState` 1회성 라우터 state 핸드오프(Step7~8) + MapPage 로컬 state, auth는 React Query(`['auth-user']`, Step12) — 전부 Zustand보다 적합한 기존 메커니즘이 이미 그 역할을 하고 있었음
- [x] `theme-store.ts`(Step4)는 계획대로 존재. 계획엔 없었지만 실제 필요에 따라 추가된 `sidebar-store`/`page-help-store`/`analyze-store`/`route-progress-store`까지 포함해 현재 5개 스토어 운영 중 — "필요해질 때 추가"가 "미리 다 만들기"보다 더 잘 맞았다고 판단

### ✅ Step 14 후속 — RoutePage/PersonaPage UI 리팩토링 + 미니맵 버그 수정 + 도슨트 연동
- [x] **미니맵 버그 #1+#2 수정**: 스팟 추가/삭제 시 핀 위치 깨지는 문제 → 부모 소유 bounds 아키텍처. `RoutePage.tsx`의 `useState(() => buildMinimapBounds(initialRoute.stops))` lazy initializer로 초기 stops 기반 1회 계산, 이후 업데이트 없음. `MinimapBounds` 인터페이스 + `buildMinimapBounds()` 헬퍼를 RoutePage.tsx에 정의. `RouteMiniMap`은 `bounds: MinimapBounds` prop을 받는 순수 컴포넌트로 변경
- [x] **Req 1 — 시간 계산 UI 제거**: `scheduleRoute`/`calculateRouteLegs`/`DEFAULT_STAY_MINUTES`/DayDivider/구간(leg) 행 제거. `route-stop-list.tsx`가 `stops: RouteStop[]`만 받는 구조로, `route-stop-card.tsx`가 `stop: RouteStop`으로. 통계는 Stops/Done 2개로 축소
- [x] **Req 2 — Persona 결과 summary 텍스트 제거**: `route-result.tsx`에서 `plan.summary` 표시 줄 제거, `PersonaPage.tsx`에서 `summary: ''`
- [x] **Req 3 — Persona Step 1 원복**: 처음 제거 → 사용자 요청("persona step1 원복 할 것")으로 `DetailStep` + step 인디케이터 복구. `confirm-step.tsx`에 `onBack: () => void` + ChevronLeft 버튼 복구
- [x] **Req 4+5 — 도슨트 버튼 + DocentPlayer 연동**: `RouteStop`에 `fromPersona?: boolean` 추가(`route-draft.ts`). `PersonaPage.handleAddToRoute`에서 `fromPersona: true` 설정. `route-stop-card.tsx`에 `stop.fromPersona && onDocent`일 때만 Headphones 버튼 노출. `RoutePage`에 `personaPlan`/`docentOpen` state + `DocentPlayer` 렌더링. `clearRoute()` 시 `clearPersonaRoutePlan()` + `setPersonaPlan(null)` 추가
- [x] **미니맵 드래그(pan) 추가**: `pan: {x,y}` state + `dragRef`(이벤트 핸들러 전용, 렌더 중 미접근 → `react-hooks/refs` 위반 없음). `setPointerCapture` 기반 포인터이벤트, `cursor-grab active:cursor-grabbing`. Directions 버튼은 드래그 레이어 바깥 `z-10`으로 분리
- [x] `npx tsc --noEmit` / `npx eslint src` 클린(shadcn `components/ui/` 3건 제외)

### ⬜ Step 15 — 백엔드 연동 검증
**배경**: "백엔드 연동 검증" 한 덩어리로 적혀있었지만 실제로는 서로 독립적인 4개 항목 — 진행 순서/담당 주체가 다 다르므로 항목별로 체크리스트 분리. 상세 내용은 `plan.md` Step15 섹션 참고

- [x] **① Kakao Maps JS SDK** (MapPage 지도 렌더링) — 백엔드/Supabase와 무관, 프론트엔드 단독+카카오 키만으로 완료 가능해서 가장 먼저 진행
  - [x] `react-kakao-maps-sdk`+`kakao.maps.d.ts`(타입) 설치, `tsconfig.app.json` types 추가
  - [x] `src/blocks/map/map-canvas.tsx` — `VITE_KAKAO_MAP_KEY` 있으면 실제 `<Map>`+`<CustomOverlayMap>` 렌더링, 없거나 SDK 로드 실패 시 기존 퍼센트 좌표 미리보기로 자동 폴백(`src/api/client.ts`의 `withFallback()`과 동일한 graceful-degradation 철학). 키 없을 땐 `useKakaoLoader()`를 아예 호출 안 해서 불필요한 카카오 서버 네트워크 요청 자체가 안 나감(컴포넌트 자체를 분기)
  - [x] `MapPage.tsx`로 내려가는 `MapCanvas` props 인터페이스 변경 없음(`center`/`places`/`selectedPlaceId`/`onSelectPlace`/`onRequestLocation`/`locationLabel` 그대로) — 장소 데이터는 여전히 기존 `fetchMapPlaces()`(`src/api/places.ts`)를 그대로 거쳐서 내려옴, 이번 작업은 그 결과를 "그리는 방식"만 교체(데이터 fetch 계층은 무관)
  - [x] Radar의 `radar-map-preview.tsx`/Route의 `route-mini-map.tsx`는 장식용 미리보기지 인터랙티브 지도가 아니라서 교체 대상에서 제외(원래 계획에도 MapPage 한정)
  - [x] 검증: `npx tsc --noEmit`/`npx eslint src` 클린(shadcn 3건 제외). `.env` 미생성(키 없음) 상태에서 Playwright로 `dapi.kakao.com` 네트워크 요청이 실제로 발생하지 않는 것 확인 + 퍼센트 미리보기 핀/클릭→상세시트 기존과 동일하게 동작(회귀 없음) 확인
  - [x] **실제 키 연동 완료 + 트러블슈팅 2건**:
    1. **`ERR_BLOCKED_BY_ORB`(http→https)**: `useKakaoLoader()`의 기본 스크립트 URL이 프로토콜 생략형(`//dapi.kakao.com/...`)이라, `http://localhost:5173`(Vite dev 서버)에서는 `http://dapi.kakao.com`으로 요청됨 — 카카오 서버가 평문 http를 거부해서 브라우저가 막아버림. `useKakaoLoader({ appkey, url: 'https://dapi.kakao.com/v2/maps/sdk.js' })`로 프로토콜 명시 고정해서 해결
    2. **`NotAuthorizedError: disabled OPEN_MAP_AND_LOCAL service`**: 2024-12부터 카카오 디벨로퍼스는 앱 생성+JS키 발급만으론 부족하고, **[내 애플리케이션] > [제품 설정] > [카카오맵] > 활성화 설정 ON**을 별도로 켜야 함 — 콘솔에서 활성화 후 해결
  - [x] **마커 가시성**: 기존 `bg-popover`(zinc 테마, 무채색)가 실제 컬러풀한 카카오 지도 위에서 거의 안 보이는 문제 발견 → `pinClassName()`을 핫핑크(`bg-pink-500`/선택 시 `bg-pink-600`+`scale-110`)로 변경. `PercentMapCanvas` 폴백과 공유하는 함수라 두 렌더링 방식 모두 동일하게 적용됨
  - [x] **선택 장소로 카메라 이동 + 위치 유지**: 지도 핀 또는 우측 목록에서 장소 클릭(`onSelectPlace`, 둘이 동일 핸들러) 시 지도가 그 장소로 자동 팬 이동(`isPanto`). `KakaoMapCanvas`에 `focusCenter` state를 두고 `<Map center>`를 검색 중심좌표 대신 선택된 장소 좌표로 전환 — `MapPage.tsx`/props 인터페이스 변경 없이 `map-canvas.tsx` 내부 로직만으로 구현. **사용자 피드백으로 수정**: 처음엔 상세시트를 닫으면(선택 해제) 검색 중심으로 도로 스냅백되던 것을 "닫아도 이동한 자리에 그대로 머문다"로 변경 — `focusCenter`를 선택 해제 시 리셋하지 않고, GPS 갱신/다른 페이지에서 들어온 새 검색 중심(`center` prop 자체 변경) 때만 리셋. React 공식 문서가 권장하는 "렌더 중 state 조정" 패턴(prev props를 state로 들고 비교, 렌더 바디에서 직접 setState)으로 구현 — `useEffect`로 처음 구현했다가 `react-hooks/set-state-in-effect` lint 에러(추가 렌더 유발)로 이 패턴으로 교체
  - [x] Playwright로 핫핑크 핀 렌더링 확인 + 다른 장소(예: 한강공원 여의도, 5.7km 거리) 클릭 시 지도가 실제로 그 위치(한강 일대)로 정확히 이동하는 것을 스크린샷으로 검증
- [ ] **② 자체 백엔드 API** (`VITE_API_BASE_URL`) — `src/api/{places,facilities,analyze,routes}.ts`가 호출할 실제 서버. axios+`withFallback()`로 이미 준비됨, 실제 백엔드 서버가 떠 있어야 검증 가능
  - [ ] `.env`에 실제 `VITE_API_BASE_URL` 설정
  - [ ] 4개 도메인(places/facilities/analyze/routes) 실제 호출 동작 확인, 트렌딩 키워드는 대응 엔드포인트 없어 영구 mock 유지
- [ ] **③ Supabase Auth (OAuth: Google/Apple/Kakao)** — `src/lib/auth.ts` 내부만 교체 예정(호출부 무변경)
  - [ ] Supabase 프로젝트 생성, provider별 콘솔 설정(Google Cloud Console / Apple Developer — 유료 멤버십 필요 / Kakao Developers)
  - [ ] `getCurrentUser()`/`loginWithProvider()`/`logout()` 내부 구현 교체
- [ ] **④ Supabase DB `saved_places` 테이블** — ③에 종속, `src/lib/saved-places.ts` 내부만 교체 예정(호출부 무변경)
  - [ ] 테이블 스키마 설계(`user_id`/장소 정보 저장 방식 결정)
  - [ ] `fetchSavedPlaces()`/`toggleSavedPlace()` 내부 구현 교체
- [ ] (참고, 외부 연동 아님) 알림 설정 실제 기능화 — Service Worker 없이 `Notification` Web API로 "탭 열린 동안" 알림만 구현 가능

---

## 주요 결정 사항 (변경 금지)
| 항목 | 결정값 |
|------|--------|
| 기본 locale | `'en'` |
| 지원 locale | `['ko', 'en', 'ja', 'zh']` |
| locale 저장 키 | `localStorage('k-vibe-locale')` |
| 테마 저장 키 | `localStorage('k-vibe-theme')` |
| dark mode 트리거 | `data-theme="dark"` on `<html>` |
| 모바일 max-width | 고정값 제거됨, 반응형 처리 완료 (Step 4) |
| QueryClient staleTime | 5분 |
| UI 반응형 | 모든 컴포넌트/페이지 필수 (위 "UI 반응형 원칙" 참고) |
| shadcn 폴리모픽 패턴 | base-ui 기반 → `asChild` 없음, **`render` prop** 사용 (`<Trigger render={<Button .../>}>children</Trigger>`) |
| mock 데이터 | 컴포넌트와 분리해 `*.data.ts` 파일로, **`async function fetch*()`로 감싸고 컴포넌트에서 `useQuery`로 호출** (Step 13에서 함수 내부만 교체하면 끝) |
| 페이지별 도움말 | 각 페이지 마운트 시 `usePageHelpStore().setHelp(title, body)` 호출 + unmount 시 `clearHelp()` → TopBar 도움말 버튼 자동 노출. 미등록 시 버튼 자동 숨김 |
| 작업 방식 | 원본(`k-vibe-tracker` **main 또는 origin/hslee**) 기능 변경/삭제 요청 시 원본 코드 직접 확인 후 대조표로 제시 → 승인 후 구현. UI 변경은 Playwright(headless Chromium)로 실제 렌더링 검증 후 완료 보고 |
| 참고 브랜치 | **`origin/hslee`가 기준** (main보다 150+ 커밋 앞선 실제 완성 버전, `git show origin/hslee:<path>`로 읽기 전용 확인. main은 Sprint-0 수준 초기 스캐폴드) |
| Button을 Link로 렌더링 시 | `render={<Link .../>}` 사용 시 **`nativeButton={false}` 필수** (안 하면 콘솔 접근성 경고) |
| 새 페이지의 블록 분리 시점 | **처음부터 블록 단위로 분리해서 시작할 것** — "다 만들고 나서 비대해지면 분리"가 아니라 설계 단계에서 미리 쪼갬. MapPage/RoutePage는 페이지에 전부 넣었다가 나중에 분리(`Step 7 후속`/`Step 10 후속`)해야 했던 반면, PersonaPage(Step9)/RouteStopList(Step10 후속)부터는 처음부터 분리해 같은 재작업이 없었음. 새 페이지 작업 시 "페이지 = 상태 보유+데이터패칭+블록 조립", "블록 = 렌더링 단위(목록/카드/프리뷰/컨트롤 등)"로 먼저 나눠서 계획한 뒤 구현 시작 |

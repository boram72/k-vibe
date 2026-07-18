# K-Vibe Frontend — Implementation Plan

> 각 Step 완료 후 CLAUDE.md Execution Progress 업데이트할 것

---

## ✅ Step 3 — React Router + react-i18next (완료)

### 확정 규칙
- **지원 locale**: `['ko', 'en', 'ja', 'zh']` / **기본값**: `'en'`
- **LocaleRedirect** (`/` 진입 시)
  1. `localStorage('k-vibe-locale')` 값이 지원 locale → 해당 locale
  2. `navigator.language` prefix(`en-US` → `en`)가 지원 locale → 해당 locale
  3. 그 외 (지원하지 않는 언어 포함) → `'en'` fallback
- **LocaleGuard** (잘못된 `:locale` param 진입 시)
  1. `SUPPORTED_LOCALES`에 없는 locale → `localStorage('k-vibe-locale')` 이전 기록 확인
  2. 이전 기록 있음 → 해당 locale로 리다이렉트
  3. 이전 기록 없음 → `/en` 리다이렉트
  - 이전 기록 방법: `localStorage('k-vibe-locale')` (별도 API 불필요)
- **i18n**: `lng: 'en'`, `fallbackLng: 'en'`, resources 직접 import (fetch 없음)
- **언어 변경 시점**: LocaleGuard `useEffect`에서 `i18n.changeLanguage(locale)` 호출

### 생성 파일
- `src/i18n/index.ts` — i18next 초기화, SUPPORTED_LOCALES / Locale 타입 export
- `src/router/LocaleGuard.tsx` — locale 유효성 검사 + i18n 동기화
- `src/router/index.tsx` — createBrowserRouter, detectLocale() 포함
- `src/pages/*.tsx` — LandingPage, MapPage, AnalyzePage, PersonaPage, RoutePage, RadarPage, ProfilePage (7개 stub)
- `src/blocks/layout/app-layout.tsx` — stub (Step 4에서 실구현)
- `src/main.tsx` — RouterProvider + QueryClientProvider 래핑

---

## ⬜ Step 4 — AppLayout (TopBar + BottomNav/SidebarNav) ← 다음 작업

### 반응형 전략 (확정)
- **모바일 (< md)**: 하단 탭바(BottomNav) 유지
- **데스크탑 (≥ md)**: 좌측 접이식 사이드바(SidebarNav)로 전환
  - 접기/펴기 상태: `useSidebarStore` (Zustand) + `localStorage('k-vibe-sidebar')` 영구 저장
  - 접었을 때: 아이콘만 표시 (고정 폭 64px), 라벨 텍스트 숨김. 네비게이션 기능은 동일하게 작동
  - 펼쳤을 때: 아이콘 + 라벨 (고정 폭 ~240px)
  - 토글 버튼: 사이드바 상단 또는 TopBar에 배치
- `#root`의 고정 `max-width: 448px` 셸 제거 → AppLayout/페이지별 반응형 max-width로 대체

### 네비게이션 항목 — 가변 리스트 구조 (확정)
고정 하드코딩 금지. `src/blocks/layout/nav-items.ts`에 **배열 형태**로 정의하여 항목 추가/삭제/순서 변경이 한 곳에서만 일어나도록 함. BottomNav/SidebarNav 둘 다 이 배열을 `map()`으로 렌더링.

```ts
// 형태 예시 (실제 작성은 코드 단계에서)
export interface NavItem {
  key: string          // 'map' | 'analyze' | ...
  path: string          // '/map' (상대경로, locale prefix는 렌더링 시 결합)
  icon: LucideIcon
  labelKey: string      // i18n 키 (messages/*.json 참조)
}

export const NAV_ITEMS: NavItem[] = [ ... ]  // 배열 — 추가/삭제 시 이 배열만 수정
```
- 항목 추가/삭제는 `NAV_ITEMS` 배열 수정만으로 BottomNav/SidebarNav 양쪽에 자동 반영
- Profile은 별도 (TopBar 아바타 전용) — `NAV_ITEMS`에 포함 안 함

### 구조
```
AppLayout
├── TopBar                      (상단 고정, 전체 폭)
│   ├── 로고/타이틀 (좌)
│   └── Profile 아바타 버튼 + 테마 토글 Switch (우)
├── <md>: flex-row
│   ├── SidebarNav (좌, md 이상에서만 표시, 접기/펴기 가능, NAV_ITEMS 순회)
│   └── <main><Outlet /></main>
└── BottomNav                   (하단 고정, md 미만에서만 표시, NAV_ITEMS 순회)
```

### 생성 파일 순서
| # | 파일 | 내용 |
|---|------|------|
| 1 | `src/store/theme-store.ts` | useThemeStore (Zustand) |
| 2 | `src/store/sidebar-store.ts` | useSidebarStore — `isCollapsed: boolean`, localStorage 영구 저장 |
| 3 | `src/blocks/layout/nav-items.ts` | NAV_ITEMS 배열 — 추가/삭제 용이한 단일 소스 |
| 4 | `src/blocks/layout/top-bar.tsx` | 상단 바 (로고 + 프로필 + 테마 토글) |
| 5 | `src/blocks/layout/bottom-nav.tsx` | 모바일 하단 탭 (md:hidden), NAV_ITEMS.map() |
| 6 | `src/blocks/layout/sidebar-nav.tsx` | 데스크탑 접이식 사이드바 (hidden md:flex), NAV_ITEMS.map() |
| 7 | `src/blocks/layout/app-layout.tsx` | stub → 실구현 교체 |
| 8 | `src/index.css` | `#root` 고정 max-width 제거, 반응형으로 교체 |

### 테마 토글 동작
- `useThemeStore` state: `'light' | 'dark' | 'auto'`
- auto: 06:00 일출 / 19:00 일몰 기준 단순 시간 판단
- `resolvedTheme` 변경 시 `document.documentElement.setAttribute('data-theme', resolvedTheme)`
- `next-themes`는 이미 설치됨 — 사용 여부는 Step 4 시 결정

---

## ⬜ Step 5 — 공통 Blocks ← 다음 작업

### 컴포넌트 설계
- **`crowd-badge.tsx`**: `{ level: 'low'|'mid'|'high', className? }` — shadcn Badge + dot, `bg/text-crowd-*` 클래스, 라벨은 `common.crowd_*` i18n 키
- **`loading-skeleton.tsx`**: shadcn Skeleton 기반, `variant: 'card'|'list'` + `count` prop으로 분기
- **`error-boundary.tsx`**: class component (`componentDidCatch` 필요), fallback UI(아이콘+제목+설명+재시도 버튼), `children`/`fallback` prop. `AppLayout`의 `<Outlet />`을 감싸 페이지 런타임 에러 대응

### i18n 추가 (`common` 네임스페이스, 4개 언어)
```json
"common": {
  "crowd_low": "...", "crowd_mid": "...", "crowd_high": "...",
  "error_title": "...", "error_desc": "...", "retry_btn": "..."
}
```

### 생성 파일 순서
| # | 파일 | 내용 |
|---|------|------|
| 1 | `src/messages/*.json` | `common` 네임스페이스 추가 (ko/en/ja/zh) |
| 2 | `src/blocks/common/crowd-badge.tsx` | 혼잡도 뱃지 |
| 3 | `src/blocks/common/loading-skeleton.tsx` | 로딩 skeleton |
| 4 | `src/blocks/common/error-boundary.tsx` | 에러 바운더리 |
| 5 | `src/blocks/layout/app-layout.tsx` | ErrorBoundary로 Outlet 래핑 (수정) |

---

## ✅ Step 6b — LandingPage 홈피드 추가 (hslee 브랜치 기준 재수정, 완료)

### 배경
`origin/hslee` 브랜치(main보다 150+ 커밋 앞선 완성 버전) 조사 결과, LandingPage에 "홈 피드"(실시간 서울 피드 — TourAPI 카드형 추천)가 트렌딩 키워드와 별개로 존재함을 확인. main 기준으로 빠뜨렸던 기능.

### 확정 사항
| 항목 | 결정 |
|------|------|
| 하단탭/사이드바 5탭 구조(Map/Analyze/Persona/Route/Radar) | **유지** — hslee의 "Route→/persona" 통합 구조로 되돌리지 않음 |
| Profile 위치(TopBar 아바타) | **유지** |
| 페이지별 도움말(page-help-store+Dialog) | **유지** — hslee의 TutorialButton 스타일로 교체 안 함 |
| 홈피드 | **지금 추가** — mock 데이터로 구현, TourAPI 연동은 Step 13 |
| 적용 범위 | hslee의 풀스펙(페르소나 맞춤 배너/저장 영속성/에러폴백)은 제외, 카드+스토리+필터+기본 인터랙션만 |

### 신규 타입 (Step 7 MapPage와 공유)
- `src/types/place.ts` — `Place`, `CrowdLevel`(기존 crowd-badge와 동일), `PlaceCategory`

### 생성/수정 파일
| # | 파일 | 내용 |
|---|------|------|
| 1 | `src/types/place.ts` | Place 타입 (Step 7에서도 재사용) |
| 2 | `src/blocks/common/place-card.tsx` | 이미지+CrowdBadge(Step5 재사용)+하트저장+이름/주소/거리+지도열기 버튼 |
| 3 | `src/blocks/landing/home-feed.data.ts` | mock 장소 6개 + STORY_TOPICS(kpop/streetFood/photoSpots/nature/shopping) 설정 |
| 4 | `src/blocks/landing/home-feed.tsx` | 헤더(eyebrow+title+새로고침) + 스토리 아이콘 행 + 카테고리 필터 탭 + 카드 가로스크롤 + 로딩/empty 상태 |
| 5 | `src/pages/LandingPage.tsx` (수정) | TopBar 다음에 HomeFeed 추가 (TrendingKeywords 위) |
| 6 | `src/messages/*.json` | `homeFeed` 네임스페이스 추가, `map.filter_food` 키 신규 추가(원본에 누락되어 있던 것 발견) |

### 카테고리 매핑 (기존 `map.filter_*` 키 재사용)
| 필터 탭 | 키 | 스토리 매핑 |
|---------|-----|------------|
| 전체 | `map.filter_all` | - |
| 문화 | `map.filter_culture` | nature |
| 음식 | `map.filter_food`(신규) | streetFood |
| 체험 | `map.filter_fun` | kpop, shopping |
| 사진 | `map.filter_photo` | photoSpots |

### 범위 외(추후 처리)
- 저장(하트) 영속성 → Step 14 Zustand store
- 실제 TourAPI 연동/캐시/에러폴백 → Step 13
- 페르소나 맞춤 배너 → Step 9 PersonaPage 완료 후 연결 가능해짐

### 구현 시 확정된 패턴 (이후 Step에도 적용)
- **mock 데이터는 `async function fetch*()`로 감싸기** (`home-feed.data.ts`, `trending-keywords.data.ts`) + 컴포넌트에서 `useQuery`로 호출 → Step 13에서 함수 내부만 실제 API 호출로 교체하면 끝, 컴포넌트는 변경 불필요
- **base-ui Button을 `render={<Link .../>}`로 다른 엘리먼트로 교체할 때는 `nativeButton={false}` 필수** — 안 그러면 콘솔에 접근성 경고 발생 (실제 버그는 아니지만 매번 누락하기 쉬움)
- Playwright로 토글성 상태(저장/해제 등) 검증할 때, `aria-label` 값 자체로 셀렉터를 잡으면 클릭 후 그 값이 바뀌어 셀렉터가 어긋남 → `article`/컨테이너 기준으로 안정적인 참조를 먼저 잡고 그 안에서 버튼을 찾을 것
- **스와이프/드래그 제스처는 `touchstart/touchend` 대신 Pointer Events 사용** (`onPointerDown`/`onPointerUp`) — 마우스 드래그로도 테스트 가능해지고 실제 터치에도 동일하게 동작. **`onPointerDown`에서 반드시 `e.currentTarget.setPointerCapture(e.pointerId)` 호출** — 안 하면 드래그가 시작 엘리먼트 밖으로 나갔을 때 pointerup이 다른 엘리먼트에서 발생해 핸들러가 누락됨 (Step7에서 실제로 겪은 버그)
- 반응형 분기를 CSS(`md:`)만으로 표현하기 어려운 경우(JS 레벨에서 분기 필요) `src/lib/use-media-query.ts`의 `useMediaQuery(query)` 재사용
- **페이지에서 `h-[calc(100dvh-...)]` 같은 고정 높이를 쓸 때는 AppLayout의 모든 형제 요소를 빠짐없이 빼야 함** — TopBar(`3.5rem`)뿐 아니라 모바일의 BottomNav(`4rem`, `md:hidden`)도 차감 필요. 하나라도 빠지면 `<main>`(`overflow-y-auto`)이 다시 스크롤되면서 하단 요소가 BottomNav에 가려 보임 (MapPage에서 실제로 겪은 버그) → 모바일/데스크탑 높이를 다르게 줘야 함: `h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-3.5rem)]`

---

## ✅ Step 6c — LandingPage 반응형 재작업 (완료)

### 문제
AppLayout(TopBar/Sidebar/BottomNav)은 `md:` 분기로 반응형 적용됐지만, LandingPage의 콘텐츠(HomeFeed, TrendingKeywords, Explore CTA)는 데스크탑에서도 모바일과 동일한 `max-w-sm` 고정폭 + 가로스크롤 구조라 데스크탑 화면에서 모바일 UI가 그대로 떠 있는 것처럼 보였음.

### 적용한 변경
| 파일 | 변경 |
|------|------|
| `src/pages/LandingPage.tsx` | `<main>`: `max-w-sm` → `md:max-w-5xl` |
| `src/blocks/landing/home-feed.tsx` | 스토리행 `md:grid-cols-5`, 필터행 `md:flex-wrap`, 카드행 `md:grid-cols-4` — 전부 `md:overflow-visible`로 스크롤 해제 |
| `src/blocks/common/place-card.tsx` 사용처 | `w-64 shrink-0` → `md:w-full md:shrink` (그리드 칸에 맞춤) |
| `src/blocks/common/loading-skeleton.tsx` | `itemClassName` prop 신규 추가 — 로딩 스켈레톤도 실제 카드와 동일 크기로 표시되도록 |
| `src/blocks/landing/trending-keywords.tsx` | 자체 `max-w-sm` 제거 |

### 패턴 확정 (이후 가로스크롤 섹션 만들 때 재사용)
```
모바일: -mx-5 flex gap-3 overflow-x-auto px-5   (각 아이템: w-64 shrink-0)
데스크탑: md:mx-0 md:grid md:grid-cols-N md:gap-4 md:overflow-visible md:px-0  (각 아이템: md:w-full md:shrink)
```

### 검증
Playwright로 모바일(390px)/데스크탑(1440px) 스크린샷 비교 — 데스크탑에서 스토리 5개 한 줄/카테고리 줄바꿈/카드 4열 그리드, 스크롤 없이 전부 표시. 콘솔 에러 없음.

### 추가 요청 처리 (사용자 후속 요청)
1. **사이드바/하단바 추가**: LandingPage가 AppLayout 없이 standalone이라 Sidebar/BottomNav가 전혀 없었음 — `BottomNav`는 원래대로 모바일에서만, `SidebarNav`는 데스크탑에서만 보이도록 LandingPage.tsx에 직접 추가(AppLayout과 동일 구조). 둘 다 자체 `md:` 분기가 있어 동시에 뜨지 않음
2. **Explore CTA 위치**: 데스크탑에서는 본문 상단 우측(subtitle과 같은 줄)으로 이동, 기존 하단 버튼은 `md:hidden`. 모바일은 변경 없음(하단 버튼 유지)
   - 이 과정에서 그동안 미사용이던 `landing.subtitle` 키를 데스크탑 상단 타이틀 텍스트로 재활용함

---

## ✅ Step 6 — LandingPage 단순화 + TopBar 패치 (완료)

### 배경
원본 LandingPage(`k-vibe-tracker/app/[locale]/page.tsx`)가 정보과밀(언어버튼+히어로+기능뱃지+트렌딩+CTA 2개+안내문)이라 단순화 결정.
원본 소스 확인 완료: `page.tsx`, `components/layout/TopBar.tsx`, `components/layout/BottomNav.tsx`, `components/common/LanguageSwitcher.tsx`, `components/auth/LoginModal.tsx`

### 확정 사항 (원본 요소별 처리)
| 원본 요소 | 처리 |
|-----------|------|
| 상단 언어 전환 4버튼 (인라인) | **삭제** — TopBar 드롭다운으로 통일 |
| 히어로 (로고+타이틀+subtitle) | **삭제** |
| Feature 뱃지 5개(Map/Analyze/My Route/AI Docent/Radar) | **삭제** — 하단 메뉴(BottomNav/SidebarNav)와 중복. BottomNav/SidebarNav의 NAV_ITEMS는 변경 없음 |
| 트렌딩 키워드("실시간 서울피드"/"인기 프롬프트") | **유지** |
| 하단 큰 로그인 버튼 | **삭제** — TopBar 프로필/로그인과 중복 |
| guest_notice 문구 | **Step 12 ProfilePage로 이동** (Landing에서 제거) |
| "K-Vibe 둘러보기" CTA | **유지**, `/map`으로 이동 (원본 `handleStart()`와 동일, 유효성 확인됨) |
| LandingPage의 TopBar 노출 | **동일 TopBar 그대로 렌더링** (AppLayout 없이 standalone). 사이드바 토글 버튼은 사이드바가 없어 시각적으로만 존재 — 허용 |

### 신규 기능 — 페이지별 도움말 버튼
"?" 플로팅 버튼은 Next.js 자체 dev 인디케이터였음(실제 앱 기능 아님, 확인 완료). 대신 **새 기능으로 페이지별 도움말 버튼**을 TopBar에 추가하기로 결정.

- `src/store/page-help-store.ts` — `title`/`body` 상태 + `setHelp()`/`clearHelp()` (Zustand)
- `src/blocks/layout/help-button.tsx` — TopBar의 HelpCircle 아이콘 → Dialog로 title/body 표시. **콘텐츠 없으면 버튼 자체 숨김**
- 각 페이지는 마운트 시 `useEffect`에서 `setHelp(t('xxx.help_title'), t('xxx.help_body'))` 호출, unmount 시 `clearHelp()` — Step 7~12에서 페이지 만들 때마다 한 줄씩 추가 (TopBar 코드 재수정 불필요)
- Step 6에서는 LandingPage 몫만 등록 (`landing.help_title`/`help_body`)

### 생성/수정 파일
| # | 파일 | 내용 |
|---|------|------|
| 1 | `src/store/page-help-store.ts` | 도움말 콘텐츠 상태 |
| 2 | `src/blocks/layout/help-button.tsx` | TopBar 도움말 버튼+Dialog |
| 3 | `src/blocks/layout/language-dropdown.tsx` | TopBar용 Globe 아이콘 드롭다운. `useLocation`+`useNavigate`로 경로 세그먼트[1] 교체(`/ko/map`→`/en/map`) |
| 4 | `src/blocks/layout/top-bar.tsx` (수정) | LanguageDropdown + HelpButton 추가 |
| 5 | `src/blocks/landing/trending-keywords.tsx` | 하드코딩 키워드 5개 유지, "🔥 trending_now" 라벨 i18n |
| 6 | `src/pages/LandingPage.tsx` | TopBar(standalone) + ErrorBoundary + TrendingKeywords + Explore CTA만 남김, 도움말 등록 |
| 7 | `src/messages/*.json` | `landing.help_title`/`help_body` 4개 언어 추가 |

### 제외(불필요 판정)
- `language-switcher.tsx`(랜딩 전용 4버튼) — TopBar 드롭다운으로 대체되어 불필요
- `feature-badge-list.tsx` — 하단 메뉴 중복으로 완전 삭제, TopBar 이동도 안 함

---

## ✅ Step 7 — MapPage (완료)

### 원본 확인 완료
`origin/hslee`의 `app/[locale]/map/page.tsx`(646줄) + `components/map/CategoryFilter.tsx`(77줄) + `PlaceDetailModal.tsx`(499줄) + `KakaoMapView.tsx`(303줄) 전부 확인.

### 기능 요구사항 6개 — 계획 매핑 확인됨
| # | 요구사항 | 담당 파일 |
|---|----------|-----------|
| 1 | TourAPI로 현위치 기반 추천 장소 가져오기 | `map-page.data.ts`의 `fetchMapPlaces()` — **지금은 mock, 실제 연동은 Step13**(백엔드 경유, 프론트가 TourAPI 키 직접 호출 안 함) |
| 2 | 추천 장소를 카테고리별 분류 | mock 장소에 category 필드(cafe/photo/fun/culture/food/stay/all) |
| 3 | 카테고리 클릭 시 필터 적용 | `category-filter.tsx` 다중선택 → 목록/지도 동시 필터링 |
| 4 | 위치기반 추천장소 지도 표시 | `map-canvas.tsx` — 좌표 기반 핀으로 표시 |
| 5 | 장소 클릭 시 팝업 상세 안내 | `place-detail-sheet.tsx` (shadcn Sheet) |
| 6 | 루트 추가 버튼 → 개인 route 반영(Step10 연동) | `route-draft.ts` (localStorage), Step10이 읽을 키 미리 맞춤 |

### 구조 (데스크탑 분할 / 모바일 스택)
| 영역 | 모바일 | 데스크탑 |
|------|--------|----------|
| 지도 | 상단 (flex-1) | 좌측 (`grid-cols-[1fr_380px]`) |
| 검색+필터+목록 | 하단(`max-h-60` 스크롤) | 우측 패널(전체 높이 스크롤) |

### 지도 영역 — 단계별 구현 방식 (중요)
| 단계 | 좌표 처리 방식 | 비고 |
|------|---------------|------|
| **지금 (Step 7)** | **퍼센트 좌표 기반 핀 미리보기** — hslee `pinPosition()` 함수처럼 lat/lng를 화면상 %(left/top)로 환산해 배치. mock 데이터로 UI/인터랙션(클릭→상세시트, 필터 연동)만 검증 | 실제 지도 타일 없음, 배경색+핀만 |
| **이후 (Step 13, API 연동 후)** | **실제 Kakao Maps SDK로 교체** — `VITE_KAKAO_MAP_KEY` 발급되면 위도/경도를 실제 지도 좌표계에 직접 매핑(Kakao `LatLng`+`CustomOverlay`). 퍼센트 계산 방식 폐기 | 핀 클릭→상세시트 연동 로직은 그대로 재사용, 좌표→화면 변환 로직만 교체 |

### 추가 확정 사항
| 항목 | 결정 |
|------|------|
| 브라우저 위치 | **지금 실제 구현** (`navigator.geolocation`, 실패 시 서울 좌표 폴백) — 백엔드 불필요한 순수 브라우저 API |
| 카테고리 | 7개로 확장: all/cafe/photo/fun/culture/food/**stay**(신규) — hslee 기준 |
| 장소 상세 시트 | 간소화: 이미지 갤러리/seen-in 통계/도슨트 버튼/TourAPI 실시간 fetch는 제외. 저장·루트추가·공유만 |
| Toast 시스템 | sonner `<Toaster />` 처음 마운트 (지금까지 미설치) — `next-themes` 의존 코드라 `theme` prop을 우리 `useThemeStore`로 직접 오버라이드 |
| 가로스크롤 스크롤바 | **숨김 처리** — `.scrollbar-hide` 유틸리티를 `index.css`에 추가하고, 기존 home-feed.tsx의 가로스크롤 3곳 + 이번 신규 category-filter에 전부 적용 |

### 생성/수정 파일
| # | 파일 | 내용 |
|---|------|------|
| 1 | `src/types/place.ts` (수정) | `PlaceCategory`에 `'stay'` 추가 |
| 2 | `src/lib/route-draft.ts` | `addStopToRouteDraft()`/`readRouteDraft()` — localStorage(`k-vibe-current-route`, hslee와 동일 키) |
| 3 | `src/blocks/common/app-toaster.tsx` | sonner Toaster, `theme={resolvedTheme}` 직접 전달 |
| 4 | `src/main.tsx` (수정) | `<AppToaster />` 마운트 |
| 5 | `src/index.css` (수정) | `.scrollbar-hide` 유틸리티 추가 |
| 6 | `src/blocks/landing/home-feed.tsx` (수정) | 가로스크롤 3곳에 `scrollbar-hide` 클래스 적용 |
| 7 | `src/blocks/map/category-filter.tsx` | 다중선택 카테고리 pills (7개, 가로 스크롤+숨김) |
| 8 | `src/blocks/map/map-canvas.tsx` | 배경 + `pinPosition()` 퍼센트 좌표 핀(현재 단계 한정, 위 표 참고), 현위치/분석 바로가기 플로팅 버튼 |
| 9 | `src/blocks/map/place-detail-sheet.tsx` | shadcn Sheet — 저장/루트추가/공유 |
| 10 | `src/blocks/map/map-page.data.ts` | mock 장소(홈피드 6개 + cafe/stay 추가) + `fetchMapPlaces()` |
| 11 | `src/pages/MapPage.tsx` | 검색+필터+목록+지도+위치요청+도움말 등록, 데스크탑/모바일 분기 |
| 12 | `src/messages/*.json` | `map.filter_stay`/`search_placeholder`/`nearby_spots`/`no_places`/`current_location`/`seoul_fallback`/`location_unavailable`/`refresh_location`/`open_analyzer`/`help_title`/`help_body`, `placeDetail.*`(add_to_route/added_to_route/share/share_copied/close) 4개 언어 — `common.save/unsave`, `common.crowd_*`는 기존 키 재사용 |

### 적용할 기존 패턴 (재확인)
- mock 데이터는 `async function fetch*()` + `useQuery` (Step 6b 패턴)
- 가로스크롤 목록/필터는 모바일 `overflow-x-auto scrollbar-hide` / 데스크탑 `md:flex-wrap` or `md:grid` (Step 6c 패턴 + 스크롤바 숨김)
- `<Button render={<Link/>}>`는 `nativeButton={false}` 필수
- Playwright로 모바일/데스크탑 둘 다 검증 후 완료 보고, 임시 파일 정리

## ✅ Step 8 — AnalyzePage (완료)

### 페이지 컨셉 (확정)
SNS(유튜브 등)에서 거론/노출된 장소를 찾는 페이지. URL 입력 → "분석"은 **백엔드가 영상/이미지를 실제로 분석**해서 장소 후보+신뢰도(confidence)를 응답으로 줄 예정(Step13). 지금은 mock으로 그 응답 형태만 흉내냄. 결과 장소는 지도 연동 + 루트 추가 가능.

### 원본 확인 완료
`origin/hslee`의 `app/[locale]/analyze/page.tsx`(534줄) + `lib/analysis.ts`(4개 언어 mock 분석 데이터, AnalysisResult/AnalysisPlace 타입) + `lib/youtube.ts`(detectSnsPlatform 등) 검토.

### 확정 사항
| 항목 | 결정 |
|------|------|
| 분석 트리거 | `useMutation`(클릭 액션이라 `useQuery`보다 적합) |
| mock 데이터 | hslee `lib/analysis.ts`의 4개 언어 mock 그대로 포팅 (성수 카페거리/경복궁/광장시장, confidence 0.92/0.87/0.78) |
| 로딩 애니메이션 | **"진짜 진행률 아닌 perceived progress"** — 타이머로 단계 진행, 마지막 단계에서 캡(cap)되어 멈춤. 실제 응답 시간과 무관하게 동작 → Step13 연동 시 `analyze.data.ts`의 `fetchAnalysis()` 내부만 교체하면 끝, 로딩 컴포넌트는 안 건드림. **코드에 주석으로 "서버가 실제 status를 내려주면 `currentStep` prop으로 받는 방식으로 교체 가능"이라고 대비 표시해둠** (실제 구현은 안 함) |
| Map 연동 방식 | **router state**(`navigate('../map', { state: {...} })`) — 일회성, 새로고침/다른 탭 이동 시 초기화됨. 의도적 결정(영속성 불필요하다고 판단한 이유: 분석→지도 1회성 안내이고, 지도 자체가 마지막 위치를 기억하는 건 별개 기능) |
| 루트 일괄 저장 | `route-draft.ts`에 `setRouteDraft(stops[])` 추가 완료 — 분석 결과 전체를 한 번에 저장(기존 `addStopToRouteDraft`는 1개씩 추가용) |
| 아이콘 이슈 발견 | 설치된 `lucide-react`(v1.21)에 브랜드 아이콘 없음(`Youtube`/`Instagram` export 안 됨) → `Video`/`Camera`로 대체 완료. 다른 Step에서도 브랜드 아이콘 필요하면 이 제약 기억할 것 |

### 완료된 파일
- [x] `src/lib/youtube.ts` (수정) — `SnsPlatform`, `detectSnsPlatform()`, `isInstagramUrl()`, `isHost()` 추가 (hslee와 동일)
- [x] `src/lib/route-draft.ts` (수정) — `setRouteDraft(stops[])` 추가, `RouteStop`에 `description?`/`tags?` 추가
- [x] `src/blocks/analyze/analyze.data.ts` — `AnalysisResult`/`AnalysisPlace` 타입, `fetchAnalysis(videoId, locale)` (4개 언어 mock, 2.2초 지연)
- [x] `src/blocks/analyze/url-input-card.tsx` — URL입력+플랫폼감지+썸네일+분석버튼+예시URL (아이콘 이슈 수정 완료, 빌드 통과)
- [x] `src/blocks/analyze/analysis-loading.tsx` — 단계별 로딩 애니메이션 (perceived progress, 주석 처리 완료)

### ✅ 완료 내역 (위 미완료 항목들 전부 마감)
1. `analysis-result-list.tsx` 재작성 완료
2. `AnalyzePage.tsx` — `useMutation` 조립 완료
3. MapPage `location.state` 수신 — `MapFocusState` 타입 export, 일회성 핸드오프로 동작 확인
4. `analyze` 네임스페이스 4개 언어 전면 교체 완료 (hslee 원문 포팅, `{{count}}` 보간 문법 적용)
5. Playwright 검증 완료 (위 Execution Progress 항목 참고)

### 추가로 발견·수정한 것 (계획에 없었음)
- **nav_title 분리**: `analyze.title`이 하단탭 라벨도 같이 쓰여서 모바일에서 "SNS Spot Analyzer"가 2줄로 줄바꿈됨 → `analyze.nav_title`("SNS Analyzer") 신규 분리, `persona.nav_title`과 동일 패턴
- **존재하지 않는 커스텀 색상 토큰 재사용 버그**: Step6 zinc테마 단순화 때 지운 `--color-k-purple` 등을 코드에서 계속 참조 → 빌드는 통과하지만 색이 안 먹음(타입 체크가 임의 문자열 클래스를 못 잡아냄). `bg-accent`/`text-primary` 같은 표준 토큰으로 교체. **교훈**: 새 색상 클래스 쓸 때 `index.css`에 실제로 정의돼 있는지 확인할 것
- **lucide-react 브랜드 아이콘 부재**: 설치된 버전(v1.21)에 `Youtube`/`Instagram` export 없음 → `Video`/`Camera`로 대체. 다음에 브랜드 아이콘 필요하면 미리 확인할 것

## ✅ Step 9 — PersonaPage (완료)

### 컨셉 정정 (중요)
기존에 messages/*.json에 미리 넣어둔 `step2_desc: "무드 다중선택"`/`step3: "활동 다중선택"`는 hslee 실제 구현과 다름 — **전부 폐기하고 다시 작성**. `origin/hslee`의 실제 위저드:
- **Step 1**: 테마 6개 중 1개 선택(K-pop/K-drama/Mood/Foodie/Creator/History) + 시작시간 입력(`<input type="time">`, 기본 10:00)
- **Step 2**: 그 테마의 디테일 4개 중 **단일** 선택(다중선택 아님)
- **Step 3**: 확인 화면(선택 요약) → "Generate Route" 버튼. 같은 페이지에서 생성 결과를 인라인으로 바로 보여줌(별도 페이지 이동 없음)

**핵심: 디테일 선택은 실제 스팟 구성에 영향 없음.** 테마당 정확히 고정된 4개 스팟(`ROUTE_TEMPLATES`, 6테마×4=24개, 좌표/체류시간 전부 하드코딩)을 그대로 반환하는 **순수 룩업 테이블**이며, 디테일은 제목/설명 문구에만 영향. hslee 주석에도 "deterministic while paid AI is approval-gated"라고 명시 — Step 8 mock 분석과 동일한 맥락(자리 비워두고 Step13에서 실제 백엔드로 교체).

### 알고리즘 (hslee `lib/routes.ts` 기준, 그대로 포팅)
1. 테마의 고정 4스팟 배열을 가져옴
2. 사용자가 고른 시작시간(분 단위로 파싱)부터 시작
3. 스팟 n과 n+1 사이: `haversineKm`로 거리 계산 → `walkingMinutes`(4km/h 기준, 이미 `src/lib/haversine.ts`에 둘 다 구현되어 있음 — 재사용)로 도보시간 산출 → 누적 cursor에 더해 다음 스팟의 `startTime` 결정, 그 스팟의 `stayMinutes`만큼 cursor 추가 진행
4. `walkingMinutes` 총합 + `stayMinutes` 총합 = `totalMinutes`
5. `formatDuration`/`parseStartTime`/`formatClock` 등 작은 헬퍼는 hslee에 있는 그대로 신규 포팅 필요(우리 lib에 아직 없음)

### 확정된 설계 결정 (대화로 합의됨)
| 항목 | 결정 |
|------|------|
| Persona ↔ Route 관계 | **분리.** Route는 Map(Step7)/Analyze(Step8)/Persona(Step9) 세 군데서 같은 `k-vibe-current-route` 바스켓에 누적하는 공유 기능. Persona는 플랜 생성+미리보기만 하고 "Edit Route" 클릭 시 `setRouteDraft(plan.stops)`로 넘기고 끝. 합치면 출처를 섞어 조합하는 게(지도에서 발견한 곳 + 분석한 곳 + 페르소나 추천 곳) 불가능해지므로 분리가 맞음 |
| route-draft.ts 스키마 | **단순 `RouteStop[]` 유지.** 여러 출처가 섞이는 바스켓이라 플랜 단위 title/summary를 영속화하는 게 의미 없음(섞이면 낡은 제목이 됨). `RouteStop`에 `stayMinutes?`/`startTime?`만 옵션으로 추가(Persona가 만드는 스팟에 필요) |
| 위저드 상태 영속화 | **저장 안 함**(hslee 기본값). 다른 탭 갔다 오면 선택 초기화. 위저드는 한 호흡에 끝나는 짧은 플로우라 손실 영향 작다고 판단 |
| 피드 개인화 | **포함**, hslee 방식 그대로. 홈에 "Personalized for {persona}" 칩이 뜨고 탭하면 기존 HomeFeed 카테고리 필터가 적용됨(자동 적용 아님, 탭해야 적용 — 깜짝 변화 없음). 새 UI 섹션을 안 만들고 기존 카테고리 필터를 재사용하는 게 더 적은 코드로 더 적은 혼란 — `<TrendingKeywords/>` 밑에 별도 리스트를 추가하면 같은 데이터가 두 곳에 중복 노출되는 혼란이 생김 |

### 파일 구조 (MapPage가 비대해졌던 교훈 반영, 처음부터 블록 분리)
```
src/blocks/persona/
  persona.data.ts        — ROUTE_THEME_OPTIONS(6테마×4디테일) + ROUTE_TEMPLATES(24스팟, hslee 데이터 그대로) +
                            parseStartTime/formatClock/formatDuration + fetchRoutePlan() (Step13 교체 지점, useMutation으로 호출)
  theme-step.tsx          — Step1: 시작시간 입력 + 테마 카드 6개(뱃지+라벨+설명+화살표)
  detail-step.tsx         — Step2: 뒤로가기 + 디테일 카드 2열 그리드 4개(선택 시 강조)
  confirm-step.tsx        — Step3: 선택 요약(테마/디테일/시작시간) + "선택 조정" + "피드에 반영" 버튼
  route-result.tsx        — 생성 후 인라인 결과: Stops/Walking/Total 통계 3칸 + 스팟 타임라인(번호+CrowdBadge 재사용+주소+설명+시작시간+체류시간) + "루트 편집"/"공유" 버튼 + "다른 루트 만들기"(리셋) 아이콘버튼
src/pages/PersonaPage.tsx — step(1|2|3) 상태 + theme/detail/startTime 로컬 state + useMutation(fetchRoutePlan) + 결과 있으면 route-result만 렌더, 없으면 스텝인디케이터+해당 step 컴포넌트+하단 단계별 CTA(다음/Generate) 조립. 도움말 등록
src/lib/route-draft.ts    — RouteStop에 stayMinutes?/startTime? 옵션 필드만 추가(기존 함수 시그니처 변경 없음)
src/lib/persona-preference.ts — (신규) {theme, detail} 저장/조회 + 테마/디테일→홈피드 카테고리 매핑(hslee `getPersonaFeedCategory` 포팅)
```

### 홈피드 연동 (피드 개인화, 별도 마지막 단계)
- `src/pages/LandingPage.tsx` 또는 `home-feed.tsx`에 "Personalized for {persona}" 칩 추가 — `persona-preference.ts`에 저장된 값이 있으면 노출
- 탭하면 home-feed의 기존 카테고리 필터 state에 매핑된 카테고리를 설정(새 데이터/새 리스트 없음, 기존 필터 재사용)

### i18n (가장 큰 작업 — messages/*.json `persona` 네임스페이스 전면 재작성)
기존 `step1_title`/`step2_desc` 등 전부 폐기. hslee `lib/ui-copy.ts`의 `persona.*` 블록(영문 확인 완료, 4개 언어 전부 존재)을 우리 snake_case 키 네이밍 + `{{}}` 보간 스타일로 포팅:
- 위저드 크롬: `generator_eyebrow`/`title`/`subtitle`/`start_time`/`back_to_themes`/`back_to_details`/`choose_detail`/`review_selection`/`confirm_eyebrow`/`confirm_title`/`confirm_body`/`selected_theme`/`selected_detail`/`selected_start`/`adjust_selection`/`personalize_feed`/`generating`/`generate`
- 결과 화면: `preview_eyebrow`/`create_another`/`stops`/`walking`/`total`/`edit_route`/`share`/`shared`/`copied`/`share_unavailable`/`route_generated`/`route_saved`/`route_save_unavailable`/`persona_saved`/`persona_save_unavailable`
- 테마 데이터: `themes.{kpop|drama|mood|foodie|creator|history}.label`/`.description`/`.details.{id}.label`/`.description` — 6×(2+4×2)=36개 문자열 ×4언어
- `route_title_template`("{{detail}} Seoul Route")/`route_summary_template` — `{{}}` 보간으로 변환

### 의도적으로 범위 제외 (Step 10/이후로 미룸)
`calculateRouteLegs`/`encodeRoutePlanForShare`/`decodeRoutePlanFromShare`/`buildGoogleMapsDirectionsUrl`/`buildRouteMapUrl`/`buildRouteStopDetailUrl`/`RouteProgressState` — 전부 `/route` 편집 페이지(Step 10)의 관심사. Persona는 플랜 생성+미리보기+"Edit Route" 핸드오프까지만.

### 검증 계획
- 데스크탑/모바일 Playwright: 테마 선택→디테일 선택(단일, 미선택 시 다음 비활성)→확인 화면 요약 일치→Generate→로딩 스피너→결과(통계 3칸 수치, 스팟 4개 타임라인, startTime 순차 증가 확인)
- "루트 편집" 클릭 → `localStorage('k-vibe-current-route')`에 stops 배열 정확히 저장 + `/route`로 이동 확인
- "공유" 클릭 → `navigator.clipboard` fallback 호출 확인(headless엔 navigator.share 없음)
- "피드에 반영" → 홈 이동 + localStorage 저장 확인. 칩 탭 → HomeFeed 카테고리 필터 적용 확인
- "다른 루트 만들기" 리셋 버튼 → step 1로 복귀, 선택 초기화 확인
- 콘솔 에러 없음, 4개 언어 키 누락 없음

### ✅ Step 9 핵심 구현 — 완료 (위저드+루트결과+피드개인화 전부 Playwright 검증됨)
- 데이터/lib: `lib/route-timing.ts`(스케줄링), `blocks/persona/persona.data.ts`(24스팟 목업, hslee 그대로 영어 유지), `types/route-theme.ts`(테마/디테일 분류), `lib/route-draft.ts`(`stayMinutes?`/`startTime?` 추가 + `addStopsToRouteDraft` 다중병합 신규, `setRouteDraft` 전체교체는 제거), `lib/persona-preference.ts`(위저드선택→홈피드 카테고리 매핑)
- UI: `theme-step`/`detail-step`/`confirm-step`/`route-result.tsx` + `PersonaPage.tsx` 조립. 버튼은 "루트에 추가"(병합, `/route`로 이동)+"공유"(navigator.share/clipboard fallback) 2개로 확정(전체초기화 버튼은 위험해서 빼고 Step10으로 미룸)
- 홈피드 개인화: `persona-chip.tsx` 신규, `home-feed.tsx`에 `forceCategory`(nonce 포함, 같은 카테고리 재탭해도 항상 재적용되도록) prop 추가, LandingPage가 `readPersonaPreference()`로 칩 노출 + 탭 시 매핑된 카테고리 적용
- i18n: `persona` 네임스페이스 전면 재작성(4개 언어, hslee `ui-copy.ts` 원문 포팅), `landing.personalized_for` 신규
- 발견한 순환참조 버그(이미 수정됨): `route_summary_template`의 `{{duration}}`은 스팟 스케줄링이 끝나야 나오는 값인데, 처음에 `fetchRoutePlan(theme, startTime, title, summary)`로 title/summary를 "입력값"으로 받게 잘못 설계함 → `persona.data.ts`/`route-timing.ts`를 "스케줄링만" 담당(`fetchScheduledRoute`)으로 분리하고, title/summary는 PersonaPage가 스케줄링 결과(duration)를 받은 뒤 조립하도록 순서 수정. 전체 코드베이스에 같은 패턴이 더 있는지 점검 완료(`{{}}` 보간 4개 전부 확인 — 나머지는 이미 완료된 데이터에서 값을 읽는 것이라 문제없음, `useMutation`도 AnalyzePage 1곳뿐이고 문제없음)

### ✅ Step 9 잔여 항목 — 완료
1. **`home-feed.tsx` 모바일 카드 가로스크롤 튀어나옴**: Playwright로 3개 행의 bounding box를 직접 재본 결과 컨테이너 좌표(`left`/`right`)는 3개 행 전부 완전히 동일(패딩 정렬 문제 아님) — 실제 원인은 카드 행만 콘텐츠가 실제로 넘쳐서(`scrollWidth` 1636px vs `clientWidth` 384px, 다른 두 행은 안 넘침) 마지막 카드가 하트 버튼까지 딱 중간에서 잘려 보이는 것. `src/index.css`에 `.scroll-fade-x` 유틸리티(우측 64px `mask-image` 그라디언트) 추가, `home-feed.tsx` 카드 행에만 적용(`md:mask-none`으로 데스크탑 그리드에서는 비활성화). 사용자가 우측 페이드 효과를 더 선호해 유지하기로 확정
2. **RouteResult 결과 화면의 리셋 버튼이 모호함**: 우상단 `RotateCcw` 아이콘 버튼이 "새로고침"인지 "초기화"인지 구분 안 됨 → `title=` 속성을 추가해봤으나 실제로는 데스크탑도 호버 유지 시간이 길어야 떴고, **모바일은 hover 자체가 없어서 원천적으로 안 뜸**(터치 디바이스의 근본적 한계) — 텍스트 라벨 추가/확인 다이얼로그 두 대안을 제시했으나 사용자가 "그냥 두자"로 결정, 현재 아이콘 전용 버튼 그대로 유지(추가한 `title=`은 해는 없으니 남겨둠)

## ⬜ Step 10 — RoutePage

### 컨셉 (대화로 확정 — hslee 단일 페이지보다 범위가 넓음)
Map/Analyze/Persona에서 모아온 스팟들로 **나만의 여행 일정을 구상하는 페이지**. Triple 앱의 여행 루트 계획 페이지 같은 느낌. hslee는 단일 날짜(시작시간만 있음)였지만, 우리는 **여러 날짜에 걸친 일정**을 지원하기로 확장:
- 드래그앤드롭으로 순서 변경
- 이동 버튼(위/아래) 클릭으로도 순서 변경 가능
- 각 스팟의 시작시간은 **기본적으로 이전 스팟과의 거리(도보시간)+체류시간으로 자동 누적 계산**
- 사용자가 특정 스팟의 **시각 또는 날짜를 직접 수정**할 수 있음 → 그 지점이 "고정점(anchor)"이 되어, 이후 스팟들은 그 수정된 값부터 다시 누적 계산을 이어감(시각만 바꿔도 날짜를 바꾼 것과 동일하게 anchor로 취급 — 대화로 확정)
- anchor의 날짜가 바로 앞 스팟의 날짜와 다르면 그 사이에 **"Day N · 6월 25일" 스타일의 날짜 구분선** 삽입(대화로 확정)
- 계산 중 자정을 넘기면 자동으로 다음 날짜로 넘어감(자연스러운 기본 동작으로 제안)

### 데이터 모델 확장
`src/lib/route-draft.ts`의 `RouteStop`에 필드 추가:
```ts
date?: string       // ISO "YYYY-MM-DD" — anchor일 때만 의미 있음(비anchor는 계산값을 렌더링 시점에 채움)
isAnchor?: boolean  // 사용자가 시각/날짜를 직접 수정했는지
```
(`startTime?`은 이미 있음). RoutePage가 재정렬/수정/삭제할 때마다 **전체 스케줄을 재계산**해서 각 스팟에 `date`/`startTime`을 채워 넣고, 그 전체 배열을 다시 저장. Step9에서 위험하다고 빼버린 "전체 교체" 함수(`setRouteDraft`)와는 다른 용도(다른 페이지가 와서 기존 걸 날리는 게 아니라, **편집기 자신이 자기가 보던 문서를 저장**하는 것)라 별도 이름으로 재도입 필요(`saveEditedRouteDraft()` 등, 네이밍은 구현 시 정함)

### 스케줄링 알고리즘
1. 스팟을 순서대로 순회
2. 첫 스팟이 anchor면 그 날짜/시각 사용, 아니면 기본값(오늘 날짜 + 10:00)
3. 이후 스팟이 anchor면 → 그 값 그대로 사용(고정점 갱신)
4. anchor가 아니면 → 이전 스팟의 (날짜+시각) + 이전 스팟 `stayMinutes`(없으면 기본 60분) + 두 스팟 간 `haversineKm`+`walkingMinutes` 도보시간을 누적해서 계산. 자정을 넘기면 날짜 +1
5. 렌더링 시 직전 스팟과 날짜가 다르면 그 앞에 날짜 구분선 삽입

### 확정된 결정 (그 외 대화로 합의)
| 항목 | 결정 |
|------|------|
| AI 도슨트 연동(`openDocent`, `/docent` 페이지) | **제외** — 로드맵(1~15스텝)에 도슨트 페이지 없음 |
| "샘플 스팟 추가" 버튼 | **제외** — hslee는 테스트용 더미고, 우리는 Map/Analyze/Persona 3곳에서 진짜 스팟 추가 가능 |
| 공유 시 base64 인코딩 URL(`?route=...`) | **포함** — 텍스트 공유만으론 받는 사람이 루트를 실제로 못 가져옴, URL이 진짜 전달 |
| 실시간 위치 기반 "다음 스팟과의 거리" 확인(GPS) | **포함** — `useCurrentLocation`/`haversineKm` 이미 있어서 추가 부담 적음 |
| 도보/대중교통 구간 구분(2.5km 임계값) | **포함 제안**(낮은 구현 비용, hslee 충실도, 거리 기반 추정이라 다른 목업 데이터와 일관) |

### 패키지 설치
`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` — `PointerSensor`+`TouchSensor`로 모바일 터치 드래그. 접근성 보조로 위/아래 버튼도 함께 유지(hslee도 드래그+버튼 둘 다 제공)

### 파일 구조
```
src/lib/route-schedule.ts   — 스케줄링 알고리즘(anchor 전파 + 날짜 롤오버), 날짜 구분선 삽입 위치 계산
src/lib/route-progress.ts   — completedStopIds 저장/조회 (localStorage `k-vibe-route-progress`, route-draft.ts와 동일 패턴)
src/lib/route-share.ts      — base64url 인코딩/디코딩(공유 URL), buildGoogleMapsDirectionsUrl/buildGoogleMapsPlaceUrl, calculateRouteLegs(도보/대중교통 구분)
src/blocks/route/route-mini-map.tsx     — hslee RouteMiniMap과 동일한 퍼센트좌표 SVG(그리드+점선 폴리라인+번호핀), 핀 탭 시 Google Maps 새창
src/blocks/route/day-divider.tsx        — "Day N · 6월 25일" 구분선
src/blocks/route/route-stop-card.tsx    — 드래그핸들+완료토글+위/아래+삭제+시각/날짜 편집(탭하면 인라인 편집)+"지도에서 보기"(내부, MapFocusState 재사용)+"Google Maps에서 열기"(외부), 다음 스팟까지의 구간(도보/대중교통) 표시
src/blocks/route/route-location-check.tsx — "현재 위치 확인" 카드(GPS 권한, 거리 계산, near/far 메시지)
src/pages/RoutePage.tsx     — readRouteDraft() 초기 로드 + dnd-kit 컨텍스트 + route-schedule로 재계산 + 완료상태 + 통계(Stops/Done/Walking/Total) + 미니맵 + 위치확인카드 + 하단 액션바(지도에서 전체보기/공유/초기화) + 날짜구분선 포함 스팟 리스트 + 빈 상태
```

### i18n
`route` 네임스페이스 전면 재작성(현재는 Step3~4 시절 단순 placeholder) — hslee `ui-copy.ts`의 `route.*` 블록(영문 확인 완료, 4개 언어 전부 존재) 베이스로 포팅 + 날짜구분선/시각편집 관련 신규 키 추가

### 의도적으로 범위 제외
`openDocent`/`/docent` 페이지 연동, "샘플 스팟 추가" 더미 버튼

### 검증 계획
- Playwright: 드래그/버튼으로 순서 변경 후 시간 재계산 확인, 특정 스팟 시각 수정 시 그 이후만 재계산되고 이전은 안 바뀌는지, 날짜를 다음날로 바꾸면 구분선이 정확한 위치에 생기는지, 자정 넘기는 케이스(도보시간 누적으로 24:00 초과) 자동 날짜 롤오버 확인, 삭제, 완료토글 후 새로고침해도 복원, 초기화(확인 다이얼로그), 미니맵 핀 클릭 시 Google Maps 새창, 공유(클립보드 텍스트+URL, URL 재오픈 시 같은 루트 복원), 위치확인(geolocation mock near/far), 빈 루트 상태, 데스크탑/모바일+4개 언어, 콘솔 에러 없음

---

## ✅ Step 10 후속 3 — RouteStopCard 모바일 재구조화 + 입력 버그 (완료)

### 1. RouteStopCard 모바일 가독성 재구조화 — 완료
- [x] 데스크탑 적용 범위 확인: 사용자가 **"데스크탑은 기존 1줄 레이아웃 유지, 모바일만 신규 구조"**로 확정 → `route-stop-card.tsx`에 모바일(`md:hidden`)/데스크탑(`hidden md:flex`) 두 분기를 완전히 분리해서 렌더링(액션버튼 4개 JSX는 `completeBtn`/`viewOnMapBtn`/`externalLinkBtn`/`removeBtn` 변수로 한 번만 정의해 양쪽에서 재사용 — `BottomNav`/`SidebarNav`와 동일한 "양쪽 다 렌더링+`md:`로 토글" 패턴)
- [x] 카드 패딩: 모바일 `px-3 py-4`, 데스크탑은 실제 렌더링 값(`px-2 py-3` — `getComputedStyle`로 직접 확인 후 동일 값으로 명시 고정, 기존 `p-2`+`py-3` 혼용으로 인한 모호성 제거)
- [x] 1층/2층 구조: 드래그핸들(좌측 고정, 카드 전체높이) → 우측 정보영역에 1층(액션버튼 4개, 우측정렬, 독립된 줄) + 2층(좌: 인덱스원, 우: 상단 제목+혼잡도뱃지 / 하단 카테고리·체류시간·시작시간 `text-xs text-muted-foreground`)
- [x] 메타 행(카테고리·체류시간·시작시간)에 `flex-nowrap whitespace-nowrap` 추가(모바일 쪽만 — 데스크탑은 "기존 그대로" 원칙 지켜서 손대지 않음)
- [x] Playwright 검증: 모바일(390px) 1층/2층 구조 정상 렌더링, 1층 액션버튼(완료토글/삭제) 실제 클릭 동작 확인(통계 갱신+DOM 반영), 데스크탑(1440px) 기존 1줄 레이아웃 픽셀 단위로 동일하게 유지 확인

### 2. 기본 체류시간 입력 0 처리 버그 — 완료 (`src/pages/RoutePage.tsx`)
`Number('')`/`Number('0')`이 falsy라 `|| DEFAULT_STAY_MINUTES`가 즉시 60으로 되돌려버려 "610 만들고 6 지우기" 우회가 필요했던 문제 → `stayMinutesText`(raw 문자열 로컬 state) 신규 추가해 입력 표시를 `defaultStayMinutes`(숫자, 스케줄링에 쓰임)와 분리. `onChange`는 빈 값/중간값을 그대로 허용하면서 유효한 양수면 바로 `defaultStayMinutes`에도 반영(실시간 일정 재계산 유지), 최소값(5) 클램핑과 빈 값일 때 60 fallback은 `onBlur`에서만 적용
- [x] Playwright 검증: "60" 전체 삭제 시 즉시 "60"으로 안 돌아가고 빈 값 유지 확인, 바로 "10" 타이핑 시 "10"(아닌 "610")으로 입력됨 확인, blur 시 "10" 그대로 유지(5 이상이라 클램핑 안 됨) 확인, 완전히 비운 채 blur 시 60으로 폴백 확인. 기존 기능(드래그재정렬/완료토글/삭제) 회귀 없음, 콘솔 에러 없음

### 3. 메모 — localStorage → DB 이전 대비 (구현 보류, Step13/14에서 본격 처리)
현재 `route-draft.ts`(`k-vibe-current-route`)/`route-progress.ts`(`k-vibe-route-progress`)/`persona-preference.ts`/`theme-store`/`sidebar-store` 등 여러 lib/store가 각자 직접 `localStorage.getItem/setItem`을 호출. read/write가 이미 함수 단위로 분리되어 있어(`readRouteDraft`/`saveRouteDraft` 등) Step13에서 함수 내부만 API 호출로 교체하면 되는 구조라 큰 문제는 아니지만, 호출이 여러 파일에 흩어져 있어 "이 데이터가 DB로 갈 대상"이라는 표시가 코드상 없음 → **Step13 진입 전에 localStorage 키 전체 목록을 한 곳에 정리**(예: `src/lib/local-storage-keys.ts` 단일 레퍼런스)해두면 마이그레이션 시 빠짐없이 확인 가능할 것으로 예상. 아직 구현 안 함 — Step13 착수 시 다시 꺼낼 것

## ✅ Step 11 — RadarPage (완료, 후속 레이아웃 조정 포함 — 상세 내역은 CLAUDE.md Execution Progress 참고)

### 원본 확인 완료
`origin/hslee`의 `app/[locale]/radar/page.tsx` + `components/radar/{FacilityCard,RadarMapPreview,RadiusSlider,facility-type-ui}.tsx` + `lib/{facilities,radar-radius,location-cache,local-api-cache}.ts` + `lib/ui-copy.ts`의 `radar.*` 블록(4개 언어 확인) 전부 검토 완료.

### 0-1. 선행 작업 — `useCurrentLocation` 3단계 위치 폴백 업그레이드 (대화로 확정, Map+Radar 공유)
**로직**: ① GPS 시도 → 성공 시 그 좌표 사용 + localStorage에 "마지막 위치"로 저장 ② GPS 실패 시 → localStorage에 저장된 마지막 위치가 있으면 그걸 사용 ③ 그것도 없으면(최초 방문 등) → 서울 좌표 폴백. TTL(유효기간)은 두지 않음(사용자가 명시적으로 요청 안 함 — 단순하게 유지, 필요해지면 추후 추가).
- `src/lib/location-cache.ts` (신규, 작은 파일) — `readLastKnownLocation()`/`writeLastKnownLocation()`, localStorage 키 `k-vibe-last-known-location`
- `src/lib/use-current-location.ts` (수정) — `requestLocation()`이 성공 시 `writeLastKnownLocation()` 호출, 실패 시 `readLastKnownLocation()` 확인 후 있으면 그 좌표+`'last_known'` 라벨, 없으면 서울 폴백. `locationLabel`이 3가지 상태(`current`/`last_known`/`seoul_fallback`) 반영
- **`MapPage.tsx`는 코드 변경 없음** — 이미 훅의 반환값(`coords`/`locationLabel`/`requestLocation`)만 소비하므로 훅 업그레이드만으로 Map도 동일하게 혜택받음. Radar도 같은 훅을 그대로 재사용
- `messages/*.json` — `map.last_known_location`(예: "Last known location") 신규 키 4개 언어 추가

### 0-2. 선행 작업 — 토스트 팝업이 TopBar를 가리는 문제 수정 (대화로 확정, 전역)
**문제**: `AppToaster`(`position="top-center"`)가 `TopBar`(`sticky top-0 z-40 h-14`)보다 위에 겹쳐 떠서, 토스트가 떠 있는 동안 헤더의 버튼(도움말/언어/테마/프로필)을 못 누름. 끄는 버튼도 없어서 자동 사라질 때까지 기다려야 함.
- `src/blocks/common/app-toaster.tsx` (수정) — `sonner`(v2.0.7)가 `offset`/`closeButton` prop을 직접 지원하므로 라이브러리 교체 없이 한 줄 수정으로 해결: `<Toaster theme={resolvedTheme} position="top-center" offset={{ top: 64 }} closeButton />` — `offset.top`으로 TopBar 높이(`h-14`=56px) 아래로 띄우고, `closeButton`으로 각 토스트에 X 버튼 추가
- 전역 컴포넌트라 모든 페이지에 영향(의도된 동작) — Radar 작업과 무관하지만 이번 세션에 함께 처리

### 1. 데스크탑 레이아웃 (대화로 확정 — MapPage/RoutePage와 동일 패턴)
- 좌측(`1fr`): 반경 슬라이더 + 필터 탭 + 레이더 미니맵(`RadarMapPreview`)
- 우측(`420px`, 스크롤 가능): 시설 목록(`FacilityList`)
- 상단 전체너비: 헤더(타이틀+위치라벨+개수+새로고침), 하단: 빈 상태/에러 시 전체너비
- 모바일: 위 순서대로 세로 스택
- **컨테이너는 RoutePage와 동일하게**: `mx-auto flex min-h-full w-full max-w-sm flex-col px-4 md:max-w-6xl` (좌우 패딩 `px-4`로 전 구간 동일, 데스크탑에서 `max-w-6xl`까지만 확장 — Radar만 다른 패딩값 쓰지 않음)

### 2. 데이터 모델 — `src/types/facility.ts` (신규, `types/place.ts`와 동일 패턴)
```ts
export type FacilityType = 'restroom' | 'atm' | 'medical' | 'transit' | 'pharmacy' | 'cafe_toilet' | 'convenience' | 'popup'
export type FacilityFilter = FacilityType | 'all'
export interface Facility { id, type, name, address, distance, lat, lng, is24h?, isOpen?, hasDisabled?, floor?, extra? }
export interface FacilityTypeMeta { id, icon: LucideIcon, color, bg, labelKey }
export const FACILITY_TYPE_META: FacilityTypeMeta[]  // 8개, 아이콘+색상+i18n 키 단일 소스 (PLACE_CATEGORIES와 동일 구조)
```
hslee는 타입정의(`lib/facilities.ts`)와 UI매핑(`components/radar/facility-type-ui.ts`)을 분리했지만, 우리는 `place.ts`가 이미 둘을 한 파일에 합친 선례가 있어 동일하게 합침(불필요한 파편화 방지).

### 3. Mock 데이터 — `src/blocks/radar/radar.data.ts` (신규)
- hslee `FACILITY_BLUEPRINTS` 9개(좌표 오프셋 기반, 8개 타입 커버) 그대로 포팅. 이름/주소는 영어 그대로 유지(Step9 페르소나 데이터와 동일 결정 — hslee 자체가 로케일 무관이라 4개 언어 번역 안 함, 타입 라벨만 번역)
- `fetchFacilities({ lat, lng, radius, filter })` async 함수로 감싸 컴포넌트에서 `useQuery`로 호출(queryKey에 좌표/반경/필터 포함 → 값 바뀌면 자동 재계산). React Query의 `staleTime: 5분`이 이미 캐싱을 담당하므로 hslee의 `local-api-cache.ts`(수동 localStorage API 캐시)는 포팅하지 않음(중복 기능)
- `src/lib/radar-radius.ts` (신규, 작은 순수함수) — `RADAR_RADIUS_STEPS = [300, 500, 800, 1000, 1500]` + `getNextRadarRadius()` (빈 상태에서 "반경 확장" 버튼용) 그대로 포팅

### 4. 컴포넌트 — `src/blocks/radar/` (처음부터 블록 분리해서 시작 — CLAUDE.md 신규 규칙 참고)
| 파일 | 내용 | RadarPage가 넘기는 것 |
|------|------|------|
| `radius-slider.tsx` | `<input type="range">` 5단계 반경 선택, 현재값+단계별 라벨 표시. hslee의 `accent-[#FF3A5C]`/`text-[#FF3A5C]` → `accent-primary`/`text-primary`로 교체 | `value`/`onChange` |
| `facility-filter-tabs.tsx` | 9개 탭(전체+8타입) **단일 선택**(MapPage `CategoryFilter`의 다중선택과 다름 — hslee 원본대로 단일선택 유지), 가로스크롤+`scrollbar-hide` | `value`/`onChange` |
| `radar-map-preview.tsx` | 퍼센트좌표 정사각 프리뷰 + 동심원 반경 표시 + 중앙 현위치 핀 + 시설 핀(타입별 색상). hslee의 다크 전용 하드코딩 색상(`#0D0D1A`/`#101827`)을 `bg-background`/`bg-muted` 등 시맨틱 토큰으로 교체(라이트모드 지원 위해 필수) | `center`/`facilities`/`radius`/`onSelectFacility` |
| `facility-card.tsx` | 펼치기/접기형 카드 1개(아이콘+타입뱃지+24h/휴무뱃지+이름/주소+거리, 펼치면 주소/층/장애인화장실여부/부가정보+전체너비 지도버튼) + 우측 별도 "지도에서 열기" 아이콘 버튼. 로컬 `useState`로 펼침 토글(다이얼로그 없이 인라인이라 `route-stop-card.tsx`보다 단순) | `facility`/`onViewMap` |
| `facility-list.tsx` **(처음부터 분리)** | `facility-card.tsx` 배열 렌더링 + 로딩 스켈레톤(`loading-skeleton.tsx` 재사용) + 에러 배너(재시도 버튼) + 빈 상태(반경확장 버튼) 전부 이 블록이 담당. RadarPage는 데이터만 내려주고 "어떻게 보여줄지"는 이 블록이 전담 | `facilities`/`isLoading`/`isError`/`onRetry`/`onExpandRadius`/`onViewMap` |

### 5. 색상 — 브랜드 레드(`#FF3A5C`) 미사용 결정
CLAUDE.md 기존 결정사항("shadcn zinc 기본 테마 그대로, 커스텀 색상 없음")을 따라 hslee의 레이더 전용 빨간 강조색은 도입하지 않음. 강조가 필요한 곳(활성 필터탭/반경 슬라이더/거리 텍스트/현위치 핀)은 `primary` 토큰으로 통일. 시설 타입별 핀 색상(8종 구분용)은 기존 `text-crowd-*`처럼 보조적 구분 목적이라 lucide 아이콘 + 중립톤 배경(`bg-accent` 계열)으로 단순화하거나, 꼭 다색이 필요하면 tailwind 표준 색상(`text-blue-500` 등, 커스텀 토큰 추가 없이) 사용 — 구현 시 최종 확정

### 6. `src/pages/RadarPage.tsx` — 조립만 담당 (데이터/상태 보유, 렌더링은 블록에 위임)
- 보유 상태: `radius`/`filter`(로컬 state), `coords`/`locationLabel`(`useCurrentLocation()`), `facilities`(`useQuery(fetchFacilities)`)
- 페이지에 직접 남기는 것: 도움말 등록(`usePageHelpStore`), 헤더(타이틀+위치라벨+개수+새로고침 — 작고 단일 용도라 RoutePage의 통계그리드처럼 인라인 유지), 데스크탑 그리드 셸(`grid-cols-[1fr_420px]`)
- 시설 클릭 시 `buildGoogleMapsFacilityUrl()`(신규, `route-share.ts`의 `buildGoogleMapsPlaceUrl`과 동일 패턴)로 새 탭 오픈 — `facility-list.tsx`/`radar-map-preview.tsx`에 `onViewMap`으로 전달

### 7. i18n
- `messages/*.json`의 `radar` 네임스페이스 **전면 재작성**(현재는 Step3 시절 단순 placeholder 5개 키만 있음 — 폐기) — hslee `ui-copy.ts`의 `radar.*` 블록(4개 언어 확인 완료) 기반 포팅: `title`/`location*`/`found`/`refresh`/`radius`/`mapTitle`/`mapSubtitle`/`currentPosition`/`openFacilityMap`/`filters.*`(9개)/`facilityTypes.*`(8개)/`errorTitle`/`retry`/`loading`/`emptyTitle`/`emptyHint`/`expandRadius`/`closed`/`twentyFourHours`/`accessibleRestroom`/`viewOnMap`
- `map.last_known_location` 신규 키 (0-1번 작업用)

### 의도적으로 범위 제외
- **TourAPI 팝업 실시간 연동**: hslee도 "approval-gated"라 명시 — 백엔드 연동은 Step13 이후
- **`local-api-cache.ts`(수동 API 응답 캐시)**: React Query `staleTime`이 동일 역할 수행, 중복 구현 불필요
- **브랜드 레드 컬러**: 위 5번 참고

### 검증 계획
- Playwright: **토스트가 TopBar 아래에서 뜨고 X 버튼으로 닫히는지 먼저 확인**(0-2번), 데스크탑(1440px) 좌/우 분할 확인(컨테이너 패딩이 RoutePage와 동일한지도 확인), 모바일(390px) 세로 스택 확인, 반경 슬라이더 5단계 변경 시 목록/미니맵 즉시 갱신, 필터탭 단일선택(다른 탭 클릭 시 이전 탭 해제) 확인, 시설카드 펼치기/접기, "지도에서 열기" 새 탭 오픈(내부+카드 펼침 버튼 둘 다), 빈 결과(반경 0~1단계로 좁혀서 유도) 시 반경확장 버튼 동작, **위치 3단계 폴백** 전부 확인(geolocation mock 성공/실패+로컬스토리지 있음/실패+로컬스토리지 없음 3가지 케이스), MapPage에서도 동일 폴백 적용 확인(회귀 없음), 콘솔 에러 없음, 4개 언어 키 누락 없음

## ✅ Step 12 — ProfilePage + LoginModal

### 원본 확인 완료
`origin/hslee`의 `app/[locale]/profile/page.tsx`(436줄) + `components/auth/LoginModal.tsx` + `lib/supabase/client.ts` + `app/api/auth/callback/route.ts` 전부 확인.

### 0. 로그인 방식 결정 (대화로 확정)
- **OAuth만 사용, ID/PW 폼 없음** — 비밀번호를 우리 앱이 절대 다루지 않음
- **Provider 3개: Google + Apple + Kakao** (Facebook/GitHub/Naver 제외 — Naver는 Supabase 자체가 미지원)

### 1. 핵심 아키텍처 원칙 — **프론트 제1원칙**: 서버가 바뀌어도 API 정책만 바꾸면 그대로 쓰도록
지금 `@supabase/supabase-js`를 설치해서 컴포넌트가 직접 `supabase.auth.*`를 호출하게 만들면, 인증을 처리하는 서버가 바뀌는 순간(Supabase 직접 호출 ↔ 우리 백엔드가 중계 등) 호출부 전체를 다시 써야 함. **이번 Step에서는 이 직접 호출을 만들지 않음.**
- `src/lib/auth.ts` — `getCurrentUser()`/`loginWithProvider(provider)`/`logout()` export. 지금은 내부에서 **mock**(localStorage에 provider별 가짜 `AuthUser` 저장)으로 동작 — `fetchMapPlaces()`/`fetchFacilities()`가 처음 mock으로 시작했던 것과 동일한 패턴(상세는 아래 "Mock 구현 상세")
- `src/lib/use-auth.ts` — 위 3개 함수를 `useQuery`(`getCurrentUser`)/`useMutation`(`loginWithProvider`/`logout`)으로 감싸는 훅. `TopBar`/`ProfilePage`/`LoginModal`은 이 훅만 사용
- **Step15(백엔드 연동)에서 `auth.ts`의 "내부 구현"만 교체**(Supabase 직접 호출이든 우리 백엔드 경유든 그 시점에 결정) — 컴포넌트 코드는 한 줄도 안 바뀜
- 이번 Step에서는 **`@supabase/supabase-js` 설치 안 함** — SDK 선택 자체도 Step15로 미룸
- mock이 실제로 "로그인됨" 상태를 만들어주므로(다른 mock 기능들처럼 가짜라는 걸 UI에 노출하지 않음), hslee의 "Supabase 미설정 안내 배너" 게이팅은 이번 Step에는 불필요

### Mock 구현 상세
```ts
// src/lib/auth.ts
export interface AuthUser { id: string; name: string; email: string; provider: 'google' | 'apple' | 'kakao' }
const STORAGE_KEY = 'k-vibe-mock-session'
// provider별 다른 가짜 사용자 — 실제 전환 후에도 "provider마다 다른 정보가 온다"는 동작이 동일하게 체감되도록
const MOCK_USERS: Record<AuthUser['provider'], AuthUser> = { google: {...}, apple: {...}, kakao: {...} }

export async function getCurrentUser(): Promise<AuthUser | null> { /* localStorage 읽기 */ }
export async function loginWithProvider(provider): Promise<AuthUser> { /* MOCK_USERS[provider]를 localStorage에 저장 후 반환 */ }
export async function logout(): Promise<void> { /* localStorage 제거 */ }
```
세 함수 모두 지금부터 `async`(Promise 반환)로 선언 — 지금은 즉시 끝나지만, 실제 OAuth는 리다이렉트 대기가 있는 진짜 비동기 작업이 됨. 호출부(`useQuery`/`useMutation`)는 이미 비동기를 다루도록 짜여 있어서 Step15에 내부 구현만 바꿔도 컴포넌트는 무관함.

### 2. 같은 원칙 — Saved Places도 API 교체 대비
저장한 장소는 결국 서버 DB로 올라갈 데이터(미래의 `saved_places` 테이블). 지금 `MapPage.tsx`/`home-feed.tsx`의 `savedIds`는 `useState(new Set())`뿐인 휘발성 상태(새로고침하면 사라짐) — 단순히 localStorage로 바꾸는 게 아니라 **`fetchMapPlaces()`와 동일한 비동기 함수 패턴**으로 감싸야 함:
- `src/lib/saved-places.ts` — `fetchSavedPlaces(): Promise<Place[]>`(지금은 localStorage 읽기) / `toggleSavedPlace(place): Promise<Place[]>`(지금은 localStorage 갱신). **Step15에서 내부만 실제 API 호출로 교체**
- **MapPage/HomeFeed/ProfilePage는 서로를 직접 참조하지 않음** — 셋 다 동일한 React Query 키(`['saved-places']`)로 `fetchSavedPlaces`를 구독하고, 저장 토글은 `useMutation(toggleSavedPlace)` + `onSuccess`에서 `invalidateQueries(['saved-places'])`만 호출. 단일 진실 소스(이 lib + 쿼리 키)를 공유할 뿐 세 곳이 서로 import하는 일은 없음 — `route-draft.ts`를 Map/Analyze/Persona/Route가 공유하는 것과 동일한 구조

### 3. 반응형 설계 (대화로 확정 — Login과 Profile은 요구사항이 다름)
- **LoginModal**: 모바일/데스크탑 **동일 UI** — hslee 원본처럼 화면 중앙(상단 정렬) 모달 카드 하나로 충분, 화면 크기에 따라 레이아웃을 분기할 이유가 없음(버튼 3개+게스트 CTA가 전부)
- **ProfilePage**: 모바일/데스크탑 **다른 레이아웃** 필요(다른 페이지들과 동일한 이유 — 데스크탑 폭을 그냥 좁게 두면 낭비)
  - 모바일: hslee 순서 그대로 세로 스택 (프로필헤더 → 저장한장소 → 저장한루트 → 설정 → 로그인/로그아웃 버튼)
  - 데스크탑: `grid-cols-[1fr_360px]` 분할 — **좌측(1fr)**: 저장한 장소 그리드(`md:grid-cols-4`)+저장한 루트 카드(콘텐츠 영역, 넓게) / **우측(360px 고정)**: 프로필헤더+설정리스트+로그인/로그아웃 버튼(계정 관련, 좁은 사이드바형). Map/Route/Radar가 전부 "1fr을 좌측, 고정폭 보조패널을 우측"에 둔 것과 동일한 리듬 유지
  - 컨테이너는 기존 페이지들과 동일 패턴: `max-w-sm px-4 md:max-w-6xl`

```
데스크탑 와이어프레임:
+----------------------------------------------------+
| <메인 콘텐츠, 1fr>            | <고정 360px>          |
|                                |                       |
| Saved Places (4열 그리드)      | [Avatar] Name         |
| [ ][ ][ ][ ]                  |  email/guest          |
| [ ][ ][ ][ ]      [전체보기]   |  [페르소나 칩]         |
|                                |  Places | Routes      |
| Current Route                 |  -------------------  |
| -------------------------     |  Settings              |
| | 진행률바 72%              | |  - Language            |
| | Next: 경복궁              | |  - Notifications       |
| | [이어하기] [편집]         | |  - Offline maps        |
| -------------------------     |  - Map data            |
|                                |  -------------------  |
|                                |  [로그인/로그아웃]      |
+----------------------------------------------------+
```

### 4. 파일 구조 (처음부터 블록 분리)
```
src/lib/
  auth.ts                 — 위 "Mock 구현 상세" 참고
  saved-places.ts         — 위 2번 항목
  use-auth.ts             — useAuth() 훅 (TopBar도 재사용)

src/blocks/profile/
  login-modal.tsx         — Google/Apple/Kakao 버튼 3개(Apple은 lucide-react `Apple` 아이콘, Google은 hslee처럼 인라인 멀티컬러 SVG, Kakao는 브랜드컬러 `#FEE500` 배경+`MessageCircle` 아이콘) + "게스트로 계속하기". 모바일/데스크탑 동일 UI
  profile-header.tsx      — 아바타(로그인 시 이름 이니셜, 게스트 시 기본 아이콘)+이름/이메일 또는 게스트 라벨+페르소나 칩+통계(저장한 장소/루트 수)
  saved-places-grid.tsx   — 모바일 2열/데스크탑 4열, 4개 미리보기+"전체보기" 토글, 빈 상태 시 지도로 이동 CTA. `useQuery(fetchSavedPlaces)` 직접 구독
  current-route-card.tsx  — `readRouteDraft()`+`scheduleRoute()` 재사용 + `route-progress-store.ts`(신규 Zustand, RoutePage와 공유) 구독 — 진행률 바+다음 스팟(완료토글 버튼 포함)+이어하기 버튼(1개로 통합), 빈 상태 시 지도로 이동 CTA
  settings-list.tsx       — 언어/알림 2행만(정적 표시만, 실제 토글 기능은 Step13 이후). 오프라인지도/지도데이터는 이 아키텍처상 영구 구현 불가로 완전 제외

src/pages/ProfilePage.tsx — useAuth()+위 블록 조립만(모바일 세로스택 / 데스크탑 `grid-cols-[1fr_360px]` 분기), LoginModal 열림 state 보유
```

### 5. 기존 코드 수정
- `MapPage.tsx`의 `PlaceDetailSheet` 저장 버튼, `home-feed.tsx`의 `PlaceCard` 저장(하트) 버튼 — 로컬 `savedIds` state 제거, `useQuery(['saved-places'], fetchSavedPlaces)`+`useMutation(toggleSavedPlace)`로 교체
- `top-bar.tsx` 프로필 아바타 — `useAuth()`의 `user`로 로그인 시 이니셜 표시, 게스트면 기존 기본 아이콘 유지

### 6. i18n
`profile` 네임스페이스 전면 재작성(현재 Step3 placeholder 8개 키 — 폐기) — hslee `ui-copy.ts`의 `profile.*`+`login.*` 블록 기반 포팅(4개 언어): `guestTitle`/`guestSubtitle`/`signInTitle`/`signInDescription`/`savedPlaces`/`noSavedPlaces`/`noSavedPlacesHint`/`savedRoutes`/`noSavedRoutes`/`noSavedRoutesHint`/`createFirstRoute`/`currentRoute`/`editRoute`/`continueRoute`/`routeProgress`/`nextStop`/`routeComplete`/`openMap`/`statsPlaces`/`statsRoutes`/`seeAll`/`showLess`/`signOut` + `login.*`(타이틀/서브타이틀/continueGoogle/continueApple/continueKakao/continueGuest/availableWithoutLogin/guestFeatures)

### 의도적으로 범위 제외 (Step15에서 처리 — 아래 Step15 섹션 참고)
- 이메일/비밀번호 로그인 폼 — OAuth만 사용
- `@supabase/supabase-js` 설치 및 실제 OAuth 연동
- Saved Places 실제 API 연동
- 설정(언어/알림/오프라인지도) 실제 토글 기능 — 정적 UI만

### 검증 계획
- Playwright: "게스트로 계속하기" 동작, 3개 provider 버튼 클릭 시 mock 로그인 성공+TopBar 아바타 변경+ProfilePage 헤더 갱신, 로그아웃 동작, 저장한 장소(MapPage에서 하트 찍고 새로고침해도 유지 — mock이지만 영속화는 진짜로 되는지가 핵심) 및 HomeFeed에서 찜한 것도 ProfilePage에 동일하게 보이는지(공유 쿼리키 검증), 저장한 루트 카드(RoutePage에서 만든 루트 진행률 표시), 빈 상태 2종(장소 없음/루트 없음) CTA, **LoginModal 모바일/데스크탑 동일 UI 확인, ProfilePage 모바일 세로스택/데스크탑 `1fr_360px` 분할 확인**, 4개 언어, 콘솔 에러 없음

### 실제 구현 — 계획과 달라진 부분 / 구현 중 발견한 사항
- **`settings-list.tsx` 범위 축소(4항목→2항목)**: 계획 단계에서는 언어/알림/오프라인지도/지도데이터 4행이었으나, 구현 중 검토 결과 "오프라인지도"·"지도데이터"는 **이 아키텍처에서 영원히 기능화 불가능**하다고 판단해 완전히 제외(Step15로 미룬 게 아니라 설계에서 삭제). 이유: 웹 지도 JS API는 Kakao든 Google이든 어떤 provider를 쓰든 타일 오프라인 다운로드 기능 자체가 없음(네이티브 모바일 SDK 전용 기능이고, 일부는 ToS로 타일 캐싱 자체를 금지). 최종 **언어+알림 2행만 유지**. "알림"은 진짜 푸시(탭이 완전히 닫혀도 수신)는 Service Worker가 필요해 지금 구조로 불가능하지만, **탭이 열려있는 동안의 알림**은 Service Worker 없이 `Notification` Web API만으로 Step13+에 실제 구현 가능해서 placeholder로 남겨둘 가치가 있다고 판단
- **로그인/로그아웃 버튼 위치 변경**: 계획에는 데스크탑 우측 컬럼에 헤더 카드+버튼이 별도 블록으로 있었으나, 구현 후 피드백으로 **`profile-header.tsx` 카드 내부 하단**으로 이동(별도 버튼 블록 삭제). `ProfileHeader`가 `onSignInClick` prop을 받아 로그인 모달을 열고, 로그아웃은 `useAuth()`로 카드 내부에서 직접 처리
- **Saved Places 게스트/계정 분리 — 계획에 없던 설계 갭 발견**: 처음엔 `k-vibe-saved-places` 단일 키만 썼는데, 그러면 로그아웃 후 다음 게스트 세션이 이전 로그인 계정의 저장 목록을 그대로 보게 되는 문제가 있음을 발견 → `src/lib/saved-places.ts`를 **`k-vibe-saved-places:{userId 또는 'guest'}`로 사용자별 버킷 분리** + **로그인 성공 시 guest 버킷을 그 계정 버킷으로 1회 병합(`mergeGuestSavedPlacesIntoUser`) 후 guest 버킷 비움**(`use-auth.ts`의 로그인 mutation `onSuccess`에서 호출). Playwright로 4단계 시나리오 전부 검증: ①게스트 저장→로그인 시 병합되어 보임 ②로그인 상태로 추가 저장 시 둘 다 보임 ③로그아웃 시 게스트 화면은 다시 비어있음(이전 계정 데이터 안 보임) ④새로고침해도 유지
- **루트 완료 상태를 Zustand 스토어로 승격 — 계획에 없던 추가 작업**: 계획에는 `current-route-card.tsx`가 `readRouteProgress()`를 1회만 읽는 단순 스냅샷이었으나, 구현 후 "Profile에서도 다음 스팟을 완료 처리할 수 있으면 좋겠다"는 요청으로 **`src/store/route-progress-store.ts`(Zustand) 신규** — `completedIds`를 RoutePage의 로컬 `useState` 대신 이 스토어로 승격(localStorage 동기화는 스토어 액션 내부, `sidebar-store`/`theme-store`와 동일한 패턴). `RoutePage.tsx`(`toggleComplete`/`removeStop`/`clearRoute`)와 `current-route-card.tsx` 둘 다 같은 스토어를 구독해 **양방향 실시간 동기화**(한쪽에서 토글하면 다른 페이지로 이동해도 즉시 반영, 새로고침 없이도). `current-route-card.tsx`에 다음 스팟 완료 토글 버튼 추가(체크 아이콘, "다음 스팟" 행 옆)
- **중복 버튼 통합**: 계획에는 "이어하기"/"편집" 2개 버튼이 있었으나 실제로는 둘 다 `navigate('../route')`로 동일하게 동작해 의미 없는 중복이었음 → "Continue" 버튼 하나로 통합, `profile.edit_route` i18n 키 4개 언어에서 모두 제거
- **빈 상태 CTA 대상 변경**: "Create your first route" 버튼이 계획·1차 구현 모두 `../persona`(페르소나 위저드)로 이동했으나, RoutePage 자신의 빈 상태 문구(`route.empty_desc`: "Add spots from the map, SNS analysis, or persona builder...")가 지도를 가장 먼저 언급하는 것과 같은 맥락으로 **`../map`(지도)으로 변경** — 처음 루트를 만드는 사용자에겐 위저드보다 지도에서 장소를 직접 둘러보는 흐름이 더 직관적이라고 판단
- Playwright 재검증: 위 변경사항 전부 실제 동작 확인(게스트→로그인→추가저장→로그아웃 4단계, Profile↔Route 양방향 완료토글 동기화+새로고침 영속, 버튼 1개로 통합 확인), `npx tsc --noEmit`/`npx eslint src` 둘 다 클린(shadcn `components/ui/` 3건 제외)

---

## ✅ Step 13 — API Layer

### 원칙
- 모든 fetch: `src/api/` 집중 / 컴포넌트 직접 호출 금지
- `VITE_API_BASE_URL` 환경변수 전용

### 사전 조사 — `origin/hslee`에서 확인한 실제 API 목록
구현 전 `origin/hslee`(실제 백엔드를 가진 참고 구현체)의 `app/api/**` 라우트를 전부 읽고 대조:

| hslee 엔드포인트 | 우리 쪽 대응 |
|---|---|
| `GET /api/places?lat&lng&radius&category&locale`(TourAPI `locationBasedList2`+mock 폴백) | `fetchMapPlaces()`+`fetchHomeFeedPlaces()` — 둘 다 파라미터 없이 고정 데이터만 반환하던 상태 |
| `GET /api/facilities?lat&lng&radius&type&locale`(mock 9개+TourAPI festival 병합) | `fetchFacilities(query)` — 이미 `{lat,lng,radius,filter}` 받고 있어 거의 일치 |
| `POST /api/analyze {youtube_url, locale}`(AI 워커+mock 폴백) | `fetchAnalysis(videoId, locale)` — **URL이 아니라 이미 파싱된 videoId를 받던 계약 버그** |
| `POST /api/routes/generate {theme, detail, start_time, locale}`(hslee도 mock뿐, 실제 AI 없음) | `fetchScheduledRoute(theme, startTime)` — `detail`/`locale` 누락 |
| `GET /api/auth/callback`+Supabase `signInWithOAuth`(OAuth 리다이렉트, 일반 REST 아님) | `lib/auth.ts` — Step15로 명시적으로 미뤄둔 영역, 이번엔 손대지 않음 |
| `GET /api/places/:contentId`(TourAPI 상세조회 3개 병렬: 개요/이미지/운영시간) | **대응 기능 없음** — 지금 UI(`place-detail-sheet.tsx`)가 안 쓰는 필드라 추가 안 함(추측성 설계 방지) |

인기검색어(트렌딩 키워드)는 hslee에도 대응 엔드포인트가 없음 — 영구 mock으로 유지.

### 아키텍처 — axios 클라이언트 하나 + 영구적인 mock 폴백 패턴
- `src/api/client.ts` — `apiClient`(axios, `baseURL: import.meta.env.VITE_API_BASE_URL`, timeout 8s) + `withFallback(realCall, mockFallback)`: `VITE_API_BASE_URL`이 비어있으면 네트워크 호출 자체를 안 하고 바로 mock, 값이 있는데 호출이 실패해도(백엔드 없음/타임아웃/5xx) 똑같이 mock 폴백(`console.warn`으로 로그). **Step15에서 지울 임시 코드가 아니라 영구적인 graceful-degradation 패턴** — hslee의 실제 백엔드도 TourAPI 키가 있어도 타임아웃 나면 mock으로 빠짐
- `src/vite-env.d.ts` 신규 — `ImportMetaEnv`에 `VITE_API_BASE_URL`/`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`VITE_KAKAO_MAP_KEY` 타입 선언(기존에 없었음)
- axios 패키지 신규 설치

### 파일 이동 (mock 데이터는 전부 보존, 옛 컨테이너 파일만 삭제)
| 신규 파일 | 흡수한 mock 데이터/함수 | 옛 파일 처리 |
|---|---|---|
| `src/api/places.ts` | `SEOUL_PLACES`+`fetchHomeFeedPlaces()`(home-feed.data.ts), `EXTRA_PLACES`+`fetchMapPlaces()`(map-page.data.ts) | `home-feed.data.ts`는 `STORY_TOPICS`/`FEED_CATEGORIES`(UI 분류체계)만 남기고 유지. `map-page.data.ts`는 내용 전부 빠져나가 삭제 |
| `src/api/facilities.ts` | `radar.data.ts` 전체 | 삭제 |
| `src/api/analyze.ts` | `MOCK_ANALYSIS_BY_LOCALE`+`fetchAnalysis()`+`AnalysisPlace`/`AnalysisResult` 타입(analyze.data.ts) | `analyze.data.ts`는 `EXAMPLE_URLS`(UI 샘플 텍스트)만 남기고 유지 |
| `src/api/routes.ts` | `persona.data.ts` 전체 | 삭제 |
| `src/api/trending.ts` | `trending-keywords.data.ts` 전체 | 삭제 |

### 의도적인 시그니처 수정 2건(새 기능이 아니라 계약 자체의 버그 수정)
1. **`fetchAnalysis(url, locale)`**: videoId 대신 원본 URL을 받도록 변경(hslee 실제 계약과 일치, 내부에서 `extractVideoId`로 videoId 추출). `AnalyzePage.tsx`도 `targetUrl`을 그대로 전달하도록 수정
2. **`fetchScheduledRoute(theme, detail, startTime, locale)`**: `detail`/`locale` 추가(mock 본문은 안 쓰지만 실제 호출 가능하도록 흘려보냄). `PersonaPage.tsx`도 이미 갖고 있던 `detail`/`i18n.language`를 같이 전달

### MapPage·Facility API 규격 통일 — 범위 확장(대화 중 결정)
구현 중 Map과 Facility의 mock 함수 모양이 서로 다르다는 게 드러남(Map은 Step7부터 "고정 카탈로그+클라이언트 필터" 컨셉이라 파라미터가 없었고, Facility는 Step11부터 "반경 슬라이더로 실시간 검색"이 핵심이라 처음부터 파라미터화됨) — hslee의 실제 백엔드는 둘 다 `lat&lng&radius&...&locale` 동일 모양이라, Step15 충돌을 줄이기 위해 **API 계약만** 지금 맞추기로 범위를 넓힘:
- `fetchMapPlaces(query: PlaceQuery)`로 변경, `PlaceQuery = {lat,lng,radius,locale}`. mock 내부에서 매번 `haversineKm()`으로 `distanceM`을 재계산하고 반경 필터+거리순 정렬(Facility의 `getMockFacilities`와 동일 패턴). `category`는 query에 안 넣음 — MapPage 카테고리 필터가 처음부터 다중선택이라 단일 서버 파라미터로 표현 불가능, 그대로 클라이언트 사이드 유지
- **UI(슬라이더)는 추가하지 않음** — 지금 지도는 줌/팬되는 실제 인터랙티브 지도가 아니라 퍼센트 좌표 정적 미리보기라서, Radar처럼 슬라이더를 넣는 게 어색하다고 판단. `DEFAULT_MAP_SEARCH_RADIUS = 10000`(10km) 고정값 사용(SEOUL_CENTER 기준 mock 장소 8개 중 가장 먼 성수동~7.3km보다 여유있게). API 계약(`radius: number`)과 "그 숫자를 누가 만드는지"는 독립적인 결정이라, 나중에 실제 Kakao 지도가 들어와도 `fetchMapPlaces()` 시그니처는 안 바뀜(아래 Step15 메모 참고)
- `fetchHomeFeedPlaces()`는 건드리지 않음(홈피드는 반경 개념이 없는 고정 트렌딩 피드), Radar의 `radius-slider.tsx`/`radar-radius.ts`도 이번엔 손대지 않음(Map에 슬라이더가 안 생겨서 공용화할 이유가 없어짐)

### 검증
- `npx tsc --noEmit`/`npx eslint src` 클린(shadcn `components/ui/` 3건 제외)
- Playwright로 7개 페이지 × 모바일/데스크탑 스모크 테스트: 콘솔 에러 없음, 이번 리팩토링 전과 동일하게 동작
- `VITE_API_BASE_URL`을 임시로 존재하지 않는 주소로 설정해 실제 호출 실패→`console.warn`→mock 폴백 경로를 직접 발생시켜 확인(RadarPage에서 `[api] falling back to mock data: AxiosError: Network Error` 로그 확인, 화면은 정상적으로 mock 데이터 렌더링)
- MapPage: 카운트뱃지가 변경 전과 동일하게 8(전체 mock 장소 수) 확인. Analyze: 예시 URL 클릭→새 URL 기반 시그니처로 기존과 동일한 결과(Seongsu Cafe Street 등) 확인. Persona: 테마→디테일→확인→생성까지 전체 위저드 플로우가 새 4-파라미터 시그니처로 정상 동작(4스팟 루트 생성, 타이밍 정확) 확인

### Step15에 넘기는 메모(잊지 않도록 기록)
MapPage의 `fetchMapPlaces()`는 지금 `radius`를 `DEFAULT_MAP_SEARCH_RADIUS` 고정값으로 호출하지만, 실제 Kakao Maps SDK가 들어오면 `zoom_changed`/`dragend` 이벤트에서 `map.getBounds()`로 화면에 보이는 영역을 구하고 `haversineKm()`으로 중심→가장자리 거리를 계산해 그 값을 `radius`로 넘기는 방식으로 교체할 것 — `fetchMapPlaces()` 시그니처는 이미 `{lat,lng,radius,locale}`라서 이 교체 시 함수 자체는 안 바뀌고, radius를 만드는 쪽(고정값 → 줌 기반 계산)만 바뀐다.

---

## ✅ Step 14 — Zustand Store 연결 (검토 후 종료 — 원래 계획한 3개 모두 다른 메커니즘으로 이미 충족됨)

### 원래 계획(생성 예정이었던 것) vs 실제로 어떻게 충족됐는지
| 계획했던 스토어 | 의도 | 실제로 충족한 방식 |
|---|---|---|
| `locale-store.ts` | "현재 locale 상태"를 전역에서 구독 가능하게 | Zustand 대신 **URL 경로**(`/:locale/...`)가 source of truth, `LocaleGuard.tsx`가 검증해서 i18next에 동기화(Step3). `useTranslation()`의 `i18n.language`가 이미 전역 구독 지점 — 별도 스토어를 만들면 URL/i18next와 동기화해야 할 두 번째 source of truth가 생기는 꼴이라 불필요 |
| `map-store.ts` | "지도 중심좌표/선택된 장소"를 다른 화면에서도 읽고 쓸 수 있게 | Zustand 대신 **1회성 라우터 state 핸드오프**(`navigate('../map', { state: { focusPlaces, openDetail } })`, `MapFocusState`, Step7~8)로 해결. 의도적으로 영속 안 시킴 — MapPage 안에서만 쓰이는 중심좌표/선택장소는 페이지 로컬 state로 충분(다른 화면이 실시간으로 알아야 할 일이 없음) |
| `auth-store.ts` | "로그인 상태, 유저 정보" | Zustand 대신 **React Query**(`['auth-user']` 쿼리키, `lib/use-auth.ts`, Step12)로 구현 — 로그인 상태는 세션성/서버성 데이터라 클라이언트 상태보다 서버상태로 다루는 게 적합하다고 판단. OAuth-only로 확정되면서 별도 클라이언트 상태 스토어가 더더욱 불필요해짐 |

`theme-store.ts`는 계획대로 Step4에 이미 생성됐고, 계획에는 없었지만 실제로 필요해질 때마다 추가된 스토어(`sidebar-store`/`page-help-store`/`analyze-store`/`route-progress-store`)가 이미 5개 존재 — "필요해지면 만든다"는 패턴이 "미리 다 만들어둔다"보다 실제로 더 잘 맞았음. 신규 작업 없이 문서만 정리하고 종료.

---

## ✅ Step 14 후속 — RoutePage/PersonaPage UI 리팩토링 + 미니맵 버그 수정 + 도슨트 연동

### 배경
Step15 진행과 별개로 UX 개선 요청 5개(Req 1~5) + 미니맵 버그 2개 + 드래그 기능 추가.

### 버그 수정 — RouteMiniMap 핀 위치 깨짐

**버그 1**: 스팟 추가 시 기존 핀 위치가 초기화됨
**버그 2**: 스팟 삭제 시 남은 핀 위치가 재조정됨

**원인**: `RouteMiniMap` 내부에서 `stops` prop 변경 때마다 bounds를 재계산해서 핀의 상대 좌표가 바뀜.

**해결 — 부모 소유 bounds 아키텍처**:
- `RoutePage.tsx`에 `MinimapBounds` 인터페이스 + `buildMinimapBounds()` 헬퍼 추가
- `const [minimapBounds] = useState<MinimapBounds | null>(() => buildMinimapBounds(initialRoute.stops))` — lazy initializer로 초기 stops 기반 1회 계산, setter 미노출로 이후 업데이트 없음
- `RouteMiniMap`은 `bounds: MinimapBounds` prop을 받는 순수 컴포넌트로 변경 — 내부 bounds state/ref 완전 제거
- **expanding-only 설계가 아닌 "초기 고정" 설계**: 첫 로드 시점의 stops로만 bounds를 결정. 추가된 스팟이 기존 범위 밖이면 드래그 pan으로 볼 수 있으므로 UX 문제 없음

### Req 1 — RoutePage 시간 계산 UI 완전 제거

**제거 대상**: `scheduleRoute`/`calculateRouteLegs`/`DEFAULT_STAY_MINUTES` import, `scheduled`/`legs` useMemo, 통계 항목(Walking/Total), DayDivider 삽입 로직, 구간(leg) 표시 행

**영향 파일**:
- `src/pages/RoutePage.tsx` — `useLocation` import, `scheduled`/`legs` useMemo, 관련 props 제거; 통계 그리드를 Stops/Done 2개로 축소
- `src/blocks/route/route-stop-list.tsx` — `scheduled: ScheduledStop[]`/`legs: RouteLeg[]` → `stops: RouteStop[]`로 단순화, DayDivider·travel segment 렌더링 제거
- `src/blocks/route/route-stop-card.tsx` — `scheduled: ScheduledStop` → `stop: RouteStop`으로 변경, 시각/날짜 편집 다이얼로그 제거

### Req 2 — Persona 결과 화면 summary 텍스트 제거

`src/blocks/persona/route-result.tsx`에서 `plan.summary`를 표시하던 `<p>` 한 줄 제거.
`PersonaPage.tsx`의 `useMutation`에서 `summary: ''` 유지(타입 에러 방지).

### Req 3 — Persona Step 1 원복 (처음엔 제거했다가 사용자 요청으로 복구)

처음에는 Step 1(DetailStep 테마/디테일 선택)을 제거하고 ConfirmStep부터 시작하도록 변경했으나, 사용자가 "persona step1 원복 할 것"을 요청해 원상복구.

- `PersonaPage.tsx`: `type Step = 1 | 2` 복구, `handleSelectTheme` 복구, step 인디케이터(2칸 프로그레스바) 복구, Step 1 CTA 버튼 복구
- `confirm-step.tsx`: `onBack: () => void` prop + ChevronLeft 뒤로가기 버튼 복구

### Req 4+5 — Persona 생성 루트에 도슨트(Headphones) 버튼 + DocentPlayer 연동

**Req 4**: Persona로 생성된 스팟에만 Headphones 버튼 표시
- `src/lib/route-draft.ts`의 `RouteStop` 인터페이스에 `fromPersona?: boolean` 추가
- `PersonaPage.tsx`의 `handleAddToRoute`: `plan.stops.map((s) => ({ ...s, id: \`${s.id}-${ts}\`, fromPersona: true }))` 로 추가
- `route-stop-card.tsx`: `stop.fromPersona && onDocent`일 때만 `<Headphones />` 버튼 노출
- `route-stop-list.tsx`: `onDocent?: (stop: RouteStop) => void` prop 추가, fromPersona인 카드에만 전달

**Req 5**: Headphones 버튼 클릭 시 DocentPlayer Dialog 열기
- `RoutePage.tsx`: `personaPlan` state(lazy init: `readPersonaRoutePlan()`), `docentOpen` state
- `onDocent={personaPlan ? () => setDocentOpen(true) : undefined}` — personaPlan이 없으면 버튼 자체가 안 뜸
- `{personaPlan && <DocentPlayer open={docentOpen} onClose={() => setDocentOpen(false)} plan={personaPlan} />}` 렌더링
- `clearRoute()` 시 `clearPersonaRoutePlan()` + `setPersonaPlan(null)` 추가

### 미니맵 드래그(pan) 기능 추가

사용자 요청: "route minimap 드래그 가능하도록 할 것"

- `RouteMiniMap` 내부에 `pan: {x,y}` state + `dragRef`(이벤트 핸들러 전용, 렌더 중 미접근)
- `setPointerCapture` 기반 포인터이벤트 드래그(`spot-list-panel.tsx` 스와이프와 동일 패턴)
- 드래그 가능한 inner div에 `cursor-grab active:cursor-grabbing` + `transform: translate(${pan.x}px, ${pan.y}px)`
- Directions 버튼은 드래그 레이어 바깥 `z-10`으로 분리해 탭 가능하게 유지

### 검증
- `npx tsc --noEmit` / `npx eslint src` 클린(shadcn `components/ui/` 3건 제외)
- `dragRef`는 렌더 바디에서 읽거나 쓰지 않고 이벤트 핸들러 내에서만 접근 → `react-hooks/refs` 위반 없음

---

## ⬜ 후속 작업 (다음 세션) — Map/Radar 모바일 고정영역 높이 비율 조정

**문제**: 모바일에서 Map/Radar는 위쪽(지도/미니맵)이 고정되고 아래쪽 목록만 스크롤되는 구조(Step11 후속 — CLAUDE.md Execution Progress 참고)인데, 화면 크기가 작은 기기에서는 이 고정부가 차지하는 비율이 상대적으로 커서 아래 목록이 너무 좁은 영역만 차지하는 경우가 있음.

**방향**: 고정부(지도/미니맵 영역) 높이를 화면 크기에 따라 유동적으로 조정 — 화면 전체 높이의 50~60% 수준을 목표로.

**현재 구현 참고(다음 세션 시작점)**:
- `RadarPage.tsx`(현재 라인 103 근방): 모바일 고정부가 `h-[35vh]` 고정 비율값
- `MapPage.tsx`(현재 라인 123, 131 근방): 모바일 고정부가 `flex-4`, `SpotListPanel`(`spot-list-panel.tsx` 현재 라인 155 근방)이 `flex-3` — 비율 기반이긴 하나 실제 Tailwind v4에 `flex-3`/`flex-4` 유틸리티가 존재하는지부터 확인 필요(없으면 의도한 비율이 실제로 적용 안 되고 있을 가능성)
- Map/Radar 둘 다 동일한 문제이므로 같은 방식으로 함께 조정

---

## ⬜ Step 15 — 백엔드 연동 검증

**Step15는 사실 서로 독립적인 4개 연동**이라 항목별로 진행: ① Kakao Maps JS SDK(완료, 아래) ② 자체 백엔드 API(`.env` 실제값 설정+각 페이지 API 연동 동작 확인+빌드 최종 검증) ③ Supabase Auth(OAuth) ④ Supabase DB `saved_places`. ①만 백엔드/Supabase 없이 프론트엔드 단독으로 끝낼 수 있어서 먼저 진행했고, ②~④는 외부 시스템(백엔드 서버/Supabase 프로젝트/OAuth 콘솔)이 준비된 뒤 별도 진행

### ✅ ① Kakao Maps JS SDK 연동 (MapPage) — 완료

**범위**: `src/blocks/map/map-canvas.tsx`의 퍼센트 좌표 핀 미리보기(Step7부터 사용해온 `pinPosition()`)를 실제 인터랙티브 카카오 지도로 교체. Radar의 `radar-map-preview.tsx`/Route의 `route-mini-map.tsx`는 둘 다 장식용 미리보기지 인터랙티브 지도가 아니라서 원래 계획대로 교체 대상에서 제외.

- [x] **패키지**: `react-kakao-maps-sdk`(React 컴포넌트로 카카오맵 SDK를 감싼 라이브러리, `useKakaoLoader` 훅으로 스크립트 로드) + `kakao.maps.d.ts`(타입 전용, devDependency) 설치. `tsconfig.app.json`의 `types`에 `"kakao.maps.d.ts"` 추가
- [x] **키 없을 때 폴백**: `MapCanvas`를 `VITE_KAKAO_MAP_KEY` 유무로 분기 — 키가 없으면 `useKakaoLoader()` 자체를 호출하는 컴포넌트(`KakaoMapCanvas`)를 아예 마운트하지 않고 기존 `PercentMapCanvas`를 바로 렌더링(불필요한 카카오 서버 네트워크 요청 자체가 안 나감). 키가 있어도 SDK 로드 실패(오프라인/잘못된 키 등) 시 `KakaoMapCanvas` 내부에서 동일하게 `PercentMapCanvas`로 폴백 — `src/api/client.ts`의 `withFallback()`과 같은 graceful-degradation 철학(에러를 띄우지 않고 조용히 기존 동작 유지)
- [x] **마커**: 기본 카카오 빨간 마커 이미지(`<MapMarker>`) 대신 `<CustomOverlayMap>` 사용 — 이름 텍스트가 적힌 알약모양 버튼 UI를 그대로 보존하기 위함(배경색은 이후 핫핑크로 변경, 아래 참고). 클릭 핸들러(`onSelectPlace`), 현위치 라벨 오버레이, 현위치/분석 버튼은 기존처럼 지도 컨테이너 위 절대위치 레이어로 유지
- [x] **인터페이스 무변경**: `MapPage.tsx`가 `MapCanvas`에 내려주는 props(`center`/`places`/`selectedPlaceId`/`onSelectPlace`/`onRequestLocation`/`locationLabel`)는 그대로라 `MapPage.tsx`는 한 줄도 안 바뀜. 장소 데이터는 여전히 기존 `fetchMapPlaces()`(`src/api/places.ts`, `withFallback()` 경유)를 그대로 거쳐서 내려옴 — 이번 작업은 그 결과를 "그리는 방식"만 교체한 것이라 **백엔드 교체 시 API 계약만 맞으면 프론트는 안 바뀐다는 원칙과 무관**(데이터 fetch 계층이 아니라 third-party 클라이언트 렌더링 SDK 교체). hslee 원본 `KakaoMapView.tsx`도 백엔드를 거치지 않고 프론트에서 직접 SDK를 로드하는 구조였던 것과 동일한 패턴
- [x] **검증**: `npx tsc --noEmit`/`npx eslint src` 클린(shadcn 3건 제외). `.env` 미생성(키 없음) 상태에서 Playwright로 실제 네트워크 요청 로그를 확인해 `dapi.kakao.com` 호출이 전혀 발생하지 않는 것 확인 + 퍼센트 미리보기 핀 렌더링/클릭→상세시트 기존과 동일 동작(회귀 없음) 확인
- [x] **실제 키 연동 + 트러블슈팅 2건** (사용자가 Kakao Developers에서 키 발급+도메인 등록+`.env` 입력 완료한 뒤 발견):
  1. **`ERR_BLOCKED_BY_ORB`**: `useKakaoLoader()` 기본 스크립트 URL이 프로토콜 생략형(`//dapi.kakao.com/...`)이라 `http://localhost:5173`에서는 `http://dapi.kakao.com`으로 요청됨 → 카카오 서버가 평문 http를 거부. `url: 'https://dapi.kakao.com/v2/maps/sdk.js'`로 명시 고정해서 해결
  2. **`NotAuthorizedError: disabled OPEN_MAP_AND_LOCAL service`**: curl로 직접 요청해서 정확한 원인 확인 — 2024-12부터 앱 생성+JS키 발급만으론 부족하고 **[제품 설정] > [카카오맵] > 활성화 설정 ON**을 콘솔에서 별도로 켜야 함(사용자가 콘솔에서 직접 처리)
  3. (디버깅 중 발견, 별도 이슈 아님) 코드를 고치는 동안 같은 브라우저 탭을 계속 켜둔 채 Vite HMR로 반영하면, `react-kakao-maps-sdk`의 `Loader` 싱글톤이 이전 실패 상태를 메모리에 들고 있다가 "Loader must not be called again with different options" 에러를 던져 ErrorBoundary로 빠짐 → 완전 새로고침(하드 리프레시)으로 해결, 코드 버그 아님
- [x] **마커 가시성 개선**: `bg-popover`(zinc 무채색)가 실제 컬러풀한 지도 위에서 거의 안 보이는 문제 발견 → `pinClassName()`을 핫핑크(`bg-pink-500`/선택 시 `bg-pink-600`+`scale-110`)로 변경(대화로 확정). `PercentMapCanvas` 폴백과 공유하는 함수라 두 렌더링 방식 모두 동일 적용
- [x] **선택 장소로 카메라 이동 + 위치 유지** (대화로 확정, 추가 기능 + 후속 수정): 지도 핀이든 우측 목록이든 장소를 클릭하면(`onSelectPlace`, 동일 핸들러) 지도가 그 장소로 자동 팬 이동(`isPanto`). `KakaoMapCanvas`에 `focusCenter` state를 두고 `<Map center>`를 검색 중심좌표 대신 선택 장소 좌표로 전환 — `MapPage.tsx`/props 변경 없음.
  - **1차 구현**: 상세시트를 닫아 선택 해제하면 다시 검색 중심으로 복귀하도록 만들었으나, **사용자 피드백**("닫으면 제자리로 돌아와서 도루묵") 받고 수정 — 선택 해제(상세시트 닫기)는 더 이상 `focusCenter`를 리셋하지 않고, 진짜 새로운 검색 중심이 생겼을 때(GPS 갱신, 다른 페이지에서 들어온 focus place — 즉 `center` prop 자체가 바뀔 때)만 리셋하도록 분리
  - **구현 디테일**: 처음엔 `useEffect` 2개(검색중심 변경 감지/선택 변경 감지)로 만들었다가 `react-hooks/set-state-in-effect` lint 에러(effect 안 setState는 불필요한 추가 렌더 유발) 발생 → React 공식 문서가 권장하는 "렌더 중 state 조정" 패턴(이전 렌더의 `center`/`selectedPlaceId`를 별도 state로 들고 렌더 바디에서 직접 비교+`setState`)으로 교체해 해결. Step9에서 비슷한 effect 패턴을 lazy initializer로 바꿨던 것과 같은 종류의 수정
  - Playwright로 먼 장소 선택→팬 이동→상세시트 닫기(Escape)까지 한 흐름으로 검증, 닫은 뒤에도 카메라가 원래 위치로 안 돌아가고 선택했던 장소에 그대로 머무는 것 스크린샷으로 확인
- [x] Playwright로 핫핑크 핀 렌더링 + 먼 장소(한강공원 여의도, 5.7km) 클릭 시 지도가 실제로 그 위치로 이동하는 것을 스크린샷으로 검증, 콘솔 에러 없음

### ⬜ ② 자체 백엔드 API
- .env 실제값(`VITE_API_BASE_URL`) 설정
- 각 페이지 API 연동 동작 확인(`src/api/{places,facilities,analyze,routes}.ts`)
- 빌드 최종 검증

### Step12(ProfilePage/LoginModal)에서 미뤄둔 항목 — ③④에서 처리
- **인증 SDK/아키텍처 확정**: Supabase 직접 호출(`@supabase/supabase-js`, 브라우저에서 `signInWithOAuth` 직접) vs 우리 백엔드가 OAuth를 중계하는 방식 중 이 시점에 결정. 결정 후 `src/lib/auth.ts`의 `getCurrentUser()`/`loginWithProvider()`/`logout()` **내부 구현만 교체** — `LoginModal`/`ProfilePage`/`TopBar` 등 호출부는 변경 없음
- **Google/Apple/Kakao 각 provider 콘솔 설정**: Google Cloud Console(OAuth client) / Apple Developer(Services ID+private key, 유료 멤버십 필요) / Kakao Developers(REST API 키+Redirect URI 등록) — Supabase 대시보드에 각 provider 키 입력
- **Supabase 프로젝트 생성 시 자동 제공되는 부분**: `auth.users` 테이블(비밀번호/OAuth 연결정보 저장, 우리가 스키마 설계 불필요), JWT 발급/검증, RLS(Row Level Security)로 `user_id` 기반 행 단위 접근제어
- **`saved_places` 테이블 신설**: `types/database.ts`에 추가(`user_id`/`place_id` 또는 장소 정보 직접 저장 여부 결정) + `src/lib/saved-places.ts`의 `fetchSavedPlaces()`/`toggleSavedPlace()` 내부를 실제 API 호출로 교체(호출부인 MapPage/HomeFeed/ProfilePage는 변경 없음)
- **설정(언어/알림) 실제 기능화**: 지금은 `settings-list.tsx`가 정적 표시만(2행 — "오프라인지도"/"지도데이터"는 Step12에서 이 아키텍처상 영구 불가능 판단으로 완전 제외됨, 위 "실제 구현" 참고) — 실제 토글 동작(언어는 이미 있는 i18n 전환과 연결, 알림은 Service Worker 없이 `Notification` Web API 기반 "탭 열려있는 동안" 알림으로 신규 설계 필요)
- **이메일/비밀번호 로그인 추가 여부 재검토**: Step12에서 OAuth만으로 확정했으나, 이 시점에 실제 사용자 피드백/요구사항 따라 재검토 가능

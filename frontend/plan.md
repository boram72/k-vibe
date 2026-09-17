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

### 3. 메모 — localStorage → DB 이전 대상 확정 (2026-07-19, Step15 ④ 범위)
`route-draft.ts`(`k-vibe-current-route`)/`route-progress.ts`(`k-vibe-route-progress`)/`persona-preference.ts`(`k-vibe-persona-preference`)/`theme-store`/`sidebar-store` 5개 검토 결과:
- **`theme-store`/`sidebar-store` → DB 이전 불필요, 로컬 유지 확정.** 기기별 UI 환경설정 성격이라 서버 동기화 가치 없음
- **`persona-preference`/`route-progress`/`route-draft` → DB 이전 대상 확정.**
  - `persona-preference`: 개인화 힌트(홈피드 카테고리 우선순위). 가벼움, 없어져도 기능 손실 적음 — 우선순위 하
  - `route-progress`: 완료 스팟 ID Set. RoutePage/ProfilePage가 공유하는 상태라 로그인 유저 기기 이동 시 동기화 가치 있음 — 우선순위 중
  - `route-draft`: 실제 루트 데이터(스팟 목록 전체, `RouteStop[]`). 사용자가 만든 핵심 콘텐츠 — **이전 가치 최상**
- **백엔드 기존 구조 대조**: `data_repositories/routeinfo.py`의 `userroute` 테이블(`GET/PUT /route/{username}`)이 route-draft와 개념 유사하나 컬럼이 `id`/`username`/`order`/`location`(문자열 1개)뿐이라 프론트 `RouteStop`(좌표/카테고리/체류시간/시작시각/완료여부/`fromPersona` 등)엔 스키마 부족 — 확장 또는 신규 테이블 필요. `data_repositories/personainfo.py`의 `persona` 테이블은 "K팝 스타별 고정 경로" 도메인이라 persona-preference(테마/디테일 위저드 선호도)와 이름만 같고 무관한 별개 개념 — 재사용 불가, 혼동 주의
- 마이그레이션 시 로그인 흐름(`presentation_api/user.py` → `data_repositories/userinfo.py` → `user` 테이블)과 동일한 3계층 패턴 그대로 적용 예정 — 아래 Step15 ④ 표 참고

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
  - **2026-07-20 수정 — Apple 제외**: Apple Developer 유료 멤버십 요구로 실제 연동 단계에서 제외, **Google+Kakao 2개**로 축소

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
- **Google/Kakao 각 provider 콘솔 설정** (Apple은 유료 멤버십으로 2026-07-20 제외): Google Cloud Console(OAuth client) / Kakao Developers(REST API 키+Redirect URI 등록) — Supabase 대시보드에 각 provider 키 입력
- **Supabase 프로젝트 생성 시 자동 제공되는 부분**: `auth.users` 테이블(비밀번호/OAuth 연결정보 저장, 우리가 스키마 설계 불필요), JWT 발급/검증, RLS(Row Level Security)로 `user_id` 기반 행 단위 접근제어
- **④ localStorage → DB 이전 대상 전체 목록** (2026-07-19 확정, 상세 판단 근거는 Step10 후속2 메모 참고):

  | lib 파일 | localStorage 키 | 이전 대상 | 전송 시점 |
  |---|---|---|---|
  | `lib/auth.ts` | `k-vibe-mock-session` | Supabase Auth (`auth.users`) | 로그인/회원가입 액션 시 즉시 (이미 실구현됨) |
  | `lib/saved-places.ts` | `k-vibe-saved-places:{userId\|guest}` | Supabase DB `saved_places` 테이블(신규 설계 필요) | **즉시 전송** — 하트 클릭은 단발 이산 이벤트, 디바운스 걸면 오히려 UX 저하 |
  | `lib/route-progress.ts` | `k-vibe-route-progress` | Supabase DB 신규 테이블 또는 기존 테이블 컬럼 확장(신규 설계 필요) — 우선순위 중 | **즉시 전송** — 완료 체크도 클릭 단위, 스팸 우려 없음 |
  | `lib/persona-preference.ts` | `k-vibe-persona-preference` | Supabase DB 신규 테이블(신규 설계 필요) — 우선순위 하 | **즉시 전송** — 위저드 완료 시 1회뿐 |
  | `lib/route-draft.ts` | `k-vibe-current-route`, `k-vibe-persona-plan` | Supabase DB 신규 테이블(신규 설계 필요) — 우선순위 최상 | **디바운스 전송** — 드래그 재정렬 등 연속 편집 발생, 마지막 변경 후 1~2초 뒤 1회 PUT(전체 덮어쓰기) + 페이지 이탈/탭 숨김 시 강제 flush |

  전송 빈도 기준: `route-draft`만 연속 편집이 실제 발생하는 유일한 케이스라 디바운스 필요, 나머지 4개는 "클릭하는 순간에만" 값이 바뀌는 단발 이벤트라 즉시 전송이 표준. `theme-store`/`sidebar-store`는 기기별 UI 상태라 DB 이전 대상에서 제외(로컬 유지 확정).
  - **참고**: `backend/db/schema.sql`에 `user`/`location`/`persona`/`docent`/`userroute` DDL이 있으나 "설계도" 파일일 뿐 자동 반영 안 됨(Supabase SQL Editor 수동 실행 필요) — 실제 연결된 프로젝트에 `user` 테이블조차 아직 없는 것으로 확인됨(`/user/login` 호출 시 `Could not find the table 'public.user'` 에러). 백엔드 작업 전 schema.sql 실행 여부부터 확인 필요
  - **`saved_places` 테이블 신설**: `types/database.ts`에 추가(`user_id`/`place_id` 또는 장소 정보 직접 저장 여부 결정) + `src/lib/saved-places.ts`의 `fetchSavedPlaces()`/`toggleSavedPlace()` 내부를 실제 API 호출로 교체(호출부인 MapPage/HomeFeed/ProfilePage는 변경 없음)
  - **route-draft/route-progress/persona-preference 3개 테이블 신설**: 백엔드 `data_repositories/routeinfo.py`의 `userroute` 테이블은 컬럼(`id`/`username`/`order`/`location`)이 부족해 그대로 재사용 불가 — 확장 또는 신규 테이블 필요. `data_repositories/personainfo.py`의 `persona` 테이블(K팝 스타 경로)은 이름만 같을 뿐 다른 도메인이라 재사용 불가
- **설정(언어/알림) 실제 기능화**: 지금은 `settings-list.tsx`가 정적 표시만(2행 — "오프라인지도"/"지도데이터"는 Step12에서 이 아키텍처상 영구 불가능 판단으로 완전 제외됨, 위 "실제 구현" 참고) — 실제 토글 동작(언어는 이미 있는 i18n 전환과 연결, 알림은 Service Worker 없이 `Notification` Web API 기반 "탭 열려있는 동안" 알림으로 신규 설계 필요)
- **이메일/비밀번호 로그인 추가 여부 재검토**: Step12에서 OAuth만으로 확정했으나, 이 시점에 실제 사용자 피드백/요구사항 따라 재검토 가능

---

## ✅ 2026-09 서비스 컨셉 변경 (PR #8~#22, Step 번호 밖의 별도 작업)

**배경**: "K-culture 스팟 발견" 앱에서 "좋아하는 스타의 루트를 따라가보자"는 컨셉으로 서비스 자체가 피벗됨. Step15(백엔드 연동) 진행 도중 별도로 들어온 작업이라 위 Step 번호 체계에는 안 끼워 넣고 이 섹션에 별도 기록. 파일 트리 레벨 상세(신규/미사용 파일 목록)는 `CLAUDE.md`의 "2026-09 갱신" 절 참고 — 여기서는 컨셉/의사결정만 정리.

### 변경 내용
- **홈 화면 재구성** (PR #11): SNS 분석기(유튜브 링크→루트 만들기)와 페르소나(아이유/뷔 등) 카드를 메인 진입점으로 승격, "근처 인기 K-스팟" 홈피드는 제거. 페르소나 카드 클릭 시 홈에서 바로 이동(구 2단계 테마/디테일 위저드 대신 K-콘텐츠 셀럽 선택 방식) — 장소 이미지 작게 추가, 장소설명은 스타 방문 스토리로 하드코딩. 페르소나는 사이드바/하단바 메뉴에서는 삭제(라우트는 유지, 홈 카드로만 진입).
- **지도 리뷰 기능** (PR #12): K팝 팬이 남기는 "찐리뷰" 추가 — 로그인한 사용자만 작성 가능, 미로그인 시 플레이스홀더로 안내.
- **SNS 분석기 면책 조항**: AI로 분석한 루트라는 점을 명시하는 면책 문구 추가.
- **편의시설 레이더 숨김** (PR #16): 실데이터 정확도가 낮고 "스타의 루트를 따라가보자" 컨셉과 기능 자체가 동떨어진다는 판단으로 내비게이션에서만 숨김(라우트/API/`RadarPage`는 그대로 유지 — 필요해지면 `nav-items.ts` 한 줄만 복구).
- **로그인**: 자체 DB 회원가입까지 관리할 필요가 없다는 판단으로 SNS 로그인만 유지(Step15 항목 ③ Supabase Auth OAuth 방향과 일치, 별도 변경 불필요).

### 코드에 남긴 흔적 (삭제 대신 주석 처리 — 컨셉 재변경 가능성 대비)
새 컨셉으로 인해 고아가 된 파일(구 홈피드, 구 페르소나 위저드 3단계 등)은 **삭제하지 않고 보존** — 각 파일 상단에 "왜 미사용이 됐는지 + 원복 시 어떻게 되살리는지"를 명시한 헤더 주석을 남겨 히스토리를 추적 가능하게 함. 목록/상세는 `CLAUDE.md` "2026-09 갱신" 절 참고.

### 검증
- `npx tsc --noEmit` / `npx eslint src` 클린(shadcn `components/ui/` 3건 제외)
- 주석 추가만 있는 파일들은 런타임 동작 변화 없음(리뷰 스켈레톤 재사용 등 실제 코드 수정 건은 별도 PR로 분리 — PR #28/#29)

---

## ⬜ 2026-09 팀 태스크보드 반영 (담당자: 보람)

**배경**: 팀 태스크보드(스크린샷)에서 담당자가 "보람"으로 표시된 항목만 추려서 정리. 하나씩 순서대로 처리 — 항목별로 계획 확정 후 착수.

- [x] **1. 홈화면 수정** (수원 샘플 이미지 반영, 대화로 세부사항 확정 — 2026-09)
  - [x] **배너**(`blocks/landing/home-banner.tsx` 신규) — 그라데이션 배경(라이트 `rose-500/pink-500/orange-400`, 다크 `rose-950/pink-950/neutral-900`) + 인사말(로그인 시 이름, 게스트는 `greeting_guest`) + "내 루트 만들기" CTA(클릭 시 `/route`, 데스크탑은 텍스트 아래·모바일은 배너 우측 하단에 별도 배치) + 우측 "OO 루트 미리보기"(데스크탑 전용, 모바일은 숨김) — 추천 페르소나 1명을 `fetchPersonaPlaces()`로 실제 장소 있는 쪽 우선 **무작위** 선택(두 쿼리 모두 settle된 뒤 1회만 선택), 홈 마운트마다 재추첨. 배너 껍데기는 데이터 없이 바로 노출하고 미리보기 카드만 내부적으로 스켈레톤. 모바일은 부제목 줄바꿈 위치가 어색해 `subtitle_mobile`(ko만 실제 개행, 나머지 로케일은 기존과 동일) 별도 사용
  - [x] **"찜한 장소" 카드**(기존 "저장한 루트" 자리를 대체, 제목 "찜한 장소") — `saved-places-grid.tsx`를 홈으로 이동. 장소별 "내 루트 추가" 버튼(이미 루트에 있으면 숨김, 클릭 시 추가+`/route`) 추가, place-detail-sheet.tsx와 동일하게 실제 장소 사진(`place.imageUrl`) 노출(없는 장소는 TourAPI에 사진 자체가 없는 경우 — 정상 폴백 아이콘). 개수가 많아져도 그리드+더보기 대신 가로스크롤(마우스 드래그 지원)로 전부 노출
  - [x] **"페르소나로 루트 찾기"**: 상위 4개만 카드로 노출(`routeCnt` 내림차순, 안정 정렬이라 동률은 응답 순서 유지). 카드는 기본적으로 `persona.profileImg`만 보여주고, 호버 중일 때만 `fetchPersonaPlaces()`로 얻은 실제 방문 장소 사진을 1.7초 간격으로 순환(오른쪽에서 슬라이드 인, `index.css`의 `.animate-persona-slide`), 호버 해제 시 profileImg로 복귀. 전환 전에 이미지를 미리 로드(`preloadImages`)해 속도가 이미지마다 들쭉날쭉해 보이지 않게 함
  - [x] 배너/찜한장소 스켈레톤 신규 추가(페르소나 카드는 기존에도 있었음)
  - [x] **덤 작업(대화 중 요청)**: 사이트 전체 폰트를 Geist → Pretendard Variable로 교체(`npm install pretendard`, `@fontsource-variable/geist` 제거)
- [x] **2. 페르소나 페이지 원복** — `nav-items.ts`에서 PR #11로 숨겼던 페르소나 메뉴 항목만 복구(주석 해제). 라우트(`/persona`)/페이지 자체는 삭제된 적 없이 메뉴 노출만 빠져있던 것 확인. 사이드바/하단바 둘 다 노출+클릭 시 `/persona` 이동 Playwright로 확인. 추가로 `PersonaPage.tsx`의 페르소나 선택 목록 룩을 홈(`persona-picker.tsx`)과 동일한 정사각 사진 카드로 통일하고 2열(데스크탑 4열) 그리드로 재배치, 컨테이너 폭을 "내 루트"(RoutePage)와 동일한 `md:max-w-6xl`로 맞춰 카드도 같이 커짐, `ZoomableImage`에 `fill` prop 추가해 사진이 정사각 칸을 완전히 채우도록 수정(대화로 확정)
- [x] **3. 페르소나 6명으로 늘리기** (데이터: 가현 담당) — 프론트 코드 확인 결과 `persona-picker.tsx`/`PersonaPage.tsx` 둘 다 `fetchKContentPersonas()` 응답을 그대로 `.map()`하고 있어 하드코딩된 개수 제한 없음. 백엔드 `/personas`가 현재 4명(BTS뷔/아이유/제니/장원영) 리턴 중인 것 직접 호출로 확인 — 가현님이 `personaCatalogInfo.py`의 `PERSONAS`에 2명 추가하면 프론트 변경 없이 바로 6명 표시됨(프론트 작업 없음)
- [x] **4. 다른 페이지 보다가 돌아왔을 때 내 위치로 복귀하는 기능** (담당자 미정 — 보드에 "?", PR #52) — "현재 위치" 버튼 자체는 이미 있었고 카카오 API 신규 연동도 필요 없었음, 버그 2건이 원인이었음: ① `map-canvas.tsx`의 위치 버튼들이 z-index 없이 DOM 순서에만 의존해서 실제 카카오 지도 SVG 레이어에 가려짐(배포 사이트에서 `elementFromPoint()`로 확인) → `z-10` 명시 ② `react-kakao-maps-sdk`의 `<Map center>`가 값이 실제로 바뀔 때만 카메라를 이동시켜서, 장소 클릭/드래그로 지도를 옮긴 뒤엔 GPS 좌표값 자체가 안 바뀌어 버튼을 눌러도 무반응이었음 → map 인스턴스에 직접 `panTo()` 호출로 해결. 실제 카카오 지도 키로 로컬 테스트 완료
- [x] **5. 위치가 바뀌었을 때 장소 목록 다시 가져오기** — 백엔드 `/places`는 원래도 임의의 lat/lng를 받으므로 백엔드 수정 없음. 지도를 손으로 드래그하면(`onDragEnd`) 상단 중앙에 "이 지역에서 검색" 버튼이 뜨고, 누르면 그 좌표를 `searchCenter`로 승격해 `/places`를 재조회. "현재 위치"를 누르면 `searchCenter`를 비우고 GPS 좌표로 복귀
- [x] **6. 동네검색 기능** (담당자 미정 — 보드에 "?") — 기존 검색창(주변 스팟 텍스트 필터)은 그대로 두고, `kakao.maps.services`(`libraries: ['services']`) 키워드 장소검색으로 "강남"류 지역명을 좌표로 변환해 5번의 `searchCenter` 메커니즘에 그대로 태움. 순수 프론트 기능(카카오 지도 SDK 자체가 프론트 전용), 백엔드 변경 없음. 모바일은 Enter 입력이 마땅치 않아 검색창 옆(하트 토글 옆)에 명시적 버튼 추가, 못 찾으면 토스트 안내
- [x] **7. 도슨트 기능 삭제** — 완전 삭제 대신 버튼만 숨김으로 처리(대화로 확정). `RoutePage.tsx`가 `RouteStopList`에 내려주는 `onDocent`를 항상 `undefined`로 고정 → `route-stop-card.tsx`의 `stop.fromPersona && onDocent` 조건이 항상 false가 되어 버튼 자체가 안 그려짐. `docent-player.tsx`/`api/docent.ts`/연동 코드는 그대로 남겨서 되돌리기 쉬움
- [x] **8. 카카오 로그인 삭제** — Google만 남기는 방향으로 진행(PR #48). `login-modal.tsx`에서 카카오 버튼 제거, `AuthProvider` 타입 `'google'`로 좁힘. 백엔드 카카오 지원 코드는 그대로 둠- [x] **9. K-Vibe 지도에 '스타별'/'카테고리별' 필터 추가** (DB 태그: 가현 담당, PR #51) — 지도 필터를 "카테고리별"/"스타별" 탭으로 전환. 스타 옵션 목록은 새 API 없이 페르소나 카탈로그(`fetchKContentPersonas`)의 `label`을 재사용, 필터링은 `place.tags`에 그 `label`과 일치하는 값이 있는지로 판단 — 가현님이 장소 `tags`에 스타 이름만 넣어주면 프론트 추가 변경 없이 바로 연동됨. 겸사겸사 지도 하트(찜) 버튼도 "찜한 것만 필터"에서 "찜 목록 섹션 토글"로 변경(찜 목록→주변 스팟→연관 관광지 추천 순으로 항상 다 보임)
- [ ] **10. 우측 상단 '계정' 클릭 시 내정보/설정만 보이도록** (현재 노출되는 장소 목록 제거)
- [x] **11. 하트 버튼 라벨 검토** — "찜"으로 변경 확정, 적용 완료(PR #47). 루트 저장 관련 문구는 그대로 둠
- [x] **12. 지도 스타별 필터 ↔ 페르소나 장소 실제 연동** (`FRONTEND_TODO_map_pan_search.md` 3번째 항목) — `GET /personas/places?locale=`(페르소나 태그가 붙은 실제 장소, `Place` 타입과 1:1 대응, `api/personas.ts`의 `fetchPersonaPlaces()`)를 지도 진입 시 1회 불러와, **스타별 탭일 때만** `MapPage.tsx`의 `candidates`에 `id` 기준 중복 제거 병합(카테고리 탭의 "전체"가 페르소나의 전국구 장소까지 섞여 "현재 위치 주변"이라는 의미가 깨지지 않도록 분리). "전체" 클릭 시 페르소나 태그가 있는 장소 전체 노출(위치 반경 무관, 카테고리 탭의 "전체"와 의미가 다름 — 대화로 확정), 특정 스타 클릭 시 그 태그만 필터. 각 장소 행에 소속 `persona.label`을 뱃지로 별도 표시(스타 탭에서는 기존 카테고리 태그 대신 노출). 빨간 펄스 "내 위치" 마커(13번에서 만든 `CurrentLocationPin`, `blocks/common/`으로 공용화)를 지도 메뉴에도 추가(`use-current-location.ts`에 `isPrecise` 플래그 추가해 폴백 좌표엔 안 찍음). **백엔드 데이터 갭 발견**: `/personas/places`가 6명 중 BTS뷔/아이유/제니 3명분만 내려주고 장원영/코르티스 성현/투어스 신유는 비어있음 → `BACKEND_REQUESTS.md` 2번 항목으로 요청 등록(프론트는 하드코딩 없이 그대로 쓰는 구조라 데이터만 채워지면 자동 반영), Playwright로 카테고리 "전체"(30건) vs 스타 "전체"(13건, 페르소나 장소만) 대조 확인
- [x] **13. 내 루트 '현재 거리' 확인 문구 개선 + 미니맵 내 위치 핀** — 기능 자체는 정상 동작(브라우저 GPS로 다음 스팟까지 haversine 거리 계산, 백엔드 호출 없음). "현재 위치에서 {{name}}까지 {{distance}}"처럼 출발~도착 둘 다 명시하도록 문구 수정(`route.next_stop_near`/`next_stop_far`), "위치 확인" 버튼으로 얻은 GPS 좌표를 `route-mini-map.tsx`에 빨간 펄스 핀(`CurrentLocationPin`)으로 표시(페이지 진입만으로 위치 권한을 자동 요청하지 않도록 버튼 클릭 결과를 재사용 — Kakao 미니맵은 내 위치도 bounds에 포함해 카메라가 같이 보여줌)
- [x] **14. 리뷰가 보였다 안 보였다 하는 버그 수정** (`FRONTEND_TODO_map_pan_search.md` 2번째 항목) — `api/reviews.ts`의 `withFallback()`이 API 실패 시 조용히 브라우저별 `localStorage` mock으로 새서 기기/시크릿창마다 다르게 보이던 문제. 실제 백엔드가 이미 정상 동작 중이므로(다른 `api/*.ts`처럼 "백엔드 아직 없음" 케이스가 아님) `withFallback` 제거하고 직접 호출, 실패 시 에러+재시도 UI 추가(`place-review-tab.tsx`, 조회 실패는 `AlertCircle`+재시도 버튼, 작성 실패는 전용 토스트 문구 `placeDetail.review_submit_error`), 조용한 localStorage mock 저장소는 삭제
- [x] **15. 홈 진입 시 `/personas`가 en→ko로 2번 호출되는 문제 수정** (`FRONTEND_TODO_map_pan_search.md` 4번째 항목) — `i18n/index.ts`가 항상 `lng: 'en'`으로 먼저 초기화된 뒤 `LocaleGuard`가 마운트 후 effect에서 `changeLanguage`를 불러서, `PersonaPicker`가 `en`으로 1차 호출 후 `ko`로 2차 호출하는 낭비 발생. `i18n.init()`의 `lng` 초기값을 URL 경로(또는 `localStorage`)에서 첫 렌더 전에 동기적으로 읽어오도록 수정해 `PersonaPicker` 최초 렌더부터 올바른 locale이 들어가게 함(`LocaleGuard.tsx`도 동일 상수 `LOCALE_STORAGE_KEY` 재사용하도록 정리)
- [x] **17. 페르소나 결과 화면에서 스팟별 추가/제외 선택** (보드 번호 없음, 대화 중 요청) — 페르소나를 고르면 뜨는 방문 루트 결과(`route-result.tsx`)를 편집 없이 통째로만 "내 루트"에 추가할 수 있어서, 필요 없는 스팟까지 일단 다 넣은 뒤 RoutePage에서 지워야 했던 불편함 해소. **DB/localStorage 저장 없는 화면 로컬 상태**로 한정(대화로 확정 — 다른 페이지 갔다 돌아오거나 새로고침하면 전부 포함 상태로 리셋되는 게 의도된 동작): `route-result.tsx`에 `excludedIds: Set<string>` state 추가, 각 스팟 카드에 원형 토글 버튼(포함 상태: 빨간 X="제외" / 제외 상태: 초록 +="추가", 아이콘 배경 없이 색상만으로 구분) 배치. 제외된 스팟은 목록에서 지우지 않고 그대로 두되 반투명+취소선+"제외됨" 뱃지로 구분, 다시 눌러 복귀 가능. 상단 통계(장소/도보/전체 시간)는 포함된 스팟만 기준으로 재계산 — 도보시간은 `lib/haversine.ts`의 `totalRouteMinutes()`를 포함된 스팟 좌표로 다시 호출(제외된 스팟은 건너뛰고 남은 스팟끼리 바로 연결된다고 가정). `onAddToRoute` 콜백을 인자 없는 `() => void`에서 `(stops: RouteStop[]) => void`로 변경해 포함된 스팟만 `PersonaPage.handleAddToRoute`로 전달(원본 `plan`/`savePersonaRoutePlan`은 선별 여부와 무관하게 전체 그대로 저장 — 도슨트 등이 참조하는 "원래 계획" 기록이라 보존). 전부 제외한 상태에서 "루트에 추가"를 누르면 토스트로 안내 후 무시(버튼도 비활성화). Playwright로 스팟 1개 제외→통계 갱신 확인→재포함→원복 확인, 전체 제외 시 버튼 비활성화, 1개만 재포함 후 그 1곳만 필터된 통계 확인
- [x] **16. 지도 모바일 스팟 목록 패널 3단계 스와이프** (대화로 확정) — 기존 2단계(펼침/접힘, 접힘도 필터까지 같이 보임)를 3단계로 확장: 기본(기존 펼침과 동일) ↔ 위로 스와이프 시 전체화면(목록이 화면 대부분 차지, 지도는 `h-16`로 축소) ↔ 아래로 스와이프 시 최소화면(검색창만 남고 필터/찜목록/타이틀/목록 전부 숨김). `spot-list-panel.tsx`에 `mobilePanelState: 'minimized'|'default'|'full'`(데스크탑 접기/펴기`isCollapsed`와는 완전히 별개 상태) 신규, 스와이프 방향에 따라 3단계를 순서대로 이동(끝에서는 clamp). **버그 발견·수정 2건**: ① `map-canvas.tsx` 루트 div의 `min-h-70`(280px 최소 높이)이 전체화면 단계의 `h-16` 축소를 무력화해서 지도가 여전히 280px를 차지하며 패널 상단(스와이프 핸들)을 덮어버려 스와이프 자체가 안 먹는 문제 → `elementFromPoint()`로 실제 확인, `compact` prop 추가해 전체화면일 때만 `min-h-0`으로 오버라이드 ② 컨테이너 크기가 CSS로 바뀌어도 카카오 지도 SDK가 스스로 감지 못해 마지막 렌더 크기 그대로 남아있는 문제(대부분의 지도 SDK 공통 특성, 구글맵의 `google.maps.event.trigger(map,'resize')`와 동일한 역할) → `compact` prop이 바뀔 때 `map.relayout()` + 중심 재설정 호출. Playwright로 3단계 양방향 반복 전환+clamp 확인, 스크린샷으로 전체화면/기본 왕복 시 지도 타일이 빈틈없이 채워지는 것 확인
- [x] **지도 "스타별" → "페르소나별" 라벨 변경 + 페르소나 다중선택 + 선택 장소로 지도 자동 이동/줌아웃** (보드 번호 없음, 대화 중 요청) — `messages/{ko,en,ja,zh}.json`의 `map.filter_mode_star` 표시 텍스트만 교체(내부 변수명 `filterMode: 'star'`/`starFilter`/`StarFilter` 등은 변경 범위가 커서 그대로 유지, `persona.nav_title` 등 기존 번역과 통일된 표현 사용: ko "페르소나별", en "By Persona", ja "ペルソナ別", zh "按角色"). **다중선택으로 전환**(대화 중 추가 요청) — `star-filter.tsx`/`spot-list-panel.tsx`/`MapPage.tsx`의 `starFilter` 타입을 `string | null` → `string[]`로 변경(빈 배열 = "전체", `CategoryFilter`의 `'all'` 리터럴 멤버 방식과 달리 페르소나 라벨은 API가 내려주는 자유 문자열이라 sentinel을 둘 수 없어 빈 배열로 표현), 여러 페르소나를 동시에 눌러 태그가 하나라도 일치하는 장소를 모두 보여줄 수 있음. **지도 자동 이동/줌아웃**(사용자 질문 — "그 페르소나별 조회했을 때 내가 그 장소 주변이 아니면 안 보인다고 지도를 옮겨줄 수 있냐") — `MapPage.tsx`에 `personaFocusPlaces`(현재 선택된 페르소나 태그와 일치하는 `personaPlaces`만, 카테고리/검색어와는 무관하게 계산 — 검색창에 글자를 칠 때마다 지도가 다시 튀는 걸 방지) 추가, 기존에 Analyze/Radar 핸드오프(`focusPlaces`)에만 쓰이던 `MapCanvas`의 `fitPlaces` prop(내부적으로 `fitKakaoMapToPlaces()`의 `setBounds`/`setCenter`+`setLevel` 로직 이미 존재)을 재사용해 페르소나별 탭에서 선택이 바뀔 때도 그 장소들을 전부 담도록 자동으로 지도를 이동/줌아웃하게 함(같은 매커니즘이라 새 지도 로직 추가 없음). `focusPlaces`(다른 페이지 핸드오프)가 있으면 그게 항상 우선. Playwright로 다중선택 토글(선택/해제/전체 리셋)이 목록 카운트와 정확히 맞물려 동작하는 것과, GPS를 부산으로 mock한 뒤 "아이유" 페르소나를 선택하면 지도가 자동으로 서울 일대(장소 5곳)로 이동/줌아웃하는 것을 스크린샷으로 확인
- [x] **홈 페르소나 카드 모바일 롱프레스 슬라이드쇼** (보드 번호 없음, 대화 중 요청) — 데스크탑 마우스 호버로만 볼 수 있던 페르소나 방문 장소 슬라이드쇼(1번 항목)를 모바일에서도 볼 수 있게, 카드를 꾹 누르고 있는 동안 화면 85%(가장자리 여백 7.5%) 크기의 이미지 팝업으로 동일한 슬라이드쇼를 띄우고 손을 떼면 사라지도록 `persona-picker.tsx`의 `PersonaCard`에 추가. 카드 목록이 가로 스크롤이라 "스크롤 스와이프"와 "꾹 누르기"를 구분해야 해서 `LONG_PRESS_MS`(350ms) 동안 `LONG_PRESS_MOVE_THRESHOLD_PX`(10px) 이상 안 움직였을 때만 롱프레스로 인정, 그 전에 크게 움직이면 타이머만 취소하고 네이티브 스크롤이 그대로 진행되게 둠(preventDefault 안 함). 짧은 탭은 `suppressClickRef` 가드로 기존 선택(onSelect) 동작 그대로 유지. 팝업은 `createPortal`로 `document.body`에 렌더링(카드의 `overflow-x-auto` 조상에 잘리지 않도록), 기존 `isHovering`/`startCycle`/`stopCycle`을 그대로 재사용해 데스크탑 호버 로직은 전혀 안 건드림(`isLongPressing`은 오직 팝업 노출 여부만 별도로 제어). **버그 발견·수정**: 처음엔 순수 Touch 이벤트(`onTouchStart`/`onTouchMove`/`onTouchEnd`/`onTouchCancel`)로 구현했는데, 실기기 테스트에서 롱프레스 팝업이 손을 떼도 안 닫히는 버그 발생(터치 종료 이벤트가 카드 버튼으로 안 돌아옴 — 팝업 오버레이가 화면을 덮는 순간 실기기/브라우저별로 터치의 "시작 지점이 계속 받는다"는 암묵적 보장이 깨지는 경우가 있었음) → `spot-list-panel.tsx`의 모바일 스와이프 핸들과 동일한 이유로 이미 확립된 해법인 **Pointer Events + `setPointerCapture(pointerId)`**로 전환(`onPointerDown`/`onPointerMove`/`onPointerUp`/`onPointerCancel`, `e.pointerType === 'touch'`로 마우스는 필터링해 데스크탑 동작과 완전히 분리) — 포인터 캡처는 이후 move/up/cancel이 무조건 그 엘리먼트로만 오게 강제하는 명시적 스펙 보장이라 근본적으로 해결됨. 실기기로 재검증 완료(사용자 확인).

## ⬜ 2026-09 QA 피드백 반영 (`테스트_v2.pptx`, 담당자: 보람)

**배경**: 팀에서 만든 QA 슬라이드(`테스트_v2.pptx`, 17장 — 홈화면/페르소나/K-Vibe 지도/내루트/제안사항 5개 섹션)를 읽고 항목별로 정리한 뒤, 대화로 우선순위·제외 여부·구체적인 수정 방향을 확정. **작업 순서: 홈화면 → 페르소나 → K-Vibe 지도 → 내루트 → 제안사항** 순으로 진행.

### 홈화면
- [x] **1. 지도 지역검색 시 카페 등 리스트가 안 뜨는 문제** — **진단 결과: 검색 버그 아님, 백엔드 데이터 소스(TourAPI)의 구조적 한계.** 실제 `/places`를 성수동 좌표로 직접 호출해 검증 — 30건 중 카테고리 분포가 `{culture:4, food:25, stay:1}`뿐이고 fun/cafe/photo는 0건, 이름에 "카페"가 들어간 곳(1곳)도 실제로는 `food`로 분류되어 있었음. 원인은 `externelAPI_services/tourAPI.py`의 `CONTENT_TYPE_TO_CATEGORY` 매핑 — TourAPI에는 애초에 "카페" 전용 콘텐츠타입이 없어 전부 "음식점(39)"으로 뭉뚱그려져 `food`로 들어오고, "인생네컷"/"코인노래방"/"방탈출" 같은 업종은 TourAPI가 아예 취급하지 않음. **후속 조치 겸 카테고리 재구성**(대화로 확정) — 실데이터가 절대 안 채워지는 `'cafe'`/`'photo'`를 필터 칩 목록에서 완전히 제거. 겸사겸사 기존 "관광지+문화시설+레포츠+축제+쇼핑"을 몽땅 `culture`/`fun` 2개로 뭉쳐놨던 것도(실제로는 TourAPI가 이 5개를 전부 구분해서 갖고 있는데 프론트가 안 나눴던 것 — 서울 도심 100건 기준 축제 7건/쇼핑 14건 실측 확인) **"관광지/문화/축제/쇼핑/음식/숙소" 6개로 재분류**: `attraction`(관광지 12+레포츠 28, 레포츠는 도심 기준 데이터 희소해 편입)/`culture`(문화시설 14, 기존보다 범위 좁아짐)/`festival`(축제행사 15, 신규)/`shopping`(쇼핑 38, 신규)/`food`/`stay`. 백엔드(`tourAPI.py`)+프론트(`types/place.ts`, `PLACE_CATEGORIES`) 동시 수정, 백엔드 테스트(`test_tourAPI.py`) 업데이트 후 92개 전체 통과 확인.
- [x] **2. 홈 "지도에서 보기" 버튼이 실제로 지도 탭으로 이동 안 함** — 실제 위치는 홈 화면 "찜한 장소" 카드가 비어있을 때 뜨는 빈 상태 CTA(`saved-places-grid.tsx`)였음. **원인**: 이 컴포넌트가 원래 ProfilePage(`/:locale/profile`, 상대경로 한 단계 깊이)에 있다가 홈(`/:locale` index 라우트)으로 옮겨왔는데, `navigate('../map')`처럼 `../`가 붙은 상대경로 3곳(빈 상태 버튼/장소 클릭/루트추가)이 그대로 남아있어서 실제로는 한 단계 더 위(`/`)로 올라가 라우터의 `*` catch-all에 걸려 홈으로 되튕기고 있었음(클릭해도 아무 반응 없는 것처럼 보임) — `../map`/`../route` → `map`/`route`로 수정. **추가 발견·수정**: "찜취소"(하트) 버튼도 안 눌리는 버그 발견 — 카드 목록의 마우스 드래그 스크롤 구현(`handlePointerDown`)이 카드 내부 어떤 버튼을 눌러도 무조건 스크롤 컨테이너로 포인터를 캡처해버려서 버튼 자신의 클릭이 씹히고 있었음(`e.target.closest('button')`이면 캡처하지 않도록 가드 추가). Playwright로 장소 저장→홈 카드 클릭→`/map` 이동, 찜취소 클릭→카드 실제 소멸, 빈 상태 버튼→`/map` 이동까지 전부 확인.

### 페르소나
- ~~3. [제니] 평점 0.0 + 뷔/신유 카운트 오류~~ — 이미 수정 완료(리뷰점수 평균 반영 + persona 등록 장소 카운팅 수정)로 확인되어 **이번 작업 범위에서 제외**.
- ~~4. 코르티스 성현/투어스 신유 클릭 시 루트 장소 평점 0점 + 이미지 미노출~~ — 대화로 **이번 작업 범위에서 제외** 확정.
- [x] **5. 특정 스타 페르소나 클릭 후 "뒤로가기" 시 엉뚱한 화면으로 이동** — 대화로 정확한 요구사항 확정: 홈에서 페르소나 카드를 눌러 결과 화면(step2)으로 갔으면 뒤로가기 시 홈으로, 페르소나 메뉴(카드 선택 목록, step1)에서 카드를 눌러 결과 화면으로 갔으면 뒤로가기 시 그 선택 목록으로 돌아가야 함. **원인**: `PersonaPage.tsx`의 step1(카드 목록)→step2(생성 결과) 전환이 실제 브라우저 히스토리에 안 쌓이고 컴포넌트 로컬 state(`selectedPersona`/`plan`)로만 처리되고 있었음 — 홈에서 온 경우(quick entry)는 애초에 `navigate('persona', {state})`로 진입해서 히스토리가 정상이라 문제없었지만, 페르소나 메뉴에서 카드를 고르는 경우는 같은 URL(`/persona`) 안에서 state만 바뀌는 것이었어서 뒤로가기를 누르면 이 페이지 진입 이전의 아무 화면(예: 사이드바 "내 루트"를 거쳐 들어왔다면 거기)으로 튀었음. **수정**: 카드 선택을 `navigate('.', { state: { selectedPersonaId } })`(같은 경로에 새 히스토리 항목 push)로 바꾸고, 루트 생성 결과를 로컬 state 대신 `location.state` 기반 `useQuery`로 파생시키도록 재구성 — 브라우저 뒤로가기가 히스토리를 그대로 한 단계 되짚어가므로 홈에서 왔으면 홈으로, 메뉴에서 왔으면 메뉴로 정확히 돌아감. 화면 안의 "다른 루트 만들기"(RotateCcw) 버튼도 `navigate(-1)`로 통일해 뒤로가기와 완전히 동일하게 동작(예전엔 `navigate('..')`로 새 항목을 push해버려서 히스토리가 계속 쌓이는 부수 버그도 있었음, 이번에 같이 정리). Playwright로 두 진입 경로 각각 브라우저 back과 "다른 루트 만들기" 버튼 모두 검증 완료.

### K-Vibe 지도
- [x] **6. 관광지 추천 토글 + 우선순위 정리** — 대화로 요청 내용 확정: 지도에 항상 화면 한참 아래에 있어야 나오던 "이 지역 연관 관광지 추천"(`related-attractions-list.tsx`, 기존부터 있던 기능)을 토글 버튼(스팟 목록 검색창 옆, 찜 토글 옆)으로 켜고 끌 수 있게 변경, 켜면 목록 최상단 쪽에 노출되도록 우선순위 확정: **찜 > 관광지 추천 > 주변 스팟**(찜+관광지 둘 다 켜졌을 때도 이 순서 고정). `spot-list-panel.tsx`에 `showAttractions` state(부모 `MapPage.tsx` 소유)+토글 버튼 추가, 기존 `savedListSection`과 동일 패턴(자체 `max-h-72 overflow-y-auto` 캡)으로 `attractionsSection`을 만들어 `savedListSection`과 `titleRow`(주변 스팟 타이틀) 사이에 배치(모바일/데스크탑 둘 다 동일 순서). 토글 아이콘은 처음에 관광지 카테고리 칩과 같은 `Landmark`를 썼다가 두 아이콘이 똑같아 구분이 안 된다는 피드백으로 `Sparkles`(추천 느낌)로 교체. **추가 발견·수정**: 추천 목록 항목이 클릭이 전혀 안 되는 정적 텍스트였음 — TourAPI 연관관광지 응답엔 좌표가 없어(이름/지역명뿐) 곧바로 지도 포커스를 못 시키므로, 클릭 시 그 이름으로 8번에서 만든 카카오 검색(`searchKakaoArea`)을 직접 호출해 위치를 찾아 지도를 이동+빨간 핀 강조하도록 연결(검색창 텍스트는 건드리지 않음 — 사용자가 타이핑한 검색어가 아니라 목록 클릭이라 구분). 겸사겸사 카카오 검색으로 찾은 스팟(상세시트의 전화번호/영업시간/태그)은 우리 백엔드에 없는 id라 상세조회가 항상 mock 폴백으로 빠져 가짜 정보(`02-1234-5678` 등)를 진짜처럼 보여주고 있던 것도 발견해 mock 값을 내부적으로 `'-'` 센티널로, 태그는 아예 비우도록 수정(`api/places.ts`의 `MOCK_PLACE_DETAIL`) — 화면엔 그 `'-'`를 그대로 노출하지 않고 4개 언어로 번역된 "서비스 준비중"(`placeDetail.info_unavailable`) 문구로 표시. Playwright로 토글 온/오프, 찜+관광지 동시 온 시 순서(찜→관광지 추천→주변 스팟 y좌표 순서 확인), 추천 항목 클릭 시 검색창 값 불변+지도 실제 이동(강남 지역 예시로 좌표 재확인), 카카오 검색 결과 상세시트에 "서비스 준비중" 표시(한/영 둘 다) 검증 완료.
- [x] **7. 카테고리 필터 다중선택 → 단일선택 전환** — `category-filter.tsx`/`MapPage.tsx`의 `categories`를 `PlaceCategory[]` → `PlaceCategory`(단일값)로 변경, 라디오 버튼 방식(하나 고르면 이전 선택 자동 해제, 이미 선택된 걸 다시 누르면 "전체"로 복귀)으로 전환.
- [x] **8. 지도 검색 — 상호명(업체명) 검색 + 지역명 검색 전면 개선** — 사용자 확인대로 상호명 검색이 안 되던 원인은 검색 자체 실패가 아니라, 카카오 키워드검색으로 찾은 좌표만 취해서 그 주변을 TourAPI로 재조회하는 구조 때문(TourAPI엔 일반 상업시설 자체가 없어 검색한 가게가 결과에 안 나타남) — 카카오 키워드검색 결과 자체(상호명/좌표/카테고리)를 `Place`로 변환해 지도에 직접 표시하도록 전면 교체(`kakao-area-search.ts`). **추가로 발견·수정한 것들**: ① "스타벅스"처럼 지역명 없는 검색이 위치 힌트 없이는 전국 아무 지점(실사용 중 북한산 인근 확인)으로 튀는 버그 → 검색 시점 지도 중심을 `location`+`sort: DISTANCE`로 넘겨 거리순 정렬 ② 검색 결과가 다른 카테고리 핀과 섞여 안 보인다는 피드백 → 매칭된 장소 전부에 실제 지도 마커 모양(아래가 뾰족한 핀, 가운데는 흰 원)의 빨간 핀 강조 표시 추가(`map-canvas.tsx`, 다음 검색이나 "현재 위치" 버튼 누를 때까지 유지) ③ "강남"/"이태원" 같은 순수 지역명이 그 이름이 들어간 업체(강남역 등)로 잘못 잡히는 문제 — 버그가 아니라 API 성격 차이(keywordSearch=상호명 검색, 지역명은 `Geocoder.addressSearch`가 정확)로 확인 → **`addressSearch` 우선 시도 → 실패 시 keywordSearch 폴백**으로 구조 변경(실측: "강남"/"이태원"은 addressSearch로 정확히 행정구역 중심좌표 매칭, "한강"/"스타벅스"는 addressSearch가 못 찾아 keywordSearch로 자연스럽게 폴백) ④ 검색 성공 시 검색어를 지워버려서 뭘 검색했는지 알 수 없던 것 → 검색어는 남기되, 그 텍스트가 그대로인 동안은 방금 받아온 결과를 다시 텍스트로 걸러내지 않도록 `areaSearchedQuery` 분리 관리.
- [x] **9. 모바일에서 검색 시 화면 비율이 안 유지됨 + 사이드바/하단바 접었을 때 지도가 화면을 다 못 채움** — 두 가지 서로 다른 원인의 버그였음. **① 모바일 화면 비율 문제**: 검색창의 `text-sm`(14px) 폰트가 iOS Safari의 "포커스한 input 폰트가 16px 미만이면 화면을 자동으로 확대(줌인)하는" 동작을 유발 — 모바일에서만 `text-base`(16px)로, 데스크탑은 기존 14px 유지. **② 사이드바/하단바 접었을 때 지도가 안 채워지는 문제**: 예전 모바일 "전체화면" 스와이프 때 고쳤던 것과 같은 클래스의 버그가 다른 트리거(데스크탑 사이드바 접기)로 재발한 것 — 카카오 지도는 컨테이너 크기가 CSS로 바뀌어도 스스로 감지 못 하는데, 그때는 `compact` prop 하나만 감지해서 고쳐서 사이드바처럼 무관한 원인으로는 재발했음. 특정 트리거를 일일이 쫓는 대신 지도 컨테이너를 `ResizeObserver`로 직접 지켜봐서 "원인이 뭐든 실제 크기가 바뀌면" 항상 `map.relayout()`하도록 근본적으로 수정. Playwright로 사이드바 접기/펴기 전후 스크린샷 비교해 빈틈없이 채워지는 것 확인, 모바일/데스크탑 검색창 font-size(16px/14px) 확인.

### 내루트
- [x] **10. 같은 장소를 내 루트에 중복 추가할 수 있음** — `route-draft.ts`의 `addStopToRouteDraft`/`addStopsToRouteDraft`가 스팟 *인스턴스* id(`stop.id`) 기준으로만 중복을 걸렀는데, 페르소나 루트를 다시 추가할 때마다 `${s.id}-${타임스탬프}`로 매번 새 id를 만들어서 실제로는 같은 장소인데도 안 걸러지고 있었음(내 루트 정확도 문제) — 실제 장소 정체성인 `placeId`(없으면 `id`) 기준으로 이미 루트에 있는지 먼저 확인하도록 수정, 이미 있으면 새로 추가하지 않고 건너뜀(대화 중 요청대로 "훑어서 있으면 패싱"). 부가로 이미 추가된 상태에서 "루트에 추가"를 누르면 기존 "루트에 추가됐어요" 대신 **"이미 추가된 루트예요"** 토스트가 뜨도록 4개 진입점(MapPage 상세시트/찜한 장소/Analyze 개별·전체추가/Persona 결과) 전부 수정, 4개 언어 i18n 적용(`common.already_in_route`). Playwright로 같은 페르소나 루트를 두 번 추가해도 스팟 개수가 늘지 않는 것 확인.
- [x] **11. 로그인 상태에서 로그아웃해도 "내 루트"가 초기화되지 않음** — 사용자 추측대로 로컬스토리지 원인이 맞았음: `lib/auth.ts`의 `logout()`이 로그인 세션(`k-vibe-mock-session`)만 지우고 `k-vibe-current-route`/`k-vibe-persona-plan`/`k-vibe-route-progress`는 그대로 남겨둬서, 로그아웃 후 같은 브라우저의 다음 사용자(게스트 포함)가 이전 계정의 루트를 그대로 보게 됐음. `saved-places.ts`처럼 계정별 버킷을 새로 설계하는 대신(대화로 확정) 로그아웃 시점에 루트 관련 상태를 통째로 비우도록 `logout()`에서 `saveRouteDraft([])`+`clearPersonaRoutePlan()`+`useRouteProgressStore.getState().clear()` 호출 추가. Playwright로 로그인→루트 추가→루트 완료 체크→로그아웃→localStorage 3개 키 전부 비워짐+"내 루트" 페이지가 실제 빈 상태로 보이는 것까지 확인.

### 제안사항
- ~~12. 루트 순서 변경 시 체감 변화가 없음(제안)~~ — 대화로 **이번 작업 범위에서 제외** 확정.

## ⬜ 2026-09 지도 전수점검 + 기타 수정 (대화 중 요청, 담당자: 보람)

**배경**: 지도에서 상태값이 꼬이거나 에러가 자주 발생한다는 지적 — 아래 5개 항목을 하나씩 원인 파악 후 수정하되, **이미 잘 동작하는 다른 상태값은 절대 건드리지 말 것**(사용자가 명시적으로 강조).

### K-Vibe 지도
- [x] **1. 주변 스팟에서 장소 클릭 시 빨간 핀 표시 안 됨** — **진단: 원래는 버그가 아니라 설계 차이**(빨간 물방울 핀은 검색/추천 전용, 일반 리스트 클릭은 카테고리색 배지+파란 링만 붙는 방식이었음, 실제로 클래스가 정확히 바뀌는 것도 확인함). 다만 대화 중 **"선택 표시를 하나로 통일해달라"는 요구로 범위 확장**해서 실제 기능 변경 진행: 주변 스팟 클릭/지도 핀 직접 클릭/검색/관광지 추천 클릭 **전부 동일한 빨간 핀**으로 표시하고, 다른 곳을 클릭하면 그 핀이 옮겨가도록 통일(다중 상호명 검색 결과는 대화로 확정한 대로 지금처럼 여러 개 동시 표시 유지, 그중 하나를 클릭하면 그것만 커짐). `map-canvas.tsx`에 `showSearchPin = highlightIds?.has(place.id) || selected` 추가, `MapPage.tsx`에 선택 전용 `highlightedPlaceId` state 신규(상세시트 열림/닫힘과 분리 — 아래 참고).
- [x] **2. 관광지 추천 목록에서 카테고리 "전체" 선택 시엔 클릭한 장소에 핀 표기되나, 다른 카테고리(관광지/문화 등) 선택 후엔 미표기** — **진단 완료, 실제 버그 확인 후 수정**. `MapPage.tsx`의 `filtered`(카테고리 필터 적용된 최종 목록)가 강조 핀 계산보다 먼저 카테고리로 걸러버려서, 클릭한 추천 장소의 카테고리가 현재 필터와 다르면(또는 카카오 매핑 결과가 `business`처럼 필터 칩에 없는 값이면) 핀이 안 보이는 게 아니라 **그 장소 자체가 목록/지도에서 통째로 빠져 있었음**(실측: "전체" 31건→"관광지" 필터 9건, 호텔 클릭 시 핀 0개·리스트에도 없음. 진짜 관광지로 분류되는 장소는 같은 필터에서도 정상 표시되는 것으로 대조 확인). **수정**: 검색/추천으로 강조된 장소(`kakaoSearchResultIds`)는 카테고리/페르소나 필터와 무관하게 항상 `filtered`에 포함되도록 예외 처리 추가.
  - **연쇄 발견·수정 3건** (1·2번을 고치는 과정에서 대화로 추가 확정된 요구사항들):
    1. 검색/추천 핀이 상세시트를 닫으면 같이 사라지던 버그 — 원인은 지도 핀의 "선택 강조"가 상세시트의 열림/닫힘과 **같은 state**(`selectedPlace`)를 공유하고 있었던 것(`onClose`가 `setSelectedPlace(null)`을 호출하면 핀 강조까지 같이 꺼짐). `highlightedPlaceId`라는 별도 state로 분리해서, 상세시트를 닫아도 핀은 유지되고 **"다른 장소를 새로 선택할 때만"** 옮겨가도록 수정("현재 위치" 버튼을 누르면 초기화).
    2. 검색/추천으로 이미 빨간 핀이 꽂힌 상태에서 완전히 무관한 다른 장소(예: 주변 스팟)를 클릭하면, 핀이 옮겨가지 않고 이전 핀이 그대로 남은 채 새 핀까지 추가돼 **2개가 동시에 빨갛게 보이는** 버그 발견 — 새로 선택한 장소가 기존 검색결과 그룹에 없으면 그 그룹(`kakaoSearchResults`)을 같이 비우도록 `handleSelectPlace`에서 처리, 강조가 항상 "지금 선택된 곳" 하나만 따라가게 함.
  - Playwright로 순서대로(추천 선택→다른 카테고리 필터에서도 핀 유지, 주변 스팟 선택→핀 이동+중복 없음, 상세시트 닫아도 핀 유지, 다중 검색 결과는 그대로 여러 개 유지, "현재 위치" 누르면 전부 초기화) 전부 재검증 완료.
- [x] **3. 같은 장소에서 언어만 변경(한국어→일본어)하면 카테고리가 하나로만 나옴** — **진단 완료, 백엔드 수정 필요(진짜 원인은 사용자 예상과 달랐음)**: 카테고리가 한글이라서가 아니라, `locale=ko`가 아닐 때 백엔드가 호출하는 TourAPI 외국어 서비스(`EngService2`/`JpnService2`/`ChsService2`)가 **한국어 서비스와 완전히 다른 `contentTypeId` 번호 체계**를 쓰는데, 백엔드의 `CONTENT_TYPE_TO_CATEGORY` 매핑이 한국어 번호(12/14/15/28/32/38/39)만 알고 있어서 전부 매칭 실패 → 기본값 `"culture"` 하나로 뭉개짐(직접 `locale=ja`로 호출해 30건 전부 `culture`인 것 확인, 외국어 응답 항목에 괄호로 같이 오는 한글 원문으로 실제 대응관계까지 실측 확인). `BACKEND_REQUESTS.md` 3번 항목으로 등록(실측 매핑표 포함) — 백엔드에서 외국어 서비스 전용 매핑 테이블 추가 필요.
- [x] **4. TourAPI로 가져온 장소도 전화번호/영업시간이 전부 "서비스 준비중"(mock)으로 뜸** — **진단 완료, 백엔드 수정 필요**: mock 폴백이 의도된 게 아니라 `GET /places/{id}` 백엔드 엔드포인트가 TourAPI에 보내는 파라미터(`defaultYN`, `overviewYN`)가 무효라서 **호출 자체가 항상 실패**하고 있었음(구현 시점부터 계속, 최근에 갑자기 깨진 게 아님 — git blame으로 확인). 파라미터 빼면 정상 동작하고 실제 전화번호/영업시간 데이터도 있는 것 직접 확인함. `BACKEND_REQUESTS.md` 4번 항목으로 등록.
- [x] **5. 모바일에서 장소 리뷰 탭 클릭 시 상세시트 닫기 버튼이 사라짐** — 원인: `PlaceDetailSheet`의 모바일 하단 시트(`SheetContent`)에 전체 높이 제한이 없어서, 리뷰 탭(자체 `max-h-[45vh]`)까지 합치면 헤더+사진+탭+리뷰+푸터 합이 화면 높이를 넘어 시트가 위로 계속 자랐고, 시트 자기 자신 기준 `top-3`에 고정된 닫기(X) 버튼이 화면 밖으로 밀려나 보이지 않게 됐음. shadcn 자동생성 `sheet.tsx`는 건드리지 않고, `place-detail-sheet.tsx`에서 시트 전체를 `max-h-[85vh]`로 캡하고 사진+탭 영역만 내부 스크롤(`overflow-y-auto`)되도록 구조 변경 — 헤더/푸터/닫기버튼은 항상 화면 안에 고정. Playwright로 리뷰 탭 전환 전후 닫기버튼 bounding box가 계속 화면 안(시트 높이도 85vh 이내)에 있는 것, 내부 스크롤 시 헤더/푸터 위치 불변, 닫기 버튼 클릭 시 실제로 닫히는 것까지 확인.

- [x] **전수점검(회귀 테스트)** — 1~5번을 고치는 과정에서 지도의 다른 기능이 망가지지 않았는지, 지도와 연동된 다른 페이지(내 루트/SNS분석/찜한장소/레이더/페르소나별 필터/다국어 전환)까지 Playwright로 전부 재검증. **회귀 없음** — 카테고리 필터(단일선택)/찜·관광지추천 토글 우선순위/지역·상호명 검색/패널 접기·모바일 3단계 스와이프/페르소나별 필터/각 페이지→지도 핸드오프(내 루트의 "루트로 돌아가기" 신규 버튼 포함)/찜취소 버튼 전부 정상 동작 확인. 다국어 전환도 크래시 없이 정상(카테고리 뭉개짐은 3번에 이미 등록된 별개의 기존 백엔드 이슈).
  - **검사 중 완전히 무관한 심각한 버그 재현(오늘 작업과 무관, 코드 수정 안 함)**: 홈에서 페르소나 카드를 클릭하면 결과 화면이 에러 화면으로 크래시남 — `POST /routes/generate`가 각 스팟의 `description`을 `locale`에 맞는 문자열이 아니라 `{en,ja,ko,zh}` 객체 그대로 내려줘서 프론트가 React 렌더링 중 크래시(`Objects are not valid as a React child`). **확인 결과 이미 수정 완료된 상태였음** — 같은 날 가현님이 PR #81(`location_story` jsonb 확장, `_pick()` 폴백 체인 수정)로 이미 고쳐서 `main`에 병합해뒀고, 로컬 백엔드가 그 이전 코드로 떠 있어서(재시작 안 함) 재현된 것. `BACKEND_REQUESTS.md` 5번 항목에 기록만 남김(새 요청 없음).

### 지도 외 기타 수정
- [x] **6. 페르소나 결과 화면(step2)의 시간 카드(도보/전체) 전부 삭제** — 대화 중 확인 결과, 단순 삭제하면 통계 카드가 "장소" 1개만 남아 어색해서 **7번과 함께 처리**하기로 확정: 도보/전체 카드 자리를 "장소"+"총 거리" 2카드로 교체(`route-result.tsx`, `grid-cols-3`→`grid-cols-2`). 거리는 `excludedIds`로 걸러낸 `includedStops` 기준(스팟 제외 시 숫자도 즉시 반영), 계산 방식은 7번과 동일한 haversine 합산. 더 이상 안 쓰는 `totalRouteMinutes`/`formatDuration`/`Clock`/`Sparkles` import와 `persona.walking`/`persona.total` i18n 키 제거, `persona.total_distance` 신규 추가(4개 언어).
- [x] **7. 내 루트에 "총 거리" 카드 신설** — 장소/완료 통계 카드 사이에 위치, 현재 순서 기준 1→2, 2→3, … 구간 거리를 전부 합산해 표시. 계산은 코드베이스 전역에서 이미 쓰던 방식과 동일하게 `haversineKm()` 직선거리 합산(실제 도보경로 API 연동 없음 — `route-location-check.tsx`/`place-card.tsx` 등과 동일 기준), 표시 포맷도 기존 `<1000m→"Xm", else→"X.Xkm"` 패턴 재사용. **대화로 확정한 디테일**: 시작점은 현재위치가 아니라 스팟 1번부터(현재위치는 사용자가 위치확인을 눌러야만 채워지는 선택값이라 포함하면 통계가 들쭉날쭉해짐). `RoutePage.tsx`에 `totalRouteDistanceM()`/`formatDistance()` 추가, `grid-cols-2`→`grid-cols-3`으로 확장(장소/총거리/완료 순), `route.total_distance` i18n 키 신규 추가(4개 언어).
- [ ] **8. 서로 다른 진입점(페르소나/지도)으로 같은 장소를 추가하면 중복됨** — QA 10번 중복방지(`placeId` 비교)가 같은 출처끼리는 걸러내지만, 페르소나로 추가한 장소를 나중에 지도에서 다시 검색해 추가하면 걸러지지 않고 중복 추가됨.
  - **원인**: `route-draft.ts`의 `isSamePlace(a,b) = (a.placeId ?? a.id) === (b.placeId ?? b.id)`가 4개의 서로 독립된 id 체계를 그대로 비교함 — 지도(`place.id`, TourAPI contentId 또는 `kakao-{id}`) / 페르소나(`"{personaId}-{장소명}"`) / SNS분석(`placeId` 자체가 없어 `id`인 `"analysis-{videoId}-{장소명}"`로 폴백) / 찜한장소(지도와 동일 `place.id` 재사용). 같은 실제 장소라도 진입점마다 id 문자열이 완전히 달라서 id/placeId만으로는 원천적으로 못 잡음.
  - **수정 방향**: 모든 출처의 `RouteStop`이 공통으로 갖고 있는 `name`+`lat`/`lng`으로 대조하는 보조 판정을 추가 — id/placeId가 다르더라도 이름이 같고(정규화 후 완전/부분 일치) 좌표가 아주 가까우면(예: 같은 건물 오차범위 내, 하버사인 거리 임계값) 같은 장소로 간주해 걸러냄. `haversine.ts`의 기존 거리계산 함수 재사용 가능. 아직 미구현 — 임계값(몇 m로 잡을지)과 이름 정규화 규칙(공백/괄호 등)은 결정 필요.
- [x] **9. 페르소나 상세리스트(route-result.tsx) 운영시간/별점 관련 2건** — 6/7번 작업 검증 중 대화로 추가 발견.
  - **① 운영시간/별점 하드코딩 여부 확인 요청** — 조사 결과 **두 군데 모두 하드코딩이었음, 성격은 다름**. (a) 백엔드가 실제로 붙이는 리뷰 평균 평점(`location.rating`, `routingService.py`의 `f"{town} · ⭐{rating} · {openingHour}"`)은 진짜 데이터지만 `town`/`openingHour`는 DB에 없어 항상 빈 문자열로 나감(별도 백엔드 이슈, 이번엔 손 안 댐). (b) **프론트 자체 목업**(`api/personas.ts`의 `PERSONA_FALLBACKS`, 백엔드 실패 시에만 사용)은 19개 장소 전부 `address`에 "구 · 평점 · 영업시간"이 완전히 지어낸 문자열로 박혀 있었음 — 사용자 요청대로 **지도 상세시트가 이미 쓰던 것과 동일한 패턴을 공유**하도록 수정: `address`를 `'-'` 센티널로 교체하고, 렌더링하는 3곳(`route-result.tsx`/`spot-list-panel.tsx`의 스타필터 리스트/`place-detail-sheet.tsx`의 데스크탑·모바일 주소 표시 2곳)에서 `address === '-'`이면 기존 `placeDetail.info_unavailable`("서비스 준비중", 4개 언어 기존 존재) 텍스트로 대체(새 i18n 키 추가 없이 재사용).
  - **② X 버튼 옆 시간 표기 삭제** — 스팟 카드 이름/뱃지 줄 우측에 `ml-auto`로 붙어있던 `stop.startTime`(도착 예정시각) 삭제. `RouteResult`는 걸러진 스팟만 넘겨서 루트에 추가하는 미리보기 화면이라 이 시각 자체가 실제 방문시각 확정이 아니라 혼란을 준다는 이유로 제거 요청.
- [x] **11. 내 루트 미니맵 도보 길찾기 버튼 삭제** — `route-mini-map.tsx`의 `DirectionsButton`(미니맵 우하단 "도보 길찾기 열기" → Google Maps Directions 링크) 컴포넌트와 두 렌더 지점(`PercentRouteMiniMap`/`KakaoRouteMiniMap`) 모두 제거. 더 이상 안 쓰는 `Navigation` 아이콘 import, `route.open_directions` i18n 키(4개 언어) 제거. `buildGoogleMapsDirectionsUrl()`(`route-share.ts`)는 재사용 가능성을 감안해 함수 자체는 남겨둠(사용처만 없어짐).
- [x] **12. 내 루트 미니맵 subtitle 삭제** — `MapHeader`에서 "Kakao 지도에서 루트를 보고, 번호를 누르면 Google Maps가 열려요." 텍스트(`route.mini_map_subtitle`) 제거, 제목만 유지. i18n 키(4개 언어)도 같이 제거.
- [x] **13. 위치확인 버튼을 토글로 변경** — 현재는 클릭 1회성 조회 버튼(`RouteLocationCheck`)이었는데, 토글 형태로 변경. 켜면 기존과 동일(GPS 조회+미니맵에 내 위치 핀), 다시 눌러서 끄면 내 위치 핀 제거하고 지도 중심을 루트 기준으로 되돌림.
  - **UI(1단계)**: 처음엔 별도 Switch 컴포넌트+라벨 분리로 구현했으나, 안내문구(현재 거리 결과) 등장 시 버튼/라벨이 따로 놀아 레이아웃이 불안정해 보인다는 피드백 → 기존처럼 버튼 하나로 원복하고, on/off 상태를 배경색(`bg-background`↔`bg-primary`)+`aria-pressed`로 표시. 안내문구는 원래대로 조건부 렌더링 유지(높이 고정 예약 시도했다가 "눌렀을 때 카드가 자연스럽게 늘어나야 한다"는 피드백으로 되돌림).
  - **동작(2단계)**: `RouteLocationCheck`의 `onLocationChecked` prop 타입을 `(coords) => void` → `(coords | null) => void`로 확장, 토글을 끌 때 `onLocationChecked?.(null)` 호출. `RoutePage.tsx`의 `setCurrentLocation`(이미 `|null` 허용)이 그대로 받아 `currentLocation`을 null로 되돌림 — `RouteMiniMap`의 `currentLocation` 의존 `useEffect`(`fitKakaoMapToRoute`)가 자동으로 재실행되어 지도가 루트 스팟만 기준으로 다시 fit됨(추가 지도 코드 수정 불필요). Playwright로 `CurrentLocationPin`의 고유 클래스(`animate-ping.bg-red-500/50`) 개수로 확인: 켜짐 시 1개, 꺼짐 시 0개.
- [x] **14. 내 루트 미니맵 줌인/아웃 기능 제공** — 현재 `KakaoMap`은 `scrollwheel={false}`로 줌 자체가 막혀있고 별도 줌 컨트롤도 없음. **대화로 확정한 방식**: 별도 +/- 버튼이 아니라 마우스휠/트랙패드 스크롤로 줌인/아웃(카카오맵 기본 동작과 동일한 느낌). `KakaoMap`의 `scrollwheel={false}`를 제거해 라이브러리 기본 스크롤휠 줌을 활성화, 카카오 SDK 미로드 시 쓰는 퍼센트 좌표 폴백(`PercentRouteMiniMap`)에도 동등하게 마우스휠로 CSS `scale()` 줌 지원 추가(범위 1~3배, 0.25 단위).
  - 검증: Kakao 실제 API(`map.getLevel()`)를 직접 후킹해서 스크롤 시 레벨이 6→5→6으로 실제로 바뀌는 것 확인(단순 시각 효과가 아니라 진짜 줌). 지도 위에서 스크롤하면 페이지 자체는 안 스크롤되고(맵이 정상적으로 캡처) 맵 밖에서는 정상 스크롤됨 — 구글맵 임베드와 동일한 표준 동작으로 확인, 회귀 아님.
  - **버그 발견·수정**: 퍼센트 폴백의 `onWheel` JSX prop 안에서 `e.preventDefault()`를 호출했는데, React가 `wheel` 이벤트를 성능상 기본적으로 `passive: true`로 등록해서 `preventDefault()`가 항상 무시되고 매번 콘솔에 `"Unable to preventDefault inside passive event listener invocation."` 에러가 찍히던 것을 PR 올리기 전 회귀 테스트 중 발견(줌 자체는 우연히 동작했지만 페이지 스크롤 차단 의도는 전혀 작동 안 하고 있었음). `ref`로 DOM을 직접 잡아 `addEventListener('wheel', handler, { passive: false })`로 네이티브 등록하는 방식으로 수정(JSX `onWheel` prop은 passive 옵션을 지정할 방법이 없음). 카카오 키를 잠깐 비활성화해 폴백 경로를 직접 띄워 재검증 — 줄 동작 유지되면서 콘솔 에러 완전히 사라짐 확인.

## ⬜ 2026-09 지도 수정 2차 + 기타 수정 (대화 중 요청, 담당자: 보람)

### K-Vibe 지도
- [x] **1. "이 지역에서 검색" 버튼 색상 변경** — `map-canvas.tsx`의 `SearchAreaButton`이 `bg-popover/90`(테마 기반 반투명, 지도와 밝기가 비슷해 잘 안 보임)였던 것을 `bg-neutral-900/90 text-white`(검정 계열)로 변경, 테두리(`border-border`)도 검정 배경에 불필요해 제거. 카카오맵 API 키가 등록된 포트(5173)에서만 로드되는 제약으로 색상 자체는 코드 리뷰+`tsc`/`eslint`로 검증(라이브 스크린샷은 5173에서 사용자 확인).
- [x] **2. 상세 팝업 내 공유 버튼 삭제** — `place-detail-sheet.tsx`의 공유 버튼과 `handleShare` 함수, 안 쓰는 `Share2` import, `placeDetail.share`/`share_copied` i18n 키(4개 언어) 제거. Playwright로 공유 버튼 미노출 + "루트에 추가" 버튼 정상 동작 확인.
- [x] **3. 빨간 강조 핀(SearchResultPin) z-index 최상위로 올리기** — TourAPI 스팟이 몰려있는 지역에서는 다른 카테고리 핀에 가려서 빨간 핀(선택/검색 강조)이 안 보임. **원인**: 기존엔 `zIndex={selected ? 2 : 1}`로 "지금 선택된 핀"만 우선순위를 높였는데, 다중 검색결과(`highlightIds`) 중 선택되지 않은 나머지 빨간 핀들은 일반 카테고리 핀과 동일한 zIndex(1)라 렌더 순서에 따라 가려질 수 있었음. **수정**: `showSearchPin`(검색/선택 강조 대상)이면 무조건 일반 핀보다 위(10), 그중 실제 선택된 것은 최상위(20)로 분리 — `KakaoMapCanvas`(`zIndex` prop)와 `PercentMapCanvas`(CSS `z-10`/`z-20` 클래스) 둘 다 동일하게 적용. Playwright로 검색 시 강조 핀들이 새 z-index 클래스를 받는 것 확인.
- [x] **4. 지도 검색 방식 변경** (4-1, 4-2 모두 완료 — 4-2는 4-1로 자동 해결)
  - **4-1. (완료)** 현재는 "행정구역 검색 → 음식점 검색" 순서라, "경복궁"을 검색하면 경복궁 주변 음식점이 먼저 뜸(엉뚱한 결과가 우선). API를 동시 호출하고, 검색 결과 목록을 주변 스팟 목록 최상단(찜/관광지 추천보다도 위, 1순위)에 노출. 클릭 시 해당 스팟으로 이동.
    - **4-1 진행 전 선행 진단(대화 중 요청) — "경복궁"/"인천공항"처럼 행정구역도 상호명도 아닌 랜드마크 검색이 안 되는 원인**: 카카오 API 자체는 정상(REST API 직접 호출로 확인, "경복궁"/"인천국제공항" 둘 다 정확도순 1위로 정확히 나옴). 원인은 프론트의 `kakao-area-search.ts`가 상호명 검색(예: "스타벅스") 정확도를 위해 넣은 `sort: SortBy.DISTANCE`(현재 위치 기준 거리순 정렬)를, 랜드마크처럼 "멀리 있는 유일한 장소" 검색에도 그대로 적용하고 있었던 것 — 거리순 정렬을 걸면 실제 랜드마크보다 **이름만 겹치는, 현재 위치에 훨씬 가까운 무관한 업체**가 1등으로 올라옴. 실측: "경복궁" 거리순 1위 = 인근 피부관리샵(쏘아베에스테틱), "인천공항" 거리순 1위 = 서울 시내 공항 대리주차 업체(실제 공항 아님). `searchKakaoArea()`는 무조건 1등 결과로 이동하므로, 사용자 입장에선 검색이 안 되는 것처럼 보임.
    - **수정**: `kakao-area-search.ts`의 `searchKakaoArea()`를 `{ type: 'address', center }`(행정구역 매칭, 기존과 동일하게 바로 이동) 또는 `{ type: 'keyword', relevance, distance }`(그 외, 두 목록만 반환·자동 이동 없음)로 재구성. `keywordSearch()`를 상호명 검색 정확도순(`sort` 없이 `near`만 지역 힌트로 사용 — 이 상태에서도 "경복궁"/"인천공항" 둘 다 1위로 정확히 나옴, 실측 확인)과 거리순(`sort: DISTANCE`) 두 번 동시 호출(`Promise.all`)하도록 분리, 거리순 목록에서 정확도순과 겹치는 장소는 제거(중복 시 정확도순 유지, 대화로 확정).
    - **검색창 직접 입력**(`areaSearchMutation`): `type: 'keyword'`면 자동 이동/강조 없이 `areaSearchLists`(정확도순/거리순) state에만 채워 넣고, `SpotListPanel`에 새 "검색 결과" 섹션으로 노출(찜/관광지 추천보다도 위, 최우선) — 정확도순 그룹이 위, 거리순 그룹이 아래. 목록 항목 클릭 시 기존 `onSelectPlace`(단일 선택 핀 메커니즘)를 그대로 재사용 — 클릭 전엔 아무 것도 강조되지 않고, 클릭한 장소 하나에만 빨간 핀이 붙음(기존 "검색 결과 전부 빨간 핀 유지" 방식을 이 흐름에 한해 명시적으로 변경, 대화로 확정). 이 목록에 뜬 장소는 카테고리 필터와 무관하게 항상 선택 가능하도록 `filtered`에 예외 처리 추가.
    - **관광지 추천 클릭**(`attractionSearchMutation`, 별도 플로우, 이번 요청 범위 밖)은 기존 "자동 이동 + 매치 전부 강조" 동작을 그대로 유지하되, 내부적으로 거리순 대신 정확도순(relevance) 결과를 사용하도록만 바꿔 같은 sort 버그의 영향은 받지 않게 함.
    - **검증**: 실제 Kakao API를 mock(REST API로 확인한 실제 응답 형태 그대로 재현)해서 `searchKakaoArea()` 단위 동작 확인 — 주소 매칭/키워드 매칭(정확도순에 진짜 랜드마크, 거리순에서 중복 제거)/무결과 케이스 전부 기대대로 동작. 카카오맵 JS 키가 특정 포트에만 허용되어 있어 실제 UI 종단 테스트(검색창 타이핑→목록 노출→클릭→이동)는 5173에서 사용자 확인 필요.
  - **4-2. (완료 — 별도 구현 불필요)** 역(지하철역) 검색 지원 — "강남역"/"삼성역" 등 역명을 검색하면 이동이 안 됨. **확인 결과**: 지하철역도 카카오 API 상에서는 랜드마크와 동일하게 상호명(POI)으로 등록돼 있어, 4-1에서 고친 keyword 검색 경로(관련도순/거리순 동시 조회 + 목록 제공)를 그대로 탄다. 실측(REST API 직접 호출, `sort` 없이 관련도순): "강남역"→"강남역 2호선"(지하철) 1위, "삼성역"→"삼성역 2호선"(지하철) 1위로 정확히 반환됨 — 4-2가 원래 가정했던 "역 검색 전용 API 필요"는 사실이 아니었고, 4-1 버그(랜드마크 검색 왜곡)와 근본 원인이 동일했음. 역명을 행정구역처럼 "검색 시 바로 이동"으로 처리하면 오히려 4-1에서 정한 "행정구역이 아니면 목록으로 제공" 원칙과 충돌하므로, 별도 구현 없이 4-1의 목록 UX를 그대로 적용하는 것이 맞는 방향으로 결론.
- [x] **5. 지도 검색이 될 때/안 될 때가 왔다갔다함** — **원인**: 검색 UI 활성화 여부(`MapPage.tsx`의 `canSearchArea`)가 기존엔 "`VITE_KAKAO_MAP_KEY`가 설정돼 있는가"만 확인했는데, 이는 `map-canvas.tsx`의 `useKakaoLoader()`가 실제로 카카오 SDK 스크립트를 다 불러와 `window.kakao.maps.services`가 초기화됐는지와는 무관한 별개 신호였음. 지도 페이지 진입 직후(또는 새로고침 직후) SDK가 아직 비동기 로딩 중인 짧은 창에 검색하면 `kakao-area-search.ts`의 가드(`typeof kakao === 'undefined' || !kakao.maps?.services`)가 그냥 `null`을 반환해 "검색 결과 없음" 토스트만 뜨고, SDK 로딩이 끝난 뒤(보통 수백ms~2초) 같은 검색어로 재시도하면 정상 동작 — "완전히 랜덤"이 아니라 "페이지 진입 직후 vs 좀 지난 후" 타이밍에 좌우되는 문제였음.
  - **수정**: `useKakaoLoader()`의 로딩 상태를 `KakaoMapCanvas`(`map-canvas.tsx`) 내부에만 갇혀있던 것을 `onKakaoStatusChange('loading'|'ready'|'unavailable')` 콜백으로 `MapPage.tsx`까지 끌어올림. `canSearchArea`는 `hasKakaoKey && status === 'ready'`일 때만 true, 로딩 중(`status === 'loading'`)이면 검색 버튼을 숨기는 대신 `Loader2` 스피너로 비활성 표시(`spot-list-panel.tsx`의 `areaSearchButton`, `map.search_area_loading` i18n 키 4개 언어 신규 추가) — SDK 로드가 완전히 실패한 경우(`status === 'unavailable'`)는 영원히 로딩중처럼 보이지 않도록 키가 아예 없을 때와 동일하게 버튼을 숨김. `handleSearchArea`/`handleSelectAttraction`(엔터키·관광지 추천 클릭 경로)도 `canSearchArea`가 아닐 때 조용히 무시하도록 가드 추가.
  - **검증**: `npx tsc --noEmit`/`npx eslint src` 클린(shadcn 3건 제외). 카카오 키가 등록 안 된 포트(5175)로 임시 dev 서버를 띄워 SDK 로드가 영구 실패(`unavailable`)하는 상황을 재현 — 검색 버튼이 무한 스피너로 멈추지 않고 정상적으로 숨겨지는 것 확인. "로딩 중 → 준비 완료" 전환 자체(실제 스피너 노출 후 검색 가능으로 바뀌는 것)는 카카오 키가 등록된 포트(5173)에서만 재현 가능해 사용자 확인 필요.
- [ ] **1. "이 지역에서 검색" 버튼 색상 변경** — 지도 위에 뜨는 이 버튼이 지도 밝기와 버튼 밝기가 비슷해서 잘 안 보임. 검정색 계열로 변경 필요.
- [ ] **2. 상세 팝업 내 공유 버튼 삭제** — `place-detail-sheet.tsx`의 공유 버튼 제거.
- [ ] **3. 빨간 강조 핀(SearchResultPin) z-index 최상위로 올리기** — TourAPI 스팟이 몰려있는 지역에서는 다른 카테고리 핀에 가려서 빨간 핀(선택/검색 강조)이 안 보임.
- [ ] **4. 지도 검색 방식 변경**
  - **4-1.** 현재는 "행정구역 검색 → 음식점 검색" 순서라, "경복궁"을 검색하면 경복궁 주변 음식점이 먼저 뜸(엉뚱한 결과가 우선). API를 동시 호출하고, 검색 결과 목록을 주변 스팟 목록 최상단(찜/관광지 추천보다도 위, 1순위)에 노출. 클릭 시 해당 스팟으로 이동.
  - **4-2.** 역(지하철역) 검색 지원 — "강남역"/"삼성역" 등 역명을 검색하면 이동이 안 됨. 역 검색이 가능한 API가 있는지 확인 필요, 없으면 대안 검색 방법 조사 필요.
- [x] **5. 지도 검색이 될 때/안 될 때가 왔다갔다함** — 원인 파악 완료, 수정 완료 (위 체크 항목 참고).
- [ ] **6. 위치 관련 기능 전면 숨김(모듈 단위 on/off 가능하게)** — 아래 4개를 하나의 모듈로 묶어서 켜고 끌 수 있게 구현.
  - **6-1.** [현재위치] 버튼 전부(좌측 상단/우측 하단) 숨김
  - **6-2.** 현재 위치 표기 아이콘(지도 위 내 위치 핀) 숨김
  - **6-3.** 지도 랜딩 시 "현재위치"가 아닌 서울역으로 기본 랜딩
  - **6-4.** 지도 랜딩 시 현재 위치 미사용(브라우저 위치 권한 동의 자체를 안 받음) — 위치 권한 동의를 받는 화면은 "내 루트 > 위치확인" 토글 클릭 시 한 곳만 남음
  - **⚠️ 실행 전 필수 선행 작업**: 이 기능을 모듈 단위로 켰다 껐다 할 수 있게 만드는 게 가능한지 먼저 검토하고, 어떤 방식으로 구현할지(예: feature flag/설정값 하나로 6-1~6-4를 한번에 제어하는 구조가 가능한지, 기존 `use-current-location.ts`/`location-cache.ts`/MapPage 구조에 미치는 영향 등)를 먼저 조사해서 보고 — 조사 결과 확인 후에만 실제 구현 시작.

### 지도 외 기타 수정
- [x] **7. 웹에서 페르소나 카드 중 제니만 프로필 이미지가 다른 카드와 정렬이 안 맞음(아래로 처짐)** — **진단 과정에서 시행착오 있었음, 최종 원인은 사용자가 직접 찾음**. 처음엔 제니 프로필 사진 원본(namu.wiki, 1000×1000 정사각형)만 다른 페르소나 사진(세로로 긴 원본)과 달리 `object-cover`가 크롭할 여백이 없어서 원본 구도 그대로 나온다고 진단하고 카드별 수동 확대(`scale`+`object-position`)로 시도했으나(1.1배→1.25배→1.6배까지 단계적 조정), 사용자가 "그 정도로 확대하지 말고 원복"을 반복 요청 — **실제 원인은 카드 설명(description) 텍스트 길이에 따라 카드 전체 레이아웃(높이)이 달라지는 것**이었음(설명이 짧으면 `line-clamp-2`가 있어도 실제 줄바꿈이 안 일어나 해당 카드만 낮은 높이를 갖고, 그리드 정렬 과정에서 이미지 표시 영역까지 흔들림). **수정**: 확대/위치 보정은 전부 원복하고, 설명 문단에 `min-h`를 고정 부여해 텍스트 줄 수와 무관하게 항상 2줄 높이를 차지하도록 변경 — `persona-picker.tsx`(홈 화면, `min-h-10`)와 `PersonaPage.tsx`(페르소나 메뉴 전체 목록, 반응형 폰트에 맞춰 `min-h-8 md:min-h-10`) 둘 다 적용. Playwright로 카드 높이가 설명 길이와 무관하게 전부 동일(352px/369px)한 것 확인.
- [x] **8. 페르소나 상세(step2)에서 공유 버튼 제외** — `route-result.tsx`의 공유 버튼(및 `onShare` prop, `PersonaPage.tsx`의 `handleShare`, 이제 안 쓰는 `persona.share`/`shared`/`copied`/`share_unavailable` i18n 키 4개 언어) 전부 제거. 남은 "루트에 추가" 버튼은 `flex-1` → `w-full`로 확장.
- [x] **(추가 발견·수정) 페르소나 카드 이미지 확대 팝업 바깥 클릭 시 실수로 페르소나가 선택되어 step2로 넘어가는 버그** — 7번 진단 중 사용자가 발견. **원인**: `zoomable-image.tsx`가 확대 팝업(`DialogContent`)에만 `stopPropagation()`을 걸어뒀는데, "바깥 클릭으로 닫기"를 처리하는 `DialogOverlay`(배경)는 별도 요소라 안 걸려있었음 — base-ui Dialog의 Overlay/Popup은 DOM상 `document.body`에 포탈되지만 **React 합성 이벤트는 실제 DOM이 아니라 JSX 트리를 따라 버블링**해서 배경 클릭이 그대로 부모 카드의 `onClick`(선택)까지 전파됐음(포탈의 흔한 함정). **수정**: `Dialog` 전체(Overlay+Popup 둘 다 포함)를 감싸는 wrapper 하나에 `stopPropagation()`을 걸어 어디를 클릭하든 부모로 전파되지 않게 처리. `ZoomableImage`를 공유하는 다른 화면(홈 롱프레스 팝업 등)에도 동일하게 적용됨. Playwright로 이미지 클릭→팝업 열림→바깥 클릭→팝업만 닫히고 URL은 `/persona`에 그대로 남는 것(step2로 안 넘어감) 확인.

**작업 순서(대화로 확정)**: plan.md 업데이트(본 섹션) → 기타 수정(7, 8번) 진행 후 PR → 지도 **1, 2번** 수정 → **3번 진행 전 반드시 사용자 확인** 받은 뒤에만 진행(절대 먼저 진행 금지).
